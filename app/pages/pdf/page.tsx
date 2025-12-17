"use client";

import { useState } from "react";

export default function ExportTestPage() {
  const [userDocId, setUserDocId] = useState("");
  const [recordId, setRecordId] = useState("");
  const [loading, setLoading] = useState(false);

  const handleExport = () => {
    if (!userDocId || !recordId) {
      alert("กรุณากรอก userDocId และ recordId ให้ครบถ้วน");
      return;
    }

    const url = `/api/pdf/${userDocId}?record_id=${recordId}`;

    // const url = `/api/export/${userDocId}?record_id=${recordId}`;


    // เปิด PDF ในแท็บใหม่
    window.open(url, "_blank");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-6">
      <div className="bg-white shadow-lg rounded-lg p-8 w-full max-w-lg">
        <h1 className="text-2xl font-bold mb-4 text-center">
          🔎Export PDF API
        </h1>

        {/* userDocId */}
        <div className="mb-4">
          <label className="block mb-1 font-semibold">User Document ID</label>
          <input
            type="text"
            placeholder="เช่น jH9fSDF3sdf หรือ 123456"
            value={userDocId}
            onChange={(e) => setUserDocId(e.target.value)}
            className="w-full border rounded px-3 py-2"
          />
        </div>

        {/* recordId */}
        <div className="mb-4">
          <label className="block mb-1 font-semibold">Record ID</label>
          <input
            type="text"
            placeholder="เช่น 20250203_123456789"
            value={recordId}
            onChange={(e) => setRecordId(e.target.value)}
            className="w-full border rounded px-3 py-2"
          />
        </div>

        {/* Button */}
        <button
          onClick={handleExport}
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition"
        >
          📄 สร้าง PDF และเปิดดู
        </button>
      </div>
    </div>
  );
}
