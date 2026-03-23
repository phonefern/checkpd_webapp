"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Image from "next/image";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebaseClient";
import { supabase } from "@/lib/supabase";
import { UserList } from "@/app/component/pdf/UserList";
import { RecordsPanel } from "@/app/component/pdf/RecordsPanel";
import { ExportSection } from "@/app/component/pdf/ExportSection";
import { PaginationControls } from "@/app/component/pdf/PaginationControls";
import { UserRow, RecordRow } from "./types";
import { Card, CardContent } from "@/components/ui/card";
import QaCreateModal from "@/app/component/qa/QaCreateModal";
import { QaPatient, QaDiagnosisRow } from "@/app/component/qa/types";

const ITEMS_PER_PAGE = 50;

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
  const [records, setRecords] = useState<RecordRow[]>([]);
  const [screeningThaiIds, setScreeningThaiIds] = useState<string[]>([]);
  const [screeningCheckedThaiIds, setScreeningCheckedThaiIds] = useState<string[]>([]);
  const [screeningLoading, setScreeningLoading] = useState(false);
  const [screeningError, setScreeningError] = useState<string | null>(null);
  const screeningCacheRef = useRef<Map<string, boolean>>(new Map());
  const screeningDebounceRef = useRef<number | null>(null);

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

  // ===== Filtering and Pagination =====
  const filteredUsers = users.filter((u) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;

    return (
      (u.firstName?.toLowerCase().includes(query)) ||
      (u.lastName?.toLowerCase().includes(query)) ||
      (u.thaiId?.toLowerCase().includes(query))
    );
  });

  const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, filteredUsers.length);
  const currentUsers = filteredUsers.slice(startIndex, endIndex);

  // ===== Screening status (Supabase: pd_screenings) =====
  const currentThaiIds = useMemo(() => {
    return Array.from(
      new Set(
        currentUsers
          .map((u) => (u.thaiId || "").trim())
          .filter((id) => id.length > 0)
      )
    );
  }, [currentUsers]);

  const currentThaiIdsKey = useMemo(() => {
    const sorted = [...currentThaiIds].sort();
    return sorted.join("|");
  }, [currentThaiIds]);

  useEffect(() => {
    let cancelled = false;

    const hydrateFromCache = () => {
      const screened: string[] = [];
      const checked: string[] = [];
      for (const id of currentThaiIds) {
        if (screeningCacheRef.current.has(id)) {
          checked.push(id);
          if (screeningCacheRef.current.get(id) === true) screened.push(id);
        }
      }
      setScreeningThaiIds(screened);
      setScreeningCheckedThaiIds(checked);
    };

    const load = async () => {
      setScreeningError(null);

      if (currentThaiIds.length === 0) {
        setScreeningThaiIds([]);
        setScreeningCheckedThaiIds([]);
        setScreeningLoading(false);
        return;
      }

      // 1) Update UI immediately from cache (no network).
      hydrateFromCache();

      // 2) Only query for ids we haven't checked yet.
      const unknown = currentThaiIds.filter((id) => !screeningCacheRef.current.has(id));
      if (unknown.length === 0) {
        setScreeningLoading(false);
        return;
      }

      setScreeningLoading(true);
      try {
        const { data, error } = await supabase
          .from("pd_screenings")
          .select("thaiid")
          .in("thaiid", unknown);

        if (error) throw error;
        const found = new Set((data ?? []).map((row: any) => row?.thaiid).filter(Boolean));

        for (const id of unknown) {
          screeningCacheRef.current.set(id, found.has(id));
        }

        if (!cancelled) hydrateFromCache();
      } catch (err: any) {
        if (!cancelled) {
          setScreeningError(err?.message || "โหลดสถานะ screening ไม่สำเร็จ");
        }
      } finally {
        if (!cancelled) setScreeningLoading(false);
      }
    };

    // Debounce because Firebase onSnapshot can trigger frequent renders.
    if (screeningDebounceRef.current) {
      window.clearTimeout(screeningDebounceRef.current);
    }
    screeningDebounceRef.current = window.setTimeout(() => {
      load();
    }, 350);

    return () => {
      cancelled = true;
      if (screeningDebounceRef.current) {
        window.clearTimeout(screeningDebounceRef.current);
        screeningDebounceRef.current = null;
      }
    };
  }, [currentThaiIdsKey]);

  // ===== Event Handlers =====
  const handleExportSingle = async () => {
    if (!userDocId || !recordId) {
      alert("กรุณากรอก userDocId และ recordId");
      return;
    }

    setLoadingSingle(true);
    try {
      const url = `/api/pdf/${userDocId}?record_id=${recordId}`;
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

      const res = await fetch("/api/pdf/batch", {
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
  };

  // ===== QA Modal =====
  const [qaOpen, setQaOpen] = useState(false);
  const [qaEditPatient, setQaEditPatient] = useState<QaPatient | null>(null);
  const [qaEditDiag, setQaEditDiag] = useState<QaDiagnosisRow | null>(null);
  const [qaPrefill, setQaPrefill] = useState<{ first_name: string; last_name: string; thaiid: string; age: string } | undefined>(undefined);

  const handleQaClick = async (user: UserRow) => {
    const thaiid = (user.thaiId || "").trim();

    // Check if patient already exists in core.patients_v2
    const { data: existing } = await supabase
      .schema("core")
      .from("patients_v2")
      .select("id,first_name,last_name,thaiid,hn_number,age,province,collection_date,bmi,weight,height,chest_cm,waist_cm,hip_cm,neck_cm,bp_supine,pr_supine,bp_upright,pr_upright")
      .eq("thaiid", thaiid)
      .maybeSingle();

    if (existing) {
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
      setQaEditPatient(null);
      setQaEditDiag(null);
      setQaPrefill({
        first_name: user.firstName ?? "",
        last_name: user.lastName ?? "",
        thaiid,
        age: user.age != null ? String(user.age) : "",
      });
    }
    setQaOpen(true);
  };

  // ===== Render =====
  return (
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* QA Modal */}
          <QaCreateModal
            open={qaOpen}
            onClose={() => setQaOpen(false)}
            onCreated={() => setQaOpen(false)}
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
            screeningThaiIds={screeningThaiIds}
            screeningCheckedThaiIds={screeningCheckedThaiIds}
            screeningLoading={screeningLoading}
            screeningError={screeningError}
            onSearchChange={(query) => {
              setSearchQuery(query);
              setCurrentPage(1);
            }}
            onUserSelect={handleUserSelect}
            onQaClick={handleQaClick}
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
          />
        </div>

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
  );
}