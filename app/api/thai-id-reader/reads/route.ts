import { NextResponse } from "next/server";

import { ThaiIdCardAccessError, requireThaiIdCardAccess } from "@/lib/thai-id-card-access";
import { thaiIdCardPayloadSchema } from "@/lib/thai-id-card";
import { hasServiceRole, supabaseServer } from "@/lib/supabase-server";

const MAX_REQUEST_BYTES = 2 * 1024 * 1024 + 64 * 1024;

export async function POST(request: Request) {
  try {
    await requireThaiIdCardAccess(request);

    if (!hasServiceRole) {
      return NextResponse.json({ error: "Thai ID card storage is not configured." }, { status: 503 });
    }

    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (contentLength > MAX_REQUEST_BYTES) {
      return NextResponse.json({ error: "The card image is too large to save." }, { status: 413 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const parsed = thaiIdCardPayloadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "The card data is invalid.", details: parsed.error.flatten() }, { status: 400 });
    }

    const { data, error } = await supabaseServer
      .schema("checkpd")
      .rpc("upsert_thai_id_card", { p_payload: parsed.data })
      .single();

    if (error) {
      console.error("Thai ID card save failed:", error.message);
      return NextResponse.json({ error: "Unable to save this card read." }, { status: 500 });
    }

    return NextResponse.json({ card: data });
  } catch (error) {
    if (error instanceof ThaiIdCardAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Thai ID card read request failed:", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ error: "Unable to save this card read." }, { status: 500 });
  }
}
