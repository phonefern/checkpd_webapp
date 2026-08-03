"use client";

import { useState } from "react";
import {
  collection,
  getDocs,
  limit as fsLimit,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebaseClient";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ClipboardCheck, Loader2, Search } from "lucide-react";
import { UserRow, extractProvince } from "@/app/pages/pdf/types";
import type { QaCreatedIdentity } from "@/app/component/qa/QaCreateModal";

interface FullFirestoreSearchModalProps {
  open: boolean;
  onClose: () => void;
  onSelectUser: (user: UserRow) => void;
  onQaClick: (user: UserRow) => void;
  qaIdentityByUser: Record<string, QaCreatedIdentity>;
}

const COLLECTIONS = ["users", "temps"] as const;
// Data has been written under both casings over the app's lifetime
// (see mapFirebaseDoc's `d.firstName || d.firstname` fallback in the page).
const ID_FIELDS = ["thaiId", "thaiid"];
const FIRST_NAME_FIELDS = ["firstName", "firstname"];
const LAST_NAME_FIELDS = ["lastName", "lastname"];
const RESULT_LIMIT_PER_QUERY = 15;

function calculateAgeFromBod(bod: any): number | null {
  try {
    if (!bod) return null;
    let birthDate: Date | null = null;
    if (typeof bod?.toDate === "function") birthDate = bod.toDate();
    else if (bod instanceof Date) birthDate = bod;
    else if (typeof bod === "string") birthDate = new Date(bod.replace("at", ""));
    if (!birthDate || Number.isNaN(birthDate.getTime())) return null;

    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    const dayDiff = today.getDate() - birthDate.getDate();
    if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) age--;
    return age;
  } catch {
    return null;
  }
}

function mapFirebaseDoc(docSnap: { id: string; data: () => any }, source: "users" | "temps"): UserRow {
  const d = docSnap.data();
  return {
    userDocId: docSnap.id,
    firstName: d.firstName || d.firstname,
    lastName: d.lastName || d.lastname,
    gender: d.gender,
    thaiId: d.thaiId || d.thaiid,
    age:
      typeof d.age === "number"
        ? d.age
        : typeof d.age === "string"
          ? Number(d.age) || null
          : calculateAgeFromBod(d.bod),
    idCardAddress: d.idCardAddress,
    liveAddress: d.liveAddress,
    timestamp: d.timestamp,
    lastUpdate: d.lastUpdate,
    source,
  };
}

// Firestore has no substring search, but exact-match and prefix ("starts
// with", via the `` trick) queries are both single-field range/equality
// queries — automatically indexed, so they stay fast regardless of how many
// documents (100k+) the collection holds. This is what lets "full search"
// cover the entire dataset without pulling every document to the client.
async function searchExactId(term: string): Promise<UserRow[]> {
  const tasks = COLLECTIONS.flatMap((col) =>
    ID_FIELDS.map(async (field) => {
      try {
        const snap = await getDocs(
          query(collection(db, col), where(field, "==", term), fsLimit(RESULT_LIMIT_PER_QUERY))
        );
        return snap.docs.map((d) => mapFirebaseDoc(d, col));
      } catch (err) {
        console.error(`[FullFirestoreSearchModal] id query failed (${col}.${field})`, err);
        return [] as UserRow[];
      }
    })
  );
  return (await Promise.all(tasks)).flat();
}

async function searchNamePrefix(term: string): Promise<UserRow[]> {
  const end = term + "";
  const fields = [...FIRST_NAME_FIELDS, ...LAST_NAME_FIELDS];
  const tasks = COLLECTIONS.flatMap((col) =>
    fields.map(async (field) => {
      try {
        const snap = await getDocs(
          query(
            collection(db, col),
            orderBy(field),
            where(field, ">=", term),
            where(field, "<", end),
            fsLimit(RESULT_LIMIT_PER_QUERY)
          )
        );
        return snap.docs.map((d) => mapFirebaseDoc(d, col));
      } catch (err) {
        console.error(`[FullFirestoreSearchModal] name query failed (${col}.${field})`, err);
        return [] as UserRow[];
      }
    })
  );
  return (await Promise.all(tasks)).flat();
}

function dedupe(rows: UserRow[]): UserRow[] {
  const seen = new Map<string, UserRow>();
  for (const row of rows) {
    const key = `${row.source}:${row.userDocId}`;
    if (!seen.has(key)) seen.set(key, row);
  }
  return Array.from(seen.values());
}

export function FullFirestoreSearchModal({
  open,
  onClose,
  onSelectUser,
  onQaClick,
  qaIdentityByUser,
}: FullFirestoreSearchModalProps) {
  const [term, setTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<UserRow[]>([]);

  const isIdMode = /^[0-9]+$/.test(term.trim());

  const runSearch = async () => {
    const trimmed = term.trim();
    if (!trimmed) return;
    setLoading(true);
    setError(null);
    setSearched(true);
    try {
      const rows = /^[0-9]+$/.test(trimmed) ? await searchExactId(trimmed) : await searchNamePrefix(trimmed);
      setResults(dedupe(rows));
    } catch (err: any) {
      setError(err?.message || "ค้นหาไม่สำเร็จ");
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      onClose();
      setTerm("");
      setResults([]);
      setSearched(false);
      setError(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            ค้นหาทั้งหมดในระบบ (ไม่จำกัดล่าสุด 1,500 คน)
          </DialogTitle>
          <DialogDescription>
            ใช้เมื่อหาไม่เจอในรายการปกติ — ครอบคลุมข้อมูลทั้งหมดใน Firebase (100k+ คน) โดยค้นหาด้วย
            <span className="font-medium"> เลขบัตรประชาชนแบบตรงทั้งเลข</span> หรือ
            <span className="font-medium"> ชื่อ/นามสกุลแบบขึ้นต้นด้วยคำที่พิมพ์</span> เท่านั้น (ไม่รองรับค้นหาคำกลางชื่อ)
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2">
          <Input
            autoFocus
            placeholder="พิมพ์เลขบัตรประชาชน หรือ ชื่อ/นามสกุล (ขึ้นต้น)..."
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") runSearch();
            }}
          />
          <Button type="button" onClick={runSearch} disabled={!term.trim() || loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            ค้นหา
          </Button>
        </div>
        {term.trim() && (
          <p className="text-xs text-muted-foreground">
            {isIdMode ? "โหมด: ค้นหาด้วยเลขบัตรประชาชน (ตรงทั้งเลข)" : "โหมด: ค้นหาด้วยชื่อ/นามสกุล (ขึ้นต้นด้วย)"}
          </p>
        )}

        <div className="max-h-[50vh] space-y-2 overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-primary mb-2" />
              <p className="text-sm text-muted-foreground">กำลังค้นหา...</p>
            </div>
          ) : error ? (
            <p className="py-6 text-center text-sm text-red-600">{error}</p>
          ) : searched && results.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">ไม่พบข้อมูลที่ตรงกับคำค้นหา</p>
          ) : (
            results.map((user) => {
              const province = extractProvince(user.liveAddress);
              return (
                <div
                  key={`${user.source}:${user.userDocId}`}
                  className="flex items-center justify-between gap-3 rounded-lg border p-3"
                >
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    onClick={() => {
                      onSelectUser(user);
                      handleOpenChange(false);
                    }}
                  >
                    <div className="flex items-center gap-2 font-sarabun font-medium">
                      {user.firstName || "-"} {user.lastName || ""}
                      <Badge variant={user.source === "temps" ? "secondary" : "outline"} className="font-normal">
                        {user.source === "temps" ? "Staff" : "Users"}
                      </Badge>
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                      <span className="font-mono">{user.thaiId || "ไม่มีเลขบัตร"}</span>
                      {typeof user.age === "number" && <span>อายุ {user.age} ปี</span>}
                      {province && <span>{province}</span>}
                      <span className="truncate" title={user.userDocId}>
                        ID: {user.userDocId}
                      </span>
                    </div>
                  </button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="shrink-0 gap-1"
                    disabled={!user.thaiId}
                    title={!user.thaiId ? "ต้องมีเลขบัตรประชาชนก่อน" : "เพิ่ม/แก้ไขข้อมูล QA"}
                    onClick={() => onQaClick(user)}
                  >
                    <ClipboardCheck className="h-4 w-4" />QA
                  </Button>
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
