"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

interface PatientInfo {
  id: string;
  first_name: string;
  last_name: string;
  thaiid: string;
}

interface Question {
  id: number;
  text: string;
  category: string;
}

export default function FoodForm({ thaiId }: { thaiId?: string }) {
  const router = useRouter();
  const [patientInfo, setPatientInfo] = useState<PatientInfo | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState("");
  const [answers, setAnswers] = useState<number[]>(Array(10).fill(-1));

  const QUESTIONS: Question[] = [
    {
      id: 1,
      text: "ท่านบริโภค ผัก (ผักใบเขียว มะเขือเทศ แครอท ฯลฯ) อย่างน้อยวันละ 2 มื้อ หรือไม่",
      category: "ผัก",
    },
    {
      id: 2,
      text: "ท่านบริโภค ผลไม้ หรือดื่มน้ำผลไม้คั้นสด อย่างน้อย 1-2 ครั้งต่อวันหรือไม่",
      category: "ผลไม้",
    },
    {
      id: 3,
      text: "ท่านรับประทานถั่วต่าง ๆ (ถั่วลิสง เม็ดมะม่วงหิมพานต์ อัลมอนด์ และถั่วเมล็ดแห้ง ถั่วแดง ถั่วดำ ฯลฯ) อย่างน้อย 3 ครั้งต่อสัปดาห์หรือไม่",
      category: "ธัญพืช",
    },
    {
      id: 4,
      text: "ท่านบริโภค ธัญพืชไม่ขัดสี (ข้าวกล้อง ขนมปังธัญพืช) เป็นประจำหรือไม่",
      category: "ธัญพืช",
    },
    {
      id: 5,
      text: "ท่านบริโภคเนื้อสัตว์เนื้อขาว (ไก่ ปลา/อาหารทะเล) อย่างน้อย 2 ครั้งต่อสัปดาห์หรือไม่",
      category: "โปรตีน",
    },
    {
      id: 6,
      text: "ท่านบริโภค เนื้อแดง (เนื้อหมู เนื้อวัว) น้อยกว่า 2 ครั้งต่อสัปดาห์หรือไม่",
      category: "โปรตีน",
    },
    {
      id: 7,
      text: "ท่านหลีกเลี่ยงการบริโภค เนื้อสัตว์แปรรูป (หมูยอ กุนเชียง เบคอน ไส้กรอก ฯลฯ) หรือไม่",
      category: "อาหารแปรรูป",
    },
    {
      id: 8,
      text: "ท่านบริโภค ผลิตภัณฑ์จากนม (โยเกิร์ต ชีส นม)  1-2 ครั้งต่อสัปดาห์หรือไม่",
      category: "นม",
    },
    {
      id: 9,
      text: "ท่านใช้ น้ำมันมะกอก เป็นน้ำมันหลักในการปรุงประกอบอาหารหรือไม่",
      category: "ไขมัน",
    },
    {
      id: 10,
      text: "ท่านหลีกเลี่ยง ขนมหวาน/เบเกอรี ที่มีน้ำตาลสูง และเลือกผลไม้หรือถั่วแทนหรือไม่",
      category: "น้ำตาล",
    },
  ];

  const totalScore = answers.filter((a) => a === 1).length;
  const answeredCount = answers.filter((a) => a !== -1).length;
  const isComplete = answeredCount === QUESTIONS.length;

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

  const handleAnswerChange = (index: number, value: number) => {
    setAnswers((prev) => {
      const updated = [...prev];
      updated[index] = value;
      return updated;
    });
  };

  const handleSubmit = async () => {
    if (!thaiId || !patientInfo) {
      setSubmitMessage("ไม่พบข้อมูลผู้ป่วย");
      return;
    }

    if (!isComplete) {
      setSubmitMessage("กรุณาตอบคำถามให้ครบทุกข้อก่อนส่งคำตอบ");
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
            food_answer: answers,
            food_score: totalScore,
          },
          { onConflict: "patient_id" }
        );

      if (upsertError) {
        console.error(upsertError);
        setSubmitMessage(`เกิดข้อผิดพลาด: ${upsertError.message}`);
      } else {
        setSubmitMessage("บันทึกผลแบบประเมินอาหารเรียบร้อยแล้ว!");
        setTimeout(() => router.back(), 1500);
      }
    } catch (err) {
      console.error(err);
      setSubmitMessage("เกิดข้อผิดพลาดที่ไม่คาดคิด");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getScoreInterpretation = (score: number) => {
    if (score >= 8) {
      return {
        level: "ดีมาก",
        color: "text-green-600",
        bgColor: "bg-green-50",
        borderColor: "border-green-300",
        description: "พฤติกรรมการรับประทานอาหารอยู่ในระดับที่ดีมาก",
      };
    } else if (score >= 6) {
      return {
        level: "ดี",
        color: "text-blue-600",
        bgColor: "bg-blue-50",
        borderColor: "border-blue-300",
        description: "พฤติกรรมการรับประทานอาหารอยู่ในระดับที่ดี",
      };
    } else if (score >= 4) {
      return {
        level: "ปานกลาง",
        color: "text-yellow-600",
        bgColor: "bg-yellow-50",
        borderColor: "border-yellow-300",
        description: "ควรปรับปรุงพฤติกรรมการรับประทานอาหาร",
      };
    } else {
      return {
        level: "ควรปรับปรุง",
        color: "text-red-600",
        bgColor: "bg-red-50",
        borderColor: "border-red-300",
        description: "ควรปรับปรุงพฤติกรรมการรับประทานอาหารอย่างเร่งด่วน",
      };
    }
  };

  const interpretation = getScoreInterpretation(totalScore);

  return (
    <div className="max-w-4xl mx-auto bg-gray-50 p-4 sm:p-6 md:p-8 min-h-screen">
      <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 md:p-8">
        <div className="text-center mb-6">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800 mb-2">
            แบบประเมินพฤติกรรมการรับประทานอาหารไทย "มีดี"
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            Thai MIND Diet Assessment
          </p>
        </div>

        {thaiId && patientInfo && (
          <div className="mb-6 p-3 bg-blue-50 rounded-lg text-center text-blue-700 text-sm sm:text-base border border-blue-200">
            กำลังทำแบบประเมินสำหรับ: <span className="font-semibold">{patientInfo.first_name}{" "}
            {patientInfo.last_name}</span> ({thaiId})
          </div>
        )}

        <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h2 className="font-semibold text-gray-700 mb-2 text-sm sm:text-base">
            คำแนะนำในการทำแบบประเมิน:
          </h2>
          <ul className="text-xs sm:text-sm text-gray-600 space-y-1 list-disc list-inside">
            <li>กรุณาตอบคำถามทุกข้อตามความเป็นจริง</li>
            <li>เลือก "ใช่" หากท่านปฏิบัติตามข้อความนั้น หรือ "ไม่ใช่" หากไม่ได้ปฏิบัติ</li>
            <li>คำถามทั้งหมด 10 ข้อ ใช้เวลาประมาณ 3-5 นาที</li>
          </ul>
        </div>

        <div className="space-y-4">
          {QUESTIONS.map((question, index) => (
            <div
              key={`question-${index}`}
              className={`border-2 rounded-lg p-4 transition-all ${
                answers[index] !== -1
                  ? "border-blue-300 bg-blue-50"
                  : "border-gray-200 bg-white hover:border-gray-300"
              }`}
            >
              <div className="flex items-start gap-3 mb-3">
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-semibold flex items-center justify-center text-sm">
                  {question.id}
                </span>
                <div className="flex-1">
                  <p className="font-medium text-gray-800 text-sm sm:text-base mb-1">
                    {question.text}
                  </p>
                  <span className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                    หมวด: {question.category}
                  </span>
                </div>
              </div>

              <div className="flex gap-4 ml-11">
                <label
                  className={`flex items-center cursor-pointer px-4 py-2 rounded-lg border-2 transition-all ${
                    answers[index] === 1
                      ? "border-green-500 bg-green-50 text-green-700 font-semibold"
                      : "border-gray-300 hover:border-green-300 hover:bg-green-50"
                  }`}
                >
                  <input
                    type="radio"
                    name={`question_${index}`}
                    value={1}
                    checked={answers[index] === 1}
                    onChange={() => handleAnswerChange(index, 1)}
                    className="mr-2 w-4 h-4 text-green-600"
                  />
                  <span className="text-sm sm:text-base">✓ ใช่</span>
                </label>

                <label
                  className={`flex items-center cursor-pointer px-4 py-2 rounded-lg border-2 transition-all ${
                    answers[index] === 0
                      ? "border-red-500 bg-red-50 text-red-700 font-semibold"
                      : "border-gray-300 hover:border-red-300 hover:bg-red-50"
                  }`}
                >
                  <input
                    type="radio"
                    name={`question_${index}`}
                    value={0}
                    checked={answers[index] === 0}
                    onChange={() => handleAnswerChange(index, 0)}
                    className="mr-2 w-4 h-4 text-red-600"
                  />
                  <span className="text-sm sm:text-base">✗ ไม่ใช่</span>
                </label>
              </div>
            </div>
          ))}
        </div>

        {/* Score Summary */}
        <div className={`mt-8 p-6 rounded-lg border-2 ${interpretation.bgColor} ${interpretation.borderColor}`}>
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="text-center sm:text-left">
              <p className="text-sm text-gray-600 mb-1">คะแนนรวม</p>
              <p className="text-4xl sm:text-5xl font-bold text-gray-800">
                {totalScore}
                <span className="text-2xl text-gray-500"> / 10</span>
              </p>
              <p className="text-xs text-gray-500 mt-1">
                ตอบแล้ว {answeredCount} จาก {QUESTIONS.length} ข้อ
              </p>
            </div>

            <div className="text-center sm:text-right">
              <p className={`text-2xl sm:text-3xl font-bold ${interpretation.color}`}>
                {interpretation.level}
              </p>
              <p className="text-sm text-gray-600 mt-1 max-w-xs">
                {interpretation.description}
              </p>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="mt-8 flex justify-center">
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !thaiId || !patientInfo || !isComplete}
            className={`w-full sm:w-auto px-8 py-3 rounded-lg font-semibold text-base sm:text-lg transition-all ${
              isSubmitting || !thaiId || !patientInfo || !isComplete
                ? "bg-gray-400 text-gray-200 cursor-not-allowed"
                : "bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-xl"
            }`}
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                กำลังบันทึก...
              </span>
            ) : (
              `บันทึกผลการประเมิน (${answeredCount}/${QUESTIONS.length})`
            )}
          </button>
        </div>

        {!isComplete && answeredCount > 0 && (
          <p className="mt-3 text-center text-sm text-orange-600">
            ⚠️ กรุณาตอบคำถามให้ครบทุกข้อก่อนส่งแบบประเมิน (เหลืออีก {QUESTIONS.length - answeredCount} ข้อ)
          </p>
        )}

        {submitMessage && (
          <div
            className={`mt-6 p-4 text-center rounded-lg text-sm sm:text-base border-2 ${
              submitMessage.includes("เรียบร้อย")
                ? "bg-green-100 text-green-700 border-green-300"
                : "bg-red-100 text-red-700 border-red-300"
            }`}
          >
            {submitMessage}
          </div>
        )}
      </div>
    </div>
  );
}