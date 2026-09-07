import { NextResponse } from "next/server";

import {
  DiagnosisLookupResult,
  lookupDiagnosisByThaiIds,
  normalizeThaiId,
  notFoundResult,
} from "@/lib/diagnosis-lookup";
import { DiagnosisApiAccessError, requireDiagnosisApiKey } from "@/lib/external-diagnosis-access";
import { checkRateLimit } from "@/lib/rateLimit";

type BatchLookupBody = {
  thaiids?: unknown;
};

type BatchResultItem = DiagnosisLookupResult & {
  input: string;
  error?: "invalid_thaiid";
};

const RATE_LIMIT_MAX_REQUESTS = 15;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_BATCH_SIZE = 100;

export async function POST(request: Request) {
  let partner = "unknown";

  try {
    const access = requireDiagnosisApiKey(request);
    partner = access.partner;

    // A batch call counts as a single request against the per-minute limit —
    // that's the point of the endpoint (many lookups, one round trip).
    const rateLimit = checkRateLimit(`diagnosis-lookup:${partner}`, RATE_LIMIT_MAX_REQUESTS, RATE_LIMIT_WINDOW_MS);
    if (!rateLimit.ok) {
      throw new DiagnosisApiAccessError("Rate limit exceeded.", 429);
    }

    let body: BatchLookupBody;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    if (typeof body !== "object" || body === null || !Array.isArray(body.thaiids)) {
      return NextResponse.json({ error: "thaiids must be a non-empty array." }, { status: 400 });
    }

    const inputs = body.thaiids as unknown[];
    if (inputs.length === 0) {
      return NextResponse.json({ error: "thaiids must be a non-empty array." }, { status: 400 });
    }
    if (inputs.length > MAX_BATCH_SIZE) {
      return NextResponse.json({ error: `thaiids cannot exceed ${MAX_BATCH_SIZE} entries per request.` }, { status: 400 });
    }

    const normalizedByInput = inputs.map((input) => ({
      input: String(input),
      normalized: normalizeThaiId(input),
    }));

    const validNormalizedIds = normalizedByInput
      .filter((entry) => entry.normalized)
      .map((entry) => entry.normalized);

    const resultsByThaiId = await lookupDiagnosisByThaiIds(validNormalizedIds);

    const results: BatchResultItem[] = normalizedByInput.map(({ input, normalized }) => {
      if (!normalized) {
        return { ...notFoundResult(""), input, thaiid: "", error: "invalid_thaiid" };
      }
      const result = resultsByThaiId.get(normalized) ?? notFoundResult(normalized);
      return { ...result, input };
    });

    logBatchLookup({
      partner,
      requested: results.length,
      invalid: results.filter((r) => r.error).length,
      found: results.filter((r) => r.found).length,
    });

    return NextResponse.json({ results, count: results.length });
  } catch (err) {
    if (err instanceof DiagnosisApiAccessError) {
      console.warn("[external/diagnosis-lookup/batch]", {
        partner,
        outcome: err.status === 429 ? "rate_limited" : "unauthorized",
      });
      return NextResponse.json({ error: err.message }, { status: err.status });
    }

    console.error("[external/diagnosis-lookup/batch]", {
      partner,
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

function logBatchLookup(args: { partner: string; requested: number; invalid: number; found: number }) {
  console.info("[external/diagnosis-lookup/batch]", args);
}
