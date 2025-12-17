"use client";
// app/component/pdform/EpworthForm.tsx
import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

const questions = [
  "1. ขณะนั่งอ่านหนังสือ",
  "2. ขณะดูโทรทัศน์",
  "3. ขณะนั่งเฉยๆ นอกบ้าน ในที่สาธารณะ เช่น ในห้องสมุด หรือโรงภาพยนตร์",
  "4. ขณะนั่งเป็นผู้โดยสารในรถหรือไฟ เครื่องบิน ติดต่อกันเป็นเวลานาน",
  "5. ขณะนั่งเงียบๆ หลังรับประทานอาหารกลางวัน โดยไม่ได้ดื่มเครื่องดื่มแอลกอฮอล์",
  "6. ขณะนั่งเอนหลังพักผ่อนช่วงบ่ายตามโอกาส",
  "7. ขณะขับรถ (หรือยานพาหนะอื่น) แล้วรถ (หรือยานพาหนะอื่น) ต้องหยุดนิ่ง 2-3 นาทีตามจังหวะการจราจร",
];



export default function EpworthForm({ thaiId }: { thaiId?: string }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  // const thaiId = searchParams.get("patient_thaiid");

  const [answers, setAnswers] = useState<number[]>(Array(questions.length).fill(0));
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
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) {
          setSubmitMessage("กรุณาเข้าสู่ระบบก่อน");
          return;
        }

        const { data, error } = await supabase
          .from("pd_screenings")
          .select("id, first_name, last_name, thaiid")
          .eq("thaiid", thaiId)
          // .eq("user_id", session.user.id)
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

  const handleAnswer = (index: number, value: number) => {
    const updated = [...answers];
    updated[index] = value;
    setAnswers(updated);
  };

  const totalScore = answers.reduce((acc, val) => acc + val, 0);

  let interpretation = "ปกติ";
  if (totalScore >= 7 && totalScore <= 9) {
    interpretation = "มีแนวโน้มง่วงผิดปกติ";
  } else if (totalScore > 9) {
    interpretation = "ผิดปกติชัดเจน";
  }

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
              epworth_answer: answers,
              epworth_score: totalScore,
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
    <div className="max-w-6xl mx-auto mt-10 bg-white p-8 rounded-lg shadow">
      <h1 className="text-2xl font-bold text-center mb-4">แบบทดสอบ Epworth Sleepiness Scale</h1>

      {thaiId && patientInfo && (
        <div className="mb-4 p-3 bg-blue-50 rounded-lg text-center text-blue-700">
          กำลังทำแบบประเมินสำหรับ: {patientInfo.first_name} {patientInfo.last_name} ({thaiId})
        </div>
      )}

      <p className="mb-4 text-center">
        <strong>คำชี้แจง</strong>: ในสถานการณ์ต่างๆ ต่อไปนี้ ท่านมีโอกาสงีบหลับ หรือเผลอหลับแค่ไหน
      </p>
      <p className="mb-4 text-center">
        (0 = ไม่เคยเลย, 1 = มีโอกาสเล็กน้อย, 2 = มีโอกาสปานกลาง, 3 = มีโอกาสสูงมาก)
      </p>

      <table className="w-full border border-gray-300 mb-6">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-gray-300 px-3 py-2 w-[70%] text-left">สถานการณ์</th>
            {[0, 1, 2, 3].map((score) => (
              <th key={score} className="border border-gray-300 px-3 py-2 text-center w-[8%]">
                {score}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {questions.map((q, i) => (
            <tr key={i}>
              <td className="border border-gray-300 px-3 py-2">{q}</td>
              {[0, 1, 2, 3].map((score) => (
                <td key={score} className="border border-gray-300 text-center">
                  <input
                    type="radio"
                    name={`q${i}`}
                    checked={answers[i] === score}
                    onChange={() => handleAnswer(i, score)}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-6 flex justify-between items-center mb-4">
        <p className="font-bold">
          รวมคะแนน: <span className="text-blue-600">{totalScore}</span> / {questions.length * 3}
        </p>
        <p className="font-bold">
          ผลการประเมิน:{" "}
          <span
            className={
              totalScore > 9 ? "text-red-600" : totalScore >= 7 ? "text-orange-600" : "text-green-600"
            }
          >
            {interpretation}
          </span>
        </p>
      </div>

      <div className="flex justify-center mt-6">
        <button
          onClick={handleSubmit}
          disabled={isSubmitting || !thaiId || !patientInfo}
          className={`px-6 py-2 rounded text-white ${isSubmitting || !thaiId || !patientInfo
            ? "bg-gray-400 cursor-not-allowed"
            : "bg-blue-600 hover:bg-blue-700"
            }`}
        >
          {isSubmitting ? "กำลังบันทึก..." : "ส่งแบบประเมิน"} {isSubmitting && (
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
