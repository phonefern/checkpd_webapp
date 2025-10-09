"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

interface PatientInfo {
  id: string;
  first_name: string;
  last_name: string;
  thaiid: string;
}

export default function TmseForm({ thaiId }: { thaiId?: string }) {
  const router = useRouter();
  const [answers, setAnswers] = useState<number[]>(Array(19).fill(0));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState("");
  const [patientInfo, setPatientInfo] = useState<PatientInfo | null>(null);

  const sections = [
    { title: "1. Orientation (6 คะแนน)", count: 6, max: 1 },
    { title: "2. Registration (3 คะแนน)", count: 1, max: 3 },
    { title: "3. Attention (5 คะแนน)", count: 1, max: 5 },
    { title: "4. Calculation (3 คะแนน)", count: 1, max: 3 },
    { title: "5. Language (10 คะแนน)", count: 9, max: 1 },
    { title: "6. Recall (3 คะแนน)", count: 1, max: 3 },
  ];

  useEffect(() => {
    if (!thaiId) {
      setSubmitMessage("ไม่พบข้อมูลผู้ป่วย กรุณาเลือกผู้ป่วยก่อนทำแบบประเมิน");
      return;
    }

    const fetchPatientInfo = async () => {
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
        console.error(error);
        setSubmitMessage("ไม่พบข้อมูลผู้ป่วยในระบบ");
      } else {
        setPatientInfo(data);
      }
    };

    fetchPatientInfo();
  }, [thaiId]);

  const handleAnswer = (index: number, value: number) => {
    const updated = [...answers];
    updated[index] = value;
    setAnswers(updated);
  };

  const totalScore = answers.reduce((a, b) => a + b, 0);

  const handleSubmit = async () => {
    if (!thaiId || !patientInfo) {
      setSubmitMessage("ไม่พบข้อมูลผู้ป่วย");
      return;
    }

    setIsSubmitting(true);
    setSubmitMessage("");

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("ไม่พบ session ผู้ใช้");

      const { error: upsertError } = await supabase
        .from("risk_factors_test")
        .upsert(
          {
            user_id: session.user.id,
            patient_id: patientInfo.id,
            thaiid: thaiId,
            tmse_answer: answers,
            tmse_score: totalScore,
          },
          { onConflict: "patient_id" }
        );

      if (upsertError) {
        console.error(upsertError);
        setSubmitMessage(`เกิดข้อผิดพลาด: ${upsertError.message}`);
      } else {
        setSubmitMessage("บันทึกผล TMSE เรียบร้อยแล้ว!");
        setTimeout(() => router.back(), 1500);
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      setSubmitMessage("เกิดข้อผิดพลาดที่ไม่คาดคิด");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderQuestions = () => {
    const elements: React.ReactElement[] = [];
    let currentIndex = 0;

    sections.forEach((section, sectionIndex) => {
      const questionIndices = Array.from(
        { length: section.count },
        (_, i) => currentIndex + i
      );

      elements.push(
        <div key={`section-${sectionIndex}`} className="border rounded-lg p-4">
          <h2 className="font-semibold text-lg mb-3 text-gray-700">
            {section.title}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {questionIndices.map((qIndex) => (
              <div key={`question-${qIndex}`} className="flex flex-col items-center">
                <label className="text-sm text-gray-600 mb-1">
                  ข้อ {qIndex + 1}
                </label>
                <input
                  type="number"
                  min={0}
                  max={section.max}
                  value={answers[qIndex] || ""}
                  onChange={(e) =>
                    handleAnswer(qIndex, Number(e.target.value) || 0)
                  }
                  className="w-20 border rounded px-2 py-1 text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-xs text-gray-500 mt-1">
                  (0-{section.max})
                </span>
              </div>
            ))}
          </div>
        </div>
      );

      currentIndex += section.count;
    });

    return elements;
  };

  return (
    <div className="max-w-4xl mx-auto mt-10 bg-white p-4 sm:p-6 md:p-8 rounded-lg shadow">
      <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-center mb-6 text-gray-800">
        แบบประเมิน Thai Mental State Examination (TMSE)
      </h1>

      {thaiId && patientInfo && (
        <div className="mb-4 p-3 bg-blue-50 rounded-lg text-center text-blue-700 text-sm sm:text-base">
          กำลังทำแบบประเมินสำหรับ: {patientInfo.first_name}{" "}
          {patientInfo.last_name} ({thaiId})
        </div>
      )}

      <div className="space-y-6">
        {renderQuestions()}
      </div>

      {/* รวมคะแนน */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-8 mb-6 p-4 bg-gray-50 rounded-lg">
        <p className="font-bold text-base sm:text-lg">
          รวมคะแนนทั้งหมด:{" "}
          <span className="text-blue-600">{totalScore}</span> / 30
        </p>
        <p
          className={`font-bold text-base sm:text-lg ${
            totalScore < 23 ? "text-red-600" : "text-green-600"
          }`}
        >
          ผลประเมิน:{" "}
          {totalScore < 23 ? "มีแนวโน้มภาวะสมองเสื่อม" : "ปกติ"}
        </p>
      </div>

      <div className="flex justify-center">
        <button
          onClick={handleSubmit}
          disabled={isSubmitting || !thaiId || !patientInfo}
          className={`w-full sm:w-auto px-6 py-3 rounded text-white font-semibold transition-colors ${
            isSubmitting || !thaiId || !patientInfo
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {isSubmitting ? "กำลังบันทึก..." : "ส่งแบบประเมิน"}
        </button>
      </div>

      {submitMessage && (
        <div
          className={`mt-4 p-3 rounded text-center text-sm sm:text-base ${
            submitMessage.includes("เรียบร้อย")
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