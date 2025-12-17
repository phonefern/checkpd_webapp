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

interface Question {
  id: string;
  label: string;
  max?: number;
}

export default function MdsUpdrsForm({ thaiId }: { thaiId?: string }) {
  const router = useRouter();
  const [patientInfo, setPatientInfo] = useState<PatientInfo | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState("");

  const [p1, setP1] = useState<number[]>(Array(13).fill(0));
  const [p2, setP2] = useState<number[]>(Array(13).fill(0));
  const [p3, setP3] = useState<number[]>(Array(33).fill(0));
  const [p4, setP4] = useState<number[]>(Array(6).fill(0));

  const [dyskinesiaPresent, setDyskinesiaPresent] = useState<string>('');
  const [dyskinesiaInterfere, setDyskinesiaInterfere] = useState<string>('');


  const part1Questions: Question[] = [
    { id: "1.1", label: "Cognitive impairment" },
    { id: "1.2", label: "Hallucinations and psychosis" },
    { id: "1.3", label: "Depressed mood" },
    { id: "1.4", label: "Anxious mood" },
    { id: "1.5", label: "Apathy" },
    { id: "1.6", label: "Features of DDS" },
    // { id: "1.6a", label: "Who is filling out questionnaire" },
    { id: "1.7", label: "Sleep problems" },
    { id: "1.8", label: "Daytime sleepiness" },
    { id: "1.9", label: "Pain and other sensations" },
    { id: "1.10", label: "Urinary problems" },
    { id: "1.11", label: "Constipation problems" },
    { id: "1.12", label: "Light headedness on standing" },
    { id: "1.13", label: "Fatigue" }
  ];

  const part2Questions: Question[] = [
    { id: "2.1", label: "Speech" },
    { id: "2.2", label: "Saliva and drooling" },
    { id: "2.3", label: "Chewing and swallowing" },
    { id: "2.4", label: "Eating tasks" },
    { id: "2.5", label: "Dressing" },
    { id: "2.6", label: "Hygiene" },
    { id: "2.7", label: "Handwriting" },
    { id: "2.8", label: "Doing hobbies and other activities" },
    { id: "2.9", label: "Turning in bed" },
    { id: "2.10", label: "Tremor" },
    { id: "2.11", label: "Getting out of bed" },
    { id: "2.12", label: "Walking and balance" },
    { id: "2.13", label: "Freezing" }
  ];

  const part3Questions: Question[] = [
    { id: "3.1", label: "Speech" },
    { id: "3.2", label: "Facial expression" },
    { id: "3.3a", label: "Rigidity– Neck" },
    { id: "3.3b", label: "Rigidity– RUE" },
    { id: "3.3c", label: "Rigidity– LUE" },
    { id: "3.3d", label: "Rigidity– RLE" },
    { id: "3.3e", label: "Rigidity– LLE" },
    { id: "3.4a", label: "Finger tapping– Right hand" },
    { id: "3.4b", label: "Finger tapping– Left hand" },
    { id: "3.5a", label: "Hand movements– Right hand" },
    { id: "3.5b", label: "Hand movements– Left hand" },
    { id: "3.6a", label: "Pronation-supination movements– Right hand" },
    { id: "3.6b", label: "Pronation-supination movements– Left hand" },
    { id: "3.7a", label: "Toe tapping– Right foot" },
    { id: "3.7b", label: "Toe tapping– Left foot" },
    { id: "3.8a", label: "Leg agility– Right leg" },
    { id: "3.8b", label: "Leg agility– Left leg" },
    { id: "3.9", label: "Arising from chair" },
    { id: "3.10", label: "Gait" },
    { id: "3.11", label: "Freezing of gait" },
    { id: "3.12", label: "Postural stability" },
    { id: "3.13", label: "Posture" },
    { id: "3.14", label: "Global spontaneity of movement" },
    { id: "3.15a", label: "Postural tremor– Right hand" },
    { id: "3.15b", label: "Postural tremor– Left hand" },
    { id: "3.16a", label: "Kinetic tremor– Right hand" },
    { id: "3.16b", label: "Kinetic tremor– Left hand" },
    { id: "3.17a", label: "Rest tremor amplitude– RUE" },
    { id: "3.17b", label: "Rest tremor amplitude– LUE" },
    { id: "3.17c", label: "Rest tremor amplitude– RLE" },
    { id: "3.17d", label: "Rest tremor amplitude– LLE" },
    { id: "3.17e", label: "Rest tremor amplitude– Lip/jaw" },
    { id: "3.18", label: "Constancy of rest tremor" }
  ];

  const part4Questions: Question[] = [
    { id: "4.1", label: "Time spent with dyskinesias" },
    { id: "4.2", label: "Functional impact of dyskinesias" },
    { id: "4.3", label: "Time spent in the OFF state" },
    { id: "4.4", label: "Functional impact of fluctuations" },
    { id: "4.5", label: "Complexity of motor fluctuations" },
    { id: "4.6", label: "Painful OFF-state dystonia" }
  ];

  const totalScore = [...p1, ...p2, ...p3, ...p4].reduce((a, b) => a + b, 0);

  const partScores = [
    p1.reduce((a, b) => a + b, 0),
    p2.reduce((a, b) => a + b, 0),
    p3.reduce((a, b) => a + b, 0),
    p4.reduce((a, b) => a + b, 0),
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

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.select();
  };

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
            mds_answer_p1: p1,
            mds_answer_p2: p2,
            mds_answer_p3: p3,
            mds_answer_p4: p4,
            mds_score: totalScore,
            mds_answer: partScores,
            mds_q_dyskinesia_present: dyskinesiaPresent === "yes",
            mds_q_dyskinesia_interfere: dyskinesiaInterfere === "yes",
          },
          { onConflict: "patient_id" }
        );

      if (upsertError) {
        console.error(upsertError);
        setSubmitMessage(`เกิดข้อผิดพลาด: ${upsertError.message}`);
      } else {
        setSubmitMessage("บันทึกผล MDS-UPDRS เรียบร้อยแล้ว!");
        setTimeout(() => router.back(), 1500);
      }
    } catch (err) {
      console.error(err);
      setSubmitMessage("เกิดข้อผิดพลาดที่ไม่คาดคิด");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderPart = (
    title: string,
    questions: Question[],
    answers: number[],
    setter: React.Dispatch<React.SetStateAction<number[]>>
  ) => (
    <div className="border rounded-lg p-4 mb-6 bg-white shadow-sm">
      <h2 className="font-semibold text-lg sm:text-xl mb-4 text-gray-800 border-b pb-2">
        {title}
      </h2>
      <div className="space-y-3">
        {questions.map((question, idx) => (
          <div
            key={`${title}-${idx}`}
            className="flex flex-col sm:flex-row sm:items-center gap-2 p-2 hover:bg-gray-50 rounded"
          >
            <label className="flex-1 text-sm text-gray-700">
              <span className="font-semibold text-blue-600">{question.id}</span>{" "}
              {question.label}
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={question.max || 4}
                value={answers[idx] || ""}
                onFocus={handleFocus}
                onChange={(e) => {
                  const value = Number(e.target.value);
                  if (value >= 0 && value <= (question.max || 4)) {
                    setter((prev) => {
                      const updated = [...prev];
                      updated[idx] = value;
                      return updated;
                    });
                  }
                }}
                className="w-16 border border-gray-300 rounded text-center py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                aria-label={`${question.id} ${question.label}`}
              />
              <span className="text-xs text-gray-500 w-12">
                (0-{question.max || 4})
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto mt-6 sm:mt-10 bg-gray-50 p-4 sm:p-6 md:p-8 min-h-screen">
      <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 md:p-8">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-center mb-2 text-gray-800">
          MDS UPDRS Score Sheet
        </h1>
        <p className="text-center text-sm text-gray-600 mb-6">
          Movement Disorder Society-Unified Parkinson's Disease Rating Scale
        </p>

        {thaiId && patientInfo && (
          <div className="mb-6 p-3 bg-blue-50 rounded-lg text-center text-blue-700 text-sm sm:text-base">
            กำลังทำแบบประเมินสำหรับ: {patientInfo.first_name}{" "}
            {patientInfo.last_name} ({thaiId})
          </div>
        )}

        {renderPart(
          "Part I: Non-Motor Experiences of Daily Living",
          part1Questions.slice(0, 13),
          p1,
          setP1
        )}

        {renderPart(
          "Part II: Motor Experiences of Daily Living",
          part2Questions,
          p2,
          setP2
        )}

        {renderPart(
          "Part III: Motor Examination",
          part3Questions,
          p3,
          setP3
        )}

        {/* ===== เพิ่มสองคำถาม Yes/No ===== */}
        <div className="border rounded-lg p-4 mb-6 bg-white shadow-sm">


          <div className="space-y-4">
            {/* Q1: Dyskinesia present */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 p-2 hover:bg-gray-50 rounded">
              <label className="flex-1 text-sm text-gray-700">
                <span className="font-semibold text-blue-600">Q D1:</span>{" "}
                Were dyskinesias present?
              </label>
              <select
                value={dyskinesiaPresent}
                onChange={(e) => setDyskinesiaPresent(e.target.value)}
                className="border border-gray-300 rounded py-2 px-3 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="">Select</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>

            {/* Q2: Interfere with rating */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 p-2 hover:bg-gray-50 rounded">
              <label className="flex-1 text-sm text-gray-700">
                <span className="font-semibold text-blue-600">Q D2:</span>{" "}
                Did these movements interfere with rating?
              </label>
              <select
                value={dyskinesiaInterfere}
                onChange={(e) => setDyskinesiaInterfere(e.target.value)}
                className="border border-gray-300 rounded py-2 px-3 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="">Select</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>
          </div>
        </div>


        {renderPart(
          "Part IV: Motor Complications",
          part4Questions,
          p4,
          setP4
        )}

        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 sm:p-6 mb-6 border border-blue-200">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="text-center sm:text-left">
              <p className="text-sm text-gray-600 mb-1">คะแนนรวมทั้งหมด</p>
              <p className="text-3xl sm:text-4xl font-bold text-blue-600">
                {totalScore}
              </p>
            </div>
            <div className="text-center sm:text-right">
              <p className="text-sm text-gray-600">แบ่งตาม Part</p>
              <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                <div className="bg-white rounded px-2 py-1">
                  <span className="text-gray-600">Part I:</span>{" "}
                  <span className="font-semibold">{p1.reduce((a, b) => a + b, 0)}</span>
                </div>
                <div className="bg-white rounded px-2 py-1">
                  <span className="text-gray-600">Part II:</span>{" "}
                  <span className="font-semibold">{p2.reduce((a, b) => a + b, 0)}</span>
                </div>
                <div className="bg-white rounded px-2 py-1">
                  <span className="text-gray-600">Part III:</span>{" "}
                  <span className="font-semibold">{p3.reduce((a, b) => a + b, 0)}</span>

                </div>
                <div className="bg-white rounded px-2 py-1">
                  <span className="text-gray-600">Part IV:</span>{" "}
                  <span className="font-semibold">{p4.reduce((a, b) => a + b, 0)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-center">
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !thaiId || !patientInfo}
            className={`w-full sm:w-auto px-8 py-3 rounded-lg text-white font-semibold text-base sm:text-lg transition-all ${isSubmitting || !thaiId || !patientInfo
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-xl"
              }`}
          >
            {isSubmitting ? "กำลังบันทึก..." : "ส่งแบบประเมิน"}
          </button>
        </div>

        {submitMessage && (
          <div
            className={`mt-4 p-3 rounded-lg text-center text-sm sm:text-base ${submitMessage.includes("เรียบร้อย")
              ? "bg-green-100 text-green-700 border border-green-300"
              : "bg-red-100 text-red-700 border border-red-300"
              }`}
          >
            {submitMessage}
          </div>
        )}
      </div>
    </div>
  );
}