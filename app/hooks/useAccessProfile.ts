"use client";

import { useEffect, useState } from "react";
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

  useEffect(() => {
    let alive = true;

    const loadAccess = async () => {
      if (!session) {
        if (!alive) return;
        setAccessProfile(unauthenticatedProfile);
        setAccessLoading(false);
        return;
      }

      setAccessLoading(true);
      const nextProfile = await getAccessProfile(supabase, session);

      if (!alive) return;
      setAccessProfile(nextProfile);
      setAccessLoading(false);
    };

    loadAccess();

    return () => {
      alive = false;
    };
  }, [session]);

  return { accessProfile, accessLoading };
}
