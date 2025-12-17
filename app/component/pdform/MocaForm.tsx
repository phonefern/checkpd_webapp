// app/component/pdform/MocaForm.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const sections = [
  { title: "VISUOSPATIAL / EXECUTIVE", max: 5 },
  { title: "NAMING", max: 3 },
  { title: "MEMORY", max: 0 },
  { title: "ATTENTION (Repeat)", max: 2 },
  { title: "ATTENTION (Concentration)", max: 1 },
  { title: "ATTENTION (Counting)", max: 3 },
  { title: "LANGUAGE (Sentence repetition)", max: 2 },
  { title: "LANGUAGE (Fluency)", max: 1 },
  { title: "ABSTRACTION", max: 2 },
  { title: "DELAYED RECALL", max: 5 },
  { title: "ORIENTATION", max: 6 },
];

export default function MocaForm({ thaiId }: { thaiId?: string }) {
  const router = useRouter();
  const [answers, setAnswers] = useState<number[]>(Array(11).fill(0));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState("");
  const [patientInfo, setPatientInfo] = useState<any>(null);

  // โหลดข้อมูลผู้ป่วยจากเลขบัตรประชาชน
  useEffect(() => {
    if (!thaiId) {
      setSubmitMessage("ไม่พบข้อมูลผู้ป่วย กรุณาเลือกผู้ป่วยก่อนทำแบบประเมิน");
      return;
    }

    const fetchPatientInfo = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setSubmitMessage("กรุณาเข้าสู่ระบบก่อน");
          return;
        }

        const { data, error } = await supabase
          .from("pd_screenings")
          .select("id, first_name, last_name, thaiid")
          .eq("thaiid", thaiId)
          .single();

        if (error) {
          console.error("Error fetching patient data:", error);
          setSubmitMessage("ไม่พบข้อมูลผู้ป่วยด้วยเลขบัตรประชาชนนี้");
        } else {
          setPatientInfo(data);
        }
      } catch (err) {
        console.error("Error fetching patient info:", err);
        setSubmitMessage("เกิดข้อผิดพลาดในการโหลดข้อมูลผู้ป่วย");
      }
    };

    fetchPatientInfo();
  }, [thaiId]);




  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.select();
  };


  const handleAnswer = (index: number, value: string) => {
    const maxScore = sections[index].max;

    // If input is empty, treat as 0 immediately
    if (value === "") {
      const updated = [...answers];
      updated[index] = 0;
      setAnswers(updated);
      return;
    }

    // Parse only digits, remove leading zeros, clamp to max
    let numValue = parseInt(value.replace(/^0+/, "") || "0", 10);
    numValue = Math.max(0, Math.min(numValue, maxScore));

    const updated = [...answers];
    updated[index] = numValue;
    setAnswers(updated);
  };




  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    const maxScore = sections[index].max;
    const currentValue = answers[index] ?? 0;

    if (e.key === "ArrowUp") {
      e.preventDefault();
      const updated = [...answers];
      updated[index] = Math.min(currentValue + 1, maxScore);
      setAnswers(updated);
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      const updated = [...answers];
      updated[index] = Math.max(currentValue - 1, 0);
      setAnswers(updated);
    }
  };



  const totalScore = answers.reduce((acc, val) => acc + val, 0);

  const handleSubmit = async () => {
    if (!thaiId || !patientInfo) {
      setSubmitMessage("ไม่พบข้อมูลผู้ป่วย");
      return;
    }

    setIsSubmitting(true);
    setSubmitMessage("");

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("ไม่พบ session ผู้ใช้");
      }

      // ใช้ upsert แทน insert/update
      const { error: upsertError } = await supabase
        .from("risk_factors_test")
        .upsert(
          [
            {
              user_id: session.user.id,
              patient_id: patientInfo.id,
              thaiid: thaiId,
              moca_answer: answers,
              moca_score: totalScore,
            },
          ],
          { onConflict: "patient_id" }
        );

      if (upsertError) {
        console.error("Error saving assessment:", upsertError);
        setSubmitMessage(`เกิดข้อผิดพลาด: ${upsertError.message}`);
      } else {
        console.log("Assessment saved successfully");
        setSubmitMessage("บันทึกผลการประเมินเรียบร้อยแล้ว!");
        await new Promise((resolve) => setTimeout(resolve, 1500));

        router.back();
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      setSubmitMessage("เกิดข้อผิดพลาดที่ไม่คาดคิด");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto mt-10 bg-white p-8 rounded-lg shadow">
      <h1 className="text-2xl font-bold text-center mb-6">
        แบบประเมิน Montreal Cognitive Assessment (MoCA)
      </h1>

      {thaiId && patientInfo && (
        <div className="mb-4 p-3 bg-blue-50 rounded-lg text-center text-blue-700">
          กำลังทำแบบประเมินสำหรับ: {patientInfo.first_name}{" "}
          {patientInfo.last_name} ({thaiId})
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full border border-gray-300 mb-6">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 px-3 py-2 text-left">
                หมวดการประเมิน
              </th>
              <th className="border border-gray-300 px-3 py-2 text-center">
                คะแนน (สูงสุด)
              </th>
            </tr>
          </thead>
          <tbody>
            {sections.map((section, i) => (
              <tr key={i}>
                <td className="border border-gray-300 px-3 py-2">
                  {section.title}
                </td>
                <td className="border border-gray-300 text-center">
                  <input
                    type="number"
                    min={0}
                    max={sections[i].max}
                    value={answers[i] ?? 0}
                    onChange={(e) => handleAnswer(i, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, i)}
                    onFocus={handleFocus}
                    className="w-20 border rounded px-2 py-1 text-center"
                  />


                  <span className="ml-1 text-sm text-gray-500">
                    / {section.max}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-between items-center mb-6">
        <p className="font-bold text-lg">
          รวมคะแนนทั้งหมด:{" "}
          <span className="text-blue-600">{totalScore}</span> / 30
        </p>
        <p
          className={`font-bold text-lg ${totalScore < 26 ? "text-red-600" : "text-green-600"
            }`}
        >
          ผลประเมิน:{" "}
          {totalScore < 26 ? "อาจมีความบกพร่องทางสติปัญญา" : "ปกติ"}
        </p>
      </div>

      <div className="flex justify-center">
        <button
          onClick={handleSubmit}
          disabled={isSubmitting || !thaiId || !patientInfo}
          className={`px-6 py-2 rounded text-white ${isSubmitting || !thaiId || !patientInfo
            ? "bg-gray-400 cursor-not-allowed"
            : "bg-blue-600 hover:bg-blue-700"
            }`}
        >
          {isSubmitting  ? "กำลังบันทึก..." : "ส่งแบบประเมิน"} {isSubmitting && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm z-50">
              <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-600 border-solid mb-4"></div>
              <p className="text-lg font-semibold text-blue-600">กำลังบันทึกผลการประเมิน...</p>
            </div>
          )}

        </button>
      </div>

      {submitMessage && (
        <div
          className={`mt-4 p-3 rounded text-center ${submitMessage.includes("เรียบร้อย")
            ? "bg-green-100 text-green-700"
            : "bg-red-100 text-red-700"
            }`}
        >
          {submitMessage}
        </div>
      )}
    </div>
  );
}