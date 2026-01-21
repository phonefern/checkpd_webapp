"use client";

import { useState } from "react";

export default function ExportTestPage() {
  // ===== single export =====
  const [userDocId, setUserDocId] = useState("");
  const [recordId, setRecordId] = useState("");

  // ===== batch export =====
  const [csvFile, setCsvFile] = useState<File | null>(null);

  const [loadingSingle, setLoadingSingle] = useState(false);
  const [loadingBatch, setLoadingBatch] = useState(false);

  // ---------- single PDF ----------
  const handleExportSingle = () => {
    if (!userDocId || !recordId) {
      alert("กรุณากรอก userDocId และ recordId");
      return;
    }

    const url = `/api/pdf/${userDocId}?record_id=${recordId}`;
    window.open(url, "_blank");
  };

  // ---------- batch ZIP ----------
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-6">
      <div className="bg-white shadow-lg rounded-lg p-8 w-full max-w-xl space-y-8">

        <h1 className="text-2xl font-bold text-center">
          📄 Export PDF
        </h1>

        {/* ================= SINGLE ================= */}
        <div className="border rounded-lg p-4">
          <h2 className="font-semibold mb-3">Single PDF</h2>

          <div className="mb-3">
            <label className="block mb-1 font-semibold">User Document ID</label>
            <input
              type="text"
              value={userDocId}
              onChange={(e) => setUserDocId(e.target.value)}
              className="w-full border rounded px-3 py-2"
            />
          </div>

          <div className="mb-3">
            <label className="block mb-1 font-semibold">Record ID</label>
            <input
              type="text"
              value={recordId}
              onChange={(e) => setRecordId(e.target.value)}
              className="w-full border rounded px-3 py-2"
            />
          </div>

          <button
            onClick={handleExportSingle}
            disabled={loadingSingle}
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
          >
            เปิด PDF
          </button>
        </div>

        {/* ================= BATCH ================= */}
        <div className="border rounded-lg p-4">
          <h2 className="font-semibold mb-3">Batch (CSV → ZIP)</h2>

          <input
            type="file"
            accept=".csv"
            onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
            className="mb-4"
          />

          <button
            onClick={handleExportBatch}
            disabled={loadingBatch}
            className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700"
          >
            {loadingBatch ? "กำลังสร้าง ZIP..." : "อัปโหลด CSV → ZIP PDF"}
          </button>

          <p className="text-xs text-gray-500 mt-2">
            * จำกัดจำนวนแถวตาม server (เช่น 5–10 records)
          </p>
        </div>
      </div>
    </div>
  );
}
