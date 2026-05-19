import type { SupabaseClient } from "@supabase/supabase-js";

export async function signOutEverywhere(supabase: SupabaseClient) {
  await supabase.auth.signOut();
  if (typeof document !== "undefined") {
    document.cookie = "chulapd-guest=; path=/; max-age=0; samesite=lax";
  }
}
