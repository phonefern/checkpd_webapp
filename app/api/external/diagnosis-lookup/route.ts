import { NextResponse } from "next/server";

import { DiagnosisApiAccessError, requireDiagnosisApiKey } from "@/lib/external-diagnosis-access";
import { checkRateLimit } from "@/lib/rateLimit";
import { supabaseServer } from "@/lib/supabase-server";

type DiagnosisLookupBody = {
  thaiid?: unknown;
};

type UserRow = {
  id: string;
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

const RATE_LIMIT_MAX_REQUESTS = 15;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;

export async function POST(request: Request) {
  let normalizedThaiId = "";
  let partner = "unknown";

  try {
    const access = requireDiagnosisApiKey(request);
    partner = access.partner;

    const rateLimit = checkRateLimit(`diagnosis-lookup:${partner}`, RATE_LIMIT_MAX_REQUESTS, RATE_LIMIT_WINDOW_MS);
    if (!rateLimit.ok) {
      throw new DiagnosisApiAccessError("Rate limit exceeded.", 429);
    }

    let body: DiagnosisLookupBody;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    if (typeof body !== "object" || body === null) {
      return NextResponse.json({ error: "thaiid must be 13 digits." }, { status: 400 });
    }

    normalizedThaiId = normalizeThaiId(body.thaiid);
    if (!normalizedThaiId) {
      return NextResponse.json({ error: "thaiid must be 13 digits." }, { status: 400 });
    }

    const { data: users, error: usersError } = await supabaseServer
      .from("users")
      .select("id")
      .eq("thaiid", normalizedThaiId);

    if (usersError) throw usersError;

    const userRows = (users ?? []) as UserRow[];
    if (userRows.length === 0) {
      logLookup({ partner, thaiid: normalizedThaiId, found: false, matchedRecords: 0 });
      return NextResponse.json(notFoundResponse(normalizedThaiId));
    }

    const userIds = userRows.map((user) => user.id);
    const { data: summaries, error: summariesError } = await supabaseServer
      .from("user_record_summary")
      .select("user_id,condition,test_result,other,prediction_risk,condition_changed_at,updated_at")
      .in("user_id", userIds)
      .order("condition_changed_at", { ascending: false, nullsFirst: false })
      .order("updated_at", { ascending: false, nullsFirst: false });

    if (summariesError) throw summariesError;

    const summaryRows = (summaries ?? []) as SummaryRow[];
    const latest = summaryRows[0];

    if (!latest) {
      logLookup({ partner, thaiid: normalizedThaiId, found: false, matchedRecords: 0 });
      return NextResponse.json(notFoundResponse(normalizedThaiId));
    }

    logLookup({ partner, thaiid: normalizedThaiId, found: true, matchedRecords: summaryRows.length });
    return NextResponse.json({
      thaiid: normalizedThaiId,
      found: true,
      user_id: latest.user_id,
      condition: latest.condition,
      test_result: latest.test_result,
      other: latest.other,
      prediction_risk: latest.prediction_risk,
      condition_changed_at: latest.condition_changed_at,
      matched_records: summaryRows.length,
    });
  } catch (err) {
    if (err instanceof DiagnosisApiAccessError) {
      console.warn("[external/diagnosis-lookup]", {
        partner,
        thaiid: normalizedThaiId ? maskThaiId(normalizedThaiId) : null,
        outcome: err.status === 429 ? "rate_limited" : "unauthorized",
      });
      return NextResponse.json({ error: err.message }, { status: err.status });
    }

    console.error("[external/diagnosis-lookup]", {
      partner,
      thaiid: normalizedThaiId ? maskThaiId(normalizedThaiId) : null,
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

function normalizeThaiId(value: unknown): string {
  if (typeof value !== "string" && typeof value !== "number") return "";

  const normalized = String(value).replace(/\D/g, "");
  return normalized.length === 13 ? normalized : "";
}

function notFoundResponse(thaiid: string) {
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

function logLookup(args: { partner: string; thaiid: string; found: boolean; matchedRecords: number }) {
  console.info("[external/diagnosis-lookup]", {
    partner: args.partner,
    thaiid: maskThaiId(args.thaiid),
    found: args.found,
    matched_records: args.matchedRecords,
  });
}

function maskThaiId(thaiid: string): string {
  if (thaiid.length <= 5) return "***";
  return `${thaiid.slice(0, 3)}********${thaiid.slice(-2)}`;
}
