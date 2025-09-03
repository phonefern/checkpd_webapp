"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from '@/lib/supabase';

const questions = [
  "ต้องเบ่งอุจจาระอย่างน้อย 25% ของการขับถ่ายทั้งหมด",
  "อุจจาระแข็งหรือก้อนนานในการถ่ายอย่างน้อย 25% ของการขับถ่ายทั้งหมด",
  "มีความรู้สึกว่าอุจจาระไม่หมดอย่างน้อย 25% ของการขับถ่ายทั้งหมด",
  "มีความรู้สึกว่ามีสิ่งกีดขวางที่ทวารหนัก/ลำไส้ตรงอย่างน้อย 25% ของการขับถ่ายทั้งหมด",
  "ต้องใช้มือช่วยในการขับถ่ายอย่างน้อย 25% ของการขับถ่ายทั้งหมด (เช่น การใช้มือช่วยดัน การหนุนท้อง)",
  "ขับถ่ายอุจจาระน้อยกว่า 3 ครั้งต่อสัปดาห์ (หากไม่ได้ใช้วิธีอื่นช่วย)",
];

export default function Rome4() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const thaiId = searchParams.get("patient_thaiid");

  const [answers, setAnswers] = useState<(boolean | null)[]>(Array(questions.length).fill(null));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState("");
  const [patientInfo, setPatientInfo] = useState<any>(null);

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
          .from('pd_screenings')
          .select('id, first_name, last_name, thaiid')
          .eq('thaiid', thaiId)
          .eq('user_id', session.user.id)
          .single();

        if (error) {
          console.error('Error fetching patient data:', error);
          setSubmitMessage("ไม่พบข้อมูลผู้ป่วยด้วยเลขบัตรประชาชนนี้");
        } else {
          setPatientInfo(data);
        }
      } catch (err) {
        console.error('Error fetching patient info:', err);
        setSubmitMessage("เกิดข้อผิดพลาดในการโหลดข้อมูลผู้ป่วย");
      }
    };

    fetchPatientInfo();
  }, [thaiId]);

  const handleAnswer = (index: number, value: boolean) => {
    const updated = [...answers];
    updated[index] = value;
    setAnswers(updated);
  };

  const totalScore = answers.filter((a) => a === true).length;

  const handleSubmit = async () => {
    if (!thaiId || !patientInfo) {
      setSubmitMessage("ไม่พบข้อมูลผู้ป่วย");
      return;
    }

    if (answers.some(a => a === null)) {
      setSubmitMessage("กรุณาตอบคำถามทั้งหมดก่อนส่งแบบประเมิน");
      return;
    }

    setIsSubmitting(true);
    setSubmitMessage("");

    try {
      const answerArray = answers.map(a => a ? 1 : 0);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("ไม่พบ session ผู้ใช้");
      }

      // ตรวจสอบว่ามี record เดิมอยู่หรือไม่
      const { data: existingRows } = await supabase
        .from('risk_factors_test')
        .select('id')
        .eq('user_id', session.user.id)
        .eq('thaiid', thaiId)

      const existingRecord = existingRows && existingRows.length > 0 ? existingRows[0] : null;

      let riskTestId: number | null = null;
      let dbError: any = null;

      if (existingRecord) {
        // ถ้ามี record → อัปเดต risk_factors_test
        const { data: updatedData, error: updateError } = await supabase
          .from('risk_factors_test')
          .update({
            rome4_answer: answerArray,
            rome4_score: totalScore,
            user_id: session.user.id,
            patient_id: patientInfo.id,
            thaiid: thaiId,
          })
          .eq('id', existingRecord.id)


        dbError = updateError;
        

        // ลบคะแนนเก่าออกก่อนแล้วค่อย insert ใหม่
        await supabase.from('risk_factors_scores').delete().eq('risk_test_id', riskTestId);
      } else {
        // ถ้ายังไม่มี → insert risk_factors_test ใหม่
        const { data: insertedData, error: insertError } = await supabase
          .from('risk_factors_test')
          .insert([{
              user_id: session.user.id,
              patient_id: patientInfo.id,
              thaiid: thaiId,
              rome4_answer: answers,
              rome4_score: totalScore,
          }])
          .select()
          .single();

        dbError = insertError;
        riskTestId = insertedData?.id;
      }

      // บันทึกคะแนนใหม่ลง risk_factors_scores
      if (!dbError && riskTestId) {
        const { error: scoreError } = await supabase
          .from('risk_factors_scores')
          .insert([{
            risk_test_id: riskTestId,
            score_type: 'total',
            score_value: totalScore,
          }]);

        if (scoreError) {
          console.error('Error inserting score:', scoreError);
          setSubmitMessage("เกิดข้อผิดพลาดในการบันทึกคะแนน");
          return;
        }
      }

      if (dbError) {
        console.error('Error saving assessment:', dbError);
        setSubmitMessage(`เกิดข้อผิดพลาด: ${dbError.message}`);
      } else {
        setSubmitMessage("บันทึกผลการประเมินเรียบร้อยแล้ว!");
        setTimeout(() => router.back(), 1200);
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      setSubmitMessage("เกิดข้อผิดพลาดที่ไม่คาดคิด");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto mt-10 bg-white p-8 rounded-lg shadow">
      <h1 className="text-2xl font-bold text-center mb-6">แบบประเมิน ROME 4</h1>

      {thaiId && patientInfo && (
        <div className="mb-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-blue-700 text-center">
            กำลังทำแบบประเมินสำหรับ: {patientInfo.first_name} {patientInfo.last_name} 
            ({thaiId})
          </p>
        </div>
      )}

      <p className="mb-4 text-center">
        ท่านมีอาการดังต่อไปนี้มาเป็นระยะเวลาอย่างน้อย <strong>3 เดือน</strong> หรือไม่
      </p>

      <table className="w-full border border-gray-300 mb-6">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-gray-300 px-3 py-2 w-[70%] text-left">
              อาการ
            </th>
            <th className="border border-gray-300 px-3 py-2 text-center w-[15%]">
              ใช่
            </th>
            <th className="border border-gray-300 px-3 py-2 text-center w-[15%]">
              ไม่ใช่
            </th>
          </tr>
        </thead>
        <tbody>
          {questions.map((q, i) => (
            <tr key={i}>
              <td className="border border-gray-300 px-3 py-2">{q}</td>
              <td className="border border-gray-300 text-center">
                <input
                  type="radio"
                  name={`q${i}`}
                  checked={answers[i] === true}
                  onChange={() => handleAnswer(i, true)}
                  className="h-4 w-4"
                />
              </td>
              <td className="border border-gray-300 text-center">
                <input
                  type="radio"
                  name={`q${i}`}
                  checked={answers[i] === false}
                  onChange={() => handleAnswer(i, false)}
                  className="h-4 w-4"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-6 flex justify-between items-center mb-4">
        <p className="font-bold">
          รวมคะแนน:{" "}
          <span className="text-blue-600">{totalScore}</span> / {questions.length}
        </p>
        <p className="font-bold">
          ผลการประเมิน:{" "}
          <span className={totalScore >= 2 ? "text-red-600" : "text-green-600"}>
            {totalScore >= 2
              ? "มีโอกาสเป็นท้องผูกเรื้อรัง"
              : "ปกติ (ไม่มีสัญญาณชัดเจนของท้องผูก)"}
          </span>
        </p>
      </div>

      <div className="flex justify-center mt-6">
        <button
          onClick={handleSubmit}
          disabled={isSubmitting || answers.some(a => a === null) || !thaiId || !patientInfo}
          className={`px-6 py-2 rounded text-white ${
            isSubmitting || answers.some(a => a === null) || !thaiId || !patientInfo
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {isSubmitting ? "กำลังบันทึก..." : "ส่งแบบประเมิน"}
        </button>
      </div>

      {submitMessage && (
        <div className={`mt-4 p-3 rounded text-center ${
          submitMessage.includes("เรียบร้อย") 
            ? "bg-green-100 text-green-700" 
            : "bg-red-100 text-red-700"
        }`}>
          {submitMessage}
        </div>
      )}
    </div>
  );
}
