"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, type Variants } from "framer-motion";
import type { Session } from "@supabase/supabase-js";

import AppSidebar from "./AppSidebar";
import AuthRedirect from "@/components/AuthRedirect";
import { useAccessProfile } from "@/app/hooks/useAccessProfile";
import { APP_ROLE_LABELS } from "@/lib/access";
import { supabase } from "@/lib/supabase";

type Props = {
  children: React.ReactNode;
  activePath: string;
  /** Extra classes applied to the <main> content area */
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
  const [session, setSession] = useState<Session | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [userName, setUserName] = useState("Admin ChulaPD");
  const [userEmail, setUserEmail] = useState("admin@checkpd.local");
  const { accessProfile, accessLoading } = useAccessProfile(session);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      if (s?.user) {
        const m = s.user.user_metadata;
        setUserName(m?.name || m?.full_name || s.user.email?.split("@")[0] || "Admin ChulaPD");
        setUserEmail(s.user.email || "admin@checkpd.local");
      }
      setSessionLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/pages/login";
  };

  if (sessionLoading || accessLoading) {
    return (
      <div className="flex min-h-screen bg-neutral-950">
        <AppSidebar
          activePath={activePath}
          role={accessProfile.role}
          user={{
            name: userName,
            email: userEmail,
            roleLabel: accessProfile.role ? APP_ROLE_LABELS[accessProfile.role] : "Loading",
          }}
          onNavigate={(path) => router.push(path)}
          onLogout={handleLogout}
        />

        <main className={`min-w-0 flex-1 overflow-auto ${mainClassName ?? ""}`}>
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
      <AppSidebar
        activePath={activePath}
        role={accessProfile.role}
        user={{
          name: userName,
          email: userEmail,
          roleLabel: accessProfile.role ? APP_ROLE_LABELS[accessProfile.role] : "ผู้ดูแลระบบ",
        }}
        onNavigate={(path) => router.push(path)}
        onLogout={handleLogout}
      />

      <motion.main
        key={activePath}
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className={`min-w-0 flex-1 overflow-auto ${mainClassName ?? ""}`}
      >
        {children}
      </motion.main>
    </div>
  );
}
