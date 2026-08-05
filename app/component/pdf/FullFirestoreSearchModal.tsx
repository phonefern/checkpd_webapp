"use client";

import { useState } from "react";
import { collection, getDocs, limit as fsLimit, orderBy, query, where } from "firebase/firestore";
import { db } from "@/lib/firebaseClient";
import { supabase } from "@/lib/supabase";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ClipboardCheck, Loader2, Search, ScanSearch } from "lucide-react";
import { UserRow, extractProvince, toTsLike } from "@/app/pages/pdf/types";
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
const SUPABASE_DEEP_SEARCH_LIMIT = 50;

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

// Mirrors page.tsx's mapSupabaseRow exactly (same public.users columns / same
// numeric-id-=>temps heuristic) so a result picked here behaves identically
// to one picked from the normal list.
function mapSupabaseRow(r: any): UserRow {
  return {
    userDocId: String(r.id),
    firstName: r.firstname ?? undefined,
    lastName: r.lastname ?? undefined,
    gender: r.gender ?? undefined,
    thaiId: r.thaiid ?? undefined,
    age: typeof r.age === "number" ? r.age : r.age != null ? Number(r.age) || null : null,
    idCardAddress: r.idcardaddress ?? undefined,
    liveAddress: r.liveaddress ?? undefined,
    timestamp: toTsLike(r.timestamp),
    lastUpdate: toTsLike(r.lastupdate),
    source: /^[0-9]+$/.test(String(r.id)) ? "temps" : "users",
  };
}

// Builds the printed-card dash format (1-2345-67890-12-3) from a clean
// 13-digit Thai ID, so a search for a full ID also catches records saved
// with that formatting (checkpd.users.thai_id had the same drift — see
// supabase/migrations/20260805_thai_id_card_normalized_matching.sql).
function toDashedThaiId(digits: string): string | null {
  if (!/^[0-9]{13}$/.test(digits)) return null;
  return `${digits[0]}-${digits.slice(1, 5)}-${digits.slice(5, 10)}-${digits.slice(10, 12)}-${digits[12]}`;
}

// Firestore has no substring search, but exact-match and prefix ("starts
// with", via the PUA-range trick below) queries are both single-field
// range/equality queries — automatically indexed, so they stay fast
// regardless of how many documents (100k+) the collection holds. This is
// the "fast" search: it reads straight from Firebase, so it's the one that
// finds someone who registered minutes ago and hasn't synced to Supabase yet.
async function searchId(rawTerm: string): Promise<UserRow[]> {
  const digits = rawTerm.replace(/\D/g, "");
  if (!digits) return [];
  const dashed = toDashedThaiId(digits);
  const PUA_HIGH = String.fromCharCode(0xf8ff);

  const tasks = COLLECTIONS.flatMap((col) =>
    ID_FIELDS.flatMap((field) => {
      const exactTerms = [digits, dashed].filter((v): v is string => Boolean(v));
      const exactQueries = exactTerms.map(async (value) => {
        try {
          const snap = await getDocs(
            query(collection(db, col), where(field, "==", value), fsLimit(RESULT_LIMIT_PER_QUERY))
          );
          return snap.docs.map((d) => mapFirebaseDoc(d, col));
        } catch (err) {
          console.error(`[FullFirestoreSearchModal] id exact query failed (${col}.${field})`, err);
          return [] as UserRow[];
        }
      });

      // Partial ID (staff remembers/typed only some digits): prefix match,
      // same trick as name search. Skipped once the ID is fully typed —
      // the exact-match queries above already cover that case.
      const prefixQuery =
        digits.length >= 4 && digits.length < 13
          ? (async () => {
              try {
                const snap = await getDocs(
                  query(
                    collection(db, col),
                    orderBy(field),
                    where(field, ">=", digits),
                    where(field, "<", digits + PUA_HIGH),
                    fsLimit(RESULT_LIMIT_PER_QUERY)
                  )
                );
                return snap.docs.map((d) => mapFirebaseDoc(d, col));
              } catch (err) {
                console.error(`[FullFirestoreSearchModal] id prefix query failed (${col}.${field})`, err);
                return [] as UserRow[];
              }
            })()
          : Promise.resolve([] as UserRow[]);

      return [...exactQueries, prefixQuery];
    })
  );
  return (await Promise.all(tasks)).flat();
}

async function searchNamePrefix(term: string): Promise<UserRow[]> {
  const PUA_HIGH = String.fromCharCode(0xf8ff);
  const end = term + PUA_HIGH;
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

// "Deep search": real substring ("contains") matching on firstname/lastname/
// thaiid — something Firestore can't do server-side at all. Reuses the same
// public.users ilike search page.tsx's Lane 2 already relies on, so it's one
// fast Postgres query instead of paging through 100k+ Firestore documents.
// Trade-off: public.users is a once-daily cron mirror, so a person who
// registered in the last day may not show up here yet — that gap is exactly
// what the Firestore-backed search above still covers.
async function searchSupabaseSubstring(term: string): Promise<UserRow[]> {
  const like = `%${term}%`;
  const { data, error } = await supabase
    .from("users")
    .select("id,firstname,lastname,gender,thaiid,age,idcardaddress,liveaddress,timestamp,lastupdate,source,province")
    .or(`firstname.ilike.${like},lastname.ilike.${like},thaiid.ilike.${like}`)
    .order("timestamp", { ascending: false, nullsFirst: false })
    .limit(SUPABASE_DEEP_SEARCH_LIMIT);

  if (error) throw error;
  return (data ?? []).map(mapSupabaseRow);
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
  const [deepLoading, setDeepLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<UserRow[]>([]);

  const isIdMode = /^[0-9]+$/.test(term.replace(/[\s-]/g, ""));

  const runSearch = async () => {
    const trimmed = term.trim();
    if (!trimmed) return;
    setLoading(true);
    setError(null);
    setSearched(true);
    try {
      const rows = isIdMode ? await searchId(trimmed) : await searchNamePrefix(trimmed);
      setResults(dedupe(rows));
    } catch (err: any) {
      setError(err?.message || "ค้นหาไม่สำเร็จ");
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const runDeepSearch = async () => {
    const trimmed = term.trim();
    if (!trimmed) return;
    setDeepLoading(true);
    setError(null);
    setSearched(true);
    try {
      const rows = await searchSupabaseSubstring(trimmed);
      setResults((prev) => dedupe([...prev, ...rows]));
    } catch (err: any) {
      setError(err?.message || "ค้นหาแบบเจาะลึกไม่สำเร็จ");
    } finally {
      setDeepLoading(false);
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

  const busy = loading || deepLoading;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            ค้นหาทั้งหมดในระบบ (ไม่จำกัดล่าสุด 1,500 คน)
          </DialogTitle>
          <DialogDescription>
            <span className="font-medium">ค้นหา</span> อ่านสดจาก Firebase — เจอคนที่เพิ่งลงทะเบียนแม้ยังไม่ sync ไป
            Supabase แต่ต้องพิมพ์เลขบัตร (ตรง/บางส่วน/มีขีดก็ได้) หรือชื่อขึ้นต้นให้ตรง.{" "}
            <span className="font-medium">ค้นหาแบบเจาะลึก</span> ค้นจาก Supabase คำกลางชื่อ/เลขบัตรได้ (เผื่อชื่อที่ลงทะเบียนไม่ตรงกับชื่อจริง)
            แต่เป็นข้อมูล sync รายวัน คนที่เพิ่งลงทะเบียนอาจยังไม่ขึ้น
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap gap-2">
          <Input
            autoFocus
            placeholder="พิมพ์เลขบัตรประชาชน หรือ ชื่อ/นามสกุล..."
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") runSearch();
            }}
            className="min-w-48 flex-1"
          />
          <Button type="button" onClick={runSearch} disabled={!term.trim() || busy}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            ค้นหา
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={runDeepSearch}
            disabled={!term.trim() || busy}
            title="ค้นคำกลางชื่อ/เลขบัตรจาก Supabase (ข้อมูล sync รายวัน)"
          >
            {deepLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanSearch className="h-4 w-4" />}
            ค้นหาแบบเจาะลึก
          </Button>
        </div>
        {term.trim() && !busy && (
          <p className="text-xs text-muted-foreground">
            {isIdMode
              ? "ค้นหา (Firebase): เลขบัตรประชาชน ตรงทั้งเลข/บางส่วน/มีขีด — หรือกด \"เจาะลึก\" เพื่อค้นจาก Supabase"
              : "ค้นหา (Firebase): ชื่อ/นามสกุลขึ้นต้นด้วยคำที่พิมพ์ — หรือกด \"เจาะลึก\" เพื่อค้นคำกลางชื่อจาก Supabase"}
          </p>
        )}

        <div className="max-h-[50vh] space-y-2 overflow-y-auto">
          {busy ? (
            <div className="flex flex-col items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-primary mb-2" />
              <p className="text-sm text-muted-foreground">{deepLoading ? "กำลังค้นหาแบบเจาะลึก..." : "กำลังค้นหา..."}</p>
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
