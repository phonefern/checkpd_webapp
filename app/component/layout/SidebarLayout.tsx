"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, type Variants } from "framer-motion";
import { Menu, X } from "lucide-react";

import AppSidebar from "./AppSidebar";
import AuthRedirect from "@/components/AuthRedirect";
import { useAccessProfile } from "@/app/hooks/useAccessProfile";
import { useSession } from "@/app/providers/SessionProvider";
import { APP_ROLE_LABELS } from "@/lib/access";
import { supabase } from "@/lib/supabase";
import { logActivity } from "@/lib/activityLog";
import { signOutEverywhere } from "@/lib/auth";

type Props = {
  children: React.ReactNode;
  activePath: string;
  mainClassName?: string;
};

const pageVariants: Variants = {
  initial: { opacity: 0, x: 18, filter: "blur(2px)" },
  animate: {
    opacity: 1,
    x: 0,
    filter: "blur(0px)",
    transition: { duration: 0.22, ease: [0.22, 1, 0.36, 1] },
  },
  exit: {
    opacity: 0,
    x: -12,
    filter: "blur(1px)",
    transition: { duration: 0.16, ease: [0.55, 0, 1, 0.45] },
  },
};

export default function SidebarLayout({ children, activePath, mainClassName }: Props) {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { session, loading: sessionLoading } = useSession();
  const userName = useMemo(() => {
    if (!session?.user) return "Admin ChulaPD";
    const metadata = session.user.user_metadata;
    return metadata?.name || metadata?.full_name || session.user.email?.split("@")[0] || "Admin ChulaPD";
  }, [session]);
  const userEmail = useMemo(() => session?.user?.email || "admin@checkpd.local", [session]);
  const { accessProfile, accessLoading } = useAccessProfile(session);

  const handleLogout = async () => {
    logActivity({ action: 'LOGOUT', page: 'auth', description: `ออกจากระบบ: ${userEmail}`, userEmail })
    await signOutEverywhere(supabase);
    window.location.href = "/pages/login";
  };

  const sidebarProps = {
    activePath,
    role: accessProfile.role,
    user: {
      name: userName,
      email: userEmail,
      roleLabel: accessProfile.role ? APP_ROLE_LABELS[accessProfile.role] : "ผู้ดูแลระบบ",
    },
    onNavigate: (path: string) => { router.push(path); setMobileMenuOpen(false); },
    onLogout: handleLogout,
  };

  if (sessionLoading || accessLoading) {
    return (
      <div className="flex min-h-screen bg-neutral-950">
        {/* Mobile top bar skeleton */}
        <header
          className="md:hidden fixed top-0 inset-x-0 z-40 flex items-center h-14 px-4 gap-3"
          style={{ background: "linear-gradient(90deg, #4339C6 0%, #3C33B5 100%)" }}
        >
          <div className="h-5 w-5 rounded bg-white/20 animate-pulse" />
          <div className="h-4 w-32 rounded bg-white/20 animate-pulse" />
        </header>

        <div className="hidden md:flex">
          <AppSidebar
            activePath={activePath}
            role={accessProfile.role}
            user={{ name: userName, email: userEmail, roleLabel: "Loading" }}
            onNavigate={(path) => router.push(path)}
            onLogout={handleLogout}
          />
        </div>

        <main className={`min-w-0 flex-1 overflow-auto pt-14 md:pt-0 ${mainClassName ?? ""}`}>
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            <div className="rounded-[28px] border border-black/5 bg-white/70 p-6 shadow-[0_20px_60px_rgba(10,10,10,0.06)] backdrop-blur sm:p-8">
              <div className="animate-pulse space-y-4">
                <div className="h-8 w-64 rounded-xl bg-neutral-200" />
                <div className="h-4 w-96 max-w-full rounded-xl bg-neutral-200" />
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <div className="h-32 rounded-2xl bg-neutral-200" />
                  <div className="h-32 rounded-2xl bg-neutral-200" />
                  <div className="h-32 rounded-2xl bg-neutral-200" />
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!session) {
    return <AuthRedirect />;
  }

  return (
    <div className="flex min-h-screen bg-neutral-950">
      {/* Mobile top bar */}
      <header
        className="md:hidden fixed top-0 inset-x-0 z-40 flex items-center h-14 px-4 gap-3"
        style={{ background: "linear-gradient(90deg, #4339C6 0%, #3C33B5 100%)" }}
      >
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-white hover:bg-white/15 active:bg-white/25 transition"
          aria-label="เปิดเมนู"
        >
          <Menu className="h-5 w-5" />
        </button>
        <span className="text-white font-medium text-sm tracking-wide">CheckPD Admin</span>
      </header>

      {/* Mobile drawer overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="absolute left-0 top-0 bottom-0 w-72 shadow-2xl overflow-y-auto">
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 transition"
              aria-label="ปิดเมนู"
            >
              <X className="h-4 w-4" />
            </button>
            <AppSidebar {...sidebarProps} />
          </div>
        </div>
      )}

      {/* Desktop sidebar — md:flex preserves stretch so aside fills full height */}
      <div className="hidden md:flex">
        <AppSidebar {...sidebarProps} />
      </div>

      <motion.main
        key={activePath}
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className={`min-w-0 flex-1 overflow-auto pt-14 md:pt-0 ${mainClassName ?? ""}`}
      >
        {children}
      </motion.main>
    </div>
  );
}
