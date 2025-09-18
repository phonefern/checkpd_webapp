"use client";
// pages/papers.tsx
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { supabase } from '@/lib/supabase';
import otherDiagnosisData from '@/app/component/questions/other_diagnosis_dropdown.json';

interface PatientData {
  id: number;
  thaiid?: string;
  first_name: string;
  last_name: string;
  gender: string;
  age: string;
  province: string;
  collection_date: string;
  hn_number: string;
  prediction_risk?: boolean | null;
  condition?: string;
  other?: string;
  risk_factors?: {
    rome4_score: number | null;
    epworth_score: number | null;
    hamd_score: number | null;
    sleep_score: number | null;
    smell_score: number | null;
    mds_score: number | null;
    moca_score: number | null;
    tmse_score: number | null;
  };
}

const assessmentLabels = {
  hamd_score: 'HAM-D',
  rome4_score: 'ROME IV',
  sleep_score: 'RBD',
  epworth_score: 'Epworth',
  smell_score: 'Smell',
  mds_score: 'MDS',
  moca_score: 'MoCA',
  tmse_score: 'TMSE'
};

const assessmentDescriptions = {
  rome4_score: 'แบบประเมินความผิดปกติของระบบทางเดินอาหาร',
  epworth_score: 'แบบประเมินระดับความง่วงนอน',
  hamd_score: 'แบบประเมินระดับความรุนแรงของอาการซึมเศร้า',
  sleep_score: 'แบบสอบถามความผิดปกติของการนอนหลับ',
  smell_score: 'แบบประเมินความผิดปกติของการรับกลิ่น',
  mds_score: 'แบบประเมินอาการทางระบบประสาท',
  moca_score: 'แบบทดสอบการทำงานของสมอง',
  tmse_score: 'แบบทดสอบการทำงานของสมอง'
};




export default function PapersPage() {
  const [patients, setPatients] = useState<PatientData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<PatientData | null>(null);
  const [editCondition, setEditCondition] = useState<string>('');
  const [editOther, setEditOther] = useState<string>('');
  const [isCustomOther, setIsCustomOther] = useState<boolean>(false);
  const [selectedOtherCategory, setSelectedOtherCategory] = useState<string>('');
  const [selectedOtherDiagnosis, setSelectedOtherDiagnosis] = useState<string>('');

  const [editScores, setEditScores] = useState({
    rome4_score: null as number | null,
    epworth_score: null as number | null,
    hamd_score: null as number | null,
    sleep_score: null as number | null,
    smell_score: null as number | null,
    mds_score: null as number | null,
    moca_score: null as number | null,
    tmse_score: null as number | null,
  });

  const conditionOptions = useMemo(
    () => ['Prodromal', 'Other diagnosis', 'Control', 'PD'],
    []
  );
  const otherCategories = useMemo(() => {
    return ['-', ...otherDiagnosisData.map(item => item.category), 'Custom...'];
  }, []);
  const getDiagnosesByCategory = (category: string): string[] => {
    if (!category || category === '-' || category === 'Custom...') return [];
    const found = (otherDiagnosisData as { category: string; diagnosis: string[] }[]).find(i => i.category === category);
    return found ? found.diagnosis : [];
  };

  useEffect(() => {
    fetchPatientData();
  }, []);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('Logout error:', error)
    } else {
      window.location.href = '/pages/login'
    }
  }

  const fetchPatientData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError("กรุณาเข้าสู่ระบบเพื่อดูข้อมูลผู้ป่วย");
        setLoading(false);
        return;
      }

      // Fetch patient data
      const { data: patientData, error: patientError } = await supabase
        .from('pd_screenings')
        .select('id, thaiid, first_name, last_name, gender, age, province, collection_date, hn_number, condition, other')
        // .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (patientError) {
        console.error('Error fetching patient data:', patientError);
        setError('ไม่สามารถโหลดข้อมูลผู้ป่วยได้');
        setLoading(false);
        return;
      }

      // Fetch risk factors data for all patients
      const patientIds = patientData.map(patient => patient.id);
      const { data: riskFactorsData, error: riskFactorsError } = await supabase
        .from('risk_factors_test')
        .select('patient_id, rome4_score, epworth_score, hamd_score, sleep_score, smell_score, mds_score, moca_score, tmse_score')
        .in('patient_id', patientIds);

      if (riskFactorsError) {
        console.error('Error fetching risk factors data:', riskFactorsError);
      }

      // Fetch prediction risk data from the view
      const thaiIds = patientData.filter(p => p.thaiid).map(p => p.thaiid);
      const { data: predictionData, error: predictionError } = await supabase
        .from('user_record_summary_with_users')
        .select('thaiid, prediction_risk')
        .in('thaiid', thaiIds);

      if (predictionError) {
        console.error('Error fetching prediction data:', predictionError);
      }

      // Merge all data
      const mergedData = patientData.map(patient => {
        const riskFactors = riskFactorsData?.find(rf => rf.patient_id === patient.id);
        const predictionRisk = predictionData?.find(pd => pd.thaiid === patient.thaiid);

        return {
          ...patient,
          prediction_risk: typeof predictionRisk?.prediction_risk === 'boolean'
            ? predictionRisk?.prediction_risk
            : predictionRisk?.prediction_risk == null
              ? null
              : Boolean(predictionRisk?.prediction_risk),
          risk_factors: riskFactors || {
            rome4_score: null,
            epworth_score: null,
            hamd_score: null,
            sleep_score: null,
            smell_score: null,
            mds_score: null,
            moca_score: null,
            tmse_score: null
          }
        };
      });

      setPatients(mergedData || []);
    } catch (err) {
      console.error('Unexpected error:', err);
      setError('เกิดข้อผิดพลาดที่ไม่คาดคิด');
    } finally {
      setLoading(false);
    }
  };

  const filteredPatients = useMemo(() => {
    if (!searchTerm) return patients;

    return patients.filter(patient =>
      patient.thaiid?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.hn_number?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [patients, searchTerm]);

  const paginatedPatients = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredPatients.slice(startIndex, endIndex);
  }, [filteredPatients, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredPatients.length / itemsPerPage);

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('th-TH');
    } catch {
      return dateString;
    }
  };

  const getScoreStatus = (score: number | null) => {
    if (score === null) return 'missing';
    return 'completed';
  };

  const getRiskBadgeColor = (risk: boolean | null) => {
    if (risk === null) return 'bg-gray-100 text-gray-600';
    return risk
      ? 'bg-red-100 text-red-700 border border-red-200'
      : 'bg-green-100 text-green-700 border border-green-200';
  };

  const openEditModal = (patient: PatientData) => {
    setEditingPatient(patient);
    setEditCondition(patient.condition || '');

    setEditScores({
      rome4_score: patient.risk_factors?.rome4_score || null,
      epworth_score: patient.risk_factors?.epworth_score || null,
      hamd_score: patient.risk_factors?.hamd_score || null,
      sleep_score: patient.risk_factors?.sleep_score || null,
      smell_score: patient.risk_factors?.smell_score || null,
      mds_score: patient.risk_factors?.mds_score || null,
      moca_score: patient.risk_factors?.moca_score || null,
      tmse_score: patient.risk_factors?.tmse_score || null,
    });
    const initialOther = patient.other || '-';

    const match = (otherDiagnosisData as { category: string; diagnosis: string[] }[]).find(cat =>
      cat.diagnosis.includes(initialOther)
    );
    if (initialOther === '-') {
      setSelectedOtherCategory('-');
      setSelectedOtherDiagnosis('');
      setIsCustomOther(false);
      setEditOther('-');
    } else if (match) {
      setSelectedOtherCategory(match.category);
      setSelectedOtherDiagnosis(initialOther);
      setIsCustomOther(false);
      setEditOther(initialOther);
    } else {
      setSelectedOtherCategory('Custom...');
      setSelectedOtherDiagnosis('');
      setIsCustomOther(true);
      setEditOther(initialOther);
    }
    setIsEditOpen(true);
  };

  const closeEditModal = () => {
    setIsEditOpen(false);
    setEditingPatient(null);
    setEditCondition('');
    setEditOther('');
    setIsCustomOther(false);
  };

  const handleSaveEdit = async () => {
    if (!editingPatient) return;
    try {
      setLoading(true);

      // --- บันทึก condition/other ใน pd_screenings ---
      let finalOther = '-';
      if (isCustomOther) {
        finalOther = editOther.trim() || '-';
      } else if (selectedOtherCategory === '-' || !selectedOtherCategory) {
        finalOther = '-';
      } else if (selectedOtherCategory === 'Custom...') {
        finalOther = editOther.trim() || '-';
      } else {
        finalOther = selectedOtherDiagnosis || '-';
      }

      const { error: updateScreeningError } = await supabase
        .from('pd_screenings')
        .update({
          condition: editCondition || null,
          other: finalOther || null,
        })
        .eq('id', editingPatient.id);

      if (updateScreeningError) throw updateScreeningError;

      // --- บันทึก scores ใน risk_factors_test ---
      const { error: updateRiskError } = await supabase
        .from('risk_factors_test')
        .update(editScores)
        .eq('patient_id', editingPatient.id);

      if (updateRiskError) throw updateRiskError;

      // อัปเดต state ใน frontend
      setPatients(prev =>
        prev.map(p =>
          p.id === editingPatient.id
            ? { ...p, condition: editCondition || undefined, other: finalOther || undefined, risk_factors: editScores }
            : p
        )
      );

      closeEditModal();
    } catch (err) {
      console.error('Error during save:', err);
      setError('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setLoading(false);
    }
  };


  const handleDeletePatient = async (patientId: number, patientName: string) => {
    if (!confirm(`คุณแน่ใจหรือไม่ที่จะลบข้อมูลผู้ป่วย "${patientName}" และข้อมูลแบบทดสอบทั้งหมดที่เกี่ยวข้อง?`)) {
      return;
    }

    try {
      setLoading(true);

      const { error: riskFactorsError } = await supabase
        .from('risk_factors_test')
        .delete()
        .eq('patient_id', patientId);

      if (riskFactorsError) {
        console.error('Error deleting risk factors:', riskFactorsError);
        setError('ไม่สามารถลบข้อมูลแบบทดสอบได้');
        setLoading(false);
        return;
      }

      const { error: patientError } = await supabase
        .from('pd_screenings')
        .delete()
        .eq('id', patientId);

      if (patientError) {
        console.error('Error deleting patient:', patientError);
        setError('ไม่สามารถลบข้อมูลผู้ป่วยได้');
        setLoading(false);
        return;
      }

      setPatients(prevPatients => prevPatients.filter(patient => patient.id !== patientId));

    } catch (err) {
      console.error('Unexpected error during deletion:', err);
      setError('เกิดข้อผิดพลาดในการลบข้อมูล');
    } finally {
      setLoading(false);
    }
  };




  const renderScoreIndicator = (score: number | null, key: keyof typeof assessmentLabels) => {
    const status = getScoreStatus(score);
    const label = assessmentLabels[key];
    const description = assessmentDescriptions[key];

    return (
      <div
        className={`inline-flex items-center justify-center min-w-[2.5rem] h-10 px-2 rounded-lg text-sm font-medium mr-2 mb-2 transition-all duration-200 ${status === 'completed'
          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
          : 'bg-slate-50 text-slate-500 border border-slate-200 hover:bg-slate-100'
          }`}
        title={`${label}: ${description}\nคะแนน: ${score !== null ? score : 'ยังไม่ทำแบบทดสอบ'}`}
      >
        <div className="text-center">
          <div className="text-xs font-semibold">{label}</div>
          <div className="text-sm">{score !== null ? score : '-'}</div>
        </div>
      </div>
    );
  };

  const Pagination = () => {
    if (totalPages <= 1) return null;

    const getPageNumbers = () => {
      const pages = [];
      const showPages = 5;
      let startPage = Math.max(1, currentPage - Math.floor(showPages / 2));
      let endPage = Math.min(totalPages, startPage + showPages - 1);

      if (endPage - startPage < showPages - 1) {
        startPage = Math.max(1, endPage - showPages + 1);
      }

      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }
      return pages;
    };

    return (
      <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 rounded-b-xl">
        <div className="flex flex-1 justify-between sm:hidden">
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            ก่อนหน้า
          </button>
          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            ถัดไป
          </button>
        </div>
        <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-700">
              แสดง <span className="font-medium">{((currentPage - 1) * itemsPerPage) + 1}</span> ถึง{' '}
              <span className="font-medium">{Math.min(currentPage * itemsPerPage, filteredPatients.length)}</span> จากทั้งหมด{' '}
              <span className="font-medium">{filteredPatients.length}</span> รายการ
            </p>
          </div>
          <div>
            <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
              >
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                </svg>
              </button>

              {getPageNumbers().map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 ${currentPage === page
                    ? 'z-10 bg-blue-600 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600'
                    : 'text-gray-900'
                    }`}
                >
                  {page}
                </button>
              ))}

              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
              >
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                </svg>
              </button>
            </nav>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="bg-white rounded-xl shadow-sm p-12">
            <div className="flex justify-center items-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
              <span className="ml-4 text-gray-600">กำลังโหลดข้อมูล...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="bg-red-50 border border-red-200 p-4 rounded-lg mb-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">เกิดข้อผิดพลาด</h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>{error}</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-center">
              <button
                onClick={fetchPatientData}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center transition-colors"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                ลองอีกครั้ง
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-6 py-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-semibold text-gray-900 mb-2">Data Sheets Management</h1>
                <p className="text-gray-600">จัดการแบบสอบถามและข้อมูลผู้ป่วยทั้งหมดในระบบ</p>
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

        <div className="max-w-7xl mx-auto px-6 py-8">

          {/* Quick Actions */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8 flex justify-between">

            <div className="flex items-center space-x-2">
              <Link
                href="/pages/papers/check-in"
                className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Check-In (ผู้ป่วยใหม่)
              </Link>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={handleLogout}
                className="inline-flex items-center px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                ออกจากระบบ
              </button>
            </div>
          </div>

          {patients.length > 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              {/* Search and Header */}
              <div className="p-6 border-b border-gray-200">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">รายชื่อผู้ป่วย</h2>
                    <p className="text-sm text-gray-600">ทั้งหมด {filteredPatients.length} คน</p>
                  </div>
                  <div className="relative max-w-md">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      placeholder="ค้นหา ID, ชื่อ, นามสกุล, HN..."
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        ข้อมูลผู้ป่วย
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        คะแนนแบบประเมิน
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        ความเสี่ยง
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        อาการ
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        อื่นๆ
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        การดำเนินการ
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {paginatedPatients.map((patient) => (
                      <tr key={patient.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                              <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {patient.first_name} {patient.last_name}
                              </div>
                              <div className="text-sm text-gray-500">
                                {patient.thaiid ? `ID: ${patient.thaiid}` : 'ไม่มีเลขบัตรประชาชน'}
                              </div>
                              <div className="text-xs text-gray-500 mt-1 space-y-1">
                                <div>อายุ: {patient.age} ปี • จังหวัด: {patient.province} • เพศ: {patient.gender}</div>
                                <div>HN: {patient.hn_number || '-'} • วันที่: {formatDate(patient.collection_date)}</div>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap">
                            {Object.entries(assessmentLabels).map(([key, label]) =>
                              renderScoreIndicator(
                                patient.risk_factors?.[key as keyof typeof assessmentLabels] ?? null,
                                key as keyof typeof assessmentLabels
                              )
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {patient.prediction_risk !== null && patient.prediction_risk !== undefined ? (
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getRiskBadgeColor(patient.prediction_risk)}`}>
                              {patient.prediction_risk ? 'เสี่ยง' : 'ไม่เสี่ยง'}
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-500">
                              ยังไม่ประเมิน
                            </span>
                          )}
                        </td>
                        <td className="text-sm px-6 py-4">
                          {patient.condition || '-'}
                        </td>
                        <td className="text-sm px-6 py-4">
                          {patient.other || '-'}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-2">
                            <button
                              onClick={() => openEditModal(patient)}
                              className="inline-flex items-center justify-center px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 transition-colors"
                            >
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5M18.5 2.5a2.121 2.121 0 113 3L12 15l-4 1 1-4 9.5-9.5z" />
                              </svg>
                              เพิ่ม/แก้ไข
                            </button>
                            <Link
                              href={`/pages/papers/assessment?patient_thaiid=${patient.thaiid}`}
                              className="inline-flex items-center justify-center px-3 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700 transition-colors"
                            >
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                              </svg>
                              เริ่มทำแบบทดสอบ
                            </Link>
                            <button
                              onClick={() => handleDeletePatient(patient.id, `${patient.first_name} ${patient.last_name}`)}
                              className="inline-flex items-center justify-center px-3 py-2 bg-red-100 text-red-700 rounded-lg text-sm hover:bg-red-200 transition-colors"
                            >
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              ลบข้อมูล
                            </button>
                            <button
                              onClick={() => window.open(`/api/generate-pdf?thaiid=${patient.thaiid}`, "_blank")}
                              className="inline-flex items-center justify-center px-3 py-2 bg-gray-200 rounded-lg text-sm"
                            >
                              พิมพ์เอกสาร
                            </button>

                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <Pagination />
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12">
              <div className="text-center">
                <svg className="mx-auto h-16 w-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V9a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2" />
                </svg>
                <h3 className="mt-4 text-lg font-medium text-gray-900">ยังไม่มีข้อมูลผู้ป่วย</h3>
                <p className="mt-1 text-gray-500">เริ่มต้นด้วยการเพิ่มผู้ป่วยใหม่</p>
                <div className="mt-6">
                  <Link
                    href="/pages/papers/check-in"
                    className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    เพิ่มผู้ป่วยใหม่
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      {isEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-lg bg-white rounded-xl shadow-lg">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">แก้ไข Condition / Other</h3>
              <button onClick={closeEditModal} className="text-gray-400 hover:text-gray-600">
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
            <div className="px-6 py-5 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Condition</label>
                <select
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                  value={editCondition}
                  onChange={(e) => setEditCondition(e.target.value)}
                >
                  <option value="">-</option>
                  {conditionOptions.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Other</label>
                <div className="grid grid-cols-1 gap-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <select
                      className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                      value={selectedOtherCategory}
                      onChange={(e) => {
                        const cat = e.target.value;
                        setSelectedOtherCategory(cat);
                        setSelectedOtherDiagnosis('');
                        if (cat === 'Custom...') {
                          setIsCustomOther(true);
                          setEditOther('');
                        } else if (cat === '-' || !cat) {
                          setIsCustomOther(false);
                          setEditOther('-');
                        } else {
                          setIsCustomOther(false);
                          setEditOther('');
                        }
                      }}
                    >
                      {otherCategories.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                    <select
                      className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white disabled:bg-gray-100 disabled:text-gray-400"
                      value={selectedOtherDiagnosis}
                      onChange={(e) => {
                        setSelectedOtherDiagnosis(e.target.value);
                        setEditOther(e.target.value);
                      }}
                      disabled={isCustomOther || !selectedOtherCategory || selectedOtherCategory === '-' || selectedOtherCategory === 'Custom...'}
                    >
                      <option value="">เลือกการวินิจฉัย</option>
                      {getDiagnosesByCategory(selectedOtherCategory).map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                  {isCustomOther && (
                    <input
                      type="text"
                      className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="ระบุค่า Other (Custom)"
                      value={editOther}
                      onChange={(e) => setEditOther(e.target.value)}
                    />
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">คะแนนแบบสอบถาม</label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {Object.entries(editScores).map(([key, value]) => (
                      <div key={key}>
                        <label className="text-xs text-gray-600">{key.replace('_', ' ')}</label>
                        <input
                          type="number"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          value={value ?? ''}
                          onChange={(e) => setEditScores(prev => ({
                            ...prev,
                            [key]: e.target.value === '' ? null : Number(e.target.value)
                          }))}
                        />
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3">
              <button
                onClick={closeEditModal}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                disabled={loading || (isCustomOther && editOther.trim() === '')}
              >
                บันทึก
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}