"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

const RBDAssessment = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const thaiId = searchParams.get("patient_thaiid");

  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [frequencyAnswers, setFrequencyAnswers] = useState<Record<number, number>>({});
  const [showResults, setShowResults] = useState(false);
  const [patientInfo, setPatientInfo] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState("");

  const questions = [
    {
      id: 1,
      text: "คุณฝันบ่อยหรือไม่"
    },
    {
      id: 2,
      text: "คุณฝันร้ายบ่อย หรือไม่"
    },
    {
      id: 3,
      text: "ความฝันของคุณมี เนื้อหาเรื่องราว สะเทือนใจและน่า เศร้าหรือไม่"
    },
    {
      id: 4,
      text: "ความฝันของคุณมี เนื้อหารุนแรงหรือ ก้าวร้าวหรือไม่ (เช่น ทะเลาะกับใครสัก คน ต่อสู้เป็นต้น)"
    },
    {
      id: 5,
      text: "ความฝันของคุณมี เนื้อหาน่ากลัวหรือ น่าสยดสยองหรือไม่ (เช่น ถูกผีไล่ตาม หลอกหลอน เป็นต้น)"
    },
    {
      id: 6,
      text: "คุณละเมอพูดหรือ ออกเสียงออกมา ระหว่างหลับหรือไม่"
    },
    {
      id: 7,
      text: "คุณตะโกน โวยวาย หรือพูดคำหยาบ คายระหว่างนอน หลับหรือไม่"
    },
    {
      id: 8,
      text: "คุณขยับแขนหรือขา ตามเนื้อหาความฝัน ในระหว่างหลับ หรือไม่"
    },
    {
      id: 9,
      text: "คุณเคยพลัดตกจาก ที่นอนหรือไม่"
    },
    {
      id: 10,
      text: "คุณเคยทำร้ายตัวเอง หรือคู่นอนในระหว่าง หลับหรือไม่"
    },
    {
      id: 11,
      text: "คุณเคยพยายามทำ ร้ายคู่นอนหรือ เกือบจะทำร้ายตัวเอง ในระหว่างหลับ หรือไม่"
    },
    {
      id: 12,
      text: "เหตุการณ์ตามที่ อธิบายในข้อ 10 หรือ 11 เกี่ยวข้องกับ เนื้อหาความฝันของ คุณหรือไม่"
    },
    {
      id: 13,
      text: "เหตุการณ์ต่าง ๆ ข้างต้นรบกวนการนอน หลับของคุณหรือไม่"
    }
  ];

  const yesNoOptions = [
    { value: "yes", label: "ใช่" },
    { value: "no", label: "ไม่ใช่" },
    { value: "unknown", label: "ไม่ทราบ/จำไม่ได้" }
  ];

  const frequencyOptions = [
    { value: 1, label: "1 หรือ 2-3 ครั้ง ต่อปี" },
    { value: 2, label: "1 หรือ 2-3 ครั้งต่อ เดือน" },
    { value: 3, label: "1 หรือ 2-3 ครั้ง ต่อ สัปดาห์" },
    { value: 4, label: "3 ครั้ง หรือ มากกว่า ต่อ สัปดาห์" }
  ];

  const handleAnswerChange = (questionId: number, value: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value
    }));

    // Reset frequency answer if changed to no/unknown
    if (value !== "yes") {
      setFrequencyAnswers(prev => {
        const newAnswers = { ...prev };
        delete newAnswers[questionId];
        return newAnswers;
      });
    }
  };

  const handleFrequencyChange = (questionId: number, value: string) => {
    setFrequencyAnswers(prev => ({
      ...prev,
      [questionId]: parseInt(value)
    }));
  };

  const calculateScore = () => {
    let totalScore = 0;
    
    // คำนวณคะแนนตามเกณฑ์ที่กำหนด
    Object.entries(frequencyAnswers).forEach(([questionId, frequency]) => {
      const qId = parseInt(questionId);

      if (qId >= 1 && qId <= 5 || qId === 13) {
        // ข้อ 1-5, 13: คะแนน 0, 1, 2
        if (frequency === 1) totalScore += 1;
        else if (frequency === 2) totalScore += 2;
        else if (frequency === 3) totalScore += 3;
        else if (frequency === 4) totalScore += 4;
      } else if (qId >= 6 && qId <= 12) {
        // ข้อ 6-12: คะแนน 0, 4, 6
        if (frequency === 1) totalScore += 2;
        else if (frequency === 2) totalScore += 4;
        else if (frequency === 3) totalScore += 6;
        else if (frequency === 4) totalScore += 8;
      }
    });

    // เพิ่มคะแนนสำหรับคำตอบ "ใช่" แบบง่าย
    Object.entries(answers).forEach(([questionId, answer]) => {
      const qId = parseInt(questionId);
      
      if (answer === "yes") {
        if (qId >= 1 && qId <= 5 || qId === 13) {
          // ข้อ 1-5, 13: คะแนน +1 สำหรับคำตอบ "ใช่"
          totalScore += 1;
        } else if (qId >= 6 && qId <= 12) {
          // ข้อ 6-12: คะแนน +2 สำหรับคำตอบ "ใช่"
          totalScore += 2;
        }
      }
    });

    return totalScore;
  };

  const getScoreInterpretation = (score: number) => {
    if (score >= 5) {
      return {
        level: "มีความเสี่ยงสูงต่อ RBD",
        color: "text-red-600",
        bg: "bg-red-100",
        recommendation: "ควรปรึกษาแพทย์เพื่อการตรวจวินิจฉัยเพิ่มเติม"
      };
    } else {
      return {
        level: "มีความเสี่ยงต่ำต่อ RBD",
        color: "text-green-600",
        bg: "bg-green-100",
        recommendation: "ผลการประเมินอยู่ในเกณฑ์ปกติ"
      };
    }
  };

  const fetchPatientInfo = async () => {
    if (!thaiId) {
      setSubmitMessage("ไม่พบข้อมูลผู้ป่วย");
      return;
    }
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setSubmitMessage("กรุณาเข้าสู่ระบบ");
        return;
      }
      const { data, error } = await supabase
        .from("pd_screenings")
        .select("id, first_name, last_name, thaiid")
        .eq("thaiid", thaiId)
        .eq("user_id", session.user.id)
        .single();
      if (error) {
        console.error("Error fetching patient info:", error);
        setSubmitMessage("ไม่พบข้อมูลผู้ป่วย");
      } else {
        setPatientInfo(data);
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      setSubmitMessage("เกิดข้อผิดพลาดในการโหลดข้อมูลผู้ป่วย");
    }
  };

  useEffect(() => {
    fetchPatientInfo();
  }, [thaiId]);

  const handleSubmit = async () => {
    if (!thaiId || !patientInfo) {
      setSubmitMessage("ไม่พบข้อมูลผู้ป่วย");
      return;
    }
    setIsSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("ไม่พบ session ผู้ใช้");
      }
      
      // Prepare answers in ordered array format
      const orderedAnswers = questions.map(q => ({
        answer: answers[q.id] || "",
        frequency: frequencyAnswers[q.id] || 0
      }));

      // Also prepare a simpler format as fallback
      const simpleAnswers = questions.map(q => {
        const answer = answers[q.id] || "";
        // Convert string answers to integers: yes=1, no=0, unknown=0
        return answer === "yes" ? 1 : 0;
      });
      const simpleFrequencies = questions.map(q => frequencyAnswers[q.id] || 0);

      // Validate data before sending
      console.log("Validating data before save:", {
        thaiId,
        patientInfo: patientInfo ? { id: patientInfo.id, name: `${patientInfo.first_name} ${patientInfo.last_name}` } : null,
        orderedAnswers,
        score: calculateScore(),
        answersCount: Object.keys(answers).length,
        frequencyAnswersCount: Object.keys(frequencyAnswers).length
      });

      // Additional validation
      if (!thaiId) {
        throw new Error("ไม่พบ Thai ID");
      }
      if (!patientInfo || !patientInfo.id) {
        throw new Error("ไม่พบข้อมูลผู้ป่วย");
      }
      if (!session.user || !session.user.id) {
        throw new Error("ไม่พบข้อมูลผู้ใช้");
      }

      const { data: existingRows } = await supabase
        .from("risk_factors_test")
        .select("id")
        .eq("user_id", session.user.id)
        .eq("thaiid", thaiId);

      const existingRecord = existingRows && existingRows.length > 0 ? existingRows[0] : null;

      let dbError: any = null;
      let useSimpleFormat = false;
      
      try {
        if (existingRecord) {
          console.log("Updating existing record with data:", {
            sleep_answer: orderedAnswers,
            sleep_score: calculateScore(),
            patient_id: patientInfo.id,
            user_id: session.user.id,
            thaiid: thaiId,
          });
          const { error: updateError } = await supabase
            .from("risk_factors_test")
            .update({
              sleep_answer: orderedAnswers,
              sleep_score: calculateScore(),
              patient_id: patientInfo.id,
              user_id: session.user.id,
              thaiid: thaiId,
            })
            .eq("id", existingRecord.id);
          dbError = updateError;
        } else {
          console.log("Inserting new record with data:", {
            user_id: session.user.id,
            patient_id: patientInfo.id,
            thaiid: thaiId,
            sleep_answer: orderedAnswers,
            sleep_score: calculateScore(),
          });
          const { error: insertError } = await supabase
            .from("risk_factors_test")
            .insert([{
              user_id: session.user.id,
              patient_id: patientInfo.id,
              thaiid: thaiId,
              sleep_answer: orderedAnswers,
              sleep_score: calculateScore(),
            }]);
          dbError = insertError;
        }
      } catch (dbOperationError) {
        console.error("Database operation failed:", dbOperationError);
        dbError = dbOperationError;
      }

      // If complex format failed, try simple format
      if (dbError) {
        console.log("Trying simple format as fallback...");
        try {
          if (existingRecord) {
            const { error: updateError } = await supabase
              .from("risk_factors_test")
              .update({
                sleep_answer: simpleAnswers,
                sleep_frequency: simpleFrequencies,
                sleep_score: calculateScore(),
                patient_id: patientInfo.id,
                user_id: session.user.id,
                thaiid: thaiId,
              })
              .eq("id", existingRecord.id);
            dbError = updateError;
          } else {
            const { error: insertError } = await supabase
              .from("risk_factors_test")
              .insert([{
                user_id: session.user.id,
                patient_id: patientInfo.id,
                thaiid: thaiId,
                sleep_answer: simpleAnswers,
                sleep_frequency: simpleFrequencies,
                sleep_score: calculateScore(),
              }]);
            dbError = insertError;
          }
          useSimpleFormat = true;
        } catch (fallbackError) {
          console.error("Fallback format also failed:", fallbackError);
          dbError = fallbackError;
        }
      }

      if (dbError) {
        console.error("Error saving RBD assessment:", dbError);
        const errorMessage = dbError.message || dbError.details || JSON.stringify(dbError) || "ไม่ทราบสาเหตุ";
        setSubmitMessage(`เกิดข้อผิดพลาด: ${errorMessage}`);
      } else {
        const formatUsed = useSimpleFormat ? " (ใช้รูปแบบข้อมูลแบบง่าย)" : "";
        setSubmitMessage(`บันทึกผลการประเมินเรียบร้อยแล้ว!${formatUsed}`);
        setShowResults(true);
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      setSubmitMessage("เกิดข้อผิดพลาดที่ไม่คาดคิด");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setAnswers({});
    setFrequencyAnswers({});
    setShowResults(false);
    setSubmitMessage("");
  };

  const totalScore = calculateScore();
  const scoreInfo = getScoreInterpretation(totalScore);
  const answeredQuestions = Object.keys(answers).length;
  const requiredFrequencyQuestions = Object.values(answers).filter(answer => answer === "yes").length;
  const answeredFrequencyQuestions = Object.keys(frequencyAnswers).length;
  const isComplete = answeredQuestions === questions.length && answeredFrequencyQuestions === requiredFrequencyQuestions;

  if (!showResults) {
    return (
      <div className="max-w-4xl mx-auto p-6 bg-white">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            แบบสอบถามเรื่องพฤติกรรมการนอนที่ผิดปกติในช่วงหลับฝัน
          </h1>
          <p className="text-gray-600">REM Sleep Behavior Disorder (RBD) Assessment</p>
        </div>

        {thaiId && patientInfo && (
          <div className="mb-4 p-3 bg-blue-50 rounded-lg text-center text-blue-700">
            กำลังทำแบบประเมินสำหรับ: {patientInfo.first_name} {patientInfo.last_name} ({thaiId})
          </div>
        )}

        <div className="bg-blue-50 p-4 rounded-lg mb-6">
          <h2 className="font-semibold text-blue-800 mb-2">คำแนะนำการทำแบบประเมิน</h2>
          <p className="text-blue-700 text-sm">
            กรุณาตอบคำถามเกี่ยวกับพฤติกรรมการนอนของคุณ หากตอบ "ใช่" กรุณาระบุความถี่ด้วย
          </p>
        </div>

        <div className="space-y-6">
          {questions.map((question, index) => (
            <div key={question.id} className="border border-gray-200 rounded-lg p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                {index + 1}. {question.text}
              </h3>
              
              {/* Yes/No/Unknown Options */}
              <div className="space-y-2 mb-4">
                {yesNoOptions.map((option) => (
                  <label key={option.value} className="flex items-center p-3 border border-gray-200 rounded hover:bg-gray-50 cursor-pointer">
                    <input
                      type="radio"
                      name={`question_${question.id}`}
                      value={option.value}
                      onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                      className="mr-3 text-blue-600"
                      checked={answers[question.id] === option.value}
                    />
                    <span className="text-gray-700">{option.label}</span>
                  </label>
                ))}
              </div>

              {/* Frequency Options - Only show if answered "yes" */}
              {answers[question.id] === "yes" && (
                <div className="ml-6 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-800 mb-3">ความถี่ที่เกิดขึ้น:</h4>
                  <div className="space-y-2">
                    {frequencyOptions.map((option) => (
                      <label key={option.value} className="flex items-center p-2 border border-gray-300 rounded hover:bg-white cursor-pointer">
                        <input
                          type="radio"
                          name={`frequency_${question.id}`}
                          value={option.value}
                          onChange={(e) => handleFrequencyChange(question.id, e.target.value)}
                          className="mr-3 text-blue-600"
                          checked={frequencyAnswers[question.id] === option.value}
                        />
                        <span className="text-gray-700">{option.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Scoring Information */}
        <div className="bg-gray-50 p-6 rounded-lg mt-8 mb-6">
          <h3 className="font-semibold text-gray-800 mb-3">หลักเกณฑ์คะแนน:</h3>
          <div className="space-y-2 text-sm text-gray-700">
            <p className="mt-3"><strong>คำถามเรื่องอาการซึ่งเคยมีตลอดชีวิต </strong></p>
            <p><strong>ข้อ 1-5 และ ข้อ 13 :</strong> ให้คะแนน ดังนี้ ไม่ทราบ = 0, ไม่ = 0, 	ใช่ = 1 </p>
            <p><strong>ข้อ 6-12 :</strong> ให้คะแนนเพิ่มขึ้น ดังนี้ ไม่ทราบ = 0, ไม่ = 0, 	ใช่ = 2 </p>
            <p className="mt-3"><strong>คำถามเรื่องความถี่ของอาการในช่วง 1 ปีที่ผ่านมามีคะแนน 5 ระดับ</strong></p>
            <p>ข้อ 1 – ข้อ 5 และ ข้อ 13 ให้คะแนน</p>
            <p>1 หรือ 2-3 ครั้งต่อปี = 1, 	1 หรือ 2-3 ครั้งต่อเดือน = 2, 	1 หรือ 2-3 ครั้งต่อสัปดาห์ = 3, 3 ครั้งหรือมากกว่าต่อสัปดาห์ = 4</p>
            <p>ข้อ 6 – ข้อ 12 ให้คะแนนเพิ่มขึ้น</p>
            <p>1 หรือ 2-3 ครั้งต่อปี = 2, 	1 หรือ 2-3 ครั้งต่อเดือน = 4, 	1 หรือ 2-3 ครั้งต่อสัปดาห์ = 6, 3 ครั้งหรือมากกว่าต่อสัปดาห์ = 8</p>
          </div>
        </div>

        <div className="flex flex-col items-center space-y-4">
          <div className="text-center">
            <p className="text-gray-600">
              ตอบแล้ว {answeredQuestions} จาก {questions.length} ข้อ
              {requiredFrequencyQuestions > 0 && ` (ความถี่: ${answeredFrequencyQuestions}/${requiredFrequencyQuestions})`}
            </p>
            <div className="w-64 bg-gray-200 rounded-full h-2 mt-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: isComplete ? "100%" : `${(answeredQuestions / questions.length) * 70 + (answeredFrequencyQuestions / Math.max(requiredFrequencyQuestions, 1)) * 30}%` }}
              ></div>
            </div>
          </div>
          
          <button
            onClick={handleSubmit}
            disabled={!isComplete || isSubmitting}
            className={`px-8 py-3 rounded-lg font-semibold transition-colors ${
              isComplete && !isSubmitting
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
          >
            {isSubmitting ? "กำลังบันทึก..." : "ดูผลประเมิน"}
          </button>
        </div>
        
        {submitMessage && (
          <div className={`mt-4 p-3 rounded ${submitMessage.includes("เรียบร้อย") ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
            {submitMessage}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          ผลการประเมิน RBD
        </h1>
      </div>

      <div className={`inline-block px-8 py-6 rounded-lg ${scoreInfo.bg} mb-6 w-full text-center`}>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">คะแนนรวม</h2>
        <div className="text-4xl font-bold text-gray-800 mb-2">{totalScore} คะแนน</div>
        <div className={`text-xl font-semibold ${scoreInfo.color}`}>
          {scoreInfo.level}
        </div>
      </div>

      <div className="bg-gray-50 p-6 rounded-lg mb-6">
        <h3 className="font-semibold text-gray-800 mb-4">รายละเอียดคำตอบ:</h3>
        <div className="space-y-3">
          {questions.map((question, index) => {
            const answer = answers[question.id];
            const frequency = frequencyAnswers[question.id];
            
            return (
              <div key={question.id} className="border-b border-gray-200 pb-2">
                <div className="flex justify-between items-start">
                  <span className="text-sm text-gray-700 flex-1 mr-4">
                    {index + 1}. {question.text}
                  </span>
                  <div className="text-right">
                    <span className={`text-sm font-medium ${
                      answer === "yes" ? "text-green-600" : 
                      answer === "no" ? "text-red-600" : "text-gray-600"
                    }`}>
                      {answer === "yes" ? "ใช่" : answer === "no" ? "ไม่ใช่" : "ไม่ทราบ"}
                    </span>
                    {frequency && (
                      <div className="text-xs text-blue-600 mt-1">
                        {frequencyOptions.find(opt => opt.value === frequency)?.label}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
        <div className="font-medium text-yellow-800 mb-1">คำแนะนำ:</div>
        <p className="text-yellow-700 text-sm mb-2">
          {scoreInfo.recommendation}
        </p>
        <p className="text-yellow-700 text-sm">
          แบบประเมินนี้เป็นเครื่องมือคัดกรองเบื้องต้น ไม่สามารถใช้วินิจฉัยแทนการตรวจโดยแพทย์ได้ 
          หากมีความกังวลเกี่ยวกับการนอนหรือพฤติกรรมขณะหลับ กรุณาปรึกษาแพทย์ผู้เชี่ยวชาญด้านการนอน
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={handleReset}
          className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          ทำแบบประเมินใหม่
        </button>
        
        <button onClick={() => window.history.go(-1)} className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700">
          กลับหน้าก่อนหน้า
        </button>
      </div>
      
      {submitMessage && (
        <div className={`mt-4 p-3 rounded ${submitMessage.includes("เรียบร้อย") ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
          {submitMessage}
        </div>
      )}
    </div>
  );
};

export default RBDAssessment;