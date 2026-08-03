import { NextResponse } from "next/server";

import { ThaiIdCardAccessError, requireThaiIdCardAccess } from "@/lib/thai-id-card-access";
import { hasServiceRole, supabaseServer } from "@/lib/supabase-server";

const filters = new Set(["all", "linked", "unlinked", "needs_review"]);

function positiveInteger(value: string | null, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export async function GET(request: Request) {
  try {
    await requireThaiIdCardAccess(request, { recordsOnly: true });

    if (!hasServiceRole) {
      return NextResponse.json({ error: "Thai ID card storage is not configured." }, { status: 503 });
    }

    const { searchParams } = new URL(request.url);
    const page = positiveInteger(searchParams.get("page"), 1);
    const limit = Math.min(100, positiveInteger(searchParams.get("limit"), 25));
    const filter = searchParams.get("filter") ?? "all";
    const search = searchParams.get("search")?.trim().slice(0, 100) || null;

    if (!filters.has(filter)) {
      return NextResponse.json({ error: "Invalid card record filter." }, { status: 400 });
    }

    const { data, error } = await supabaseServer
      .schema("checkpd")
      .rpc("list_thai_id_cards", {
        p_search: search,
        p_filter: filter,
        p_limit: limit,
        p_offset: (page - 1) * limit,
      });

    if (error) {
      console.error("Thai ID card list failed:", error.message);
      return NextResponse.json({ error: "Unable to load Thai ID card records." }, { status: 500 });
    }

    const rows = data ?? [];
    return NextResponse.json({ rows, total: Number(rows[0]?.total_count ?? 0), page, limit });
  } catch (error) {
    if (error instanceof ThaiIdCardAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Thai ID card list request failed:", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ error: "Unable to load Thai ID card records." }, { status: 500 });
  }
}
