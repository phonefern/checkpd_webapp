"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Session } from "@supabase/supabase-js";
import {
  ArrowRight,
  BarChart3,
  Download,
  FileDown,
  FileText,
  ShieldCheck,
  Users,
} from "lucide-react";

import AppSidebar from "@/app/component/layout/AppSidebar";
import AuthRedirect from "@/components/AuthRedirect";
import { useAccessProfile } from "@/app/hooks/useAccessProfile";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { APP_ROLE_LABELS, canAccessFeature, type AppFeature } from "@/lib/access";
import { supabase } from "@/lib/supabase";

type UserProfile = {
  name: string;
  role: string;
  hospital: string;
  email: string;
};

type MenuItem = {
  title: string;
  subtitle: string;
  icon: typeof Users;
  path: string;
  accent: string;
  feature: AppFeature;
};

const dashboardCards: MenuItem[] = [
  {
    title: "CheckPD Label Dashboard",
    subtitle: "Manage patient records and profile data for the CheckPD system.",
    icon: Users,
    path: "/pages/users",
    accent: "from-sky-500/20 to-cyan-500/10 text-sky-700",
    feature: "users",
  },
  {
    title: "Questionnaire Management V1",
    subtitle: "Review forms, screening sheets, and questionnaire submissions.",
    icon: FileText,
    path: "/pages/papers",
    accent: "from-emerald-500/20 to-green-500/10 text-emerald-700",
    feature: "papers",
  },
  {
    title: "Realtime Download Tracking",
    subtitle: "Monitor downloads and usage activity in near real time.",
    icon: BarChart3,
    path: "/pages/tracking",
    accent: "from-amber-500/20 to-orange-500/10 text-amber-700",
    feature: "tracking",
  },
  {
    title: "CheckPD PDF export",
    subtitle: "Export PDF results and work with assessment data in one place.",
    icon: FileDown,
    path: "/pages/pdf",
    accent: "from-violet-500/20 to-fuchsia-500/10 text-violet-700",
    feature: "pdf",
  },
  {
    title: "Raw Data Storage",
    subtitle: "Download raw source data from CheckPD storage and records.",
    icon: Download,
    path: "/pages/storage",
    accent: "from-lime-500/20 to-emerald-500/10 text-lime-700",
    feature: "storage",
  },
  {
    title: "Questionnaire Management V2",
    subtitle: "Create, review, and assess questionnaire workflows in the new QA flow.",
    icon: ShieldCheck,
    path: "/pages/qa",
    accent: "from-teal-500/20 to-emerald-500/10 text-teal-700",
    feature: "qa",
  },
];

const defaultUser: UserProfile = {
  name: "Admin ChulaPD",
  role: "System administrator",
  hospital: "Excellence Center for Parkinson’s Disease at King Chulalongkorn Memorial Hospital.",
  email: "admin@checkpd.local",
};

export default function DashboardPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [currentUser, setCurrentUser] = useState<UserProfile>(defaultUser);
  const { accessProfile, accessLoading } = useAccessProfile(session);

  useEffect(() => {
    const applySession = (nextSession: Session | null) => {
      setSession(nextSession);

      if (!nextSession?.user) {
        return;
      }

      const metadata = nextSession.user.user_metadata;
      setCurrentUser({
        name: metadata?.name || metadata?.full_name || nextSession.user.email?.split("@")[0] || defaultUser.name,
        role: metadata?.role || defaultUser.role,
        hospital: metadata?.hospital || defaultUser.hospital,
        email: nextSession.user.email || defaultUser.email,
      });
    };

    supabase.auth.getSession().then(({ data: { session: nextSession } }) => {
      applySession(nextSession);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      applySession(nextSession);
    });

    return () => subscription.unsubscribe();
  }, []);

  const quickStats = useMemo(
    () => [
      {
        label: "Core tools",
        value: dashboardCards.filter((item) => canAccessFeature(accessProfile.role, item.feature)).length.toString().padStart(2, "0"),
      },
      { label: "Access role", value: accessProfile.role ? APP_ROLE_LABELS[accessProfile.role] : "Unassigned" },
      { label: "System", value: "CheckPD" },
    ],
    [accessProfile.role]
  );

  const visibleDashboardCards = useMemo(
    () => dashboardCards.filter((item) => canAccessFeature(accessProfile.role, item.feature)),
    [accessProfile.role]
  );

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Logout error:", error);
      return;
    }

    window.location.href = "/pages/login";
  };

  if (!session) {
    return <AuthRedirect />;
  }

  if (accessLoading) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-50">
        <div className="flex min-h-screen">
          <AppSidebar
            activePath="/pages/index"
            role={accessProfile.role}
            user={{
              name: currentUser.name,
              email: currentUser.email,
              roleLabel: accessProfile.role ? APP_ROLE_LABELS[accessProfile.role] : currentUser.role,
            }}
            onNavigate={(path) => router.push(path)}
            onLogout={handleLogout}
          />

          <main className="min-w-0 flex-1 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.14),_transparent_35%),linear-gradient(180deg,_#fafafa_0%,_#f4f4f5_100%)] text-neutral-950">
            <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
              <div className="rounded-[28px] border border-black/5 bg-white/80 p-6 shadow-[0_20px_60px_rgba(10,10,10,0.08)] backdrop-blur sm:p-8">
                <div className="animate-pulse space-y-4">
                  <div className="h-8 w-64 rounded-xl bg-neutral-200" />
                  <div className="h-4 w-96 max-w-full rounded-xl bg-neutral-200" />
                  <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                    <div className="h-48 rounded-[24px] bg-neutral-200" />
                    <div className="h-48 rounded-[24px] bg-neutral-200" />
                    <div className="h-48 rounded-[24px] bg-neutral-200" />
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-50">
      <div className="flex min-h-screen">
        <AppSidebar
          activePath="/pages/index"
          role={accessProfile.role}
          user={{
            name: currentUser.name,
            email: currentUser.email,
            roleLabel: accessProfile.role ? APP_ROLE_LABELS[accessProfile.role] : currentUser.role,
          }}
          onNavigate={(path) => router.push(path)}
          onLogout={handleLogout}
        />

        <main className="min-w-0 flex-1 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.14),_transparent_35%),linear-gradient(180deg,_#fafafa_0%,_#f4f4f5_100%)] text-neutral-950">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {visibleDashboardCards.map((item) => (
                <Card
                  key={item.title}
                  className="group overflow-hidden rounded-[24px] border-black/5 bg-white/85 shadow-[0_16px_40px_rgba(15,23,42,0.08)] transition duration-200 hover:-translate-y-1 hover:shadow-[0_18px_50px_rgba(15,23,42,0.14)]"
                >
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${item.accent}`}>
                        <item.icon className="h-6 w-6" />
                      </div>
                      <ArrowRight className="h-5 w-5 text-neutral-400 transition group-hover:text-neutral-950" />
                    </div>
                    <CardTitle className="pt-3 text-xl text-neutral-950">{item.title}</CardTitle>
                    <CardDescription className="text-sm leading-6 text-neutral-600">{item.subtitle}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button
                      variant="ghost"
                      className="h-auto w-full justify-between rounded-xl border border-neutral-200 px-4 py-3 text-neutral-950 hover:bg-neutral-100"
                      onClick={() => router.push(item.path)}
                    >
                      Open module
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="mt-8 rounded-[24px] border border-black/5 bg-white/70 px-6 py-5 text-sm text-neutral-600 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
              <p className="font-medium text-neutral-950">Signed in hospital</p>
              <p className="mt-1">{currentUser.hospital}</p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
