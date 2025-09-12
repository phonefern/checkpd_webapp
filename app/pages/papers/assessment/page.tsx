"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

// Assessment configuration for easy scaling
const assessments = [
    {
    id: 'ham-d',
    title: 'Behavioral / psychiatric domain',
    description: 'แบบประเมินระดับความรุนแรงของอาการซึมเศร้า',
    category: 'HAM-D',
    icon: '🧠',
    color: 'bg-purple-50 hover:bg-purple-100 border-purple-200',
    textColor: 'text-purple-700',
    badgeColor: 'bg-purple-100 text-purple-800'
  },
  {
    id: 'rome4',
    title: 'Constipation ',
    description: 'แบบประเมินความผิดปกติของระบบทางเดินอาหาร',
    category: 'ROME IV',
    icon: '🏥',
    color: 'bg-blue-50 hover:bg-blue-100 border-blue-200',
    textColor: 'text-blue-700',
    badgeColor: 'bg-blue-100 text-blue-800'
  },
  {
    id: 'sleep',
    title: 'RBD Questionnaire ',
    description: 'แบบสอบถามความผิดปกติของการนอนหลับ',
    category: 'Sleep domain ',
    icon: '🌙',
    color: 'bg-slate-50 hover:bg-slate-100 border-slate-200',
    textColor: 'text-slate-700',
    badgeColor: 'bg-slate-100 text-slate-800'
  },
  {
    id: 'epworth',
    title: 'Epworth Sleepiness Scale',
    description: 'แบบประเมินระดับความง่วงนอนในชีวิตประจำวัน',
    category: 'Sleep domain',
    icon: '😴',
    color: 'bg-indigo-50 hover:bg-indigo-100 border-indigo-200',
    textColor: 'text-indigo-700',
    badgeColor: 'bg-indigo-100 text-indigo-800'
  },

  {
    id: 'smell',
    title: 'Smell Test',
    description: 'แบบประเมินความผิดปกติของการรับกลิ่น',
    category: 'Sniffin stick test',
    icon: '👃',
    color: 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200',
    textColor: 'text-emerald-700',
    badgeColor: 'bg-emerald-100 text-emerald-800'
  }
];

export default function AssessmentPage() {
  const searchParams = useSearchParams();
  const patientThaiid = searchParams.get("patient_thaiid");
  const [patientData, setPatientData] = useState<any>(null);

  useEffect(() => {
    if (patientThaiid) {
      console.log("Loading assessments for patient:", patientThaiid);
    }
  }, [patientThaiid]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-gray-900 mb-2">
                Parkinson Disease Assessment
              </h1>
              <p className="text-gray-600">เลือกแบบประเมินทางการแพทย์ที่เหมาะสม</p>
            </div>
            <div className="hidden md:block">
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                <span>ระบบพร้อมใช้งาน</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Patient Info Card */}
      {patientThaiid && (
        <div className="max-w-4xl mx-auto px-6 py-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-semibold text-lg">👤</span>
              </div>
              <div>
                <h2 className="text-lg font-medium text-gray-900">ข้อมูลผู้ป่วย</h2>
                <p className="text-gray-600">รหัสประจำตัวผู้ป่วย: <span className="font-mono font-medium text-gray-900">{patientThaiid}</span></p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Assessment Grid */}
      <div className="max-w-4xl mx-auto px-6 py-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">แบบประเมินที่มีให้บริการ</h2>
          <p className="text-gray-600">กรุณาเลือกแบบประเมินที่ต้องการทำการวินิจฉัย</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {assessments.map((assessment) => (
            <Link
              key={assessment.id}
              href={`/pages/papers/${assessment.id}${patientThaiid ? `?patient_thaiid=${patientThaiid}` : ''}`}
              className={`block p-6 rounded-xl border-2 transition-all duration-200 ${assessment.color} group`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{assessment.icon}</span>
                  <div>
                    <h3 className={`font-semibold text-lg ${assessment.textColor} group-hover:underline`}>
                      {assessment.title}
                    </h3>
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${assessment.badgeColor} mt-1`}>
                      {assessment.category}
                    </span>
                  </div>
                </div>
                <div className={`opacity-0 group-hover:opacity-100 transition-opacity duration-200`}>
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
              <p className="text-gray-600 text-sm leading-relaxed">
                {assessment.description}
              </p>
            </Link>
          ))}
        </div>

        {/* Add New Assessment Placeholder */}
        <div className="mt-6 p-6 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50">
          <div className="text-center">
            <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-gray-500 text-xl">+</span>
            </div>
            <h3 className="text-lg font-medium text-gray-700 mb-2">เพิ่มแบบประเมินใหม่</h3>
            <p className="text-gray-500 text-sm">ระบบพร้อมรองรับการเพิ่มแบบประเมินทางการแพทย์เพิ่มเติมในอนาคต</p>
          </div>
        </div>
      </div>

      {/* Footer Navigation */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <Link
              href="/pages/papers"
              className="inline-flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors duration-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>กลับไปหน้ารายการผู้ป่วย</span>
            </Link>
            <div className="text-sm text-gray-500">
              จำนวนแบบประเมิน: {assessments.length} รายการ
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}