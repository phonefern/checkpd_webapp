import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { canAccessFeature, getDefaultAuthorizedPath, getFeatureFromPathname, isAppRole, type AppRole } from "@/lib/access";

function clearSupabaseAuthCookies(request: NextRequest, response: NextResponse) {
  const authCookieNames = request.cookies
    .getAll()
    .map((cookie) => cookie.name)
    .filter((name) => name.startsWith("sb-") && name.includes("auth-token"));

  for (const name of authCookieNames) {
    response.cookies.delete(name);
  }
}

async function resolveRole(request: NextRequest, response: NextResponse) {
  const supabase = createMiddlewareClient({ req: request, res: response });
  let session: Awaited<ReturnType<typeof supabase.auth.getSession>>["data"]["session"] = null;

  try {
    const { data } = await supabase.auth.getSession();
    session = data.session;
  } catch (error) {
    console.warn("middleware getSession failed:", error);
    clearSupabaseAuthCookies(request, response);
    return { session: null, role: null as AppRole | null, isActive: false };
  }

  if (!session) {
    return { session: null, role: null as AppRole | null, isActive: false };
  }

  const email = session.user.email?.toLowerCase();

  if (!email) {
    return { session, role: null as AppRole | null, isActive: false };
  }

  const { data, error } = await supabase
    .from("admin_users")
    .select("role,is_active")
    .ilike("email", email)
    .maybeSingle<{ role: AppRole; is_active: boolean }>();

  if (!error && data && isAppRole(data.role)) {
    return {
      session,
      role: data.role,
      isActive: Boolean(data.is_active),
    };
  }

  if (error) {
    console.error("middleware admin_users lookup failed:", error.message);
  }

  const metadataRole = session.user.user_metadata?.role;
  return {
    session,
    role: isAppRole(metadataRole) ? metadataRole : null,
    isActive: isAppRole(metadataRole),
  };
}

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const pathname = request.nextUrl.pathname;
  const { session, role, isActive } = await resolveRole(request, response);

  if (pathname === "/pages/login") {
    if (!session) return response;
    if (!role || !isActive) return response;

    return NextResponse.redirect(new URL(getDefaultAuthorizedPath(role), request.url));
  }

  if (!session) {
    return NextResponse.redirect(new URL("/pages/login", request.url));
  }

  const feature = getFeatureFromPathname(pathname);
  if (!feature) {
    return response;
  }

  if (!role || !isActive || !canAccessFeature(role, feature)) {
    return NextResponse.redirect(new URL("/pages/login", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/pages/:path*"],
};
