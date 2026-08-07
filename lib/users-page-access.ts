import { createClient, type Session } from "@supabase/supabase-js";

import { canAccessFeature, getAccessProfile, type AccessProfile } from "@/lib/access";
import { supabaseServer } from "@/lib/supabase-server";

export class UsersPageAccessError extends Error {
  constructor(
    message: string,
    public readonly status: 401 | 403
  ) {
    super(message);
    this.name = "UsersPageAccessError";
  }
}

function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  const [scheme, token] = authorization.split(" ");

  return scheme?.toLowerCase() === "bearer" && token ? token : null;
}

// Same pattern as lib/thai-id-card-access.ts — gates server actions the
// Users page triggers (currently: per-row demographic re-sync) behind the
// same "users" feature role check the page itself is gated by.
export async function requireUsersPageAccess(request: Request): Promise<AccessProfile> {
  const token = getBearerToken(request);
  if (!token) {
    throw new UsersPageAccessError("Sign in is required.", 401);
  }

  const authClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
  const { data, error } = await authClient.auth.getUser(token);

  if (error || !data.user) {
    throw new UsersPageAccessError("Your session has expired. Please sign in again.", 401);
  }

  const profile = await getAccessProfile(supabaseServer, { user: data.user } as Session);

  if (!profile.isActive || !canAccessFeature(profile.role, "users")) {
    throw new UsersPageAccessError("You do not have access to this resource.", 403);
  }

  return profile;
}
