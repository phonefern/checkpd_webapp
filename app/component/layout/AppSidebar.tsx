"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Building2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  FileDown,
  FileText,
  LogOut,
  Package,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { canAccessFeature, type AppFeature, type AppRole } from "@/lib/access";

type SidebarUser = {
  name: string;
  email: string;
  roleLabel: string;
};

type SidebarItem = {
  label: string;
  icon: LucideIcon;
  path: string;
  feature: AppFeature;
  badge?: string;
};

const mainItems: SidebarItem[] = [
  { label: "Dashboard", icon: Building2, path: "/pages/index", feature: "dashboard" },
  { label: "Admin management", icon: ShieldCheck, path: "/pages/admin", feature: "admin" },
  { label: "Activity Log", icon: Bell, path: "/pages/log", feature: "log" },
];

const workspaceItems: SidebarItem[] = [
  { label: "CheckPD Label Dashboard", icon: ShieldCheck, path: "/pages/users", feature: "users" },
  { label: "Questionnaire Management V1", icon: FileText, path: "/pages/papers", feature: "papers" },
  { label: "Realtime Download Tracking", icon: Clock, path: "/pages/tracking", feature: "tracking" },
  { label: "CheckPD PDF export", icon: FileDown, path: "/pages/pdf", feature: "pdf" },
  { label: "Raw Data Storage", icon: Package, path: "/pages/storage", feature: "storage" },
  { label: "Questionnaire Management V2", icon: Download, path: "/pages/qa", feature: "qa" },
];

function getUserInitials(name: string) {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "AD"
  );
}

type AppSidebarProps = {
  activePath: string;
  role: AppRole | null;
  user: SidebarUser;
  onNavigate: (path: string) => void;
  onLogout: () => void;
};

export default function AppSidebar({ activePath, role, user, onNavigate, onLogout }: AppSidebarProps) {
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("sidebar_collapsed") === "1";
  });


  const visibleMainItems = useMemo(
    () => mainItems.filter((item) => canAccessFeature(role, item.feature)),
    [role]
  );

  const visibleWorkspaceItems = useMemo(
    () => workspaceItems.filter((item) => canAccessFeature(role, item.feature)),
    [role]
  );

  useEffect(() => {
    [...visibleMainItems, ...visibleWorkspaceItems].forEach((item) => {
      router.prefetch(item.path);
    });
  }, [router, visibleMainItems, visibleWorkspaceItems]);

  return (
    <aside
      className={`relative flex-shrink-0 transition-[width] duration-300 ease-in-out ${
        collapsed ? "w-[68px]" : "w-[280px]"
      }`}
      style={{
        background: "linear-gradient(180deg, #4339C6 0%, #3C33B5 55%, #312991 100%)",
      }}
    >
      {/* Toggle button */}
      <button
        onClick={() => setCollapsed((v) => {
          const next = !v;
          localStorage.setItem("sidebar_collapsed", next ? "1" : "0");
          return next;
        })}
        className="absolute -right-3 top-6 z-20 flex h-6 w-6 items-center justify-center rounded-full border border-white/20 bg-[#4339C6] text-white shadow-md hover:bg-[#3C33B5] transition"
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
      </button>

      <div className="flex h-full flex-col overflow-hidden px-3 py-5">
        {/* Logo */}
        <div className="flex items-center gap-3 px-2">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/14 ring-1 ring-white/20">
            <Building2 className="h-5 w-5 text-white" />
          </div>
          <div
            className={`overflow-hidden transition-all duration-300 ease-in-out ${
              collapsed ? "w-0 opacity-0" : "w-auto opacity-100"
            }`}
          >
            <p className="whitespace-nowrap text-sm font-medium text-neutral-200">CheckPD Admin</p>
            <p className="whitespace-nowrap text-xs text-neutral-500">Operations Console</p>
          </div>
        </div>

        {/* User card */}
        <div className="mt-4">
          <div className="rounded-2xl border border-white/15 bg-white/10 p-3 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <Avatar className="h-11 w-11 shrink-0 border border-white/10">
                <AvatarFallback className="bg-white/15 text-sm font-semibold text-white">
                  {getUserInitials(user.name)}
                </AvatarFallback>
              </Avatar>
              <div
                className={`min-w-0 flex-1 overflow-hidden transition-all duration-300 ease-in-out ${
                  collapsed ? "w-0 opacity-0" : "w-auto opacity-100"
                }`}
              >
                <p className="truncate whitespace-nowrap text-sm font-medium text-white">{user.name}</p>
                <p className="truncate whitespace-nowrap text-xs text-indigo-100/75">{user.email}</p>
              </div>
            </div>
            <div
              className={`overflow-hidden transition-all duration-300 ease-in-out ${
                collapsed ? "mt-0 h-0 opacity-0" : "mt-3 h-auto opacity-100"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <Badge variant="outline" className="border-white/20 bg-white/10 text-white">
                  {user.roleLabel}
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full text-indigo-100 hover:bg-white/15 hover:text-white"
                  onClick={onLogout}
                  aria-label="Log out"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </div>
            {/* Collapsed logout */}
            {collapsed && (
              <div className="mt-2 flex justify-center">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full text-indigo-100 hover:bg-white/15 hover:text-white"
                  onClick={onLogout}
                  aria-label="Log out"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
          <Separator className="mt-4 bg-white/15" />
        </div>

        {/* Nav */}
        <nav className="mt-6 flex-1 overflow-y-auto overflow-x-hidden">
          <div className="space-y-1">
            {visibleMainItems.map((item) => {
              const isActive = activePath === item.path;
              return (
                <button
                  key={item.label}
                  onClick={() => onNavigate(item.path)}
                  title={collapsed ? item.label : undefined}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition ${
                    isActive ? "bg-white text-[#4339C6] shadow-sm" : "text-indigo-100 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span
                    className={`flex flex-1 items-center justify-between overflow-hidden whitespace-nowrap transition-all duration-300 ease-in-out ${
                      collapsed ? "w-0 opacity-0" : "w-auto opacity-100"
                    }`}
                  >
                    {item.label}
                    {item.badge ? (
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          isActive ? "bg-indigo-100 text-[#4339C6]" : "bg-white/15 text-white"
                        }`}
                      >
                        {item.badge}
                      </span>
                    ) : null}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-8 px-1">
            <p
              className={`mb-3 overflow-hidden whitespace-nowrap text-xs font-medium uppercase tracking-[0.18em] text-indigo-200/70 transition-all duration-300 ease-in-out ${
                collapsed ? "h-0 opacity-0" : "h-auto opacity-100"
              }`}
            >
              Workspace
            </p>
            <div className="space-y-1">
              {visibleWorkspaceItems.map((item) => (
                <button
                  key={item.label}
                  onClick={() => onNavigate(item.path)}
                  title={collapsed ? item.label : undefined}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition ${
                    activePath === item.path
                      ? "bg-white/16 text-white"
                      : "text-indigo-100 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span
                    className={`overflow-hidden whitespace-nowrap transition-all duration-300 ease-in-out ${
                      collapsed ? "w-0 opacity-0" : "w-auto opacity-100"
                    }`}
                  >
                    {item.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </nav>

      </div>
    </aside>
  );
}
