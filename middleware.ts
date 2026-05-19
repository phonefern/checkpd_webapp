import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = new Set(["/pages/login"]);
const GUEST_ALLOWED_PATHS = new Set(["/pages/index"]);

function hasSupabaseAuthCookie(request: NextRequest): boolean {
  return request.cookies
    .getAll()
    .some((cookie) => cookie.name.startsWith("sb-") && cookie.name.includes("auth-token"));
}

function isGuest(request: NextRequest): boolean {
  return request.cookies.get("chulapd-guest")?.value === "1";
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const hasSession = hasSupabaseAuthCookie(request);
  const guest = isGuest(request);

  if (PUBLIC_PATHS.has(pathname)) {
    if (hasSession) {
      return NextResponse.redirect(new URL("/pages/index", request.url));
    }
    return NextResponse.next();
  }

  if (!hasSession) {
    return NextResponse.redirect(new URL("/pages/login", request.url));
  }

  if (guest && !GUEST_ALLOWED_PATHS.has(pathname)) {
    return NextResponse.redirect(new URL("/pages/index", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/pages/:path*"],
};
