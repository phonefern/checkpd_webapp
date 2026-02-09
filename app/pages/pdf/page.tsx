"use client";

import { useState, useEffect } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebaseClient";
import { UserList } from "@/app/component/pdf/UserList";
import { RecordsPanel } from "@/app/component/pdf/RecordsPanel";
import { ExportSection } from "@/app/component/pdf/ExportSection";
import { PaginationControls } from "@/app/component/pdf/PaginationControls";
import { UserRow, RecordRow } from "./types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

  // ===== Firebase Listeners =====
  useEffect(() => {
    const q = query(collection(db, "users"), orderBy("timestamp", "desc"));

    const unsub = onSnapshot(q, (snap) => {
      const rows: UserRow[] = [];

      snap.forEach((doc) => {
        const d = doc.data();
        rows.push({
          userDocId: doc.id,
          firstName: d.firstName || d.firstname,
          lastName: d.lastName || d.lastname,
          gender: d.gender,
          thaiId: d.thaiId || d.thaiid,
          idCardAddress: d.idCardAddress,
          timestamp: d.timestamp,
          lastUpdate: d.lastUpdate,
        });
      });

      setUsers(rows);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  useEffect(() => {
    if (!selectedUser?.userDocId) {
      setRecords([]);
      return;
    }

    const q = query(
      collection(db, "users", selectedUser.userDocId, "records"),
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

  // ===== Render =====
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white p-4 md:p-6 space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Users List */}
        <UserList
          users={users}
          loading={loading}
          searchQuery={searchQuery}
          selectedUserId={selectedUser?.userDocId || ""}
          onSearchChange={(query) => {
            setSearchQuery(query);
            setCurrentPage(1);
          }}
          onUserSelect={handleUserSelect}
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
  );
}