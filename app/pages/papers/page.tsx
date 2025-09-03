// pages/papers/page.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from '@/lib/supabase';

interface PatientData {
  id: number;
  thaiid?: string;
  first_name: string;
  last_name: string;
  age: string;
  province: string;
  collection_date: string;
  hn_number: string;
}

export default function PapersPage() {
  const [patients, setPatients] = useState<PatientData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPatientData();
  }, []);

  const fetchPatientData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError("Please log in to view patient data");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('pd_screenings')
        .select('id, thaiid, first_name, last_name, age, province, collection_date, hn_number')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching patient data:', error);
        setError('Failed to load patient data');
      } else {
        setPatients(data || []);
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('th-TH');
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto mt-10 p-6 bg-white rounded-2xl shadow-lg">
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto mt-10 p-6 bg-white rounded-2xl shadow-lg">
        <div className="text-red-500 text-center mb-4">{error}</div>
        <div className="flex justify-center">
          <button 
            onClick={fetchPatientData}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto mt-10 p-6 bg-white rounded-2xl shadow-lg">
      <h1 className="text-2xl font-bold mb-6 text-center">ระบบจัดการแบบสอบถาม</h1>
      
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">เลือกแบบสอบถามสำหรับผู้ป่วยใหม่</h2>
        <div className="flex flex-col gap-3">
          <Link
            href="/pages/papers/check-in"
            className="px-4 py-3 bg-pink-600 text-white rounded-lg text-center hover:bg-pink-700"
          >
            Check-In (ผู้ป่วยใหม่)
          </Link>

        </div>
      </div>

      {patients.length > 0 ? (
        <>
          <div className="mb-6 mt-8">
            <h2 className="text-xl font-semibold mb-4">รายชื่อผู้ป่วย</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border border-gray-200">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="py-2 px-4 border-b">เลขบัตรประชาชน</th>
                    <th className="py-2 px-4 border-b">ชื่อ</th>
                    <th className="py-2 px-4 border-b">นามสกุล</th>
                    <th className="py-2 px-4 border-b">อายุ</th>
                    <th className="py-2 px-4 border-b">จังหวัด</th>
                    <th className="py-2 px-4 border-b">วันที่เก็บข้อมูล</th>
                    <th className="py-2 px-4 border-b">HN</th>
                    <th className="py-2 px-4 border-b">การดำเนินการ</th>
                  </tr>
                </thead>
                <tbody>
                  {patients.map((patient) => (
                    <tr key={patient.id} className="hover:bg-gray-50">
                      <td className="py-2 px-4 border-b">{patient.thaiid || '-'}</td>
                      <td className="py-2 px-4 border-b">{patient.first_name}</td>
                      <td className="py-2 px-4 border-b">{patient.last_name}</td>
                      <td className="py-2 px-4 border-b">{patient.age}</td>
                      <td className="py-2 px-4 border-b">{patient.province}</td>
                      <td className="py-2 px-4 border-b">{formatDate(patient.collection_date)}</td>
                      <td className="py-2 px-4 border-b">{patient.hn_number || '-'}</td>
                      <td className="py-2 px-4 border-b">
                        <div className="flex flex-col gap-2">

                          <Link
                            href={`/pages/papers/assessment?patient_thaiid=${patient.thaiid}`}
                            className="px-3 py-1 bg-blue-600 text-white rounded text-sm text-center hover:bg-blue-700"
                          >
                            +เริ่มทำแบบทดสอบ
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
        </>
      ) : (
        <div className="text-center">
          <p className="mb-6">ยังไม่มีข้อมูลผู้ป่วย</p>
        </div>
      )}
    </div>
  );
}
