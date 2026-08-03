import { createClient, type Session } from "@supabase/supabase-js";

import { canAccessFeature, getAccessProfile, type AccessProfile } from "@/lib/access";
import { supabaseServer } from "@/lib/supabase-server";

type ThaiIdCardAccessOptions = {
  recordsOnly?: boolean;
};

export class ThaiIdCardAccessError extends Error {
  constructor(
    message: string,
    public readonly status: 401 | 403
  ) {
    super(message);
    this.name = "ThaiIdCardAccessError";
  }
}

function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  const [scheme, token] = authorization.split(" ");

  return scheme?.toLowerCase() === "bearer" && token ? token : null;
}

export async function requireThaiIdCardAccess(
  request: Request,
  options: ThaiIdCardAccessOptions = {}
): Promise<AccessProfile> {
  const token = getBearerToken(request);
  if (!token) {
    throw new ThaiIdCardAccessError("Sign in is required.", 401);
  }

  const authClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
  const { data, error } = await authClient.auth.getUser(token);

  if (error || !data.user) {
    throw new ThaiIdCardAccessError("Your session has expired. Please sign in again.", 401);
  }

  const profile = await getAccessProfile(supabaseServer, { user: data.user } as Session);
  const feature = options.recordsOnly ? "thai_id_records" : "thai_id_reader";

  if (!profile.isActive || !canAccessFeature(profile.role, feature)) {
    throw new ThaiIdCardAccessError("You do not have access to this Thai ID card resource.", 403);
  }

  return profile;
}
