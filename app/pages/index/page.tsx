"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Session } from "@supabase/supabase-js";
import AuthRedirect from "@/components/AuthRedirect";
import {
  Users,
  FileText,
  CalendarDays,
  ArrowRight,
  UserCircle,
  Building2,
  LogOut,
} from "lucide-react";

interface DashboardStats {
  totalPatients: number;
  appointmentsToday: number;
  patientsWithoutCondition: number;
  patientsWithoutThaiid: number;
  averageMdsScore: number;
  newPatientsThisMonth: number;
}

export default function Dashboard() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalPatients: 0,
    appointmentsToday: 0,
    patientsWithoutCondition: 0,
    patientsWithoutThaiid: 0,
    averageMdsScore: 0,
    newPatientsThisMonth: 0,
  });
  const [currentUser, setCurrentUser] = useState({
    name: "Admin ChulaPD",
    role: "ผู้ดูแลระบบ",
    hospital: "โรงพยาบาลจุฬาลงกรณ์ สภากาชาดไทย",
  });

  const menuItems = [
    {
      title: "Patient Data Management",
      subtitle: "จัดการข้อมูลผู้ป่วยในระบบ CheckPD",
      icon: Users,
      color: "blue",
      path: "/pages/users",
    },
    {
      title: "Data Sheets Management",
      subtitle: "บันทึกและตรวจสอบแบบประเมินผู้ป่วย",
      icon: FileText,
      color: "emerald",
      path: "/pages/papers",
    }
  ];

  const navigateTo = (path: string) => {
    router.push(path);
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Logout error:", error);
    } else {
      window.location.href = "/pages/login";
    }
  };

  // Fetch dashboard statistics
  const fetchDashboardStats = async () => {
    try {
      setLoading(true);

      // Get today's date range
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayDateStr = today.toISOString().split("T")[0];
      const todayEnd = new Date(today);
      todayEnd.setHours(23, 59, 59, 999);
      const todayEndDateStr = todayEnd.toISOString().split("T")[0];

      // Get first day of current month
      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const monthStart = firstDayOfMonth.toISOString();

      // Initialize stats
      let totalPatients = 0;
      let appointmentsToday = 0;
      let newPatientsThisMonth = 0;
      let patientsWithoutCondition = 0;
      let patientsWithoutThaiid = 0;
      let averageMdsScore = 0;

      // 1. Total patients count from pd_screenings
      const { count: totalPatientsCount, error: totalError } = await supabase
        .from("pd_screenings")
        .select("*", { count: "exact", head: true });

      if (totalError) {
        console.error("Error fetching total patients:", totalError);
      } else {
        totalPatients = totalPatientsCount || 0;
      }

      // 2. Appointments today (screening records with collection_date today)
      const { count: appointmentsTodayCount, error: appointmentsError } =
        await supabase
          .from("pd_screenings")
          .select("*", { count: "exact", head: true })
          .gte("collection_date", todayDateStr)
          .lte("collection_date", todayEndDateStr);

      if (appointmentsError) {
        console.error("Error fetching appointments today:", appointmentsError);
      } else {
        appointmentsToday = appointmentsTodayCount || 0;
      }

      // 3. New patients this month
      const { count: newPatientsCount, error: newPatientsError } = await supabase
        .from("pd_screenings")
        .select("*", { count: "exact", head: true })
        .gte("created_at", monthStart);

      if (newPatientsError) {
        console.error("Error fetching new patients:", newPatientsError);
      } else {
        newPatientsThisMonth = newPatientsCount || 0;
      }

      // 4. Patients without condition (condition is null or "ไม่ระบุ")
      const { count: patientsWithoutConditionNull, error: noConditionNullError } =
        await supabase
          .from("pd_screenings")
          .select("*", { count: "exact", head: true })
          .is("condition", null);

      const { count: patientsWithoutConditionNotSpecified, error: noConditionNotSpecifiedError } =
        await supabase
          .from("pd_screenings")
          .select("*", { count: "exact", head: true })
          .eq("condition", "ไม่ระบุ");

      if (noConditionNullError || noConditionNotSpecifiedError) {
        console.error("Error fetching patients without condition:", noConditionNullError || noConditionNotSpecifiedError);
      } else {
        patientsWithoutCondition = (patientsWithoutConditionNull || 0) + (patientsWithoutConditionNotSpecified || 0);
      }

      // 5. Patients without thaiid (thaiid is null, "-", or "nan")
      const { data: allScreeningsForThaiid, error: screeningsForThaiidError } =
        await supabase
          .from("pd_screenings")
          .select("thaiid");

      if (screeningsForThaiidError) {
        console.error("Error fetching screenings for thaiid check:", screeningsForThaiidError);
      } else {
        // Count records where thaiid is null, "-", or "nan" (case-insensitive)
        patientsWithoutThaiid = allScreeningsForThaiid?.filter((s) => {
          const thaiid = s.thaiid;
          return (
            thaiid === null ||
            thaiid === undefined ||
            thaiid === "-" ||
            String(thaiid).toLowerCase() === "nan" ||
            String(thaiid).trim() === ""
          );
        }).length || 0;
      }

      // 6. Average MDS-UPDRS score
      const { data: mdsScores, error: mdsError } = await supabase
        .from("risk_factors_test")
        .select("mds_score")
        .not("mds_score", "is", null);

      if (mdsError) {
        console.error("Error fetching MDS scores:", mdsError);
      } else {
        const validScores =
          mdsScores?.filter((s) => s.mds_score !== null) || [];
        if (validScores.length > 0) {
          averageMdsScore =
            validScores.reduce((sum, s) => sum + (s.mds_score || 0), 0) /
            validScores.length;
          averageMdsScore = Math.round(averageMdsScore * 10) / 10;
        }
      }

      // Update stats with all collected data
      setStats({
        totalPatients,
        appointmentsToday,
        patientsWithoutCondition,
        patientsWithoutThaiid,
        averageMdsScore,
        newPatientsThisMonth,
      });
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
    } finally {
      setLoading(false);
    }
  };

  // Get user session and info
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        // Try to get user metadata
        const userMetadata = session.user.user_metadata;
        setCurrentUser({
          name: userMetadata?.name || userMetadata?.full_name || session.user.email?.split("@")[0] || "Admin ChulaPD",
          role: userMetadata?.role || "ผู้ดูแลระบบ",
          hospital: userMetadata?.hospital || "โรงพยาบาลจุฬาลงกรณ์ สภากาชาดไทย",
        });
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch stats when session is available
  useEffect(() => {
    if (session) {
      fetchDashboardStats();
    }
  }, [session]);

  if (!session) {
    return <AuthRedirect />;
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        {/* Header Bar - แบบ HIS จริง */}
        <header className="bg-white border-b border-gray-200 shadow-sm">
          <div className="px-6 py-4 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Building2 className="w-8 h-8 text-blue-700" />
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  CheckPD System
                </h1>
                <p className="text-sm text-gray-600">
                  {currentUser.hospital}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-6">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">
                  {currentUser.name}
                </p>
                <p className="text-xs text-gray-500">{currentUser.role}</p>
              </div>
              <div className="flex items-center space-x-3">
                <UserCircle className="w-10 h-10 text-gray-400" />
                <button
                  onClick={handleLogout}
                  className="text-gray-500 hover:text-gray-700 transition"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-6 py-12">
          {/* Welcome Section */}
          <div className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">
              ยินดีต้อนรับสู่ระบบ CheckPD
            </h2>
            <p className="text-lg text-gray-600">
              ระบบประเมินและติดตามอาการผู้ป่วยโรคพาร์กินสันและ Movement Disorders
            </p>
          </div>

          {/* Menu Cards */}
          <div className="grid md:grid-cols-3 gap-8">
            {menuItems.map((item, index) => (
              <button
                key={index}
                onClick={() => navigateTo(item.path)}
                className="group bg-white rounded-xl border border-gray-200 p-8 text-left hover:shadow-lg hover:border-blue-300 transition-all duration-300"
              >
                <div className="flex items-start justify-between mb-6">
                  <div
                    className={`w-14 h-14 rounded-lg flex items-center justify-center ${
                      item.color === "blue"
                        ? "bg-blue-100 text-blue-700"
                        : item.color === "emerald"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-purple-100 text-purple-700"
                    }`}
                  >
                    <item.icon className="w-8 h-8" />
                  </div>
                  <ArrowRight className="w-6 h-6 text-gray-400 group-hover:text-blue-600 transition" />
                </div>

                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  {item.title}
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  {item.subtitle}
                </p>
              </button>
            ))}
          </div>

          {/* Quick Stats */}
          {loading ? (
            <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse"
                >
                  <div className="h-4 bg-gray-200 rounded w-24 mb-4"></div>
                  <div className="h-8 bg-gray-200 rounded w-16 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-32"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <p className="text-sm text-gray-600">ผู้ป่วยทั้งหมด</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {stats.totalPatients.toLocaleString()}
                </p>
                <p className="text-xs text-green-600 mt-2">
                  ↑ {stats.newPatientsThisMonth} คน เดือนนี้
                </p>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <p className="text-sm text-gray-600">นัดหมายวันนี้</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {stats.appointmentsToday}
                </p>
                <p className="text-xs text-blue-600 mt-2">คลินิกพาร์กินสัน</p>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <p className="text-sm text-gray-600">ผู้ป่วยที่ไม่มี condition</p>
                <p className="text-3xl font-bold text-orange-600 mt-2">
                  {stats.patientsWithoutCondition}
                </p>
                <p className="text-xs text-gray-500 mt-2">ยังไม่ได้ระบุ</p>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <p className="text-sm text-gray-600">ผู้ป่วยที่ไม่มี thaiid</p>
                <p className="text-3xl font-bold text-red-600 mt-2">
                  {stats.patientsWithoutThaiid}
                </p>
                <p className="text-xs text-gray-500 mt-2">ยังไม่มีเลขบัตรประชาชน</p>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <p className="text-sm text-gray-600">MDS-UPDRS เฉลี่ย</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {stats.averageMdsScore > 0 ? stats.averageMdsScore : "-"}
                </p>
                <p className="text-xs text-gray-500 mt-2">ทั้งหมด</p>
              </div>
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className="bg-white border-t border-gray-200 mt-16">
          <div className="max-w-7xl mx-auto px-6 py-6 text-center text-sm text-gray-600">
            <p>
              Copyright © 2025 ChulaPD • ศูนย์ความเป็นเลิศทางการแพทย์โรคพาร์กินสันฯ โรงพยาบาลจุฬาลงกรณ์ • All Rights Reserved
            </p>
          </div>
        </footer>
      </div>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700;800&display=swap');
        
        body {
          font-family: 'Sarabun', sans-serif;
        }
      `}</style>
    </>
  );
}