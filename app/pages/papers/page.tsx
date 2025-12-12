"use client";
import { useState, useEffect } from "react";
import PapersTable from '@/app/component/papers/PapersTable';

import LoadingState from '@/app/component/papers/LoadingState';
import ErrorState from '@/app/component/papers/ErrorState';
import EmptyState from '@/app/component/papers/EmptyState';
import EditModal from '@/app/component/papers/EditModal';
import { supabase } from '@/lib/supabase';
import { PatientData } from '@/app/component/papers/types';
import Link from "next/link";
import PatientHistory from '@/app/component/papers/PatientHistory';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LogOut, Plus } from "lucide-react";

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
  const [totalCount, setTotalCount] = useState<number>(0);

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
      const { data: patientData, count, error: patientError } = await supabase
        .from('pd_screenings')
        .select(
          'id, thaiid, first_name, last_name, gender, age, province, collection_date, hn_number, condition, other, weight, height, bmi, chest, waist, neck, hip, bp_supine, pr_supine, bp_upright, pr_upright',
          { count: 'exact' }
        )
        .order('created_at', { ascending: false })
        .range(0, 999);

      setPatients(patientData || []);
      setTotalCount(count || 0);

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
    <div className="min-h-screen w-full bg-background">
      <div className="flex min-h-screen w-full flex-col space-y-6 px-4 py-6 md:px-8 lg:px-12">

        <Card className="w-full border-border shadow-sm">
          <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              <CardTitle className="text-2xl md:text-3xl">Patient Data Management System</CardTitle>
              <CardDescription>จัดการข้อมูลผู้ป่วยและแบบทดสอบทั้งหมด</CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button asChild size="lg" className="gap-2">
                <Link href="/pages/papers/check-in">
                  <Plus className="h-4 w-4" />
                  Check-In (ผู้ป่วยใหม่)
                </Link>
              </Button>
              <Button variant="destructive" size="lg" className="gap-2" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
                ออกจากระบบ
              </Button>
            </div>
          </CardHeader>
        </Card>

        {/* <Card className="flex-1 overflow-hidden border-border shadow-sm"> */}
          <CardContent className="h-full p-0">
            <ScrollArea className="h-full w-full">
              <div className="p-0">
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
                    totalCount={totalCount}
                  />
                ) : (
                  <EmptyState />
                )}
              </div>
            </ScrollArea>
          </CardContent>
        {/* </Card> */}

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
    </div>
  );
};