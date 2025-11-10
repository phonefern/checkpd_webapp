import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { PatientData, EditScores } from './types';

interface ProdromalDetailsModalProps {
  patientId: number;
  patient: PatientData;
  onClose: () => void;
}

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

const ProdromalDetailsModal = ({ patientId, patient, onClose }: ProdromalDetailsModalProps) => {
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

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchDetails = async () => {
      const { data, error } = await supabase
        .from("pd_prodromal_details")
        .select("*")
        .eq("screening_id", patientId)
        .maybeSingle();

      if (data) setForm((prev) => ({ ...prev, ...data }));
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

    const cleanValue = value.replace(/[^0-9.]/g, "");
    setEditScores(prev => ({
      ...prev,
      [key]: cleanValue === "" ? null : Number(cleanValue)
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
      // Validate only when the stored value is a string (avoid boolean values from checkboxes)
      if (typeof value === 'string' && value !== "" && !/^\d*\.?\d*$/.test(value)) {
        newErrors[field] = 'กรุณากรอกตัวเลขเท่านั้น';
      }
    });

    // Validate other_diagnosis - ต้องเป็นตัวอักษรเท่านั้น
    if (form.other_diagnosis && !/^[a-zA-Zก-๙\s]*$/.test(form.other_diagnosis)) {
      newErrors.other_diagnosis = 'กรุณากรอกตัวอักษรเท่านั้น';
    }

    // Validate family_relation - ต้องเป็นตัวอักษรเท่านั้น
    if (form.family_relation && !/^[a-zA-Zก-๙\s]*$/.test(form.family_relation)) {
      newErrors.family_relation = 'กรุณากรอกตัวอักษรเท่านั้น';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
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

      // update scores (ในตาราง risk_factors)
      await supabase
        .from("pd_risk_factors")
        .update(editScores)
        .eq("screening_id", patientId);

      alert("✅ บันทึกข้อมูลสำเร็จ");
      onClose();
    } catch (err) {
      console.error(err);
      alert("❌ เกิดข้อผิดพลาดในการบันทึกข้อมูล");
    } finally {
      setLoading(false);
    }
  };

  const YearInput = ({ label, name }: { label: string; name: keyof ProdromalData }) => {
    const inputId = `year-input-${name}`;
    return (
      <div>
        <label
          htmlFor={inputId}
          className="block text-xs text-gray-600 mb-1"
        >
          {label}
        </label>
        <input
          id={inputId}
          name={name}
          type="text"
          // inputMode="decimal"
          value={form[name] === undefined || form[name] === null ? "" : String(form[name])}
          onChange={(e) => {
            const cleanValue = e.target.value.replace(/[^0-9.]/g, "");
            handleFormChange(name, cleanValue === "" ? "" : cleanValue);
          }}
          className={`w-full border rounded-lg px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors[name] ? 'border-red-500' : ''
            }`}
          placeholder="ตัวเลขเท่านั้น"
        />
        {errors[name] && <p className="text-red-500 text-xs mt-1">{errors[name]}</p>}
      </div>
    );
  };


  const TextInput = ({ label, name }: { label: string; name: keyof ProdromalData }) => {
    const inputId = `text-input-${name}`;
    return (
      <div>
        <label htmlFor={inputId} className="block text-xs text-gray-600 mb-1">
          {label}
        </label>
        <input
          id={inputId}
          name={name}
          type="text"
          value={String(form[name] ?? "")}
          onChange={(e) => {
            const cleanValue = e.target.value.replace(/[^a-zA-Zก-๙\s]/g, "");
            handleFormChange(name, cleanValue);
          }}
          className={`w-full border rounded-lg px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors[name] ? 'border-red-500' : ''
            }`}
          placeholder="ตัวอักษรเท่านั้น"
        />
        {errors[name] && <p className="text-red-500 text-xs mt-1">{errors[name]}</p>}
      </div>
    );
  };


  const ScoreInput = ({ label, name }: { label: string; name: keyof EditScores }) => {
    const inputId = `score-input-${name}`;
    return (
      <div>
        <label htmlFor={inputId} className="block text-xs text-gray-600 mb-1">
          {label}
        </label>
        <input
          id={inputId}
          name={name}
          type="text"
          inputMode="decimal"
          value={editScores[name] ?? ""}
          onChange={(e) => handleScoreChange(name, e.target.value)}
          className={`w-full border rounded-lg px-2 py-1 focus:ring-2 focus:ring-green-500 focus:border-green-500 ${errors[name] ? 'border-red-500' : ''
            }`}
          placeholder="ตัวเลขเท่านั้น"
        />
        {errors[name] && <p className="text-red-500 text-xs mt-1">{errors[name]}</p>}
      </div>
    );
  };


  const CheckBox = ({ label, name }: { label: string; name: keyof ProdromalData }) => {
    const inputId = `checkbox-${name}`;
    return (
      <div className="flex items-center gap-2 text-sm text-gray-700">
        <input
          id={inputId}
          name={name}
          type="checkbox"
          checked={!!form[name]}
          onChange={(e) => handleFormChange(name, e.target.checked)}
          className="w-4 h-4"
        />
        <label htmlFor={inputId}>{label}</label>
      </div>
    );
  };


  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-xl w-full max-w-5xl shadow-lg overflow-y-auto max-h-[90vh]">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            รายละเอียดเพิ่มเติม (Prodromal)
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          <section>
            <h4 className="font-semibold text-gray-800 mb-2">Suspected RBD</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <CheckBox label="มีอาการละเมอ" name="suspected_rbd" />
              <YearInput label="อายุเริ่มมีอาการ (ปี)" name="rbd_years" />
              <YearInput label="ระยะเวลามีอาการ (ปี)" name="rbd_duration" />

            </div>
          </section>

          <section>
            <h4 className="font-semibold text-gray-800 mb-2">Hyposmia</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <CheckBox label="กลิ่นลดลง" name="hyposmia" />
              <YearInput label="อายุเริ่มมีอาการ (ปี)" name="hyposmia_years" />
              <YearInput label="ระยะเวลามีอาการ (ปี)" name="hyposmia_duration" />

            </div>
          </section>

          <section>
            <h4 className="font-semibold text-gray-800 mb-2">Constipation</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <CheckBox label="ท้องผูก" name="constipation" />
              <YearInput label="อายุเริ่มมีอาการ (ปี)" name="constipation_years" />
              <YearInput label="ระยะเวลามีอาการ (ปี)" name="constipation_duration" />

            </div>
          </section>

          <section>
            <h4 className="font-semibold text-gray-800 mb-2">Depression</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <CheckBox label="ภาวะซึมเศร้า" name="depression" />
              <YearInput label="อายุเริ่มมีอาการ (ปี)" name="depression_years" />
              <YearInput label="ระยะเวลามีอาการ (ปี)" name="depression_duration" />

            </div>
          </section>

          <section>
            <h4 className="font-semibold text-gray-800 mb-2">EDS</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <CheckBox label="ง่วงตอนกลางวัน" name="eds" />
              <YearInput label="อายุเริ่มมีอาการ (ปี)" name="eds_years" />
              <YearInput label="ระยะเวลามีอาการ (ปี)" name="eds_duration" />

            </div>
          </section>

          <section>
            <h4 className="font-semibold text-gray-800 mb-2">Autonomic Dysfunction</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <CheckBox label="มีภาวะ ANS dysfunction" name="autonomic_dysfunction" />
              <YearInput label="เริ่มมีอาการ (ปี)" name="autonomic_years" />
              <YearInput label="ระยะเวลามีอาการ (ปี)" name="autonomic_duration" />
            </div>
          </section>

          <section>
            <h4 className="font-semibold text-gray-800 mb-2">Mild Parkinsonian Sign</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <CheckBox label="พบอาการ Parkinsonian" name="mild_parkinson_sign" />

            </div>
          </section>

          <section>
            <h4 className="font-semibold text-gray-800 mb-2">Family History</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <CheckBox label="มีประวัติครอบครัว PD" name="family_history" />
              <TextInput label="ความสัมพันธ์ (เช่น พ่อ แม่ พี่ น้อง)" name="family_relation" />
            </div>
          </section>

          <section>
            <h4 className="font-semibold text-gray-800 mb-2">Other Diagnosis</h4>
            <TextInput label="การวินิจฉัยอื่น ๆ" name="other_diagnosis" />
          </section>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            ยกเลิก
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? "กำลังบันทึก..." : "บันทึก"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProdromalDetailsModal;