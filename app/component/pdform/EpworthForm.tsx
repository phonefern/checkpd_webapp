"use client";
// app/component/pdform/EpworthForm.tsx
import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

const questions = [
  "1. à¸‚à¸“à¸°à¸™à¸±à¹ˆà¸‡à¸­à¹ˆà¸²à¸™à¸«à¸™à¸±à¸‡à¸ªà¸·à¸­",
  "2. à¸‚à¸“à¸°à¸”à¸¹à¹‚à¸—à¸£à¸—à¸±à¸¨à¸™à¹Œ",
  "3. à¸‚à¸“à¸°à¸™à¸±à¹ˆà¸‡à¹€à¸‰à¸¢à¹† à¸™à¸­à¸à¸šà¹‰à¸²à¸™ à¹ƒà¸™à¸—à¸µà¹ˆà¸ªà¸²à¸˜à¸²à¸£à¸“à¸° à¹€à¸Šà¹ˆà¸™ à¹ƒà¸™à¸«à¹‰à¸­à¸‡à¸ªà¸¡à¸¸à¸” à¸«à¸£à¸·à¸­à¹‚à¸£à¸‡à¸ à¸²à¸žà¸¢à¸™à¸•à¸£à¹Œ",
  "4. à¸‚à¸“à¸°à¸™à¸±à¹ˆà¸‡à¹€à¸›à¹‡à¸™à¸œà¸¹à¹‰à¹‚à¸”à¸¢à¸ªà¸²à¸£à¹ƒà¸™à¸£à¸–à¸«à¸£à¸·à¸­à¹„à¸Ÿ à¹€à¸„à¸£à¸·à¹ˆà¸­à¸‡à¸šà¸´à¸™ à¸•à¸´à¸”à¸•à¹ˆà¸­à¸à¸±à¸™à¹€à¸›à¹‡à¸™à¹€à¸§à¸¥à¸²à¸™à¸²à¸™",
  "5. à¸‚à¸“à¸°à¸™à¸±à¹ˆà¸‡à¹€à¸‡à¸µà¸¢à¸šà¹† à¸«à¸¥à¸±à¸‡à¸£à¸±à¸šà¸›à¸£à¸°à¸—à¸²à¸™à¸­à¸²à¸«à¸²à¸£à¸à¸¥à¸²à¸‡à¸§à¸±à¸™ à¹‚à¸”à¸¢à¹„à¸¡à¹ˆà¹„à¸”à¹‰à¸”à¸·à¹ˆà¸¡à¹€à¸„à¸£à¸·à¹ˆà¸­à¸‡à¸”à¸·à¹ˆà¸¡à¹à¸­à¸¥à¸à¸­à¸®à¸­à¸¥à¹Œ",
  "6. à¸‚à¸“à¸°à¸™à¸±à¹ˆà¸‡à¹€à¸­à¸™à¸«à¸¥à¸±à¸‡à¸žà¸±à¸à¸œà¹ˆà¸­à¸™à¸Šà¹ˆà¸§à¸‡à¸šà¹ˆà¸²à¸¢à¸•à¸²à¸¡à¹‚à¸­à¸à¸²à¸ª",
  "7. à¸‚à¸“à¸°à¸‚à¸±à¸šà¸£à¸– (à¸«à¸£à¸·à¸­à¸¢à¸²à¸™à¸žà¸²à¸«à¸™à¸°à¸­à¸·à¹ˆà¸™) à¹à¸¥à¹‰à¸§à¸£à¸– (à¸«à¸£à¸·à¸­à¸¢à¸²à¸™à¸žà¸²à¸«à¸™à¸°à¸­à¸·à¹ˆà¸™) à¸•à¹‰à¸­à¸‡à¸«à¸¢à¸¸à¸”à¸™à¸´à¹ˆà¸‡ 2-3 à¸™à¸²à¸—à¸µà¸•à¸²à¸¡à¸ˆà¸±à¸‡à¸«à¸§à¸°à¸à¸²à¸£à¸ˆà¸£à¸²à¸ˆà¸£",
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
      setSubmitMessage("à¹„à¸¡à¹ˆà¸žà¸šà¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸œà¸¹à¹‰à¸›à¹ˆà¸§à¸¢ à¸à¸£à¸¸à¸“à¸²à¹€à¸¥à¸·à¸­à¸à¸œà¸¹à¹‰à¸›à¹ˆà¸§à¸¢à¸à¹ˆà¸­à¸™à¸—à¸³à¹à¸šà¸šà¸›à¸£à¸°à¹€à¸¡à¸´à¸™");
      return;
    }

    const fetchPatientInfo = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) {
          setSubmitMessage("à¸à¸£à¸¸à¸“à¸²à¹€à¸‚à¹‰à¸²à¸ªà¸¹à¹ˆà¸£à¸°à¸šà¸šà¸à¹ˆà¸­à¸™");
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
          setSubmitMessage("à¹„à¸¡à¹ˆà¸žà¸šà¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸œà¸¹à¹‰à¸›à¹ˆà¸§à¸¢à¸”à¹‰à¸§à¸¢à¹€à¸¥à¸‚à¸šà¸±à¸•à¸£à¸›à¸£à¸°à¸Šà¸²à¸Šà¸™à¸™à¸µà¹‰");
        } else {
          setPatientInfo(data);
        }
      } catch (err) {
        console.error("Error fetching patient info:", err);
        setSubmitMessage("à¹€à¸à¸´à¸”à¸‚à¹‰à¸­à¸œà¸´à¸”à¸žà¸¥à¸²à¸”à¹ƒà¸™à¸à¸²à¸£à¹‚à¸«à¸¥à¸”à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸œà¸¹à¹‰à¸›à¹ˆà¸§à¸¢");
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

  let interpretation = "à¸›à¸à¸•à¸´";
  if (totalScore >= 7 && totalScore <= 9) {
    interpretation = "à¸¡à¸µà¹à¸™à¸§à¹‚à¸™à¹‰à¸¡à¸‡à¹ˆà¸§à¸‡à¸œà¸´à¸”à¸›à¸à¸•à¸´";
  } else if (totalScore > 9) {
    interpretation = "à¸œà¸´à¸”à¸›à¸à¸•à¸´à¸Šà¸±à¸”à¹€à¸ˆà¸™";
  }

  const handleSubmit = async () => {
    if (!thaiId || !patientInfo) {
      setSubmitMessage("à¹„à¸¡à¹ˆà¸žà¸šà¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸œà¸¹à¹‰à¸›à¹ˆà¸§à¸¢");
      return;
    }

    setIsSubmitting(true);
    setSubmitMessage("");

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("à¹„à¸¡à¹ˆà¸žà¸š session à¸œà¸¹à¹‰à¹ƒà¸Šà¹‰");
      }

      // à¹ƒà¸Šà¹‰ upsert à¹à¸—à¸™ insert/update
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
        setSubmitMessage(`à¹€à¸à¸´à¸”à¸‚à¹‰à¸­à¸œà¸´à¸”à¸žà¸¥à¸²à¸”: ${upsertError.message}`);
      } else {
        console.log("Assessment saved successfully");
        setSubmitMessage("à¸šà¸±à¸™à¸—à¸¶à¸à¸œà¸¥à¸à¸²à¸£à¸›à¸£à¸°à¹€à¸¡à¸´à¸™à¹€à¸£à¸µà¸¢à¸šà¸£à¹‰à¸­à¸¢à¹à¸¥à¹‰à¸§!");
        await new Promise((resolve) => setTimeout(resolve, 1500));

        router.back();
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      setSubmitMessage("à¹€à¸à¸´à¸”à¸‚à¹‰à¸­à¸œà¸´à¸”à¸žà¸¥à¸²à¸”à¸—à¸µà¹ˆà¹„à¸¡à¹ˆà¸„à¸²à¸”à¸„à¸´à¸”");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto mt-10 bg-white p-8 rounded-lg shadow">
      <h1 className="text-2xl font-bold text-center mb-4">à¹à¸šà¸šà¸—à¸”à¸ªà¸­à¸š Epworth Sleepiness Scale</h1>

      {thaiId && patientInfo && (
        <div className="mb-4 p-3 bg-blue-50 rounded-lg text-center text-blue-700">
          à¸à¸³à¸¥à¸±à¸‡à¸—à¸³à¹à¸šà¸šà¸›à¸£à¸°à¹€à¸¡à¸´à¸™à¸ªà¸³à¸«à¸£à¸±à¸š: {patientInfo.first_name} {patientInfo.last_name} ({thaiId})
        </div>
      )}

      <p className="mb-4 text-center">
        <strong>à¸„à¸³à¸Šà¸µà¹‰à¹à¸ˆà¸‡</strong>: à¹ƒà¸™à¸ªà¸–à¸²à¸™à¸à¸²à¸£à¸“à¹Œà¸•à¹ˆà¸²à¸‡à¹† à¸•à¹ˆà¸­à¹„à¸›à¸™à¸µà¹‰ à¸—à¹ˆà¸²à¸™à¸¡à¸µà¹‚à¸­à¸à¸²à¸ªà¸‡à¸µà¸šà¸«à¸¥à¸±à¸š à¸«à¸£à¸·à¸­à¹€à¸œà¸¥à¸­à¸«à¸¥à¸±à¸šà¹à¸„à¹ˆà¹„à¸«à¸™
      </p>
      <p className="mb-2 text-center text-sm text-gray-700">
        ให้ประเมินจากประสบการณ์จริงในช่วง 1 เดือนที่ผ่านมา แม้ไม่ได้ตั้งใจจะนอน และเลือกคำตอบเพียง 1 ระดับต่อ 1 ข้อ
      </p>
      <p className="mb-4 text-center text-sm text-gray-700">
        หากไม่เคยอยู่ในสถานการณ์นั้น ให้ประเมินตามความเป็นไปได้ที่ใกล้เคียงที่สุด
      </p>
      <p className="mb-4 text-center">
        (0 = à¹„à¸¡à¹ˆà¹€à¸„à¸¢à¹€à¸¥à¸¢, 1 = à¸¡à¸µà¹‚à¸­à¸à¸²à¸ªà¹€à¸¥à¹‡à¸à¸™à¹‰à¸­à¸¢, 2 = à¸¡à¸µà¹‚à¸­à¸à¸²à¸ªà¸›à¸²à¸™à¸à¸¥à¸²à¸‡, 3 = à¸¡à¸µà¹‚à¸­à¸à¸²à¸ªà¸ªà¸¹à¸‡à¸¡à¸²à¸)
      </p>

      <table className="w-full border border-gray-300 mb-6">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-gray-300 px-3 py-2 w-[70%] text-left">à¸ªà¸–à¸²à¸™à¸à¸²à¸£à¸“à¹Œ</th>
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
          à¸£à¸§à¸¡à¸„à¸°à¹à¸™à¸™: <span className="text-blue-600">{totalScore}</span> / {questions.length * 3}
        </p>
        <p className="font-bold">
          à¸œà¸¥à¸à¸²à¸£à¸›à¸£à¸°à¹€à¸¡à¸´à¸™:{" "}
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
          {isSubmitting ? "à¸à¸³à¸¥à¸±à¸‡à¸šà¸±à¸™à¸—à¸¶à¸..." : "à¸ªà¹ˆà¸‡à¹à¸šà¸šà¸›à¸£à¸°à¹€à¸¡à¸´à¸™"} {isSubmitting && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm z-50">
              <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-600 border-solid mb-4"></div>
              <p className="text-lg font-semibold text-blue-600">à¸à¸³à¸¥à¸±à¸‡à¸šà¸±à¸™à¸—à¸¶à¸à¸œà¸¥à¸à¸²à¸£à¸›à¸£à¸°à¹€à¸¡à¸´à¸™...</p>
            </div>
          )}
        </button>
      </div>

      {submitMessage && (
        <div
          className={`mt-4 p-3 rounded text-center ${submitMessage.includes("à¹€à¸£à¸µà¸¢à¸šà¸£à¹‰à¸­à¸¢")
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
