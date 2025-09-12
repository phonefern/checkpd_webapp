
"use client";
// app/component/pdform/HamdForm.tsx
import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

const questions = [
    {
      id: 1,
      title: "1. อารมณ์ซึมเศร้า (DEPRESSED MOOD)",
      subtitle: "เศร้าใจ, สิ้นหวัง, หมดหนุ่ม, ไร้ค่า",
      options: [
        { value: 0, label: "0 - ไม่มี" },
        { value: 1, label: "1 - จะบอกภาวะความรู้สึกนี้ต่อเมื่อถามเท่านั้น" },
        { value: 2, label: "2 - บอกภาวะความรู้สึกนี้ออกมาเอง" },
        { value: 3, label: "3 - สื่อภาวะความรู้สึกนี้โดยภาษากาย ได้แก่ ทางการแสดงสีหน้า, ท่าทาง, น้ำเสียงและท่าทางจะร้องไห้ " },
        { value: 4, label: "4 - ผู้ป่วยบอกเพียงความรู้สึกนี้อย่างชัดเจน ทั้งการบอกเล่าเอง และภาษากาย" }
      ]
    },
    {
      id: 2,
      title: "2. ความรู้สึกผิด/ความผิด (FEELINGS OF GUILT)",
      options: [
        { value: 0, label: "0 - ไม่มี" },
        { value: 1, label: "1 - ติเตียนตนเอง รู้สึกตนเองทำให้ผู้อื่นเสียใจ" },
        { value: 2, label: "2 - ความคิดว่าตนเองมีผิด หรือครุ่นคำนึงถึงความผิดพลาดหรือการก่อกรรมทำบาปในอดีต" },
        { value: 3, label: "3 - ความเจ็บป่วยในปัจจุบันเป็นการลงโทษ, มีอาการหลงผิดว่าตนเองมีความผิดบาป" },
        { value: 4, label: "4 - ได้ยินเสียงกล่าวโทษ หรือประณาม และ/หรือ เห็นภาพหลอนที่ข่มขู่คุมคาม" }
      ]
    },
    {
      id: 3,
      title: "3. ความคิดฆ่าตัวตาย  (SUICIDE)",
      options: [
        { value: 0, label: "0 - ไม่มี" },
        { value: 1, label: "1 - รู้สึกชีวิตไร้ค่า" },
        { value: 2, label: "2 - คิดว่าตนเองน่าจะตาย หรือมีความคิดใด ๆ เกี่ยวกับการตายที่อาจเกิดขึ้นได้กับตนเอง" },
        { value: 3, label: "3 - มีความคิดหรือท่าทีจะฆ่าตัวตาย" },
        { value: 4, label: "4 - พยายามฆ่าตัวตาย (ความพยายามใดๆ ที่รุนแรง ให้คะแนน 4)" }
      ]
    },
    {
      id: 4,
      title: "4. การนอนไม่หลับในช่วงต้น  (INSOMNIA EARLY)",
      options: [
        { value: 0, label: "0 - ไม่มีนอนหลับยาก" },
        { value: 1, label: "1 - แจ้งว่ามีนอนหลับยากบางครั้ง ได้แก่นานมากกว่า 1/2 ชั่วโมง" },
        { value: 2, label: "2 - แจ้งว่านอนหลับยากทุกคืน" }
      ]
    },
    {
      id: 5,
      title: "5. การนอนไม่หลับ ในช่วงกลางคืน (INSOMNIA MIDDLE)",
      options: [
        { value: 0, label: "0 - ไม่มีปัญหา" },
        { value: 1, label: "1 - ผู้ป่วยแจ้งว่ากระสับกระส่ายและนอนหลับไม่สนิทช่วงกลางคืน" },
        { value: 2, label: "2 - ตื่นกลางดึก การลุกจากที่นอนไม่ว่าจะจากอะไรก็ตาม ให้คะแนน 2 (ยกเว้นเพื่อปัสสาวะ)" }
      ]
    },
    {
      id: 6,
      title: "6. การตื่นนอนเช้ากว่าปกติ  (INSOMNIA LATE)",
      options: [
        { value: 0, label: "0 - ไม่มีปัญหา" },
        { value: 1, label: "1 - ตื่นแต่เช้ามืด แต่นอนหลับต่อได้" },
        { value: 2, label: "2 - ไม่สามารถนอนหลับต่อได้อีก หากลุกจากเตียงไปแล้ว" }
      ]
    },
    {
      id: 7,
      title: "7. การงานและกิจกรรม (WORK AND ACTIVITIES)",
      options: [
        { value: 0, label: "0 - ไม่มีปัญหา" },
        { value: 1, label: "1 - มีความคิดหรือความรู้สึก ว่าตนเองไม่มีสมรรถภาพ, เหนื่อยล้า, หรืออ่อนแรงที่จะทำกิจกรรมต่างๆ; การงาน หรืองานอดิเรก" },
        { value: 2, label: "2 - หมดความสนใจในกิจกรรมต่างๆ; งานอดิเรก หรืองานประจำไม่ว่าจะทราบโดยตรงจากการบอกเล่าของผู้ป่วย หรือทางอ้อมจากการที่ผู้ป่วยดูไม่กระตือรือร้น, ลังเลใจ และเปลี่ยนใจไปมา (ผู้ป่วยรู้สึกว่าต้องบังคับให้ตนเองทำงานหรือกิจกรรม)" },
        { value: 3, label: "3 - ใช้เวลาจริง ในการทำงานอย่างเป็นผลลดลง หากอยู่ในโรงพยาบาล, ให้คะแนน 3 ถ้าผู้ป่วยใช้เวลาต่ำกว่า 3 ชั่วโมงต่อวันในการทำกิจกรรม (งานของโรงพยาบาลหรืองานอดิเรก)ยกเว้นหน้าที่ประจำวันในโรงพยาบาล" },
        { value: 4, label: "4 - ไม่ได้ทำงานเพราะการเจ็บป่วยในปัจจุบัน. หากอยู่ในโรงพยาบาล, ให้คะแนน 4 ถ้าผู้ป่วยไม่ทำกิจกรรมอื่นนอกจากหน้าที่ประจำวัน หรือถ้าผู้ป่วยทำหน้าที่ประจำวันไม่ได้หากไม่มีคนช่วย" }
      ]
    },
    {
      id: 8,
      title: "8. ความล้าเฉื่อย (RETARDATION: PSYCHOMOTOR)",
      subtitle: "ความเชื่องช้าของความคิดและการพูดจา, สมาธิเสื่อม, การเคลื่อนไหวลดลง",
      options: [
        { value: 0, label: "0 - การพูดจาและความคิดปกติ" },
        { value: 1, label: "1 - มีความเฉื่อยชาเล็กน้อยขณะสัมภาษณ์" },
        { value: 2, label: "2 - มีความเฉื่อยชาเจนขณะสัมภาษณ์" },
        { value: 3, label: "3 - สัมภาษณ์ได้อย่างลำบาก" },
        { value: 4, label: "4 - อยู่นิ่งเฉยไม่ขยับเขยื้อน" }
      ]
    },
    {
      id: 9,
      title: "9. อาการกระวนกระวายทั้งกายและใจ (AGITATION)",
      options: [
        { value: 0, label: "0 - ไม่มี" },
        { value: 1, label: "1 - หงุดหงิดงุ่นง่าน" },
        { value: 2, label: "2 - เล่นมือ สางผม ฯลฯ" },
        { value: 3, label: "3 - ขยับตัวไปมา นั่งนิ่งๆไม่ได้" },
        { value: 4, label: "4 - บีบมือ กัดเล็บ ดึงผม กัดริมฝีปาก" }
      ]
    },
    {
      id: 10,
      title: "10. ความวิตกกังวลในจิตใจ (ANXIETY PSYCHOLOGICAL)",
      options: [
        { value: 0, label: "0 - ไม่มีปัญหา" },
        { value: 1, label: "1 - ผู้ป่วยรู้สึกตึงเครียด และหงุดหงิด" },
        { value: 2, label: "2 - กังวลในเรื่องเล็กน้อย" },
        { value: 3, label: "3 - การพูดจาหรือสีหน้ามีท่าทีหวั่นวิตก" },
        { value: 4, label: "4 - แสดงความหวาดกลัวโดยไม่ต้องถาม" }
      ]
    },
    {
      id: 11,
      title: "11. ความวิตกกังวลซึ่งแสดงออกทางกาย (ANXIETY SOMATIC)",
      description: "มีอาการด้านสรีระวิทยาร่วมกับความวิตกกังวล เช่น ระบบทางเดินอาหาร : ปากแห้ง ลมขึ้น อาหารไม่ย่อย ท้องเสีย ปวดเกร็งท้อง แน่นท้อง ระบบหัวใจและหลอดเลือด : ใจสั่น ปวดศีรษะ ระบบหายใจ : หายใจหอบเร็ว ถอนหายใจ ระบบอื่นๆ : ปัสสาวะบ่อย เหงื่อออก ควรหลีกเลี่ยงการถามเกี่ยวกับผลการออกฤทธิ์ของยา (side effects) : เช่น ริมฝีปากแห้ง ท้องผูก)",
      options: [
        { value: 0, label: "0 - ไม่มี" },
        { value: 1, label: "1 - เล็กน้อย" },
        { value: 2, label: "2 - ปานกลาง" },
        { value: 3, label: "3 - รุนแรง" },
        { value: 4, label: "4 - เสื่อมสมรรถภาพ" }
      ]
    },
    {
      id: 12,
      title: "12. อาการทางกาย ระบบทางเดินอาหาร (SOMATIC SYMPTOMS [GASTROINTESTINAL])",
      options: [
        { value: 0, label: "0 - ไม่มี" },
        { value: 1, label: "1 - เบื่ออาหาร แต่รับประทานได้โดยผู้อื่นไม่ต้องคอยกระตุ้น เช่น รู้สึกหน่วงในท้อง" },
        { value: 2, label: "2 - รับประทานยา หากไม่มีคนคอยกระตุ้น เช่น ขอหรือจำต้องได้ยาระบายหรือยาเกี่ยวกับลำไส้ หรือยาสำหรับอาการของระบบทางเดินอาหาร" }
      ]
    },
    {
      id: 13,
      title: "13. อาการทางกาย อาการทั่วไป (SOMATIC SYMPTOMS GENERAL)",
      options: [
        { value: 0, label: "0 - ไม่มี" },
        { value: 1, label: "1 - ตึงแขนขา หลังหรือศีรษะ ปวดหลัง ปวดศีรษะ ปวดกล้ามเนื้อ ไม่มีแรงและอ่อนเพลีย" },
        { value: 2, label: "2 - มีอาการใด ๆ ที่ชัดเจน ให้คะแนน 2" }
      ]
    },
    {
      id: 14,
      title: "14. อาการเกี่ยวข้องกับระบบสืบพันธุ์ (GENITAL SYMPTOMS)",
      options: [
        { value: 0, label: "0 - ไม่มีอาการเช่น: หมดความสนใจทางเพศ, ประจำเดือนผิดปกติ" },
        { value: 1, label: "1 - เล็กน้อย" },
        { value: 2, label: "2 - ปานกลาง" }
      ]
    },
    {
      id: 15,
      title: "15. อาการคิดว่าตนป่วยเป็นโรคทางกาย (HYPOCHONDRIASIS)",
      options: [
        { value: 0, label: "0 - ไม่มี" },
        { value: 1, label: "1 - สนใจอยู่แต่เรื่องของตนเอง (ด้านร่างกาย)" },
        { value: 2, label: "2 - หมกมุ่นเรื่องสุขภาพ" },
        { value: 3, label: "3 - แจ้งถึงอาการต่าง ๆ บ่อย เรียกร้องความช่วยเหลือ ฯลฯ" },
        { value: 4, label: "4 - มีอาการหลงผิดว่าตนป่วยเป็นโรคทางกาย" }
      ]
    },
    {
      id: 16,
      title: "16. น้ำหนักลด (LOSS OF WEIGHT) เลือกข้อ ก. หรือ ข.",
      subtitle: "ก. เมื่อให้คะแนนโดยอาศัยประวัติ:",
      options: [
        { value: 0, label: "0 - ไม่มีน้ำหนักลด" },
        { value: 1, label: "1 - อาจมีน้ำหนักลด ซึ่งเกี่ยวเนื่องกับการเจ็บป่วยครั้งนี้" },
        { value: 2, label: "2 - น้ำหนักลดชัดเจน (ตามคำบอกเล่าของผู้ป่วย)" },
        { value: 3, label: "3 - ไม่ได้ประเมิน" }
      ],
      subtitle2: "ข. จากการให้คะแนนประจำสัปดาห์โดยจิตแพทย์ประจำหอผู้ป่วย เมื่อได้ชั่งวัดน้ำหนักที่เปลี่ยนไปจริง:",
      options2: [
        { value: 0, label: "0 - น้ำหนักลดน้อยกว่า 0.5 กิโลกรัมใน 1 สัปดาห์" },
        { value: 1, label: "1 - น้ำหนักลดมากกว่า 0.5 กิโลกรัมใน 1 สัปดาห์" },
        { value: 2, label: "2 - น้ำหนักลดมากกว่า 1 กิโลกรัมใน 1 สัปดาห์" },
        { value: 3, label: "3 - ไม่ได้ประเมิน" }
      ]
    },
    {
      id: 17,
      title: "17. การหยั่งเห็นถึงความผิดปกติของตนเอง (INSIGHT)",
      options: [
        { value: 0, label: "0 - ตระหนักว่าตนเองกำลังซึมเศร้า และเจ็บป่วย" },
        { value: 1, label: "1 - ตระหนักว่ากำลังเจ็บป่วย แต่โยงสาเหตุกับ อาหารที่ไม่มีคุณค่า ดินฟ้าอากาศ การทำงานหนัก ไวรัส การต้องการพักผ่อน ฯลฯ" },
        { value: 2, label: "2 - ปฏิเสธการเจ็บป่วยโดยสิ้นเชิง" }
      ]
    }
  ];

export default function Hamd({ thaiId }: { thaiId?: string }) {
    const searchParams = useSearchParams();
    const router = useRouter();
    // const thaiId = searchParams.get("patient_thaiid");
  
    const [answers, setAnswers] = useState<Record<number, number>>({});
    const [showResults, setShowResults] = useState(false);
    const [patientInfo, setPatientInfo] = useState<any>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitMessage, setSubmitMessage] = useState("");
    const [question16Choice, setQuestion16Choice] = useState<string>('');


    const handleAnswerChange = (questionId: number, value: number) => {
        setAnswers(prev => ({
          ...prev,
          [questionId]: parseInt(value.toString())
        }));
      };
    
      const handleQuestion16Choice = (choice: string) => {
        setQuestion16Choice(choice);
        // Clear previous answer when choice changes
        setAnswers(prev => {
          const newAnswers = { ...prev };
          delete newAnswers[16];
          return newAnswers;
        });
      };
    
      const getOrderedAnswers = () => {
        return questions.map(q => answers[q.id] ?? 0);
      };
    
      const calculateTotalScore = () => {
        return getOrderedAnswers().reduce((sum, score) => sum + (score || 0), 0);
      };
    
      const getDepressionLevel = (score: number) => {
        if (score <= 7) return { level: "ปกติ", color: "text-green-600", bg: "bg-green-100" };
        if (score <= 12) return { level: "ซึมเศร้าเล็กน้อย", color: "text-yellow-600", bg: "bg-yellow-100" };
        if (score <= 17) return { level: "ซึมเศร้าปานกลาง", color: "text-orange-600", bg: "bg-orange-100" };
        if (score <= 29) return { level: "ซึมเศร้าระดับรุนแรง", color: "text-red-600", bg: "bg-red-100" };
        if (score > 30) return { level: "ซึมเศร้าระดับรุนแรงมาก", color: "text-red-800", bg: "bg-red-200" };
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
          const { data: existingRows } = await supabase
            .from("risk_factors_test")
            .select("id")
            .eq("user_id", session.user.id)
            .eq("thaiid", thaiId);
    
          const existingRecord = existingRows && existingRows.length > 0 ? existingRows[0] : null;
    
          let dbError: any = null;
          const orderedAnswers = getOrderedAnswers();
          if (existingRecord) {
            const { error: updateError } = await supabase
              .from("risk_factors_test")
              .update({
                hamd_answer: orderedAnswers,
                hamd_score: calculateTotalScore(),
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
                hamd_answer: orderedAnswers,
                hamd_score: calculateTotalScore(),
              }]);
            dbError = insertError;
          }
    
          if (dbError) {
            console.error("Error saving HAM-D:", dbError);
            setSubmitMessage(`เกิดข้อผิดพลาด: ${dbError.message}`);
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
    
      const totalScore = calculateTotalScore();
      const depressionInfo = getDepressionLevel(totalScore) || { level: "", color: "text-gray-600", bg: "bg-gray-100" };
      const answeredQuestions = Object.keys(answers).length;
      const allAnswered = questions.every(q => answers[q.id] !== undefined && answers[q.id] !== null) && (!!question16Choice);
    
      return (
        <div className="max-w-4xl mx-auto p-6 bg-white">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Hamilton Depression Rating Scale (HAM-D)</h1>
            <p className="text-gray-600">แบบประเมินภาวะซึมเศร้า</p>
          </div>
    
          {!showResults ? (
            <div className="space-y-8">
              {/* <div className="bg-blue-50 p-4 rounded-lg mb-6">
                <h2 className="font-semibold text-blue-800 mb-2">คำแนะนำการทำแบบประเมิน</h2>
                <p className="text-blue-700 text-sm">
                  กรุณาอ่านคำถามแต่ละข้อและเลือกคำตอบที่ตรงกับสภาวะของคุณในช่วง 2 สัปดาห์ที่ผ่านมา
                </p>
              </div> */}
    
              {thaiId && patientInfo && (
                <div className="mb-4 p-3 bg-blue-50 rounded-lg text-center text-blue-700">
                  กำลังทำแบบประเมินสำหรับ: {patientInfo.first_name} {patientInfo.last_name} ({thaiId})
                </div>
              )}
    
              {questions.map((question) => (
                <div key={question.id} className="border border-gray-200 rounded-lg p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">
                    {question.title}
                  </h3>
                  {question.subtitle && (
                    <p className="text-sm text-gray-600 mb-3">{question.subtitle}</p>
                  )}
                  {question.description && (
                    <p className="text-sm text-gray-600 mb-4 bg-gray-50 p-3 rounded">
                      {question.description}
                    </p>
                  )}
    
                  {question.id === 16 ? (
                    <div className="space-y-4">
                      <div className="flex gap-3 mb-2">
                        <button
                          type="button"
                          onClick={() => handleQuestion16Choice('A')}
                          className={`px-3 py-1 rounded border ${question16Choice === 'A' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300'}`}
                        >
                          เลือกข้อ ก.
                        </button>
                        <button
                          type="button"
                          onClick={() => handleQuestion16Choice('B')}
                          className={`px-3 py-1 rounded border ${question16Choice === 'B' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300'}`}
                        >
                          เลือกข้อ ข.
                        </button>
                      </div>
                      {question16Choice === 'A' && (
                        <>
                          {question.subtitle && (
                            <p className="text-sm text-gray-600 mb-3">{question.subtitle}</p>
                          )}
                          <div className="space-y-2">
                            {question.options.map((option) => (
                              <label key={`16A_${option.value}`} className="flex items-center p-3 border border-gray-200 rounded hover:bg-gray-50 cursor-pointer">
                                <input
                                  type="radio"
                                  name={`question_16`}
                                  value={option.value}
                                  onChange={(e) => handleAnswerChange(16, parseInt(e.target.value))}
                                  checked={answers[16] === option.value}
                                  className="mr-3 text-blue-600"
                                />
                                <span className="text-gray-700">{option.label}</span>
                              </label>
                            ))}
                          </div>
                        </>
                      )}
                      {question16Choice === 'B' && (
                        <>
                          {question.subtitle2 && (
                            <p className="text-sm text-gray-600 mb-3">{question.subtitle2}</p>
                          )}
                          <div className="space-y-2">
                            {(question.options2 || []).map((option) => (
                              <label key={`16B_${option.value}`} className="flex items-center p-3 border border-gray-200 rounded hover:bg-gray-50 cursor-pointer">
                                <input
                                  type="radio"
                                  name={`question_16`}
                                  value={option.value}
                                  onChange={(e) => handleAnswerChange(16, parseInt(e.target.value))}
                                  checked={answers[16] === option.value}
                                  className="mr-3 text-blue-600"
                                />
                                <span className="text-gray-700">{option.label}</span>
                              </label>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {question.options.map((option) => (
                        <label key={option.value} className="flex items-center p-3 border border-gray-200 rounded hover:bg-gray-50 cursor-pointer">
                          <input
                            type="radio"
                            name={`question_${question.id}`}
                            value={option.value}
                            onChange={(e) => handleAnswerChange(question.id, parseInt(e.target.value))}
                            checked={answers[question.id] === option.value}
                            className="mr-3 text-blue-600"
                          />
                          <span className="text-gray-700">{option.label}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              <div className="flex flex-col items-center space-y-4 mt-8">
                <div className="text-center">
                  <p className="text-gray-600">
                    ตอบแล้ว {answeredQuestions} จาก {questions.length} ข้อ
                  </p>
                  <div className="w-64 bg-gray-200 rounded-full h-2 mt-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(answeredQuestions / questions.length) * 100}%` }}
                    ></div>
                  </div>
                </div>
    
                <button
                  onClick={handleSubmit}
                  disabled={!allAnswered}
                  className={`px-8 py-3 rounded-lg font-semibold transition-colors ${allAnswered
                      ? "bg-blue-600 text-white hover:bg-blue-700"
                      : "bg-gray-300 text-gray-500 cursor-not-allowed"
                    }`}
                >
                  ดูผลประเมิน
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center">
              <div className={`inline-block px-8 py-6 rounded-lg ${depressionInfo.bg} mb-6`}>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">ผลการประเมิน</h2>
                <div className="text-4xl font-bold text-gray-800 mb-2">{totalScore} คะแนน</div>
                <div className={`text-xl font-semibold ${depressionInfo.color}`}>
                  {depressionInfo.level}
                </div>
              </div>
    
              <div className="bg-gray-50 p-6 rounded-lg mb-6 text-left">
                <h3 className="font-semibold text-gray-800 mb-3">เกณฑ์การแปลผล HAM-D:</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>0-7 คะแนน:</span>
                    <span className="text-green-600 font-medium">ปกติ</span>
                  </div>
                  <div className="flex justify-between">
                    <span>8-12 คะแนน:</span>
                    <span className="text-yellow-600 font-medium">ซึมเศร้าเล็กน้อย</span>
                  </div>
                  <div className="flex justify-between">
                    <span>13-17 คะแนน:</span>
                    <span className="text-orange-600 font-medium">คือมีภาวะซึมเศร้าที่น้อยกว่าระดับ major depression</span>
                  </div>
                  <div className="flex justify-between">
                    <span>18-29 คะแนน:</span>
                    <span className="text-purple-600 font-medium">คือมีภาวะซึมเศร้าระดับ major depression</span>
                  </div>
                  <div className="flex justify-between">
                    <span>30 คะแนนขึ้นไป:</span>
                    <span className="text-red-600 font-medium">คือมีภาวะซึมเศร้าระดับรุนแรงมาก severe depression</span>
                  </div>
                </div>
              </div>
    
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 text-left">
                <div className="font-medium text-yellow-800 mb-1">คำแนะนำ:</div>
                <p className="text-yellow-700 text-sm">
                  จุดประสงค์ของแบบประเมิน HAM-D เพื่อประเมิน คัดกรองภาวะซึมเศร้า สามารถใช้ในบุคคลทั่วไปและในผู้ป่วยพาร์กินสัน โดยเป็นถามผู้ป่วย และเลือกตัวเลือกที่เหมาะสมที่สุด ประกอบด้วยคำถาม จำนวน 17 ข้อ ให้คะแนนตั้งแต่ 0 คือ ไม่มีอาการนั้นๆ เลย ถึง 4 คะแนน คือ มีอาการนั้นๆ ในความรุนแรงมากที่สุด
                </p>
              </div>
    
              <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6 text-left">
                <div className="font-medium text-red-800 mb-1">คำแนะนำ:</div>
                <p className="text-red-700 text-sm">
                  ผลการประเมินนี้เป็นเพียงข้อมูลเบื้องต้นเท่านั้น ไม่สามารถใช้วินิจฉัยทางการแพทย์ได้
                  หากมีคะแนนสูงหรือมีความกังวลเกี่ยวกับสุขภาพจิต กรุณาปรึกษาแพทย์หรือผู้เชี่ยวชาญด้านสุขภาพจิต
                </p>
              </div>
    
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setShowResults(false)}
                  className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  ทำแบบประเมินใหม่
                </button>
    
                <button onClick={() => window.history.go(-1)} className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700">
                  กลับหน้าก่อนหน้า
                </button>
              </div>
            </div>
          )}
          {submitMessage && (
            <div className={`mt-4 p-3 rounded ${submitMessage.includes("เรียบร้อย") ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
              {submitMessage}
            </div>
          )}
        </div>
      );
};