import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

interface PDDetailsModalProps {
  patientId: number;
  onClose: () => void;
}

interface PDDetails {
  newly_diagnosis?: boolean;
  pd?: boolean;
  disease_duration?: string;
  hy_stage?: string;
}

const PDDetailsModal = ({ patientId, onClose }: PDDetailsModalProps) => {
  const [form, setForm] = useState<PDDetails>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const { data } = await supabase
        .from("pd_pd_details")
        .select("*")
        .eq("screening_id", patientId)
        .maybeSingle();
      if (data) setForm(data);
    };
    fetchData();
  }, [patientId]);

  const handleChange = (key: keyof PDDetails, value: any) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
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
      onClose();
    } catch (err) {
      console.error(err);
      alert("❌ เกิดข้อผิดพลาดในการบันทึกข้อมูล");
    } finally {
      setLoading(false);
    }
  };

  const CheckBox = ({ label, name }: { label: string; name: keyof PDDetails }) => (
    <label className="flex items-center gap-2">
      <input
        type="checkbox"
        checked={!!form[name]}
        onChange={(e) => handleChange(name, e.target.checked)}
      />
      {label}
    </label>
  );

  const Input = ({ label, name }: { label: string; name: "disease_duration" | "hy_stage" }) => (
    <div>
      <label className="block text-sm text-gray-600 mb-1">{label}</label>
      <input
        type="text"
        className="w-full border rounded-lg px-3 py-2"
        value={form[name] ?? ""}
        onChange={(e) => handleChange(name, e.target.value)}
      />
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-xl w-full max-w-lg shadow-lg">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900">PD Details</h3>
          <button onClick={onClose}>✕</button>
        </div>

        <div className="p-6 space-y-4">
          <CheckBox label="Newly Diagnosis" name="newly_diagnosis" />
          <CheckBox label="PD" name="pd" />
          <Input label="Disease Duration (ปี)" name="disease_duration" />
          <Input label="H&Y Stage" name="hy_stage" />
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 bg-gray-100 rounded-lg">
            ยกเลิก
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg"
          >
            {loading ? "กำลังบันทึก..." : "บันทึก"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PDDetailsModal;
