"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  Brain,
  Heart,
  Moon,
  Eye,
  Utensils,
  Activity,
  TestTube,
  FileCheck,
  ArrowLeft,
  CheckCircle2,
  Circle,
  AlertCircle,
  Clock,
  User,
  Calendar,
} from "lucide-react";

// === การกำหนดแบบประเมิน (ใช้ icon จริง) ===
const assessments = [
  {
    id: "ham-d",
    title: "HAM-D",
    fullTitle: "Hamilton Depression Rating Scale",
    description: "แบบประเมินระดับความรุนแรงของภาวะซึมเศร้า",
    icon: Brain,
    scoreKey: "hamd_score" as keyof RiskFactors,
  },
  {
    id: "rome4",
    title: "ROME IV",
    fullTitle: "Rome IV Criteria - Constipation",
    description: "แบบประเมินอาการท้องผูกเรื้อรัง",
    icon: Heart,
    scoreKey: "rome4_score" as keyof RiskFactors,
  },
  {
    id: "sleep",
    title: "RBD Questionnaire",
    fullTitle: "REM Sleep Behavior Disorder Screening",
    description: "แบบคัดกรองพฤติกรรมผิดปกติในระยะ REM",
    icon: Moon,
    scoreKey: "sleep_score" as keyof RiskFactors,
  },
  {
    id: "epworth",
    title: "Epworth Sleepiness Scale",
    fullTitle: "แบบประเมินความง่วงในชีวิตประจำวัน",
    description: "วัดระดับความง่วงซึมระหว่างวัน",
    icon: Activity,
    scoreKey: "epworth_score" as keyof RiskFactors,
  },
  {
    id: "smell",
    title: "Sniffin' Sticks Test",
    fullTitle: "แบบทดสอบการได้กลิ่น",
    description: "ประเมินการรับรู้กลิ่น (Hyposmia/Anosmia)",
    icon: TestTube,
    scoreKey: "smell_score" as keyof RiskFactors,
  },
  {
    id: "moca",
    title: "MoCA",
    fullTitle: "Montreal Cognitive Assessment",
    description: "แบบคัดกรองความบกพร่องทางสติปัญญา",
    icon: Brain,
    scoreKey: "moca_score" as keyof RiskFactors,
  },
  {
    id: "tmse",
    title: "TMSE",
    fullTitle: "Thai Mental State Examination",
    description: "แบบประเมินภาวะสมองเสื่อม (ฉบับภาษาไทย)",
    icon: Brain,
    scoreKey: "tmse_score" as keyof RiskFactors,
  },
  {
    id: "mds",
    title: "MDS-UPDRS",
    fullTitle: "Movement Disorder Society - UPDRS",
    description: "แบบประเมินมาตรฐานโรคพาร์กินสัน (Part I-IV)",
    icon: Activity,
    scoreKey: "mds_score" as keyof RiskFactors,
  },
  {
    id: "food",
    title: "Nutritional Assessment",
    fullTitle: "แบบประเมินโภชนาการผู้สูงอายุ",
    description: "ประเมินภาวะโภชนาการและความเสี่ยงทุพโภชนาการ",
    icon: Utensils,
    scoreKey: "food_score" as keyof RiskFactors,
  },
];

interface RiskFactors {
  hamd_score: number | null;
  rome4_score: number | null;
  sleep_score: number | null;
  epworth_score: number | null;
  smell_score: number | null;
  moca_score: number | null;
  tmse_score: number | null;
  mds_score: number | null;
  food_score: number | null;
}

interface PatientInfo {
  id: number;
  first_name: string;
  last_name: string;
  thaiid: string;
  hn_number: string | null;
  collection_date: string;
}

function AssessmentContent() {
  const searchParams = useSearchParams();
  const patientThaiid = searchParams.get("patient_thaiid");
  const [patientInfo, setPatientInfo] = useState<PatientInfo | null>(null);
  const [riskFactors, setRiskFactors] = useState<RiskFactors | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch patient data and risk factors
  useEffect(() => {
    const fetchData = async () => {
      if (!patientThaiid) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Fetch patient info
        const { data: patientData, error: patientError } = await supabase
          .from("pd_screenings")
          .select("id, first_name, last_name, thaiid, hn_number, collection_date")
          .eq("thaiid", patientThaiid)
          .order("collection_date", { ascending: false })
          .limit(1)
          .single();

        if (patientError) {
          throw new Error("ไม่พบข้อมูลผู้ป่วย");
        }

        setPatientInfo(patientData);

        // Fetch risk factors
        const { data: riskData, error: riskError } = await supabase
          .from("risk_factors_test")
          .select("hamd_score, rome4_score, sleep_score, epworth_score, smell_score, moca_score, tmse_score, mds_score, food_score")
          .eq("thaiid", patientThaiid)
          .maybeSingle();

        if (riskError && riskError.code !== "PGRST116") {
          // PGRST116 = no rows returned, which is OK
          console.error("Error fetching risk factors:", riskError);
        } else {
          setRiskFactors(riskData || {
            hamd_score: null,
            rome4_score: null,
            sleep_score: null,
            epworth_score: null,
            smell_score: null,
            moca_score: null,
            tmse_score: null,
            mds_score: null,
            food_score: null,
          });
        }
      } catch (err: any) {
        console.error("Error fetching data:", err);
        setError(err.message || "เกิดข้อผิดพลาดในการโหลดข้อมูล");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [patientThaiid]);

  // Determine assessment status
  const getAssessmentStatus = (scoreKey: keyof RiskFactors): "completed" | "pending" | "not-started" => {
    if (!riskFactors) return "not-started";
    const score = riskFactors[scoreKey];
    if (score !== null && score !== undefined) {
      return "completed";
    }
    // If any other assessment is completed, consider it pending
    const hasAnyCompleted = Object.values(riskFactors).some(
      (val) => val !== null && val !== undefined
    );
    return hasAnyCompleted ? "pending" : "not-started";
  };

  // Calculate summary stats
  const summaryStats = assessments.reduce(
    (acc, assessment) => {
      const status = getAssessmentStatus(assessment.scoreKey);
      if (status === "completed") acc.completed++;
      else if (status === "pending") acc.pending++;
      else acc.notStarted++;
      return acc;
    },
    { completed: 0, pending: 0, notStarted: 0 }
  );

  // Format date
  const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString("th-TH", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#1E40AF]"></div>
          <p className="mt-4 text-[#6B7280]">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <AlertCircle className="w-8 h-8 text-red-600 mx-auto mb-2" />
          <p className="text-red-800 font-medium">{error}</p>
          <Link
            href="/pages/papers"
            className="mt-4 inline-flex items-center text-[#1E40AF] hover:text-[#1E3A8A]"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            กลับสู่รายการผู้ป่วย
          </Link>
        </div>
      </div>
    );
  }

  const patientName = patientInfo
    ? `${patientInfo.first_name} ${patientInfo.last_name}`
    : "ไม่พบข้อมูลผู้ป่วย";
  const hn = patientInfo?.hn_number ? `HN: ${patientInfo.hn_number}` : "";
  const collectionDate = patientInfo?.collection_date
    ? formatDate(patientInfo.collection_date)
    : "-";

  return (
    <>
      {/* Patient Header Card */}
      {patientThaiid && patientInfo && (
        <div className="bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-6xl mx-auto px-6 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-5">
                <div className="w-16 h-16 bg-[#1E40AF] rounded-full flex items-center justify-center">
                  <User className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {patientName}
                  </h2>
                  <div className="flex items-center space-x-4 text-sm text-[#6B7280] mt-1">
                    {hn && (
                      <>
                        <span className="font-mono font-semibold bg-gray-100 px-2 py-1 rounded">{hn}</span>
                        <span>•</span>
                      </>
                    )}
                    <span>เลขบัตรประชาชน: {patientThaiid}</span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center justify-end text-[#6B7280]">
                  <Calendar className="w-4 h-4 mr-2" />
                  <span className="text-sm">วันที่เริ่มประเมิน</span>
                </div>
                <div className="font-medium text-gray-900">{collectionDate}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Assessment Grid */}
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-3">
            แบบประเมินทางการแพทย์
          </h1>
          <p className="text-lg text-[#6B7280]">
            โปรดเลือกแบบประเมินที่ต้องการบันทึกหรือดำเนินการต่อ
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {assessments.map((item) => {
            const Icon = item.icon;
            const status = getAssessmentStatus(item.scoreKey);
            const isCompleted = status === "completed";
            const isPending = status === "pending";

            return (
              <Link
                key={item.id}
                href={`/pages/papers/${item.id}${
                  patientThaiid ? `?patient_thaiid=${patientThaiid}` : ""
                }`}
                className="group relative block bg-white rounded-lg border border-gray-200 p-6 transition-all shadow-sm hover:shadow-md hover:border-[#1E40AF]"
              >
                {/* Status Indicator */}
                <div className="absolute top-4 right-4">
                  {isCompleted ? (
                    <CheckCircle2 className="w-6 h-6 text-[#166534]" />
                  ) : isPending ? (
                    <Clock className="w-6 h-6 text-orange-500" />
                  ) : (
                    <Circle className="w-5 h-5 text-gray-400" />
                  )}
                </div>

                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-gray-50 rounded-lg flex items-center justify-center border border-gray-200">
                    <Icon className="w-7 h-7 text-[#1E40AF]" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-lg mb-1 text-gray-900">{item.title}</h3>
                    <p className="text-sm font-medium text-[#6B7280] mb-2">
                      {item.fullTitle}
                    </p>
                    <p className="text-sm text-[#6B7280] leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>

                {/* Hover arrow */}
                <div className="mt-4 flex justify-end opacity-0 group-hover:opacity-100 transition">
                  <ArrowLeft className="w-5 h-5 rotate-180 text-[#1E40AF]" />
                </div>
              </Link>
            );
          })}
        </div>

        {/* Summary */}
        <div className="mt-12 bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-8">
              <div className="text-center">
                <div className="text-3xl font-bold text-[#166534]">
                  {summaryStats.completed}
                </div>
                <div className="text-sm text-[#6B7280]">เสร็จสิ้น</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-orange-500">
                  {summaryStats.pending}
                </div>
                <div className="text-sm text-[#6B7280]">อยู่ระหว่างทำ</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-500">
                  {summaryStats.notStarted}
                </div>
                <div className="text-sm text-[#6B7280]">ยังไม่ได้เริ่ม</div>
              </div>
            </div>
            <Link
              href="/pages/papers"
              className="inline-flex items-center space-x-2 text-[#1E40AF] hover:text-[#1E3A8A] font-medium"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>กลับสู่รายการผู้ป่วย</span>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

export default function AssessmentPage() {
  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: "'Sarabun', sans-serif" }}>
      <Suspense fallback={
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#1E40AF]"></div>
            <p className="mt-4 text-[#6B7280]">กำลังโหลดข้อมูลผู้ป่วย...</p>
          </div>
        </div>
      }>
        <AssessmentContent />
      </Suspense>
    </div>
  );
}