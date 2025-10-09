"use client";

// app/component/pdform/SmellForm.tsx

import React, { useState, useCallback, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

// Types
interface Answer {
    [key: number]: string;
}

interface ScoreInterpretation {
    level: string;
    color: string;
    bg: string;
    description: string;
}

// Constants
const CORRECT_ANSWERS: Answer = {
    1: "A", // ส้ม
    2: "B", // เครื่องหนัง
    3: "D", // จันทาบอน/อนชง
    4: "C", // ปะปะปิรันต์/ผลชะมพผ
    5: "C", // กล้วย
    6: "C", // มะนาว
    7: "A", // ขะมอม
    8: "D", // น้ำผึ้งปีง
    9: "B", // กระเพียม
    10: "B", // กาแฟ
    11: "D", // แอปเปิ้ล
    12: "A", // กาบพลู
    13: "D", // สับปะรด
    14: "B", // กุหลาบ
    15: "A", // โบนิก้า
    16: "C" // ปลา
};

const QUESTIONS = [
    {
        id: 1,
        options: [
            { value: "A", label: "ส้ม" },
            { value: "B", label: "สตรอเบอรี" },
            { value: "C", label: "แบล็กเบอร์รี" },
            { value: "D", label: "สับปะรด" }
        ]
    },
    {
        id: 2,
        options: [
            { value: "A", label: "ควัน" },
            { value: "B", label: "เครื่องหนัง" },
            { value: "C", label: "กาว" },
            { value: "D", label: "หญ้า" }
        ]
    },
    {
        id: 3,
        options: [
            { value: "A", label: "น้ำผึ้ง" },
            { value: "B", label: "ช็อกโกแลต" },
            { value: "C", label: "วานิลลา" },
            { value: "D", label: "ซินนามอน/ อบเชย" }
        ]
    },
    {
        id: 4,
        options: [
            { value: "A", label: "ต้นหอม" },
            { value: "B", label: "ต้นสน" },
            { value: "C", label: "เปปเปอร์มินต์/สะระแหน่" },
            { value: "D", label: "หัวหอม" }
        ]
    },
    {
        id: 5,
        options: [
            { value: "A", label: "มะพร้าว" },
            { value: "B", label: "ถั่ววอลนัต" },
            { value: "C", label: "กล้วย" },
            { value: "D", label: "เชอรี่" }
        ]
    },
    {
        id: 6,
        options: [
            { value: "A", label: "ลูกพีช" },
            { value: "B", label: "แอปเปิ้ล" },
            { value: "C", label: "มะนาว" },
            { value: "D", label: "เกรปฟรุต/ ส้มผลใหญ่" }
        ]
    },
    {
        id: 7,
        options: [
            { value: "A", label: "ชะเอม" },
            { value: "B", label: "เชอรี่" },
            { value: "C", label: "สเปียร์มินต์" },
            { value: "D", label: "คุกกี้" }
        ]
    },
    {
        id: 8,
        options: [
            { value: "A", label: "มัสตาร์ด" },
            { value: "B", label: "เมนทอล" },
            { value: "C", label: "ยาง" },
            { value: "D", label: "น้ำมันสน" }
        ]
    },
    {
        id: 9,
        options: [
            { value: "A", label: "หัวหอม" },
            { value: "B", label: "กระเทียม" },
            { value: "C", label: "กะหล่ำปลีดอง" },
            { value: "D", label: "แคร์รอต" }
        ]
    },
    {
        id: 10,
        options: [
            { value: "A", label: "บุหรี่" },
            { value: "B", label: "กาแฟ" },
            { value: "C", label: "ไวน์" },
            { value: "D", label: "ควันไฟ" }
        ]
    },
    {
        id: 11,
        options: [
            { value: "A", label: "เมลอน/ แตงไทย" },
            { value: "B", label: "ส้ม" },
            { value: "C", label: "ลูกพีช/ลูกพีช" },
            { value: "D", label: "แอปเปิ้ล" }
        ]
    },
    {
        id: 12,
        options: [
            { value: "A", label: "กานพลู" },
            { value: "B", label: "พริกไทย" },
            { value: "C", label: "ซินนามอน/อบเชย" },
            { value: "D", label: "มัสตาร์ด" }
        ]
    },
    {
        id: 13,
        options: [
            { value: "A", label: "สาลี่" },
            { value: "B", label: "ลูกพรุน" },
            { value: "C", label: "ลูกพีช/ ลูกท้อ" },
            { value: "D", label: "สับปะรด" }
        ]
    },
    {
        id: 14,
        options: [
            { value: "A", label: "คาโมมายล์" },
            { value: "B", label: "กุหลาบ" },
            { value: "C", label: "ราสป์เบอร์รี" },
            { value: "D", label: "เชอรี่" }
        ]
    },
    {
        id: 15,
        options: [
            { value: "A", label: "โป๊ยกั๊ก" },
            { value: "B", label: "น้ำผึ้ง" },
            { value: "C", label: "รัม" },
            { value: "D", label: "ต้นสน" }
        ]
    },
    {
        id: 16,
        options: [
            { value: "A", label: "ขนมปัง" },
            { value: "B", label: "ชีส" },
            { value: "C", label: "ปลา" },
            { value: "D", label: "แฮม" }
        ]
    }
];

export default function Smell({ thaiId }: { thaiId?: string }) {

    const searchParams = useSearchParams();
    const router = useRouter();
    // const thaiId = searchParams.get("patient_thaiid");

    const [answers, setAnswers] = useState<Answer>({});
    const [showResults, setShowResults] = useState(false);
    const [patientInfo, setPatientInfo] = useState<any>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitMessage, setSubmitMessage] = useState("");

    // Memoized handlers to prevent unnecessary re-renders
    const handleAnswerChange = useCallback((questionId: number, value: string) => {
        setAnswers(prev => ({
            ...prev,
            [questionId]: value
        }));
    }, []);

    const calculateScore = useCallback((): number => {
        let score = 0;
        Object.entries(answers).forEach(([questionId, answer]) => {
            if (CORRECT_ANSWERS[parseInt(questionId)] === answer) {
                score += 1;
            }
        });
        return score;
    }, [answers]);

    const getScoreInterpretation = useCallback((score: number): ScoreInterpretation => {
        const percentage = (score / 16) * 100;

        if (score >= 12) {
            return {
                level: "ปกติ",
                color: "text-green-600",
                bg: "bg-green-100",
                description: "ความสามารถในการดมกลิ่นอยู่ในเกณฑ์ปกติ"
            };
        } else if (score >= 9) {
            return {
                level: "ผิดปกติเล็กน้อย",
                color: "text-yellow-600",
                bg: "bg-yellow-100",
                description: "มีการลดลงของความสามารถในการดมกลิ่นเล็กน้อย"
            };
        } else {
            return {
                level: "ผิดปกติอย่างมาก",
                color: "text-red-600",
                bg: "bg-red-100",
                description: "ความสามารถในการดมกลิ่นลดลงอย่างมาก ควรปรึกษาแพทย์"
            };
        }
    }, []);

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
                // .eq("user_id", session.user.id)
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
            const orderedAnswers = QUESTIONS.map(q => answers[q.id] || "");
            const totalScore = calculateScore();

            // Validate data before sending
            console.log("Validating data before save:", {
                thaiId,
                patientInfo: patientInfo ? { id: patientInfo.id, name: `${patientInfo.first_name} ${patientInfo.last_name}` } : null,
                orderedAnswers,
                score: totalScore,
                answersCount: Object.keys(answers).length
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
            try {
                if (existingRecord) {
                    console.log("Updating existing record with data:", {
                        smell_answer: orderedAnswers,
                        smell_score: totalScore,
                        patient_id: patientInfo.id,
                        user_id: session.user.id,
                        thaiid: thaiId,
                    });
                    const { error: updateError } = await supabase
                        .from("risk_factors_test")
                        .update({
                            smell_answer: orderedAnswers,
                            smell_score: totalScore,
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
                        smell_answer: orderedAnswers,
                        smell_score: totalScore,
                    });
                    const { error: insertError } = await supabase
                        .from("risk_factors_test")
                        .insert([{
                            user_id: session.user.id,
                            patient_id: patientInfo.id,
                            thaiid: thaiId,
                            smell_answer: orderedAnswers,
                            smell_score: totalScore,
                        }]);
                    dbError = insertError;
                }
            } catch (dbOperationError) {
                console.error("Database operation failed:", dbOperationError);
                dbError = dbOperationError;
            }

            if (dbError) {
                console.error("Error saving smell assessment:", dbError);
                const errorMessage = dbError.message || dbError.details || JSON.stringify(dbError) || "ไม่ทราบสาเหตุ";
                setSubmitMessage(`เกิดข้อผิดพลาด: ${errorMessage}`);
            } else {
                setSubmitMessage("บันทึกผลการประเมินเรียบร้อยแล้ว!");
                setShowResults(true);
            }
        } catch (err) {
            console.error("Unexpected error:", err);
            setSubmitMessage("เกิดข้อผิดพลาดที่ไม่คาดคิด");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleReset = useCallback(() => {
        setAnswers({});
        setShowResults(false);
        setSubmitMessage("");
    }, []);

    const totalScore = calculateScore();
    const scoreInfo = getScoreInterpretation(totalScore);
    const answeredQuestions = Object.keys(answers).length;
    const isComplete = answeredQuestions === QUESTIONS.length;

    if (!showResults) {
        return (
            <div className="max-w-4xl mx-auto p-4 sm:p-6 md:p-8 bg-white min-h-screen">
                {/* Header */}
                <div className="text-center mb-6 sm:mb-8">
                    <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800 mb-4 sm:mb-6 px-2">
                        แบบทดสอบความสามารถในการดมกลิ่น
                    </h1>

                    <div className="text-left max-w-3xl mx-auto mb-6 sm:mb-8 px-2">
                        <p className="text-gray-700 text-xs sm:text-sm leading-relaxed">
                            <strong>คำชี้แจง:</strong> กลิ่นที่ท่านได้กลิ่นดังต่อไปนี้คือกลิ่นใด มี 16 ข้อ จงวงกลมหรือกากบากคำตอบที่ถูกต้อง
                        </p>
                    </div>
                </div>

                {thaiId && patientInfo && (
                    <div className="mb-4 p-3 bg-blue-50 rounded-lg text-center text-blue-700">
                        กำลังทำแบบประเมินสำหรับ: {patientInfo.first_name} {patientInfo.last_name} ({thaiId})
                    </div>
                )}

                <div className="space-y-6">
                {Array.from({ length: 8 }, (_, rowIndex) => (
                    <div
                    key={rowIndex}
                    className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 sm:gap-8"
                    >
                    {QUESTIONS.slice(rowIndex * 2, rowIndex * 2 + 2).map((question) => (
                        <div
                        key={question.id}
                        className="border border-gray-300 p-4 rounded-lg shadow-sm hover:shadow-md transition"
                        >
                        <h3 className="text-base sm:text-lg md:text-xl font-semibold text-gray-800 mb-4 text-center">
                            {question.id}. กลิ่นที่ {question.id}
                        </h3>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {question.options.map((option) => {
                            const isCorrectAnswer =
                                CORRECT_ANSWERS[question.id] === option.value;

                            return (
                                <label
                                key={option.value}
                                className={`flex items-center p-2 cursor-pointer rounded-lg border transition-colors duration-150
                                    ${
                                    answers[question.id] === option.value
                                        ? "bg-blue-50 border-blue-400"
                                        : "border-gray-200 hover:bg-gray-50"
                                    }`}
                                >
                                <input
                                    type="radio"
                                    name={`question_${question.id}`}
                                    value={option.value}
                                    onChange={(e) =>
                                    handleAnswerChange(question.id, e.target.value)
                                    }
                                    className="mr-2 text-blue-600"
                                    checked={answers[question.id] === option.value}
                                />
                                <span className="text-sm sm:text-base">
                                    <strong>{option.value}.</strong>{" "}
                                    <span>{option.label}</span>
                                </span>
                                </label>
                            );
                            })}
                        </div>
                        </div>
                    ))}
                    </div>
                ))}
                </div>


                {/* Score section */}
                <div className="mt-8 text-center">
                    <div className="inline-block border-2 border-gray-800 p-4 mb-6">
                        <span className="text-lg font-semibold">คะแนนรวม {totalScore}/16</span>
                    </div>
                </div>

                {/* Progress and Submit */}
                <div className="flex flex-col items-center space-y-4 mt-8">
                    <div className="text-center">
                        <p className="text-gray-600">
                            ตอบแล้ว {answeredQuestions} จาก {QUESTIONS.length} ข้อ
                        </p>
                        <div className="w-64 bg-gray-200 rounded-full h-2 mt-2">
                            <div
                                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${(answeredQuestions / QUESTIONS.length) * 100}%` }}
                                role="progressbar"
                                aria-valuenow={answeredQuestions}
                                aria-valuemin={0}
                                aria-valuemax={QUESTIONS.length}
                            ></div>
                        </div>
                    </div>

                    <button
                        onClick={handleSubmit}
                        disabled={!isComplete || isSubmitting}
                        className={`px-8 py-3 rounded-lg font-semibold transition-colors ${isComplete && !isSubmitting
                                ? "bg-blue-600 text-white hover:bg-blue-700"
                                : "bg-gray-300 text-gray-500 cursor-not-allowed"
                            }`}
                        aria-label={isComplete ? "ดูผลการทดสอบ" : "กรุณาตอบคำถามให้ครบก่อน"}
                    >
                        {isSubmitting ? "กำลังบันทึก..." : "ดูผลการทดสอบ"}
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
        <div className="max-w-4xl mx-auto p-8 bg-white">
            <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-gray-800 mb-2">
                    ผลการทดสอบกลิ่น
                </h1>
            </div>

            <div className={`inline-block px-8 py-6 rounded-lg ${scoreInfo.bg} mb-6 w-full text-center`}>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">คะแนนรวม</h2>
                <div className="text-4xl font-bold text-gray-800 mb-2">{totalScore}/16</div>
                <div className="text-lg text-gray-600 mb-2">
                    ({((totalScore / 16) * 100).toFixed(1)}%)
                </div>
                <div className={`text-xl font-semibold ${scoreInfo.color}`}>
                    {scoreInfo.level}
                </div>
                <p className="text-sm text-gray-600 mt-2">
                    {scoreInfo.description}
                </p>
            </div>

            {/* Detailed Results */}
            <div className="bg-gray-50 p-6 rounded-lg mb-6">
                <h3 className="font-semibold text-gray-800 mb-4">รายละเอียดคำตอบ:</h3>
                <div className="grid grid-cols-2 gap-4">
                    {QUESTIONS.map((question) => {
                        const userAnswer = answers[question.id];
                        const correctAnswer = CORRECT_ANSWERS[question.id];
                        const isCorrect = userAnswer === correctAnswer;
                        const correctOption = question.options.find(opt => opt.value === correctAnswer);
                        const userOption = question.options.find(opt => opt.value === userAnswer);

                        return (
                            <div key={question.id} className="border border-gray-200 p-3 rounded bg-white">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="font-medium text-gray-800">ข้อ {question.id}</span>
                                    <span className={`text-sm font-medium px-2 py-1 rounded ${isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                        }`}>
                                        {isCorrect ? '✓ ถูก' : '✗ ผิด'}
                                    </span>
                                </div>
                                <div className="text-xs text-gray-600">
                                    <div>คำตอบของคุณ: <span className="font-medium">{userOption?.label || 'ไม่ได้ตอบ'}</span></div>
                                    <div>คำตอบที่ถูก: <span className="font-medium text-green-600">{correctOption?.label}</span></div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Score Interpretation */}
            <div className="bg-blue-50 p-6 rounded-lg mb-6">
                <h3 className="font-semibold text-blue-800 mb-3">เกณฑ์การแปลผล:</h3>
                <div className="space-y-2 text-sm text-blue-700">
                    <div className="flex justify-between">
                        <span>12-16 คะแนน (75-100%):</span>
                        <span className="font-medium text-green-600">ปกติ</span>
                    </div>
                    <div className="flex justify-between">
                        <span>9-11 คะแนน (50-74%):</span>
                        <span className="font-medium text-yellow-600">ผิดปกติเล็กน้อย</span>
                    </div>
                    <div className="flex justify-between">
                        <span>0-8 คะแนน (0-49%):</span>
                        <span className="font-medium text-red-600">ผิดปกติอย่างมาก</span>
                    </div>
                </div>
            </div>

            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
                <div className="font-medium text-yellow-800 mb-1">คำแนะนำ:</div>
                <p className="text-yellow-700 text-sm">
                    หากผลการทดสอบแสดงว่าความสามารถในการดมกลิ่นลดลง อาจเป็นสัญญาณของปัญหาสุขภาพที่ต้องติดตาม
                    เช่น โรคพาร์กินสัน, โรคอัลไซเมอร์ หรือปัญหาอื่นๆ ควรปรึกษาแพทย์เพื่อการตรวจวินิจฉัยเพิ่มเติม
                </p>
            </div>

            <div className="text-center space-x-4">
                <button
                    onClick={handleReset}
                    className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                    ทำแบบทดสอบใหม่
                </button>
                <button
                    onClick={() => window.print()}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    พิมพ์ผลการทดสอบ
                </button>

                <button onClick={() => window.history.go(-1)} className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors">
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