import { supabaseServer } from "@/lib/supabase-server";

export type DiagnosisLookupResult = {
  thaiid: string;
  found: boolean;
  user_id: string | null;
  condition: string | null;
  test_result: string | null;
  other: string | null;
  prediction_risk: boolean | null;
  condition_changed_at: string | null;
  matched_records: number;
};

type UserRow = {
  id: string;
  thaiid: string;
};

type SummaryRow = {
  user_id: string;
  condition: string | null;
  test_result: string | null;
  other: string | null;
  prediction_risk: boolean | null;
  condition_changed_at: string | null;
  updated_at: string | null;
};

export function normalizeThaiId(value: unknown): string {
  if (typeof value !== "string" && typeof value !== "number") return "";

  const normalized = String(value).replace(/\D/g, "");
  return normalized.length === 13 ? normalized : "";
}

export function maskThaiId(thaiid: string): string {
  if (thaiid.length <= 5) return "***";
  return `${thaiid.slice(0, 3)}********${thaiid.slice(-2)}`;
}

export function notFoundResult(thaiid: string): DiagnosisLookupResult {
  return {
    thaiid,
    found: false,
    user_id: null,
    condition: null,
    test_result: null,
    other: null,
    prediction_risk: null,
    condition_changed_at: null,
    matched_records: 0,
  };
}

/**
 * Resolves diagnosis condition data for one or more normalized (13-digit) thaiids
 * in a fixed number of queries regardless of batch size, keyed by thaiid for callers
 * to look up. thaiids not present in `public.users` are absent from the map — callers
 * should fall back to notFoundResult(thaiid) for any key that comes back missing.
 */
export async function lookupDiagnosisByThaiIds(
  normalizedThaiIds: string[]
): Promise<Map<string, DiagnosisLookupResult>> {
  const results = new Map<string, DiagnosisLookupResult>();
  const uniqueThaiIds = [...new Set(normalizedThaiIds)];
  if (uniqueThaiIds.length === 0) return results;

  const { data: users, error: usersError } = await supabaseServer
    .from("users")
    .select("id,thaiid")
    .in("thaiid", uniqueThaiIds);

  if (usersError) throw usersError;

  const userRows = (users ?? []) as UserRow[];
  if (userRows.length === 0) return results;

  const thaiIdByUserId = new Map<string, string>();
  for (const user of userRows) {
    thaiIdByUserId.set(user.id, user.thaiid);
  }

  const { data: summaries, error: summariesError } = await supabaseServer
    .from("user_record_summary")
    .select("user_id,condition,test_result,other,prediction_risk,condition_changed_at,updated_at")
    .in("user_id", userRows.map((user) => user.id))
    .order("condition_changed_at", { ascending: false, nullsFirst: false })
    .order("updated_at", { ascending: false, nullsFirst: false });

  if (summariesError) throw summariesError;

  const summaryRows = (summaries ?? []) as SummaryRow[];

  // summaryRows is already sorted most-recent-first, so appending here keeps
  // each thaiid's own rows in that same order — index 0 per group is the latest.
  const rowsByThaiId = new Map<string, SummaryRow[]>();
  for (const row of summaryRows) {
    const thaiid = thaiIdByUserId.get(row.user_id);
    if (!thaiid) continue;

    const existing = rowsByThaiId.get(thaiid);
    if (existing) existing.push(row);
    else rowsByThaiId.set(thaiid, [row]);
  }

  for (const thaiid of uniqueThaiIds) {
    const rows = rowsByThaiId.get(thaiid);
    const latest = rows?.[0];
    if (!latest) continue;

    results.set(thaiid, {
      thaiid,
      found: true,
      user_id: latest.user_id,
      condition: latest.condition,
      test_result: latest.test_result,
      other: latest.other,
      prediction_risk: latest.prediction_risk,
      condition_changed_at: latest.condition_changed_at,
      matched_records: rows.length,
    });
  }

  return results;
}
