"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebaseClient";
import { supabase } from "@/lib/supabase";
import { UserList } from "@/app/component/pdf/UserList";
import { RecordsPanel } from "@/app/component/pdf/RecordsPanel";
import { ExportSection } from "@/app/component/pdf/ExportSection";
import { PaginationControls } from "@/app/component/pdf/PaginationControls";
import { UserRow, RecordRow, extractProvince } from "./types";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import QaCreateModal from "@/app/component/qa/QaCreateModal";
import type { QaCreatedIdentity } from "@/app/component/qa/QaCreateModal";
import { QaPatient, QaDiagnosisRow } from "@/app/component/qa/types";
import SidebarLayout from "@/app/component/layout/SidebarLayout";

const ITEMS_PER_PAGE = 50;

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
  const [loadingSingle, setLoadingSingle] = useState(false);
  const [loadingBatch, setLoadingBatch] = useState(false);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
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

  // ===== Firebase Listeners =====
  useEffect(() => {
    const usersQuery = query(
      collection(db, "users"),
      orderBy("timestamp", "desc")
    );

    const tempsQuery = query(
      collection(db, "temps"),
      orderBy("timestamp", "desc")
    );

    let usersData: UserRow[] = [];
    let tempsData: UserRow[] = [];

    const mergeAndSet = () => {
      const merged = [...usersData, ...tempsData].sort((a, b) => {
        const ta = a.timestamp?.toMillis?.() || 0;
        const tb = b.timestamp?.toMillis?.() || 0;
        return tb - ta;
      });

      setUsers(merged);
      setLoading(false);
    };

    const unsubUsers = onSnapshot(usersQuery, (snap) => {
      usersData = [];
      snap.forEach((doc) => {
        const d = doc.data();
        usersData.push({
          userDocId: doc.id,
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
          source: "users",
        });
      });
      mergeAndSet();
    });

    const unsubTemps = onSnapshot(tempsQuery, (snap) => {
      tempsData = [];
      snap.forEach((doc) => {
        const d = doc.data();
        tempsData.push({
          userDocId: doc.id,
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
          source: "temps",
        });
      });
      mergeAndSet();
    });

    return () => {
      unsubUsers();
      unsubTemps();
    };
  }, []);

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

  // ===== Filtering and Pagination =====
  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase().trim();
    if (q && !(
      u.firstName?.toLowerCase().includes(q) ||
      u.lastName?.toLowerCase().includes(q) ||
      u.thaiId?.toLowerCase().includes(q)
    )) return false;

    if (provinceFilter) {
      const p = extractProvince(u.liveAddress);
      if (p !== provinceFilter) return false;
    }

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

  const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, filteredUsers.length);
  const currentUsers = filteredUsers.slice(startIndex, endIndex);

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
            users={users}
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
              totalItems: filteredUsers.length,
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
                totalItems={filteredUsers.length}
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

