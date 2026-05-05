# Tracking Risk Summary: ความสัมพันธ์ของ Date Range กับ Test Result

## สถานะปัจจุบัน (Current Behavior)

- ส่วน `Download Tracking` (ยอดรวม users/temps ในหน้า) ใช้ `dateRange` ไปกรองจาก Firebase field: `timestamp`
- ส่วน `Risk Summary` (เสี่ยง/ปกติ/ยังไม่ประเมิน/ไม่ได้ทดสอบ) อ่านจากตาราง Supabase: `checkpd_user_risk`
- ตอนนี้ `Risk Summary` จะ:
  - กรองตาม `province`, `kind`, `user_id` ได้
  - ถ้าเปิด checkbox date filter จะกรองตามเวลาใน DB (`parent_timestamp` fallback `latest_record_at` fallback `updated_at`)

## ทำไมติ๊กแล้วผลเป็น 0

มีโอกาสสูงจากสาเหตุนี้:

1. ช่วงวันที่ใน Firebase (`timestamp`) ไม่ตรงกับช่วงวันที่ใน Supabase (`parent_timestamp`)
2. หลายแถวใน `checkpd_user_risk` อาจมี `parent_timestamp` เป็น `NULL` หรือเป็นคนละวันกับที่ผู้ใช้เลือก
3. เลยเกิด “ฐานเวลาไม่ตรงกัน” แม้ข้อมูลรวมใน DB มีจริง

สรุป: ตอนเปิด date filter ใน risk summary เรากำลังกรองคนละแกนเวลา กับกล่องสถิติฝั่ง Firebase

## คำตอบคำถาม “ตอนนี้มันอิง parent_timestamp ไหม”

- ใช่ เมื่อเปิด checkbox มันอิงเวลาใน DB (`parent_timestamp` เป็นหลัก)
- ไม่ได้อิง `timestamp` จาก Firebase โดยตรง

## แนวทางทำให้ “สัมพันธ์กัน” (Recommended)

### ทางเลือก A (แนะนำ): ผูก Risk Summary กับชุดผู้ใช้ที่ผ่าน Firebase dateRange

หลักการ:

1. ใช้ `dateRange` กรอง Firebase ก่อน (เหมือนที่หน้าใช้อยู่)
2. เอา `user_id` ที่อยู่ในช่วงนั้นส่งไป API risk summary
3. API นับผลจาก `checkpd_user_risk` เฉพาะ `user_id` ชุดนี้

ข้อดี:

- สองบล็อกสถิติสัมพันธ์กันจริงตาม “กลุ่มผู้ใช้ในช่วงวันที่เลือก”
- ไม่ต้องพึ่งว่า `parent_timestamp` ใน Supabase ต้องสมบูรณ์

ข้อควรระวัง:

- ต้องเพิ่มพารามิเตอร์ `userIds[]` หรือ POST body ไป API
- ถ้าจำนวน user เยอะมาก ควรส่งเป็น POST + batching

---

### ทางเลือก B: ใช้ DB time อย่างเดียวทั้งหน้า

หลักการ:

- ให้ทั้งหน้าติดตามอิง `checkpd_user_risk.parent_timestamp` เป็นแกนเวลาเดียว

ข้อดี:

- แกนเวลาชัดเจนเดียวกันทั้งหมด

ข้อเสีย:

- ไม่ตรงกับ behavior ปัจจุบันของ dashboard ที่อิง Firebase realtime

## ข้อเสนอเชิงปฏิบัติ

แนะนำทำทางเลือก A เพื่อคง UX เดิม:

1. หน้า tracking สร้างรายชื่อ `user_id` จาก Firebase ตาม `dateRange`
2. เรียก `/api/tracking/risk-summary` พร้อม `userIds` และ filter อื่น (`province`, `kind`)
3. API กรอง `checkpd_user_risk.user_id IN (...)` แล้วค่อยนับ `latest_status`
4. คง checkbox `parent_timestamp` ไว้เป็น “โหมดวิเคราะห์ด้วยเวลาฐานข้อมูล” แยกชัดเจน (optional)

## SQL Debug ที่ควรใช้ตรวจข้อมูลจริง

```sql
-- 1) กระจายสถานะทั้งหมด
select latest_status, count(*)
from public.checkpd_user_risk
group by latest_status
order by count(*) desc;

-- 2) ดูว่า parent_timestamp ว่างเยอะไหม
select
  count(*) as total_rows,
  count(parent_timestamp) as has_parent_timestamp,
  count(*) - count(parent_timestamp) as missing_parent_timestamp
from public.checkpd_user_risk;

-- 3) กระจายข้อมูลตามวันของ parent_timestamp
select date_trunc('day', parent_timestamp) as day, count(*)
from public.checkpd_user_risk
where parent_timestamp is not null
group by 1
order by 1 desc
limit 30;
```

## สรุปสั้น

- ระบบตอนนี้อ่าน risk summary จาก DB ได้ถูกแล้ว
- อาการ “ติ๊ก parent_timestamp แล้วว่าง” เกิดจากแกนเวลา Supabase ไม่ตรงกับ dateRange ฝั่ง Firebase
- วิธีให้สัมพันธ์กันจริง: ให้ risk summary กรองตาม `user_id set` ที่ได้จาก Firebase dateRange (ทางเลือก A)
