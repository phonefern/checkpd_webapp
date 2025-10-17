import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

interface ProdromalDetailsModalProps {
  patientId: number;
  onClose: () => void;
}

interface ProdromalData {
  suspected_rbd?: boolean;
  rbd_years?: string;
  rbd_duration?: string;
  rbd_score?: string;

  hyposmia?: boolean;
  hyposmia_years?: string;
  hyposmia_duration?: string;
  sniffin_score?: string;

  constipation?: boolean;
  constipation_years?: string;
  constipation_duration?: string;
  rome_score?: string;

  depression?: boolean;
  depression_years?: string;
  depression_duration?: string;
  hamd_score?: string;

  eds?: boolean;
  eds_years?: string;
  eds_duration?: string;
  ess_score?: string;

  autonomic_dysfunction?: boolean;
  autonomic_years?: string;
  autonomic_duration?: string;
  ans_score?: string;

  mild_parkinson_sign?: boolean;
  updrs_score?: string;

  family_history?: boolean;
  family_relation?: string;

  other_diagnosis?: string;
}

const ProdromalDetailsModal = ({ patientId, onClose }: ProdromalDetailsModalProps) => {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<ProdromalData>({});

  // โหลดข้อมูลเดิมจาก database
  useEffect(() => {
    const fetchDetails = async () => {
      const { data, error } = await supabase
        .from("pd_prodromal_details")
        .select("*")
        .eq("screening_id", patientId)
        .maybeSingle();

      if (data) setForm(data);
      if (error && error.code !== "PGRST116") console.error(error);
    };
    fetchDetails();
  }, [patientId]);

  const handleChange = (key: keyof ProdromalData, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const { data: existing } = await supabase
        .from("pd_prodromal_details")
        .select("id")
        .eq("screening_id", patientId)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("pd_prodromal_details")
          .update(form)
          .eq("screening_id", patientId);
      } else {
        await supabase
          .from("pd_prodromal_details")
          .insert([{ screening_id: patientId, ...form }]);
      }

      alert("✅ บันทึกข้อมูลสำเร็จ");
      onClose();
    } catch (err) {
      console.error(err);
      alert("❌ เกิดข้อผิดพลาดในการบันทึกข้อมูล");
    } finally {
      setLoading(false);
    }
  };

  const Input = ({
    label,
    name,
    type = "text",
    placeholder,
  }: {
    label: string;
    name: keyof ProdromalData;
    type?: string;
    placeholder?: string;
  }) => (
    <div>
      <label className="block text-xs text-gray-600 mb-1">{label}</label>
      <input
        type={type}
        value={String(form[name] ?? "")}
        onChange={(e) => handleChange(name, e.target.value)}
        placeholder={placeholder}
        className="w-full border rounded-lg px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      />
    </div>
  );

  const CheckBox = ({
    label,
    name,
  }: {
    label: string;
    name: keyof ProdromalData;
  }) => (
    <label className="flex items-center gap-2 text-sm text-gray-700">
      <input
        type="checkbox"
        checked={!!form[name]}
        onChange={(e) => handleChange(name, e.target.checked)}
      />
      {label}
    </label>
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-xl w-full max-w-5xl shadow-lg overflow-y-auto max-h-[90vh]">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            รายละเอียดเพิ่มเติม (Prodromal)
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">

          {/* 1️⃣ Suspected RBD */}
          <section>
            <h4 className="font-semibold text-gray-800 mb-2">Suspected RBD</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <CheckBox label="มีอาการละเมอ" name="suspected_rbd" />
              <Input label="ระยะเวลา (ปี)" name="rbd_years" />
              <Input label="ละเมอมานาน (ปี)" name="rbd_duration" />
              <Input label="RBD Score" name="rbd_score" />
            </div>
          </section>

          {/* 2️⃣ Hyposmia */}
          <section>
            <h4 className="font-semibold text-gray-800 mb-2">Hyposmia</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <CheckBox label="มีอาการกลิ่นลดลง" name="hyposmia" />
              <Input label="เริ่มมีอาการ (ปี)" name="hyposmia_years" />
              <Input label="ระยะเวลามีอาการ (ปี)" name="hyposmia_duration" />
              <Input label="Sniffin’s Score" name="sniffin_score" />
            </div>
          </section>

          {/* 3️⃣ Constipation */}
          <section>
            <h4 className="font-semibold text-gray-800 mb-2">Constipation</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <CheckBox label="มีอาการท้องผูก" name="constipation" />
              <Input label="เริ่มมีอาการ (ปี)" name="constipation_years" />
              <Input label="ระยะเวลามีอาการ (ปี)" name="constipation_duration" />
              <Input label="ROME IV Score" name="rome_score" />
            </div>
          </section>

          {/* 4️⃣ Depression */}
          <section>
            <h4 className="font-semibold text-gray-800 mb-2">Depression</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <CheckBox label="มีภาวะซึมเศร้า" name="depression" />
              <Input label="เริ่มมีอาการ (ปี)" name="depression_years" />
              <Input label="ระยะเวลามีอาการ (ปี)" name="depression_duration" />
              <Input label="HAM-D Score" name="hamd_score" />
            </div>
          </section>

          {/* 5️⃣ EDS */}
          <section>
            <h4 className="font-semibold text-gray-800 mb-2">
              Excessive Daytime Sleepiness (EDS)
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <CheckBox label="ง่วงนอนตอนกลางวัน" name="eds" />
              <Input label="เริ่มมีอาการ (ปี)" name="eds_years" />
              <Input label="ระยะเวลามีอาการ (ปี)" name="eds_duration" />
              <Input label="ESS Score" name="ess_score" />
            </div>
          </section>

          {/* 6️⃣ Autonomic Dysfunction */}
          <section>
            <h4 className="font-semibold text-gray-800 mb-2">Autonomic Dysfunction</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <CheckBox label="มีภาวะ ANS dysfunction" name="autonomic_dysfunction" />
              <Input label="เริ่มมีอาการ (ปี)" name="autonomic_years" />
              <Input label="ระยะเวลามีอาการ (ปี)" name="autonomic_duration" />
              <Input label="ANS Score" name="ans_score" />
            </div>
          </section>

          {/* 7️⃣ Mild Parkinsonian Sign */}
          <section>
            <h4 className="font-semibold text-gray-800 mb-2">Mild Parkinsonian Sign</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <CheckBox label="พบอาการ Parkinsonian" name="mild_parkinson_sign" />
              <Input label="UPDRS Score" name="updrs_score" />
            </div>
          </section>

          {/* 8️⃣ Family History */}
          <section>
            <h4 className="font-semibold text-gray-800 mb-2">Family History</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <CheckBox label="มีประวัติครอบครัว PD" name="family_history" />
              <Input label="ความสัมพันธ์ (เช่น พ่อ แม่ พี่ น้อง)" name="family_relation" />
            </div>
          </section>

          {/* 9️⃣ Other Diagnosis */}
          <section>
            <h4 className="font-semibold text-gray-800 mb-2">Other Diagnosis</h4>
            <Input label="การวินิจฉัยอื่น ๆ" name="other_diagnosis" />
          </section>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 bg-gray-100 rounded-lg">
            ยกเลิก
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "กำลังบันทึก..." : "บันทึก"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProdromalDetailsModal;
