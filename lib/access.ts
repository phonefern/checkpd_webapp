import type { Session, SupabaseClient } from "@supabase/supabase-js";

export type AppRole = "super_admin" | "admin" | "doctor" | "medical_staff";

export type AppFeature =
  | "dashboard"
  | "admin"
  | "users"
  | "storage"
  | "qa"
  | "pdf"
  | "tracking"
  | "papers"
  | "export"
  | "event"
  | "log";

export type AccessSource = "admin_users" | "metadata" | "none";

export type AdminUserRow = {
  id: string;
  user_id: string | null;
  email: string;
  role: AppRole;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
};

export type AccessProfile = {
  email: string | null;
  role: AppRole | null;
  isActive: boolean;
  allowedFeatures: AppFeature[];
  source: AccessSource;
  debugError?: string | null;
};

export const APP_ROLES: AppRole[] = ["super_admin", "admin", "doctor", "medical_staff"];

export const APP_FEATURE_LABELS: Record<AppFeature, string> = {
  dashboard: "Dashboard",
  admin: "Admin",
  users: "Users",
  storage: "Storage",
  qa: "QA",
  pdf: "PDF",
  tracking: "Tracking",
  papers: "Papers",
  export: "Export",
  event: "Event",
  log: "Activity Log",
};

export const APP_ROLE_LABELS: Record<AppRole, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  doctor: "Doctor",
  medical_staff: "Medical Staff",
};

export const ROLE_ACCESS: Record<AppRole, AppFeature[]> = {
  super_admin: ["dashboard", "admin", "users", "storage", "qa", "pdf", "tracking", "papers", "export", "event", "log"],
  admin: ["dashboard", "users", "tracking", "storage", "qa", "papers", "export", "event", "log"],
  doctor: ["dashboard", "users", "storage", "qa", "pdf"],
  medical_staff: ["users", "qa"],
};

const FEATURE_ROUTE_PREFIXES: Array<{ prefix: string; feature: AppFeature }> = [
  { prefix: "/pages/admin", feature: "admin" },
  { prefix: "/pages/users", feature: "users" },
  { prefix: "/pages/storage", feature: "storage" },
  { prefix: "/pages/qa", feature: "qa" },
  { prefix: "/pages/pdf", feature: "pdf" },
  { prefix: "/pages/tracking", feature: "tracking" },
  { prefix: "/pages/papers", feature: "papers" },
  { prefix: "/pages/export", feature: "export" },
  { prefix: "/pages/event", feature: "event" },
  { prefix: "/pages/index", feature: "dashboard" },
  { prefix: "/pages/log", feature: "log" },
];

export function isAppRole(value: unknown): value is AppRole {
  return typeof value === "string" && APP_ROLES.includes(value as AppRole);
}

export function getAllowedFeatures(role: AppRole | null | undefined) {
  return role ? ROLE_ACCESS[role] ?? [] : [];
}

export function canAccessFeature(role: AppRole | null | undefined, feature: AppFeature) {
  return getAllowedFeatures(role).includes(feature);
}

export function getFeatureFromPathname(pathname: string): AppFeature | null {
  const matched = FEATURE_ROUTE_PREFIXES.find(({ prefix }) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  return matched?.feature ?? null;
}

export function getDefaultAuthorizedPath(role: AppRole | null | undefined) {
  const allowed = getAllowedFeatures(role);
  if (allowed.length === 0) return "/pages/login";
  if (allowed.includes("dashboard")) return "/pages/index";

  const firstFeature = allowed[0];
  const route = FEATURE_ROUTE_PREFIXES.find((item) => item.feature === firstFeature);
  return route?.prefix ?? "/pages/login";
}

function getRoleFromMetadata(session: Session | null): AppRole | null {
  const candidate = session?.user?.user_metadata?.role;
  return isAppRole(candidate) ? candidate : null;
}

export async function getAccessProfile(
  supabase: SupabaseClient,
  session: Session | null
): Promise<AccessProfile> {
  const email = session?.user?.email?.toLowerCase() ?? null;

  if (!session || !email) {
    return {
      email,
      role: null,
      isActive: false,
      allowedFeatures: [],
      source: "none",
      debugError: null,
    };
  }

  const { data, error } = await supabase
    .from("admin_users")
    .select("id,user_id,email,role,is_active,created_at,updated_at")
    .ilike("email", email)
    .maybeSingle<AdminUserRow>();

  if (!error && data && isAppRole(data.role)) {
    return {
      email,
      role: data.role,
      isActive: Boolean(data.is_active),
      allowedFeatures: data.is_active ? getAllowedFeatures(data.role) : [],
      source: "admin_users",
      debugError: null,
    };
  }

  if (error) {
    console.error("getAccessProfile admin_users lookup failed:", error.message);
  }

  const fallbackRole = getRoleFromMetadata(session);
  return {
    email,
    role: fallbackRole,
    isActive: Boolean(fallbackRole),
    allowedFeatures: getAllowedFeatures(fallbackRole),
    source: fallbackRole ? "metadata" : "none",
    debugError: error?.message ?? null,
  };
}
