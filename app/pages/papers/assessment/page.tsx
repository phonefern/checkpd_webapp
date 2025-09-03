// pages/papers/assessment/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

export default function AssessmentPage() {
  const searchParams = useSearchParams();
  const patientThaiid = searchParams.get("patient_thaiid");
  const [patientData, setPatientData] = useState<any>(null);

  useEffect(() => {
      if (patientThaiid) {
      // Fetch patient data based on patientId
      // This is a placeholder - implement based on your data structure
      console.log("Loading assessments for patient:", patientThaiid);
    }
  }, [patientThaiid]);

  return (
    <div className="max-w-2xl mx-auto mt-10 p-6 bg-white rounded-2xl shadow-lg">
      <h1 className="text-2xl font-bold mb-4 text-center">เลือกแบบสอบถาม</h1>
      {patientThaiid && (
        <div className="mb-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-blue-700">แบบสอบถามสำหรับผู้ป่วย: {patientThaiid}</p>
        </div>
      )}
      <div className="flex flex-col gap-4">
        <Link
          href={`/pages/papers/rome4${patientThaiid ? `?patient_thaiid=${patientThaiid}` : ''}`}
          className="px-4 py-3 bg-blue-600 text-white rounded-lg text-center hover:bg-blue-700"
        >
          แบบสอบถาม ROME 4
        </Link>
        <Link
          href={`/pages/papers/epworth${patientThaiid ? `?patient_thaiid=${patientThaiid}` : ''}`}
          className="px-4 py-3 bg-green-600 text-white rounded-lg text-center hover:bg-green-700"
        >
          Epworth Sleepiness Scale
        </Link>
        <Link
          href={`/pages/papers/ham-d${patientThaiid ? `?patient_thaiid=${patientThaiid}` : ''}`}
          className="px-4 py-3 bg-red-600 text-white rounded-lg text-center hover:bg-red-700"
        >
          Hamilton Depression Scale
        </Link>
        <Link
          href={`/pages/papers/sleep${patientThaiid ? `?patient_thaiid=${patientThaiid}` : ''}`}
          className="px-4 py-3 bg-yellow-600 text-white rounded-lg text-center hover:bg-yellow-700"
        >
          Sleep Disorders Questionnaire
        </Link>
        <Link
          href={`/pages/papers/smell${patientThaiid ? `?patient_thaiid=${patientThaiid}` : ''}`}
          className="px-4 py-3 bg-purple-600 text-white rounded-lg text-center hover:bg-purple-700"
        >
          Smell Disorders Questionnaire
        </Link>
      </div>
      <div className="mt-6 pt-4 border-t">
        <Link
          href="/pages/papers"
          className="text-blue-600 hover:text-blue-800"
        >
          ← กลับไปหน้ารายการผู้ป่วย
        </Link>
      </div>
    </div>
  );
}