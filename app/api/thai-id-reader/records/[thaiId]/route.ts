import { NextResponse } from "next/server";

import { ThaiIdCardAccessError, requireThaiIdCardAccess } from "@/lib/thai-id-card-access";
import { isValidThaiIdChecksum } from "@/lib/thai-id-card";
import { hasServiceRole, supabaseServer } from "@/lib/supabase-server";

type RouteContext = { params: Promise<{ thaiId: string }> };

async function getThaiId(context: RouteContext) {
  const { thaiId } = await context.params;
  return isValidThaiIdChecksum(thaiId) ? thaiId : null;
}

function storageUnavailable() {
  return NextResponse.json({ error: "Thai ID card storage is not configured." }, { status: 503 });
}

export async function GET(request: Request, context: RouteContext) {
  try {
    await requireThaiIdCardAccess(request, { recordsOnly: true });
    if (!hasServiceRole) return storageUnavailable();

    const thaiId = await getThaiId(context);
    if (!thaiId) return NextResponse.json({ error: "Invalid Thai ID." }, { status: 400 });

    const [{ data: card, error: cardError }, { data: users, error: usersError }] = await Promise.all([
      supabaseServer
        .schema("checkpd")
        .from("thai_id_cards")
        .select("thai_id,user_id,title_th,title_en,full_name_th,full_name_en,first_name_th,first_name_en,last_name_th,last_name_en,date_of_birth,gender,card_issuer,issue_date,expire_date,address,photo_base64_uri,first_scanned_at,last_scanned_at,linked_at")
        .eq("thai_id", thaiId)
        .maybeSingle(),
      supabaseServer
        .schema("checkpd")
        .from("users")
        .select("id,thai_id,first_name,last_name,phone_number")
        .eq("thai_id", thaiId)
        .order("id"),
    ]);

    if (cardError || usersError) {
      console.error("Thai ID card detail failed:", cardError?.message ?? usersError?.message);
      return NextResponse.json({ error: "Unable to load this Thai ID card record." }, { status: 500 });
    }
    if (!card) return NextResponse.json({ error: "Thai ID card record not found." }, { status: 404 });

    return NextResponse.json({ card, candidates: users ?? [] });
  } catch (error) {
    if (error instanceof ThaiIdCardAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Thai ID card detail request failed:", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ error: "Unable to load this Thai ID card record." }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    await requireThaiIdCardAccess(request, { recordsOnly: true });
    if (!hasServiceRole) return storageUnavailable();

    const thaiId = await getThaiId(context);
    if (!thaiId) return NextResponse.json({ error: "Invalid Thai ID." }, { status: 400 });

    let body: { userId?: unknown };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }
    if (body.userId !== null && typeof body.userId !== "string") {
      return NextResponse.json({ error: "userId must be a user ID or null." }, { status: 400 });
    }

    const { data: card, error: cardError } = await supabaseServer
      .schema("checkpd")
      .from("thai_id_cards")
      .select("thai_id,user_id")
      .eq("thai_id", thaiId)
      .maybeSingle();

    if (cardError) throw cardError;
    if (!card) return NextResponse.json({ error: "Thai ID card record not found." }, { status: 404 });

    const userId = body.userId ?? null;
    if (card.user_id && userId && card.user_id !== userId) {
      return NextResponse.json({ error: "Unlink the current user before assigning a different user." }, { status: 409 });
    }

    if (userId) {
      const { data: user, error: userError } = await supabaseServer
        .schema("checkpd")
        .from("users")
        .select("id,thai_id")
        .eq("id", userId)
        .maybeSingle();

      if (userError) throw userError;
      if (!user || user.thai_id !== thaiId) {
        return NextResponse.json({ error: "This user is not an exact Thai ID match." }, { status: 409 });
      }
    }

    const { data, error } = await supabaseServer
      .schema("checkpd")
      .from("thai_id_cards")
      .update({ user_id: userId, linked_at: userId ? new Date().toISOString() : null })
      .eq("thai_id", thaiId)
      .select("thai_id,user_id,linked_at")
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "That user is already linked to another Thai ID card." }, { status: 409 });
      }
      throw error;
    }

    return NextResponse.json({ card: data });
  } catch (error) {
    if (error instanceof ThaiIdCardAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Thai ID card link request failed:", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ error: "Unable to update this Thai ID card link." }, { status: 500 });
  }
}
