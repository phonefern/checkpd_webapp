"use client";
import { useState, useEffect } from "react";
import PapersTable from '@/app/component/papers/PapersTable';
import PapersHeader from '@/app/component/papers/PapersHeader';
import LoadingState from '@/app/component/papers/LoadingState';
import ErrorState from '@/app/component/papers/ErrorState';
import EmptyState from '@/app/component/papers/EmptyState';
import EditModal from '@/app/component/papers/EditModal';
import { supabase } from '@/lib/supabase';
import { PatientData } from '@/app/component/papers/types';
import Link from "next/link";
import PatientHistory from '@/app/component/papers/PatientHistory';

export default function PapersPage() {
  const [patients, setPatients] = useState<PatientData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [viewingPatient, setViewingPatient] = useState<PatientData | null>(null);
  const [editingPatient, setEditingPatient] = useState<PatientData | null>(null);

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
        .order('created_at', { ascending: false });

      if (patientError) throw patientError;

      // Fetch risk factors data
      const patientIds = patientData.map(patient => patient.id);
      const { data: riskFactorsData } = await supabase
        .from('risk_factors_test')
        .select('patient_id, rome4_score, epworth_score, hamd_score, sleep_score, smell_score, mds_score, moca_score, tmse_score')
        .in('patient_id', patientIds);

      // Fetch prediction risk data
      const thaiIds = patientData.filter(p => p.thaiid).map(p => p.thaiid);
      const { data: predictionData } = await supabase
        .from('user_record_summary_with_users')
        .select('thaiid, prediction_risk')
        .in('thaiid', thaiIds);

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
      console.error('Error:', err);
      setError('เกิดข้อผิดพลาดในการโหลดข้อมูล');
    } finally {
      setLoading(false);
    }
  };

  const handleViewHistory = (patient: PatientData) => {
    setViewingPatient(patient);
  };

  const openEditModal = (patient: PatientData) => {
    setEditingPatient(patient);
    setIsEditOpen(true);
  };

  const closeEditModal = () => {
    setIsEditOpen(false);
    setEditingPatient(null);
  };

  const handleUpdatePatient = (updatedPatient: PatientData) => {
    setPatients(prev =>
      prev.map(p => p.id === updatedPatient.id ? updatedPatient : p)
    );
  };

  const handleDeletePatient = async (patientId: number, patientName: string) => {
    if (!confirm(`คุณแน่ใจหรือไม่ที่จะลบข้อมูลผู้ป่วย "${patientName}" และข้อมูลแบบทดสอบทั้งหมดที่เกี่ยวข้อง?`)) {
      return;
    }

    try {
      setLoading(true);

      // First delete from risk_factors_test table
      const { error: riskFactorsError } = await supabase
        .from('risk_factors_test')
        .delete()
        .eq('patient_id', patientId);

      if (riskFactorsError) {
        console.error('Error deleting risk factors:', riskFactorsError);
        setError('ไม่สามารถลบข้อมูลแบบทดสอบได้');
        return;
      }

      // Then delete from pd_screenings table
      const { error: patientError } = await supabase
        .from('pd_screenings')
        .delete()
        .eq('id', patientId);

      if (patientError) {
        console.error('Error deleting patient:', patientError);
        setError('ไม่สามารถลบข้อมูลผู้ป่วยได้');
        return;
      }

      // Remove from local state
      setPatients(prevPatients => prevPatients.filter(patient => patient.id !== patientId));

    } catch (err) {
      console.error('Unexpected error during deletion:', err);
      setError('เกิดข้อผิดพลาดในการลบข้อมูล');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={fetchPatientData} />;

  return (
    <div className="min-h-screen bg-gray-50">
      <PapersHeader />

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8 flex justify-between">
          {/* Quick Actions */}
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
          <PapersTable
            patients={patients}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            itemsPerPage={itemsPerPage}
            onEditPatient={openEditModal}
            onDeletePatient={handleDeletePatient}
            onViewHistory={handleViewHistory}
          />
        ) : (
          <EmptyState />
        )}
      </div>

      {isEditOpen && editingPatient && (
        <EditModal
          patient={editingPatient}
          onClose={closeEditModal}
          onSave={handleUpdatePatient}
        />
      )}

      {viewingPatient && (
        <PatientHistory
          patient={viewingPatient}
          onClose={() => setViewingPatient(null)}
        />
      )}
    </div>
  );
};