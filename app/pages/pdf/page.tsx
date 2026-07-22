"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { collection, limit, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebaseClient";
import { supabase } from "@/lib/supabase";
import { UserList } from "@/app/component/pdf/UserList";
import { RecordsPanel } from "@/app/component/pdf/RecordsPanel";
import { ExportSection } from "@/app/component/pdf/ExportSection";
import { PaginationControls } from "@/app/component/pdf/PaginationControls";
import { UserRow, RecordRow, extractProvince, toTsLike } from "./types";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import QaCreateModal from "@/app/component/qa/QaCreateModal";
import type { QaCreatedIdentity } from "@/app/component/qa/QaCreateModal";
import { QaPatient, QaDiagnosisRow } from "@/app/component/qa/types";
import SidebarLayout from "@/app/component/layout/SidebarLayout";

// How many rows to show per page in the table (kept small so the DOM stays light).
const ITEMS_PER_PAGE = 50;
// How many of the latest patients to stream from Firebase into memory. This set
// powers both the realtime browse list AND the in-memory "lane 1" search, so it
// must be big enough to hold a full event day's registrations (~1000). Still only
// ~1.5% of the ~100k collection, so it loads fast.
const BROWSE_LIMIT = 1500;

// Firestore Timestamp -> local "yyyy-MM-dd" for the date input (avoids UTC off-by-one)
const toDateInputValue = (ts?: { toDate?: () => Date }): string => {
  const d = ts?.toDate?.();
  if (!d || Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export default function ExportTestPage() {
  // ===== State Management =====
  const [userDocId, setUserDocId] = useState("");
  const [recordId, setRecordId] = useState("");
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  // Debounced copy of searchQuery so we hit Supabase once the user pauses
  // typing, not on every keystroke (ilike over ~100k rows is not free).
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loadingSingle, setLoadingSingle] = useState(false);
  const [loadingBatch, setLoadingBatch] = useState(false);
  // Lane 1 source: the latest BROWSE_LIMIT patients, streamed realtime from
  // Firebase and kept in memory. Powers both browse and the in-memory search.
  const [firebaseUsers, setFirebaseUsers] = useState<UserRow[]>([]);
  const [firebaseLoading, setFirebaseLoading] = useState(true);
  // Lane 2 source: one page of Supabase results for the current search (covers
  // older, already-synced patients across the whole ~100k mirror).
  const [supabaseUsers, setSupabaseUsers] = useState<UserRow[]>([]);
  const [supabaseCount, setSupabaseCount] = useState(0);
  const [supabaseLoading, setSupabaseLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);
  const [mobileRecordsOpen, setMobileRecordsOpen] = useState(false);
  const [records, setRecords] = useState<RecordRow[]>([]);
  const [provinceFilter, setProvinceFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [qaIdentityByUser, setQaIdentityByUser] = useState<Record<string, QaCreatedIdentity>>({});

  const calculateAgeFromBod = (bod: any): number | null => {
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
  };

  // Map a Firestore users/temps doc into the shared UserRow shape.
  const mapFirebaseDoc = (
    docSnap: { id: string; data: () => any },
    source: "users" | "temps"
  ): UserRow => {
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
  };

  // Map a Supabase public.users row into the shared UserRow shape. `source` is
  // derived from the id format to match the PDF API route exactly (numeric id
  // => temps, otherwise users), so records/PDF resolve the same Firestore
  // collection no matter what the stored `source` column happens to say.
  const mapSupabaseRow = (r: any): UserRow => ({
    userDocId: String(r.id),
    firstName: r.firstname ?? undefined,
    lastName: r.lastname ?? undefined,
    gender: r.gender ?? undefined,
    thaiId: r.thaiid ?? undefined,
    age:
      typeof r.age === "number"
        ? r.age
        : r.age != null
          ? Number(r.age) || null
          : null,
    idCardAddress: r.idcardaddress ?? undefined,
    liveAddress: r.liveaddress ?? undefined,
    timestamp: toTsLike(r.timestamp),
    lastUpdate: toTsLike(r.lastupdate),
    source: /^[0-9]+$/.test(String(r.id)) ? "temps" : "users",
  });

  // Debounce the search box so we query Supabase once the user pauses typing.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // ===== Lane 1 source: latest BROWSE_LIMIT patients, realtime from Firebase =====
  // Subscribed once and kept alive for the whole page. Brand-new registrations
  // (incl. a live event's) appear here instantly — this is what makes same-day
  // search work without waiting for the daily Supabase sync.
  useEffect(() => {
    setFirebaseLoading(true);
    const usersQuery = query(
      collection(db, "users"),
      orderBy("timestamp", "desc"),
      limit(BROWSE_LIMIT)
    );
    const tempsQuery = query(
      collection(db, "temps"),
      orderBy("timestamp", "desc"),
      limit(BROWSE_LIMIT)
    );

    let usersData: UserRow[] = [];
    let tempsData: UserRow[] = [];

    const mergeAndSet = () => {
      const merged = [...usersData, ...tempsData]
        .sort((a, b) => (b.timestamp?.toMillis?.() || 0) - (a.timestamp?.toMillis?.() || 0))
        .slice(0, BROWSE_LIMIT);
      setFirebaseUsers(merged);
      setFirebaseLoading(false);
    };

    const unsubUsers = onSnapshot(usersQuery, (snap) => {
      usersData = snap.docs.map((d) => mapFirebaseDoc(d, "users"));
      mergeAndSet();
    });
    const unsubTemps = onSnapshot(tempsQuery, (snap) => {
      tempsData = snap.docs.map((d) => mapFirebaseDoc(d, "temps"));
      mergeAndSet();
    });

    return () => {
      unsubUsers();
      unsubTemps();
    };
  }, []);

  // ===== Lane 2 source: Supabase search over the whole ~100k mirror =====
  // Only runs while a filter is active. Covers older, already-synced patients
  // that fell outside the in-memory BROWSE_LIMIT window. Paginated server-side.
  useEffect(() => {
    const searchActive = !!(debouncedSearch || provinceFilter || dateFrom || dateTo);
    if (!searchActive) {
      setSupabaseUsers([]);
      setSupabaseCount(0);
      setSupabaseLoading(false);
      return;
    }

    let cancelled = false;
    setSupabaseLoading(true);
    const from = (currentPage - 1) * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;

    (async () => {
      let q = supabase
        .from("users")
        .select(
          "id,firstname,lastname,gender,thaiid,age,idcardaddress,liveaddress,timestamp,lastupdate,source,province",
          { count: "exact" }
        )
        .order("timestamp", { ascending: false, nullsFirst: false })
        .order("id", { ascending: true })
        .range(from, to);

      if (debouncedSearch) {
        const like = `%${debouncedSearch}%`;
        q = q.or(`firstname.ilike.${like},lastname.ilike.${like},thaiid.ilike.${like}`);
      }
      if (provinceFilter) q = q.eq("province", provinceFilter);
      if (dateFrom) q = q.gte("timestamp", dateFrom);
      if (dateTo) {
        const end = new Date(dateTo);
        end.setDate(end.getDate() + 1);
        q = q.lt("timestamp", end.toISOString());
      }

      const { data, error, count } = await q;
      if (cancelled) return;
      if (error) {
        console.error("PDF user search failed:", error);
        setSupabaseUsers([]);
        setSupabaseCount(0);
      } else {
        setSupabaseUsers((data ?? []).map(mapSupabaseRow));
        setSupabaseCount(count ?? 0);
      }
      setSupabaseLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, provinceFilter, dateFrom, dateTo, currentPage]);

  useEffect(() => {
    if (!selectedUser?.userDocId) {
      setRecords([]);
      return;
    }

    const q = query(
      collection(
        db,
        selectedUser.source === "temps" ? "temps" : "users",
        selectedUser.userDocId,
        "records"
      ),
      orderBy("lastUpdate", "desc")
    );

    const unsub = onSnapshot(q, (snap) => {
      const rows: RecordRow[] = [];

      snap.forEach((docSnap) => {
        const d = docSnap.data();

        rows.push({
          recordId: docSnap.id,
          timestamp: d.lastUpdate,
          risk:
            typeof d.prediction?.risk === "boolean"
              ? d.prediction.risk
              : null,
        });
      });

      setRecords(rows);
    });

    return () => unsub();
  }, [selectedUser]);

  // Auto-resolve QA registration by thaiid when a user is selected, so the
  // "ยังไม่ได้ลงทะเบียน QA" warning only shows for patients that truly aren't in
  // core.patients_v2 yet (and print can reuse the existing id/uid).
  useEffect(() => {
    const thaiid = (selectedUser?.thaiId || "").trim();
    if (!selectedUser || !thaiid) return;
    if (qaIdentityByUser[selectedUser.userDocId]?.id) return;

    const userDocId = selectedUser.userDocId;
    let cancelled = false;

    (async () => {
      const { data, error } = await supabase
        .schema("core")
        .from("patients_v2")
        .select("id,patient_uid")
        .eq("thaiid", thaiid)
        .order("collection_date", { ascending: false, nullsFirst: false })
        .order("id", { ascending: false })
        .limit(1);

      if (cancelled || error || !data || data.length === 0) return;
      const row = data[0] as { id: number; patient_uid: string | null };
      setQaIdentityByUser((prev) => ({
        ...prev,
        [userDocId]: { id: row.id, patient_uid: row.patient_uid ?? null },
      }));
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedUser, qaIdentityByUser]);

  useEffect(() => {
    const desktopQuery = window.matchMedia("(min-width: 1024px)");
    const closeMobileDialogOnDesktop = (event: MediaQueryListEvent) => {
      if (event.matches) setMobileRecordsOpen(false);
    };

    desktopQuery.addEventListener("change", closeMobileDialogOnDesktop);
    return () => desktopQuery.removeEventListener("change", closeMobileDialogOnDesktop);
  }, []);

  // ===== Compose the two lanes into the visible page =====
  const searchActive = !!(debouncedSearch || provinceFilter || dateFrom || dateTo);

  // Lane 1: filter the in-memory realtime set (substring name/thaiid + province
  // + date). Surfaces recent / live-event patients that Supabase may not have
  // synced yet, so they are findable the same day.
  const lane1Matches = useMemo(() => {
    if (!searchActive) return [] as UserRow[];
    const q = debouncedSearch.toLowerCase();
    return firebaseUsers.filter((u) => {
      if (q) {
        const hit =
          u.firstName?.toLowerCase().includes(q) ||
          u.lastName?.toLowerCase().includes(q) ||
          u.thaiId?.toLowerCase().includes(q);
        if (!hit) return false;
      }
      if (provinceFilter && extractProvince(u.liveAddress) !== provinceFilter) return false;
      if (dateFrom || dateTo) {
        const ts = u.timestamp?.toDate?.();
        if (!ts) return false;
        if (dateFrom && ts < new Date(dateFrom)) return false;
        if (dateTo) {
          const end = new Date(dateTo);
          end.setHours(23, 59, 59, 999);
          if (ts > end) return false;
        }
      }
      return true;
    });
  }, [searchActive, firebaseUsers, debouncedSearch, provinceFilter, dateFrom, dateTo]);

  const lane1Ids = useMemo(
    () => new Set(lane1Matches.map((u) => u.userDocId)),
    [lane1Matches]
  );

  let currentUsers: UserRow[];
  let totalItems: number;
  let loading: boolean;

  if (!searchActive) {
    // Browse: paginate the in-memory realtime set, ITEMS_PER_PAGE per page.
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    currentUsers = firebaseUsers.slice(start, start + ITEMS_PER_PAGE);
    totalItems = firebaseUsers.length;
    loading = firebaseLoading;
  } else {
    // Search: fresh in-memory hits (lane 1, capped so page 1 stays light) shown
    // on top of page 1, then Supabase (lane 2) with lane-1 ids removed so nobody
    // appears twice. Later pages are Supabase-only.
    const lane1Top = lane1Matches.slice(0, ITEMS_PER_PAGE);
    const lane2 = supabaseUsers.filter((u) => !lane1Ids.has(u.userDocId));
    currentUsers = currentPage === 1 ? [...lane1Top, ...lane2] : lane2;
    totalItems = supabaseCount + lane1Matches.length;
    // Show fresh hits immediately; only spin if there is nothing to show yet.
    loading = supabaseLoading && lane1Matches.length === 0;
  }

  const totalPages = Math.max(
    1,
    Math.ceil((searchActive ? supabaseCount : firebaseUsers.length) / ITEMS_PER_PAGE)
  );
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + currentUsers.length;

  // ===== Event Handlers =====
  const handleExportSingle = async () => {
    if (!userDocId || !recordId) {
      alert("กรุณากรอก userDocId และ recordId");
      return;
    }

    setLoadingSingle(true);
    try {
      const params = new URLSearchParams({ record_id: recordId });
      const qaIdentity = selectedUser ? qaIdentityByUser[selectedUser.userDocId] : undefined;
      if (qaIdentity?.id) params.set("qa_id", String(qaIdentity.id));
      if (qaIdentity?.patient_uid) params.set("qa_uid", qaIdentity.patient_uid);

      const url = `/api/pdf-v2/${userDocId}?${params.toString()}`;
      window.open(url, "_blank");
    } catch (err: any) {
      alert(err.message || "เกิดข้อผิดพลาด");
    } finally {
      setLoadingSingle(false);
    }
  };

  const handleExportBatch = async () => {
    if (!csvFile) {
      alert("กรุณาเลือกไฟล์ CSV");
      return;
    }

    setLoadingBatch(true);

    try {
      const form = new FormData();
      form.append("file", csvFile);

      const res = await fetch("/api/pdf-v2/batch", {
        method: "POST",
        body: form,
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Batch export failed");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = "pdf_reports.zip";
      document.body.appendChild(a);
      a.click();
      a.remove();

      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.message || "เกิดข้อผิดพลาด");
    } finally {
      setLoadingBatch(false);
    }
  };

  const handleUserSelect = (user: UserRow) => {
    setSelectedUser(user);
    setUserDocId(user.userDocId);
    setRecordId("");
    if (window.matchMedia("(max-width: 1023px)").matches) {
      setMobileRecordsOpen(true);
    }
  };

  // ===== QA Modal =====
  const [qaOpen, setQaOpen] = useState(false);
  const [qaEditPatient, setQaEditPatient] = useState<QaPatient | null>(null);
  const [qaEditDiag, setQaEditDiag] = useState<QaDiagnosisRow | null>(null);
  const [qaPrefill, setQaPrefill] = useState<{ first_name: string; last_name: string; thaiid: string; age: string; province: string; collection_date: string } | undefined>(undefined);
  const [qaTargetUserId, setQaTargetUserId] = useState<string | null>(null);

  const handleQaClick = async (user: UserRow) => {
    const thaiid = (user.thaiId || "").trim();
    setQaTargetUserId(user.userDocId);

    // Check if patient already exists in core.patients_v2
    const { data: existing } = await supabase
      .schema("core")
      .from("patients_v2")
      .select("id,patient_uid,first_name,last_name,thaiid,hn_number,age,province,collection_date,bmi,weight,height,chest_cm,waist_cm,hip_cm,neck_cm,bp_supine,pr_supine,bp_upright,pr_upright")
      .eq("thaiid", thaiid)
      .maybeSingle();

    if (existing) {
      setQaIdentityByUser((prev) => ({
        ...prev,
        [user.userDocId]: {
          id: (existing as QaPatient).id,
          patient_uid: (existing as QaPatient).patient_uid ?? null,
        },
      }));

      const { data: diag } = await supabase
        .schema("core")
        .from("patient_diagnosis_v2")
        .select("*")
        .eq("patient_id", (existing as QaPatient).id)
        .maybeSingle();
      setQaEditPatient(existing as QaPatient);
      setQaEditDiag(diag as QaDiagnosisRow | null);
      setQaPrefill(undefined);
    } else {
      const province = extractProvince(user.liveAddress) || extractProvince(user.idCardAddress) || "";
      const collection_date = toDateInputValue(user.timestamp) || toDateInputValue(user.lastUpdate);
      setQaEditPatient(null);
      setQaEditDiag(null);
      setQaPrefill({
        first_name: user.firstName ?? "",
        last_name: user.lastName ?? "",
        thaiid,
        age: user.age != null ? String(user.age) : "",
        province,
        collection_date,
      });
    }
    setQaOpen(true);
  };

  // ===== Render =====
  return (
    <SidebarLayout activePath="/pages/pdf">
    <div className="relative min-h-screen overflow-hidden">
      {/* Background Image */}
      <Image
        src="/background/checkpd_qr_5.png"
        alt="CheckPD background"
        fill
        priority
        className="object-cover"
      />

      {/* Overlay */}
      <div className="absolute inset-0 bg-background/50" />

      {/* Content */}
      <div
        className="relative min-h-screen p-4 md:p-6 space-y-6"
        style={{
          background:
            'radial-gradient(circle at center, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.9) 40%, rgba(240,244,255,0.85) 100%)',
        }}
      >
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* QA Modal */}
          <QaCreateModal
            open={qaOpen}
            onClose={() => {
              setQaOpen(false);
              setQaTargetUserId(null);
            }}
            onCreated={(created) => {
              if (qaTargetUserId) {
                setQaIdentityByUser((prev) => ({
                  ...prev,
                  [qaTargetUserId]: created,
                }));
              }
              setQaOpen(false);
              setQaTargetUserId(null);
            }}
            editPatient={qaEditPatient}
            editDiag={qaEditDiag}
            prefillData={qaPrefill}
          />

          {/* Left: Users List */}
          <UserList
            users={firebaseUsers}
            loading={loading}
            searchQuery={searchQuery}
            selectedUserId={selectedUser?.userDocId || ""}
            className={selectedUser ? "lg:col-span-8" : "lg:col-span-12"}
            provinceFilter={provinceFilter}
            dateFrom={dateFrom}
            dateTo={dateTo}
            onSearchChange={(query) => { setSearchQuery(query); setCurrentPage(1); }}
            onProvinceChange={(v) => { setProvinceFilter(v); setCurrentPage(1); }}
            onDateFromChange={(v) => { setDateFrom(v); setCurrentPage(1); }}
            onDateToChange={(v) => { setDateTo(v); setCurrentPage(1); }}
            onUserSelect={handleUserSelect}
            onQaClick={handleQaClick}
            qaIdentityByUser={qaIdentityByUser}
            currentUsers={currentUsers}
            paginationInfo={{
              currentPage,
              totalPages,
              startIndex,
              endIndex,
              totalItems,
            }}
          />

          {/* Right: Records Panel */}
          <div className="hidden empty:hidden lg:col-span-4 lg:block">
            <RecordsPanel
              selectedUser={selectedUser}
              records={records}
              selectedRecordId={recordId}
              loading={false}
              onClose={() => {
                setSelectedUser(null);
                setRecordId("");
              }}
              onRecordSelect={setRecordId}
              onExport={handleExportSingle}
              isExporting={loadingSingle}
              qaIdentity={selectedUser ? qaIdentityByUser[selectedUser.userDocId] : undefined}
              onQaRegister={() => selectedUser && handleQaClick(selectedUser)}
            />
          </div>
        </div>

        <Dialog open={mobileRecordsOpen} onOpenChange={setMobileRecordsOpen}>
          <DialogContent
            showCloseButton={false}
            className="left-0 top-0 block h-[100dvh] w-screen max-w-none translate-x-0 translate-y-0 overflow-hidden rounded-none border-0 p-0 sm:max-w-none lg:hidden"
          >
            <DialogTitle className="sr-only">รายการตรวจและเปิดรายงาน PDF</DialogTitle>
            <DialogDescription className="sr-only">
              เลือกรายการตรวจ ลงทะเบียน QA และเปิดรายงาน PDF ของผู้ใช้ที่เลือก
            </DialogDescription>
            <RecordsPanel
              variant="dialog"
              selectedUser={selectedUser}
              records={records}
              selectedRecordId={recordId}
              loading={false}
              onClose={() => setMobileRecordsOpen(false)}
              onRecordSelect={setRecordId}
              onExport={handleExportSingle}
              isExporting={loadingSingle}
              qaIdentity={selectedUser ? qaIdentityByUser[selectedUser.userDocId] : undefined}
              onQaRegister={() => selectedUser && handleQaClick(selectedUser)}
            />
          </DialogContent>
        </Dialog>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <Card>
            <CardContent className="pt-6">
              <PaginationControls
                currentPage={currentPage}
                totalPages={totalPages}
                startIndex={startIndex}
                endIndex={endIndex}
                totalItems={totalItems}
                onPageChange={setCurrentPage}
              />
            </CardContent>
          </Card>
        )}

        {/* Export Section */}
        <div className="hidden lg:block">
          <ExportSection
            userDocId={userDocId}
            recordId={recordId}
            csvFile={csvFile}
            loadingSingle={loadingSingle}
            loadingBatch={loadingBatch}
            onUserDocIdChange={setUserDocId}
            onRecordIdChange={setRecordId}
            onCsvFileChange={setCsvFile}
            onSingleExport={handleExportSingle}
            onBatchExport={handleExportBatch}
          />
        </div>
      </div>
    </div>
    </SidebarLayout>
  );
}

