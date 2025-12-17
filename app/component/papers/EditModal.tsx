import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { supabase } from '@/lib/supabase';
import { PatientData, EditScores } from './types';
import { conditionOptions } from './constants';
import otherDiagnosisData from '@/app/component/questions/other_diagnosis_dropdown.json';
import { YearInput, TextInput, ScoreInput, CheckBox } from './EditState';


// Types
interface ProdromalData {
  suspected_rbd: boolean;
  rbd_years?: string;
  rbd_duration?: string;
  hyposmia: boolean;
  hyposmia_years?: string;
  hyposmia_duration?: string;
  constipation: boolean;
  constipation_years?: string;
  constipation_duration?: string;
  depression: boolean;
  depression_years?: string;
  depression_duration?: string;
  eds: boolean;
  eds_years?: string;
  eds_duration?: string;
  autonomic_dysfunction: boolean;
  autonomic_years?: string;
  autonomic_duration?: string;
  mild_parkinson_sign: boolean;
  family_history: boolean;
  family_relation?: string;
  other_diagnosis?: string;
}

interface PDDetails {
  newly_diagnosis?: boolean;
  pd?: boolean;
  disease_duration?: string;
  hy_stage?: string;
}

interface EditModalProps {
  patient: PatientData;
  onClose: () => void;
  onSave: (updatedPatient: PatientData) => void;
}

type ActiveTab = 'basic' | 'prodromal' | 'pd';

// Main EditModal Component
const EditModal = ({ patient, onClose, onSave }: EditModalProps) => {
  const [editCondition, setEditCondition] = useState(patient.condition || '');
  const [editOther, setEditOther] = useState(patient.other || '');
  const [isCustomOther, setIsCustomOther] = useState(false);
  const [selectedOtherCategory, setSelectedOtherCategory] = useState('');
  const [selectedOtherDiagnosis, setSelectedOtherDiagnosis] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('basic');
  const [editScores, setEditScores] = useState<EditScores>({
    rome4_score: patient.risk_factors?.rome4_score || null,
    epworth_score: patient.risk_factors?.epworth_score || null,
    hamd_score: patient.risk_factors?.hamd_score || null,
    sleep_score: patient.risk_factors?.sleep_score || null,
    smell_score: patient.risk_factors?.smell_score || null,
    mds_score: patient.risk_factors?.mds_score || null,
    moca_score: patient.risk_factors?.moca_score || null,
    tmse_score: patient.risk_factors?.tmse_score || null,
  });

  const otherCategories = useMemo(() => {
    return ['-', ...otherDiagnosisData.map(item => item.category), 'Custom...'];
  }, []);

  const getDiagnosesByCategory = (category: string): string[] => {
    if (!category || category === '-' || category === 'Custom...') return [];
    const found = (otherDiagnosisData as { category: string; diagnosis: string[] }[]).find(i => i.category === category);
    return found ? found.diagnosis : [];
  };

  useEffect(() => {
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
  }, [patient.other]);

  // Auto-switch tab based on condition
  useEffect(() => {
    if (editCondition === 'Prodromal') {
      setActiveTab('prodromal');
    } else if (editCondition === 'PD') {
      setActiveTab('pd');
    } else {
      setActiveTab('basic');
    }
  }, [editCondition]);

  const handleSave = async () => {
    try {
      setLoading(true);

      // Calculate final other value
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

      // Update screening data
      const { error: updateScreeningError } = await supabase
        .from('pd_screenings')
        .update({
          condition: editCondition || null,
          other: finalOther || null,
        })
        .eq('id', patient.id);

      if (updateScreeningError) throw updateScreeningError;

      // Update risk factors
      const { error: updateRiskError } = await supabase
        .from('risk_factors_test')
        .update(editScores)
        .eq('patient_id', patient.id);

      if (updateRiskError) throw updateRiskError;

      // Update local state
      const updatedPatient: PatientData = {
        ...patient,
        condition: editCondition || undefined,
        other: finalOther || undefined,
        risk_factors: editScores
      };

      if (patient.condition === 'prodromal' && editCondition !== 'prodromal') {
        await supabase
          .from('pd_prodromal_details')
          .delete()
          .eq('screening_id', patient.id);
      }

      onSave(updatedPatient);
      onClose();
    } catch (err) {
      console.error('Error during save:', err);
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-4xl bg-white rounded-xl shadow-lg max-h-[90vh] overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">แก้ไขข้อมูลผู้ป่วย</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('basic')}
              className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'basic'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              ข้อมูลพื้นฐาน
            </button>
            <button
              onClick={() => setActiveTab('prodromal')}
              className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'prodromal'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              รายละเอียด Prodromal
            </button>
            <button
              onClick={() => setActiveTab('pd')}
              className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'pd'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              รายละเอียด PD
            </button>
          </nav>
        </div>

        <div className="overflow-y-auto max-h-[calc(90vh-180px)]">
          <div className="px-6 py-5 space-y-5">
            {/* Basic Information Tab */}
            {activeTab === 'basic' && (
              <>
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
                        id="other-custom"
                        name="other_custom"
                        type="text"
                        className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="ระบุค่า Other (Custom)"
                        value={editOther}
                        onChange={(e) => setEditOther(e.target.value)}
                      />
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">คะแนนแบบสอบถาม</label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {Object.entries(editScores).map(([key, value]) => {
                      const inputId = `edit-score-${key}`;
                      return (
                        <div key={key}>
                          <label htmlFor={inputId} className="text-xs text-gray-600">
                            {key.replace('_', ' ')}
                          </label>
                          <input
                            id={inputId}
                            name={key}
                            type="number"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            value={value ?? ''}
                            onChange={(e) =>
                              setEditScores((prev) => ({
                                ...prev,
                                [key]: e.target.value === '' ? null : Number(e.target.value),
                              }))
                            }
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            {/* Prodromal Details Tab */}
            {activeTab === 'prodromal' && (
              <ProdromalDetailsSection 
                patientId={patient.id} 
                patient={patient}
                editScores={editScores}
                setEditScores={setEditScores}
              />
            )}

            {/* PD Details Tab */}
            {activeTab === 'pd' && (
              <PDDetailsSection patientId={patient.id} />
            )}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-500">
            {activeTab === 'basic' && 'ข้อมูลพื้นฐาน'}
            {activeTab === 'prodromal' && 'รายละเอียด Prodromal'}
            {activeTab === 'pd' && 'รายละเอียด PD'}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              disabled={loading}
            >
              ยกเลิก
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              disabled={loading || (isCustomOther && editOther.trim() === '')}
            >
              {loading ? 'กำลังบันทึก...' : 'บันทึก'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

// Prodromal Details Section Component
const ProdromalDetailsSection = ({ 
  patientId, 
  patient,
  editScores,
  setEditScores 
}: { 
  patientId: number; 
  patient: PatientData;
  editScores: EditScores;
  setEditScores: React.Dispatch<React.SetStateAction<EditScores>>;
}) => {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<ProdromalData>({
    suspected_rbd: false,
    hyposmia: false,
    constipation: false,
    depression: false,
    eds: false,
    autonomic_dysfunction: false,
    mild_parkinson_sign: false,
    family_history: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchDetails = async () => {
      const { data, error } = await supabase
        .from("pd_prodromal_details")
        .select("*")
        .eq("screening_id", patientId)
        .maybeSingle();

      if (data) {
        // Ensure boolean fields are properly converted
        const processedData: ProdromalData = {
          suspected_rbd: !!data.suspected_rbd,
          hyposmia: !!data.hyposmia,
          constipation: !!data.constipation,
          depression: !!data.depression,
          eds: !!data.eds,
          autonomic_dysfunction: !!data.autonomic_dysfunction,
          mild_parkinson_sign: !!data.mild_parkinson_sign,
          family_history: !!data.family_history,
          ...data,
        };
        setForm((prev) => ({ ...prev, ...processedData }));
      }
      if (error && error.code !== "PGRST116") console.error(error);
    };
    fetchDetails();
  }, [patientId]);

  const handleFormChange = (key: keyof ProdromalData, value: any) => {
    setForm(prev => ({ ...prev, [key]: value }));

    if (errors[key]) {
      setErrors(prev => ({ ...prev, [key]: "" }));
    }
  };

  const handleScoreChange = (key: keyof EditScores, value: string) => {
    setEditScores(prev => ({
      ...prev,
      [key]: value === "" ? null : Number(value)
    }));

    if (errors[key]) {
      setErrors(prev => ({ ...prev, [key]: "" }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    const yearFields = [
      'rbd_years', 'rbd_duration', 'hyposmia_years', 'hyposmia_duration',
      'constipation_years', 'constipation_duration', 'depression_years', 'depression_duration',
      'eds_years', 'eds_duration', 'autonomic_years', 'autonomic_duration'
    ];

    yearFields.forEach(field => {
      const value = form[field as keyof ProdromalData];
      if (typeof value === 'string' && value !== "" && !/^\d*\.?\d*$/.test(value)) {
        newErrors[field] = 'กรุณากรอกตัวเลขเท่านั้น';
      }
    });

    if (form.other_diagnosis && !/^[a-zA-Zก-๙\s]*$/.test(form.other_diagnosis)) {
      newErrors.other_diagnosis = 'กรุณากรอกตัวอักษรเท่านั้น';
    }

    if (form.family_relation && !/^[a-zA-Zก-๙\s]*$/.test(form.family_relation)) {
      newErrors.family_relation = 'กรุณากรอกตัวอักษรเท่านั้น';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveProdromal = async () => {
    if (!validateForm()) {
      alert("❌ กรุณากรอกข้อมูลให้ถูกต้องก่อนบันทึก");
      return;
    }

    setLoading(true);
    try {
      const cleanForm = { ...form } as Record<string, any>;
      Object.keys(cleanForm).forEach((k) => {
        if (typeof cleanForm[k] === "boolean") cleanForm[k] = !!cleanForm[k];
      });

      const { data: existing } = await supabase
        .from("pd_prodromal_details")
        .select("id")
        .eq("screening_id", patientId)
        .maybeSingle();

      if (existing) {
        await supabase.from("pd_prodromal_details").update(cleanForm).eq("screening_id", patientId);
      } else {
        await supabase.from("pd_prodromal_details").insert([{ screening_id: patientId, ...cleanForm }]);
      }

      await supabase
        .from("risk_factors_test")
        .update(editScores)
        .eq("patient_id", patientId);

      alert("✅ บันทึกข้อมูลสำเร็จ");
    } catch (err) {
      console.error(err);
      alert("❌ เกิดข้อผิดพลาดในการบันทึกข้อมูล");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {Object.entries({
          rome4_score: 'Rome4 Score',
          epworth_score: 'Epworth Score', 
          hamd_score: 'HAMD Score',
          sleep_score: 'Sleep Score',
          smell_score: 'Smell Score',
          mds_score: 'MDS Score',
          moca_score: 'MoCA Score',
          tmse_score: 'TMSE Score'
        }).map(([key, label]) => (
          <ScoreInput 
            key={key} 
            label={label} 
            name={key as keyof EditScores}
            value={editScores[key as keyof EditScores] ?? null}
            onChange={(n, v) => handleScoreChange(n, v)}
            error={errors[key]}
          />
        ))}
      </div>

      <section>
        <h4 className="font-semibold text-gray-800 mb-2">Suspected RBD</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <CheckBox 
            label="มีอาการละเมอ" 
            name="suspected_rbd" 
            checked={!!form.suspected_rbd}
            onChange={(n, v) => handleFormChange(n as keyof ProdromalData, v)}
          />
          <YearInput 
            label="อายุเริ่มมีอาการ (ปี)" 
            name="rbd_years" 
            value={form.rbd_years ?? ""}
            onChange={(n, v) => handleFormChange(n as keyof ProdromalData, v)}
            error={errors["rbd_years"]}
          />
          <YearInput 
            label="ระยะเวลามีอาการ (ปี)" 
            name="rbd_duration" 
            value={form.rbd_duration ?? ""}
            onChange={(n, v) => handleFormChange(n as keyof ProdromalData, v)}
            error={errors["rbd_duration"]}
          />
        </div>
      </section>

      <section>
        <h4 className="font-semibold text-gray-800 mb-2">Hyposmia</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <CheckBox 
            label="กลิ่นลดลง" 
            name="hyposmia" 
            checked={!!form.hyposmia}
            onChange={(n, v) => handleFormChange(n as keyof ProdromalData, v)}
          />
          <YearInput 
            label="อายุเริ่มมีอาการ (ปี)" 
            name="hyposmia_years" 
            value={form.hyposmia_years ?? ""}
            onChange={(n, v) => handleFormChange(n as keyof ProdromalData, v)}
            error={errors["hyposmia_years"]}
          />
          <YearInput 
            label="ระยะเวลามีอาการ (ปี)" 
            name="hyposmia_duration" 
            value={form.hyposmia_duration ?? ""}
            onChange={(n, v) => handleFormChange(n as keyof ProdromalData, v)}
            error={errors["hyposmia_duration"]}
          />
        </div>
      </section>

      <section>
        <h4 className="font-semibold text-gray-800 mb-2">Constipation</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <CheckBox 
            label="ท้องผูก" 
            name="constipation" 
            checked={!!form.constipation}
            onChange={(n, v) => handleFormChange(n as keyof ProdromalData, v)}
          />
          <YearInput 
            label="อายุเริ่มมีอาการ (ปี)" 
            name="constipation_years" 
            value={form.constipation_years ?? ""}
            onChange={(n, v) => handleFormChange(n as keyof ProdromalData, v)}
            error={errors["constipation_years"]}
          />
          <YearInput 
            label="ระยะเวลามีอาการ (ปี)" 
            name="constipation_duration" 
            value={form.constipation_duration ?? ""}
            onChange={(n, v) => handleFormChange(n as keyof ProdromalData, v)}
            error={errors["constipation_duration"]}
          />
        </div>
      </section>

      <section>
        <h4 className="font-semibold text-gray-800 mb-2">Depression</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <CheckBox 
            label="ภาวะซึมเศร้า" 
            name="depression" 
            checked={!!form.depression}
            onChange={(n, v) => handleFormChange(n as keyof ProdromalData, v)}
          />
          <YearInput 
            label="อายุเริ่มมีอาการ (ปี)" 
            name="depression_years" 
            value={form.depression_years ?? ""}
            onChange={(n, v) => handleFormChange(n as keyof ProdromalData, v)}
            error={errors["depression_years"]}
          />
          <YearInput 
            label="ระยะเวลามีอาการ (ปี)" 
            name="depression_duration" 
            value={form.depression_duration ?? ""}
            onChange={(n, v) => handleFormChange(n as keyof ProdromalData, v)}
            error={errors["depression_duration"]}
          />
        </div>
      </section>

      <section>
        <h4 className="font-semibold text-gray-800 mb-2">EDS</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <CheckBox 
            label="ง่วงตอนกลางวัน" 
            name="eds" 
            checked={!!form.eds}
            onChange={(n, v) => handleFormChange(n as keyof ProdromalData, v)}
          />
          <YearInput 
            label="อายุเริ่มมีอาการ (ปี)" 
            name="eds_years" 
            value={form.eds_years ?? ""}
            onChange={(n, v) => handleFormChange(n as keyof ProdromalData, v)}
            error={errors["eds_years"]}
          />
          <YearInput 
            label="ระยะเวลามีอาการ (ปี)" 
            name="eds_duration" 
            value={form.eds_duration ?? ""}
            onChange={(n, v) => handleFormChange(n as keyof ProdromalData, v)}
            error={errors["eds_duration"]}
          />
        </div>
      </section>

      <section>
        <h4 className="font-semibold text-gray-800 mb-2">Autonomic Dysfunction</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <CheckBox 
            label="มีภาวะ ANS dysfunction" 
            name="autonomic_dysfunction" 
            checked={!!form.autonomic_dysfunction}
            onChange={(n, v) => handleFormChange(n as keyof ProdromalData, v)}
          />
          <YearInput 
            label="เริ่มมีอาการ (ปี)" 
            name="autonomic_years" 
            value={form.autonomic_years ?? ""}
            onChange={(n, v) => handleFormChange(n as keyof ProdromalData, v)}
            error={errors["autonomic_years"]}
          />
          <YearInput 
            label="ระยะเวลามีอาการ (ปี)" 
            name="autonomic_duration" 
            value={form.autonomic_duration ?? ""}
            onChange={(n, v) => handleFormChange(n as keyof ProdromalData, v)}
            error={errors["autonomic_duration"]}
          />
        </div>
      </section>

      <section>
        <h4 className="font-semibold text-gray-800 mb-2">Mild Parkinsonian Sign</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <CheckBox 
            label="พบอาการ Parkinsonian" 
            name="mild_parkinson_sign" 
            checked={!!form.mild_parkinson_sign}
            onChange={(n, v) => handleFormChange(n as keyof ProdromalData, v)}
          />
        </div>
      </section>

      <section>
        <h4 className="font-semibold text-gray-800 mb-2">Family History</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <CheckBox 
            label="มีประวัติครอบครัว PD" 
            name="family_history" 
            checked={!!form.family_history}
            onChange={(n, v) => handleFormChange(n as keyof ProdromalData, v)}
          />
          <TextInput 
            label="ความสัมพันธ์ (เช่น พ่อ แม่ พี่ น้อง)" 
            name="family_relation" 
            value={String(form.family_relation ?? "")}
            onChange={(n, v) => handleFormChange(n as keyof ProdromalData, v)}
            error={errors["family_relation"]}
          />
        </div>
      </section>

      <section>
        <h4 className="font-semibold text-gray-800 mb-2">Other Diagnosis</h4>
        <TextInput 
          label="การวินิจฉัยอื่น ๆ" 
          name="other_diagnosis" 
          value={String(form.other_diagnosis ?? "")}
          onChange={(n, v) => handleFormChange(n as keyof ProdromalData, v)}
          error={errors["other_diagnosis"]}
        />
      </section>

      <div className="flex justify-end pt-4 border-t">
        <button
          onClick={handleSaveProdromal}
          disabled={loading}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
        >
          {loading ? "กำลังบันทึก..." : "บันทึก Prodromal"}
        </button>
      </div>
    </div>
  );
};

// PD Input Component (moved outside to prevent re-creation on every render)
const PDInput = ({ 
  label, 
  name, 
  value, 
  onChange 
}: { 
  label: string; 
  name: "disease_duration" | "hy_stage"; 
  value: string | undefined;
  onChange: (name: "disease_duration" | "hy_stage", value: string) => void;
}) => {
  const inputId = `pd-input-${name}`;
  return (
    <div>
      <label htmlFor={inputId} className="block text-sm text-gray-600 mb-1">{label}</label>
      <input
        id={inputId}
        type="text"
        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        value={value ?? ""}
        onChange={(e) => onChange(name, e.target.value)}
      />
    </div>
  );
};

// PD Details Section Component
const PDDetailsSection = ({ patientId }: { patientId: number }) => {
  const [form, setForm] = useState<PDDetails>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const { data } = await supabase
        .from("pd_pd_details")
        .select("*")
        .eq("screening_id", patientId)
        .maybeSingle();
        if (data) {
          // Ensure boolean fields are properly converted
          const processedData: PDDetails = {
            newly_diagnosis: !!data.newly_diagnosis,
            pd: !!data.pd,
            disease_duration: data.disease_duration,
            hy_stage: data.hy_stage,
          };
          setForm(processedData);
        }
    };
    fetchData();
  }, [patientId]);

  const handleChange = (key: keyof PDDetails, value: any) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSavePD = async () => {
    setLoading(true);
    try {
      const { data: existing } = await supabase
        .from("pd_pd_details")
        .select("id")
        .eq("screening_id", patientId)
        .maybeSingle();

      if (existing) {
        await supabase.from("pd_pd_details").update(form).eq("screening_id", patientId);
      } else {
        await supabase.from("pd_pd_details").insert([{ screening_id: patientId, ...form }]);
      }

      alert("✅ บันทึก PD details สำเร็จ");
    } catch (err) {
      console.error(err);
      alert("❌ เกิดข้อผิดพลาดในการบันทึกข้อมูล");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <CheckBox 
        label="Newly Diagnosis" 
        name="newly_diagnosis" 
        checked={!!form.newly_diagnosis}
        onChange={(n, v) => handleChange(n as keyof PDDetails, v)}
      />
      <CheckBox 
        label="PD" 
        name="pd" 
        checked={!!form.pd}
        onChange={(n, v) => handleChange(n as keyof PDDetails, v)}
      />
      <PDInput 
        label="Disease Duration (ปี)" 
        name="disease_duration" 
        value={form.disease_duration}
        onChange={(n, v) => handleChange(n, v)}
      />
      <PDInput 
        label="H&Y Stage" 
        name="hy_stage" 
        value={form.hy_stage}
        onChange={(n, v) => handleChange(n, v)}
      />
      
      <div className="flex justify-end pt-4 border-t">
        <button
          onClick={handleSavePD}
          disabled={loading}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
        >
          {loading ? "กำลังบันทึก..." : "บันทึก PD Details"}
        </button>
      </div>
    </div>
  );
};

export default EditModal;