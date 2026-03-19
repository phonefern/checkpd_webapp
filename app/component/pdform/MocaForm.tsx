"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { mocaItems } from "./MocaConfig";
import MocaCard, { MocaItem } from "./MocaCard";

interface PatientInfo {
  id: string;
  first_name: string;
  last_name: string;
  thaiid: string;
}

export default function MocaForm({ thaiId }: { thaiId?: string }) {
  const router = useRouter();
  const [answers, setAnswers] = useState<number[]>(() =>
    Array(mocaItems.length).fill(0)
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState("");
  const [patientInfo, setPatientInfo] = useState<PatientInfo | null>(null);

  useEffect(() => {
    if (!thaiId) {
      setSubmitMessage("กรุณาเลือกผู้ป่วยก่อนเริ่มแบบประเมิน");
      return;
    }

    const fetchPatientInfo = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) {
          setSubmitMessage("ไม่พบ session ผู้ใช้");
          return;
        }

        const { data, error } = await supabase
          .from("pd_screenings")
          .select("id, first_name, last_name, thaiid")
          .eq("thaiid", thaiId)
          .single();

        if (error) {
          setSubmitMessage(
            "ไม่พบข้อมูลผู้ป่วย หรือข้อมูลไม่ครบ กรุณาตรวจสอบ Thai ID อีกครั้ง"
          );
        } else {
          setPatientInfo(data);
        }
      } catch (err) {
        console.error("Error fetching patient info:", err);
        setSubmitMessage("เกิดข้อผิดพลาดในการดึงข้อมูลผู้ป่วย");
      }
    };

    fetchPatientInfo();
  }, [thaiId]);

  const scoreItems = mocaItems.filter((item) => item.type !== "practice");
  const totalScore = scoreItems.reduce(
    (acc, item) => acc + (answers[item.id] || 0),
    0
  );
  const maxScore = scoreItems.reduce((acc, item) => acc + item.max, 0);
  const scorePercent = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;

  const sectionGroups = useMemo(() => {
    const grouped: {
      section: string;
      items: MocaItem[];
      score: number;
      max: number;
    }[] = [];
    const sectionMap = new Map<string, number>();

    mocaItems.forEach((item) => {
      const index = sectionMap.get(item.section);
      if (index === undefined) {
        const sectionData = {
          section: item.section,
          items: [item],
          score: item.type === "practice" ? 0 : answers[item.id] || 0,
          max: item.type === "practice" ? 0 : item.max,
        };
        sectionMap.set(item.section, grouped.length);
        grouped.push(sectionData);
      } else {
        const group = grouped[index];
        group.items.push(item);
        if (item.type !== "practice") {
          group.score += answers[item.id] || 0;
          group.max += item.max;
        }
      }
    });

    return grouped;
  }, [answers]);

  const handleSubmit = async () => {
    if (!thaiId || !patientInfo) {
      setSubmitMessage("กรุณาเลือกผู้ป่วยก่อนบันทึกผล");
      return;
    }

    setIsSubmitting(true);
    setSubmitMessage("");

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("ไม่พบ session ผู้ใช้งาน");
      }

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
        setSubmitMessage(`บันทึกข้อมูลไม่สำเร็จ: ${upsertError.message}`);
      } else {
        setSubmitMessage("บันทึกผล MoCA เรียบร้อย!");
        await new Promise((resolve) => setTimeout(resolve, 1500));
        router.back();
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      setSubmitMessage("เกิดข้อผิดพลาดระบบ กรุณาลองใหม่");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto mt-10 bg-slate-50 p-4 sm:p-6 rounded-xl shadow-lg">
      <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">
              Montreal Cognitive Assessment (MoCA)
            </h1>
            <p className="text-sm sm:text-base text-slate-500 mt-1">
              คำถาม/ข้อสอบครบ 30 คะแนน (ตัวอย่าง)
            </p>
          </div>
          <div className="rounded-xl bg-slate-200 text-slate-600 p-3 text-center">
            <div className="text-xs uppercase tracking-wide font-semibold">
              คะแนนรวม
            </div>
            <div className="text-3xl font-extrabold mt-1">{totalScore}</div>
            <div className="text-xs">{`/ ${maxScore}`}</div>
          </div>
        </div>
      </div>

      {thaiId && patientInfo && (
        <div className="mb-4 rounded-xl bg-blue-50 border border-blue-200 p-3 text-blue-800 text-sm sm:text-base">
          รายชื่อผู้ป่วย:{" "}
          <span className="font-semibold">
            {patientInfo.first_name} {patientInfo.last_name}
          </span>{" "}
          ({thaiId})
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <div className="text-sm text-slate-500">Progress</div>
            <div className="font-semibold text-slate-700">
              คะแนนรวม {scorePercent}%
            </div>
          </div>
          <div className="w-full sm:w-72 h-2 bg-slate-200 rounded-full">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-cyan-500"
              style={{ width: `${scorePercent}%` }}
            />
          </div>
        </div>
      </div>

      <div className="space-y-5">
        {sectionGroups.map((group) => (
          <section
            key={group.section}
            className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 space-y-4 shadow-sm"
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h2 className="text-lg font-semibold text-slate-800">
                  {group.section}
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  {group.max > 0
                    ? `คะแนนส่วนนี้: ${group.score}/${group.max}`
                    : "ส่วนฝึกฝน (ไม่คิดคะแนน)"}
                </p>
              </div>
              <div className="text-sm text-slate-600">
                {group.max > 0 ? `${Math.round((group.score / group.max) * 100)}%` : "-"}
              </div>
            </div>

            <div className="space-y-4">
              {group.items.map((item) => (
                <MocaCard
                  key={item.id}
                  item={item}
                  value={item.type === "practice" ? (answers[item.id] ?? -1) : (answers[item.id] || 0)}
                  onChange={(val) => {
                    const updated = [...answers];
                    updated[item.id] = val;
                    setAnswers(updated);
                  }}
                />
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="mt-5 bg-white border border-slate-200 rounded-xl p-4 sm:p-5">
        <div className="text-sm text-slate-500">คะแนนรวม</div>
        <div className="text-3xl font-bold text-slate-800">
          {totalScore} / {maxScore}
        </div>
        <div
          className={`text-base font-semibold ${
            totalScore < 26 ? "text-red-600" : "text-green-600"
          }`}
        >
          {totalScore < 26 ? "มีความเสี่ยง/ต้องประเมินต่อ" : "ปกติ"}
        </div>
      </div>

      <div className="mt-4 flex justify-center">
        <button
          onClick={handleSubmit}
          disabled={isSubmitting || !thaiId || !patientInfo}
          className={`px-6 py-2 rounded-xl text-white font-semibold transition ${
            isSubmitting || !thaiId || !patientInfo
              ? "bg-slate-400 cursor-not-allowed"
              : "bg-indigo-600 hover:bg-indigo-700"
          }`}
        >
          {isSubmitting ? "กำลังบันทึก..." : "บันทึกผล"}
        </button>
      </div>

      {submitMessage && (
        <div
          className={`mt-4 p-3 rounded-lg text-center ${
            submitMessage.includes("เรียบร้อย")
              ? "bg-blue-100 text-blue-700"
              : "bg-red-100 text-red-700"
          }`}
        >
          {submitMessage}
        </div>
      )}
    </div>
  );
}
