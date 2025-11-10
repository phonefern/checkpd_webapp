import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { supabase } from '@/lib/supabase';
import { PatientData, EditScores } from './types';
import { conditionOptions } from './constants';
import otherDiagnosisData from '@/app/component/questions/other_diagnosis_dropdown.json';
import ProdromalDetailsModal from "./ProdromalDetailsModal";
import PDDetailsModal from './PDDetailsModal';
//app/component/papers/EditModal.tsx
interface EditModalProps {
    patient: PatientData;
    onClose: () => void;
    onSave: (updatedPatient: PatientData) => void;
}



const EditModal = ({ patient, onClose, onSave }: EditModalProps) => {
    const [editCondition, setEditCondition] = useState(patient.condition || '');
    const [editOther, setEditOther] = useState(patient.other || '');
    const [isCustomOther, setIsCustomOther] = useState(false);
    const [selectedOtherCategory, setSelectedOtherCategory] = useState('');
    const [selectedOtherDiagnosis, setSelectedOtherDiagnosis] = useState('');
    const [loading, setLoading] = useState(false);
    const [showProdromalModal, setShowProdromalModal] = useState(false);
    const [showPDModal, setShowPDModal] = useState(false);
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

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
            <div className="w-full max-w-lg bg-white rounded-xl shadow-lg">
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">แก้ไข Condition / Other</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
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
                            onChange={(e) => {
                                const newCondition = e.target.value;


                                setEditCondition(newCondition);


                                if (newCondition === 'Prodromal') {
                                    setShowProdromalModal(true);
                                } else if (newCondition === 'PD') {
                                    setShowPDModal(true);
                                }


                                // (async () => {
                                //     try {
                                //         if (patient.condition === 'Prodromal' && newCondition !== 'Prodromal') {
                                //             await supabase.from('pd_prodromal_details').delete().eq('screening_id', patient.id);
                                //         }
                                //         if (patient.condition === 'PD' && newCondition !== 'PD') {
                                //             await supabase.from('pd_pd_details').delete().eq('screening_id', patient.id);
                                //         }
                                //     } catch (err) {
                                //         console.error('Error clearing condition data:', err);
                                //     }
                                // })();
                            }}
                        >
                            <option value="">-</option>
                            {conditionOptions.map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                            ))}
                        </select>


                    </div>

        
                    {showProdromalModal && (
                        <ProdromalDetailsModal
                            patientId={patient.id}
                            patient={patient}
                            onClose={() => setShowProdromalModal(false)}
                        />
                    )}


                    {showPDModal && (
                        <PDDetailsModal
                            patientId={patient.id}
                            onClose={() => setShowPDModal(false)}
                        />
                    )}

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
                </div>
                <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                        disabled={loading}
                    >
                        ยกเลิก
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                        disabled={loading || (isCustomOther && editOther.trim() === '')}
                    >
                        {loading ? 'กำลังบันทึก...' : 'บันทึก'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EditModal;