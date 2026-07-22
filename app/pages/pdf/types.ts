import { Timestamp } from "firebase/firestore";

/**
 * Minimal timestamp shape the UI relies on (`.toDate()` / `.toMillis()`).
 * A Firestore `Timestamp` already satisfies this; Supabase rows (ISO strings)
 * are wrapped with `toTsLike()` so both data sources render identically and
 * downstream components (UserList, PdfUserCardList) need no changes.
 */
export interface TsLike {
  toDate: () => Date;
  toMillis: () => number;
}

/** Wrap a Supabase timestamp (ISO string / Date) into the `TsLike` shape. */
export function toTsLike(value?: string | Date | null): TsLike | undefined {
  if (!value) return undefined;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return undefined;
  return { toDate: () => d, toMillis: () => d.getTime() };
}

export type UserRow = {
  userDocId: string;
  firstName?: string;
  lastName?: string;
  gender?: string;
  thaiId?: string;
  age?: number | null;
  idCardAddress?: string;
  liveAddress?: string;
  timestamp?: TsLike;
  lastUpdate?: TsLike;
  source: "users" | "temps";
};

/** แยกชื่อจังหวัดออกจาก liveAddress โดยเทียบกับ provinceOptions */
export function extractProvince(address?: string): string | null {
  if (!address) return null;
  for (const opt of provinceOptions) {
    if (opt.value !== "null" && address.includes(opt.value)) {
      return opt.value;
    }
  }
  return null;
}

export type RecordRow = {
  recordId: string;
  timestamp?: Timestamp;
  risk?: boolean | null;
};

export type PaginationInfo = {
  currentPage: number;
  totalPages: number;
  startIndex: number;
  endIndex: number;
  totalItems: number;
};

export const provinceOptions = [
    { value: 'null', label: 'เลือกจังหวัด' },
    { value: 'กรุงเทพมหานคร', label: 'กรุงเทพมหานคร' },
    { value: 'กระบี่', label: 'กระบี่' },
    { value: 'กาญจนบุรี', label: 'กาญจนบุรี' },
    { value: 'กาฬสินธุ์', label: 'กาฬสินธุ์' },
    { value: 'กำแพงเพชร', label: 'กำแพงเพชร' },
    { value: 'ขอนแก่น', label: 'ขอนแก่น' },
    { value: 'จันทบุรี', label: 'จันทบุรี' },
    { value: 'ฉะเชิงเทรา', label: 'ฉะเชิงเทรา' },
    { value: 'ชลบุรี', label: 'ชลบุรี' },
    { value: 'ชัยนาท', label: 'ชัยนาท' },
    { value: 'ชัยภูมิ', label: 'ชัยภูมิ' },
    { value: 'ชุมพร', label: 'ชุมพร' },
    { value: 'เชียงราย', label: 'เชียงราย' },
    { value: 'เชียงใหม่', label: 'เชียงใหม่' },
    { value: 'ตรัง', label: 'ตรัง' },
    { value: 'ตราด', label: 'ตราด' },
    { value: 'ตาก', label: 'ตาก' },
    { value: 'นครนายก', label: 'นครนายก' },
    { value: 'นครปฐม', label: 'นครปฐม' },
    { value: 'นครพนม', label: 'นครพนม' },
    { value: 'นครราชสีมา', label: 'นครราชสีมา' },
    { value: 'นครศรีธรรมราช', label: 'นครศรีธรรมราช' },
    { value: 'นครสวรรค์', label: 'นครสวรรค์' },
    { value: 'นนทบุรี', label: 'นนทบุรี' },
    { value: 'นราธิวาส', label: 'นราธิวาส' },
    { value: 'น่าน', label: 'น่าน' },
    { value: 'บึงกาฬ', label: 'บึงกาฬ' },
    { value: 'บุรีรัมย์', label: 'บุรีรัมย์' },
    { value: 'ปทุมธานี', label: 'ปทุมธานี' },
    { value: 'ประจวบคีรีขันธ์', label: 'ประจวบคีรีขันธ์' },
    { value: 'ปราจีนบุรี', label: 'ปราจีนบุรี' },
    { value: 'ปัตตานี', label: 'ปัตตานี' },
    { value: 'พระนครศรีอยุธยา', label: 'พระนครศรีอยุธยา' },
    { value: 'พังงา', label: 'พังงา' },
    { value: 'พัทลุง', label: 'พัทลุง' },
    { value: 'พิจิตร', label: 'พิจิตร' },
    { value: 'พิษณุโลก', label: 'พิษณุโลก' },
    { value: 'เพชรบุรี', label: 'เพชรบุรี' },
    { value: 'เพชรบูรณ์', label: 'เพชรบูรณ์' },
    { value: 'แพร่', label: 'แพร่' },
    { value: 'ภูเก็ต', label: 'ภูเก็ต' },
    { value: 'มหาสารคาม', label: 'มหาสารคาม' },
    { value: 'มุกดาหาร', label: 'มุกดาหาร' },
    { value: 'แม่ฮ่องสอน', label: 'แม่ฮ่องสอน' },
    { value: 'ยโสธร', label: 'ยโสธร' },
    { value: 'ยะลา', label: 'ยะลา' },
    { value: 'ร้อยเอ็ด', label: 'ร้อยเอ็ด' },
    { value: 'ระนอง', label: 'ระนอง' },
    { value: 'ระยอง', label: 'ระยอง' },
    { value: 'ราชบุรี', label: 'ราชบุรี' },
    { value: 'ลพบุรี', label: 'ลพบุรี' },
    { value: 'ลำปาง', label: 'ลำปาง' },
    { value: 'ลำพูน', label: 'ลำพูน' },
    { value: 'เลย', label: 'เลย' },
    { value: 'ศรีสะเกษ', label: 'ศรีสะเกษ' },
    { value: 'สกลนคร', label: 'สกลนคร' },
    { value: 'สงขลา', label: 'สงขลา' },
    { value: 'สตูล', label: 'สตูล' },
    { value: 'สมุทรปราการ', label: 'สมุทรปราการ' },
    { value: 'สมุทรสงคราม', label: 'สมุทรสงคราม' },
    { value: 'สมุทรสาคร', label: 'สมุทรสาคร' },
    { value: 'สระแก้ว', label: 'สระแก้ว' },
    { value: 'สระบุรี', label: 'สระบุรี' },
    { value: 'สิงห์บุรี', label: 'สิงห์บุรี' },
    { value: 'สุโขทัย', label: 'สุโขทัย' },
    { value: 'สุพรรณบุรี', label: 'สุพรรณบุรี' },
    { value: 'สุราษฎร์ธานี', label: 'สุราษฎร์ธานี' },
    { value: 'สุรินทร์', label: 'สุรินทร์' },
    { value: 'หนองคาย', label: 'หนองคาย' },
    { value: 'หนองบัวลำภู', label: 'หนองบัวลำภู' },
    { value: 'อ่างทอง', label: 'อ่างทอง' },
    { value: 'อำนาจเจริญ', label: 'อำนาจเจริญ' },
    { value: 'อุดรธานี', label: 'อุดรธานี' },
    { value: 'อุตรดิตถ์', label: 'อุตรดิตถ์' },
    { value: 'อุทัยธานี', label: 'อุทัยธานี' },
    { value: 'อุบลราชธานี', label: 'อุบลราชธานี' },
    { value: 'พะเยา', label: 'พะเยา' },
    { value: 'อื่นๆ', label: 'อื่นๆ' },
  ];