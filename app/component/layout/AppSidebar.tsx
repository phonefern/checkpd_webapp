"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Bell,
  Building2,
  ChevronLeft,
  ChevronRight,
  Database,
  Clock,
  Download,
  FileDown,
  FileText,
  Home,
  LogOut,
  LogIn,
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
  path?: string;
  feature?: AppFeature;
  badge?: string;
  hideForRoles?: AppRole[];
  children?: SidebarItem[];
};

const mainItems: SidebarItem[] = [
  { label: "Home", icon: Home, path: "/pages/index", feature: "dashboard", hideForRoles: ["guest"] },
  { label: "Statistics Dashboard", icon: BarChart3, path: "/pages/dashboard", feature: "dashboard" },
  { label: "User Management", icon: ShieldCheck, path: "/pages/admin", feature: "admin" },
  { label: "Activity Logs", icon: Bell, path: "/pages/log", feature: "log" },
];

const workspaceItems: SidebarItem[] = [
  { label: "Diagnosis Management", icon: ShieldCheck, path: "/pages/users", feature: "users" },
  // { label: "Questionnaire Management V1", icon: FileText, path: "/pages/papers", feature: "papers" },
    { label: "Screening Assessments", icon: Download, path: "/pages/qa", feature: "qa" },
  { label: "Usage Analytics", icon: Clock, path: "/pages/tracking", feature: "tracking" },
  { label: "CheckPD Report Export (PDF)", icon: FileDown, path: "/pages/pdf", feature: "pdf" },
  {
    label: "Raw Data Access",
    icon: Package,
    children: [
      { label: "Patient Records ZIP", icon: Download, path: "/pages/export", feature: "export" },
      { label: "Storage Files", icon: Database, path: "/pages/storage", feature: "storage" },
    ],
  },

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
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("sidebar_collapsed") === "1";
    setCollapsed(stored);
  }, []);


  const isItemVisible = (item: SidebarItem): boolean => {
    if (role && item.hideForRoles?.includes(role)) return false;
    if (item.children?.length) {
      return item.children.some((child) => isItemVisible(child));
    }
    return item.feature ? canAccessFeature(role, item.feature) : false;
  };

  const visibleMainItems = useMemo(
    () => mainItems.filter(isItemVisible),
    [role]
  );

  const visibleWorkspaceItems = useMemo(
    () => workspaceItems.filter(isItemVisible),
    [role]
  );

  const visibleChildren = (item: SidebarItem) => item.children?.filter(isItemVisible) ?? [];

  const isActiveItem = (item: SidebarItem) => {
    if (item.path && activePath === item.path) return true;
    return visibleChildren(item).some((child) => child.path === activePath);
  };

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
          {role === "guest" ? (
            <div className={`border border-white/15 bg-white/10 backdrop-blur-sm transition-all duration-300 ease-in-out ${collapsed ? "rounded-xl p-2" : "rounded-2xl p-3"}`}>
              <Button
                type="button"
                className={`w-full justify-center rounded-xl bg-white/15 text-white hover:bg-white/25 ${collapsed ? "px-2" : ""}`}
                onClick={onLogout}
              >
                <LogIn className="h-4 w-4" />
                {!collapsed ? <span className="ml-2">เข้าสู่ระบบ</span> : null}
              </Button>
            </div>
          ) : (
            <div
              className={`border border-white/15 bg-white/10 backdrop-blur-sm transition-all duration-300 ease-in-out ${
                collapsed ? "rounded-xl p-2" : "rounded-2xl p-3"
              }`}
            >
              <div className={`flex items-center ${collapsed ? "justify-center" : "gap-3"}`}>
                <Avatar
                  className={`shrink-0 border border-white/10 transition-all duration-300 ease-in-out ${
                    collapsed ? "h-8 w-8" : "h-11 w-11"
                  }`}
                >
                  <AvatarFallback
                    className={`bg-white/15 font-semibold text-white transition-all duration-300 ease-in-out ${
                      collapsed ? "text-xs" : "text-sm"
                    }`}
                  >
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
          )}
          <Separator className="mt-4 bg-white/15" />
        </div>

        {/* Nav */}
        <nav className="mt-6 flex-1 overflow-y-auto overflow-x-hidden">
          <div className="space-y-1">
            {visibleMainItems.map((item) => {
              const isActive = isActiveItem(item);
              return (
                <button
                  key={item.label}
                  onClick={() => item.path && onNavigate(item.path)}
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
              {visibleWorkspaceItems.map((item) => {
                const children = visibleChildren(item);
                const active = isActiveItem(item);
                const firstChildPath = children[0]?.path;
                return (
                  <div key={item.label} className="space-y-1">
                    <button
                      onClick={() => item.path ? onNavigate(item.path) : firstChildPath && onNavigate(firstChildPath)}
                      title={collapsed ? item.label : undefined}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition ${
                        active
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

                    {children.length > 0 && !collapsed ? (
                      <div className="ml-4 space-y-1 border-l border-white/15 pl-3">
                        {children.map((child) => {
                          const ChildIcon = child.icon;
                          const childActive = activePath === child.path;
                          return (
                            <button
                              key={child.label}
                              onClick={() => child.path && onNavigate(child.path)}
                              className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs transition ${
                                childActive
                                  ? "bg-white text-[#4339C6] shadow-sm"
                                  : "text-indigo-100/85 hover:bg-white/10 hover:text-white"
                              }`}
                            >
                              <ChildIcon className="h-3.5 w-3.5 shrink-0" />
                              <span className="overflow-hidden whitespace-nowrap">{child.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </nav>

      </div>
    </aside>
  );
}
