"use client";

import { useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";

import { getAccessProfile, type AccessProfile } from "@/lib/access";
import { supabase } from "@/lib/supabase";

const unauthenticatedProfile: AccessProfile = {
  email: null,
  role: null,
  isActive: false,
  allowedFeatures: [],
  source: "none",
};

export function useAccessProfile(session: Session | null) {
  const [accessProfile, setAccessProfile] = useState<AccessProfile>(unauthenticatedProfile);
  const [accessLoading, setAccessLoading] = useState(true);
  const cachedProfileRef = useRef<{ userId: string; profile: AccessProfile } | null>(null);

  useEffect(() => {
    if (!session) {
      cachedProfileRef.current = null;
      setAccessProfile(unauthenticatedProfile);
      setAccessLoading(false);
      return;
    }

    if (cachedProfileRef.current?.userId === session.user.id) {
      setAccessProfile(cachedProfileRef.current.profile);
      setAccessLoading(false);
      return;
    }

    let alive = true;
    setAccessLoading(true);

    getAccessProfile(supabase, session).then((nextProfile) => {
      if (!alive) return;
      cachedProfileRef.current = { userId: session.user.id, profile: nextProfile };
      setAccessProfile(nextProfile);
      setAccessLoading(false);
    });

    return () => {
      alive = false;
    };
  }, [session]);

  return { accessProfile, accessLoading };
}
