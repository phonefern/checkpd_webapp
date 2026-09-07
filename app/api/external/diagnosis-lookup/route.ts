import { NextResponse } from "next/server";

import {
  lookupDiagnosisByThaiIds,
  maskThaiId,
  normalizeThaiId,
  notFoundResult,
} from "@/lib/diagnosis-lookup";
import { DiagnosisApiAccessError, requireDiagnosisApiKey } from "@/lib/external-diagnosis-access";
import { checkRateLimit } from "@/lib/rateLimit";

type DiagnosisLookupBody = {
  thaiid?: unknown;
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

    const resultsByThaiId = await lookupDiagnosisByThaiIds([normalizedThaiId]);
    const result = resultsByThaiId.get(normalizedThaiId) ?? notFoundResult(normalizedThaiId);

    logLookup({ partner, thaiid: normalizedThaiId, found: result.found, matchedRecords: result.matched_records });
    return NextResponse.json(result);
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

function logLookup(args: { partner: string; thaiid: string; found: boolean; matchedRecords: number }) {
  console.info("[external/diagnosis-lookup]", {
    partner: args.partner,
    thaiid: maskThaiId(args.thaiid),
    found: args.found,
    matched_records: args.matchedRecords,
  });
}
