-- Backfill public.users.province for rows where province IS NULL, using the
-- civil-registration province code embedded in Thai ID digits 2-3 (จังหวัดที่เกิด
-- หรือมีทะเบียนบ้าน) as a fallback — for people who skipped filling liveaddress
-- via an app gap that let them jump straight to the test without completing
-- registration, and never took the risk assessment (so no other geo signal
-- exists for them either).
--
-- CAVEAT (intentional, discussed with the project owner): digits 2-3 encode
-- province of BIRTH / HOUSEHOLD REGISTRATION, not necessarily where the
-- person currently lives — liveaddress-derived province remains the "real"
-- field. This is a best-effort proxy ONLY for rows with zero geographic data.
-- Never overwrites an existing non-null province (WHERE province IS NULL).
--
-- Only touches the `province` column — does NOT touch `liveaddress`, so the
-- BEFORE UPDATE OF liveaddress trigger (set_province_trigger) does not fire
-- and cannot re-derive/overwrite this value from a (still-empty) address.
--
-- Province code table source (cross-checked against 2 independent sources):
--   https://www.jangwat.com/knowledge/331/
--   กรมการปกครอง (DOPA) ทะเบียนราษฎร์ province code list
-- Spelling matches app/types/user.ts's provinceOptions exactly (all 77).

-- ── Preflight: run this first to see how many rows would be affected ───────
-- SELECT count(*) AS candidates
-- FROM public.users u
-- WHERE u.province IS NULL
--   AND u.thaiid IS NOT NULL
--   AND length(regexp_replace(u.thaiid, '\D', '', 'g')) = 13;

WITH province_codes(code, province) AS (
  VALUES
    ('10','กรุงเทพมหานคร'), ('11','สมุทรปราการ'), ('12','นนทบุรี'), ('13','ปทุมธานี'),
    ('14','พระนครศรีอยุธยา'), ('15','อ่างทอง'), ('16','ลพบุรี'), ('17','สิงห์บุรี'),
    ('18','ชัยนาท'), ('19','สระบุรี'), ('20','ชลบุรี'), ('21','ระยอง'),
    ('22','จันทบุรี'), ('23','ตราด'), ('24','ฉะเชิงเทรา'), ('25','ปราจีนบุรี'),
    ('26','นครนายก'), ('27','สระแก้ว'), ('30','นครราชสีมา'), ('31','บุรีรัมย์'),
    ('32','สุรินทร์'), ('33','ศรีสะเกษ'), ('34','อุบลราชธานี'), ('35','ยโสธร'),
    ('36','ชัยภูมิ'), ('37','อำนาจเจริญ'), ('38','บึงกาฬ'), ('39','หนองบัวลำภู'),
    ('40','ขอนแก่น'), ('41','อุดรธานี'), ('42','เลย'), ('43','หนองคาย'),
    ('44','มหาสารคาม'), ('45','ร้อยเอ็ด'), ('46','กาฬสินธุ์'), ('47','สกลนคร'),
    ('48','นครพนม'), ('49','มุกดาหาร'), ('50','เชียงใหม่'), ('51','ลำพูน'),
    ('52','ลำปาง'), ('53','อุตรดิตถ์'), ('54','แพร่'), ('55','น่าน'),
    ('56','พะเยา'), ('57','เชียงราย'), ('58','แม่ฮ่องสอน'), ('60','นครสวรรค์'),
    ('61','อุทัยธานี'), ('62','กำแพงเพชร'), ('63','ตาก'), ('64','สุโขทัย'),
    ('65','พิษณุโลก'), ('66','พิจิตร'), ('67','เพชรบูรณ์'), ('70','ราชบุรี'),
    ('71','กาญจนบุรี'), ('72','สุพรรณบุรี'), ('73','นครปฐม'), ('74','สมุทรสาคร'),
    ('75','สมุทรสงคราม'), ('76','เพชรบุรี'), ('77','ประจวบคีรีขันธ์'), ('80','นครศรีธรรมราช'),
    ('81','กระบี่'), ('82','พังงา'), ('83','ภูเก็ต'), ('84','สุราษฎร์ธานี'),
    ('85','ระนอง'), ('86','ชุมพร'), ('90','สงขลา'), ('91','สตูล'),
    ('92','ตรัง'), ('93','พัทลุง'), ('94','ปัตตานี'), ('95','ยะลา'),
    ('96','นราธิวาส')
),
candidates AS (
  SELECT
    u.id,
    substring(regexp_replace(u.thaiid, '\D', '', 'g') from 2 for 2) AS province_code
  FROM public.users u
  WHERE u.province IS NULL
    AND u.thaiid IS NOT NULL
    AND length(regexp_replace(u.thaiid, '\D', '', 'g')) = 13
)
UPDATE public.users u
SET province = pc.province
FROM candidates c
JOIN province_codes pc ON pc.code = c.province_code
WHERE u.id = c.id;

-- ── Postflight: run this after to confirm how many rows still have no
-- province at all (thaiid missing/malformed/unrecognized code — nothing
-- more can be inferred for these without liveaddress) ──────────────────────
-- SELECT count(*) AS still_null FROM public.users WHERE province IS NULL;
