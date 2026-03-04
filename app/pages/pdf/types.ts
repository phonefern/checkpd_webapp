import { Timestamp } from "firebase/firestore";

export type UserRow = {
  userDocId: string;
  firstName?: string;
  lastName?: string;
  gender?: string;
  thaiId?: string;
  age?: number | null;
  idCardAddress?: string;
  timestamp?: Timestamp;
  lastUpdate?: Timestamp;
  source: "users" | "temps";
};

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