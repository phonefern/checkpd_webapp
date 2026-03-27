"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { Loader2, LockKeyhole, ShieldCheck, UserPlus, Users } from "lucide-react";

import AppSidebar from "@/app/component/layout/AppSidebar";
import { useAccessProfile } from "@/app/hooks/useAccessProfile";
import AuthRedirect from "@/components/AuthRedirect";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { APP_ROLE_LABELS, APP_ROLES, type AdminUserRow, type AppRole } from "@/lib/access";
import { supabase } from "@/lib/supabase";

type UserProfile = {
  name: string;
  role: string;
  hospital: string;
  email: string;
};

type AdminModalState = {
  email: string;
  role: AppRole;
  isActive: boolean;
  confirmPassword: string;
};

const defaultUser: UserProfile = {
  name: "Admin ChulaPD",
  role: "System administrator",
  hospital: "King Chulalongkorn Memorial Hospital",
  email: "admin@checkpd.local",
};

const defaultModalState: AdminModalState = {
  email: "",
  role: "admin",
  isActive: true,
  confirmPassword: "",
};

const roleStyles: Record<AppRole, string> = {
  super_admin: "border-red-200 bg-red-50 text-red-700",
  admin: "border-emerald-200 bg-emerald-50 text-emerald-700",
  doctor: "border-sky-200 bg-sky-50 text-sky-700",
};

const roleDescriptions: Record<AppRole, string> = {
  super_admin: "Full platform control including admin access and grants.",
  admin: "Users, tracking, storage, QA, papers, export, and event access.",
  doctor: "Users, storage, QA, and PDF access.",
};

export default function AdminPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [currentUser, setCurrentUser] = useState<UserProfile>(defaultUser);
  const { accessProfile, accessLoading } = useAccessProfile(session);
  const [rows, setRows] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalState, setModalState] = useState<AdminModalState>(defaultModalState);

  useEffect(() => {
    const applySession = (nextSession: Session | null) => {
      setSession(nextSession);

      if (!nextSession?.user) return;

      const metadata = nextSession.user.user_metadata;
      setCurrentUser({
        name: metadata?.name || metadata?.full_name || nextSession.user.email?.split("@")[0] || defaultUser.name,
        role: metadata?.role || defaultUser.role,
        hospital: metadata?.hospital || defaultUser.hospital,
        email: nextSession.user.email || defaultUser.email,
      });
    };

    supabase.auth.getSession().then(({ data: { session: nextSession } }) => {
      applySession(nextSession);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      applySession(nextSession);
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadAdminUsers = async () => {
    setLoading(true);
    setError(null);

    const { data, error: loadError } = await supabase
      .from("admin_users")
      .select("id,user_id,email,role,is_active,created_at,updated_at")
      .order("email", { ascending: true });

    if (loadError) {
      setRows([]);
      setError(loadError.message);
      setLoading(false);
      return;
    }

    setRows((data as AdminUserRow[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    if (!session || accessLoading) return;
    if (accessProfile.role !== "super_admin") return;

    loadAdminUsers();
  }, [session, accessLoading, accessProfile.role]);

  const handleLogout = async () => {
    const { error: logoutError } = await supabase.auth.signOut();
    if (logoutError) {
      console.error("Logout error:", logoutError);
      return;
    }

    window.location.href = "/pages/login";
  };

  const verifyCurrentPassword = async () => {
    if (!currentUser.email || !modalState.confirmPassword) {
      return { ok: false, message: "Please confirm your current super admin password." };
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: currentUser.email,
      password: modalState.confirmPassword,
    });

    if (signInError) {
      return { ok: false, message: "Password confirmation failed." };
    }

    return { ok: true, message: null };
  };

  const handleCreateOrGrant = async () => {
    setSaving(true);
    setError(null);

    const email = modalState.email.trim().toLowerCase();
    if (!email) {
      setError("Email is required.");
      setSaving(false);
      return;
    }

    const verification = await verifyCurrentPassword();
    if (!verification.ok) {
      setError(verification.message);
      setSaving(false);
      return;
    }

    const { error: upsertError } = await supabase.from("admin_users").upsert(
      {
        email,
        role: modalState.role,
        is_active: modalState.isActive,
      },
      {
        onConflict: "email",
      }
    );

    if (upsertError) {
      setError(upsertError.message);
      setSaving(false);
      return;
    }

    setModalState(defaultModalState);
    setIsModalOpen(false);
    await loadAdminUsers();
    setSaving(false);
  };

  const handleRoleChange = async (row: AdminUserRow, role: AppRole) => {
    const { error: updateError } = await supabase
      .from("admin_users")
      .update({ role })
      .eq("id", row.id);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    await loadAdminUsers();
  };

  const handleActiveChange = async (row: AdminUserRow, isActive: boolean) => {
    const { error: updateError } = await supabase
      .from("admin_users")
      .update({ is_active: isActive })
      .eq("id", row.id);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    await loadAdminUsers();
  };

  const roleCounts = useMemo(() => {
    return APP_ROLES.map((role) => ({
      role,
      total: rows.filter((row) => row.role === role).length,
    }));
  }, [rows]);

  const totals = useMemo(() => {
    const active = rows.filter((row) => row.is_active).length;
    return {
      total: rows.length,
      active,
      inactive: rows.length - active,
    };
  }, [rows]);

  if (!session) {
    return <AuthRedirect />;
  }

  if (accessLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50">
        <Loader2 className="h-6 w-6 animate-spin text-neutral-500" />
      </div>
    );
  }

  if (accessProfile.role !== "super_admin") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50 p-6">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle>Access denied</CardTitle>
            <CardDescription>Only the `super_admin` role can manage account access.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push("/pages/index")}>Back to dashboard</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-50">
      <div className="flex min-h-screen">
        <AppSidebar
          activePath="/pages/admin"
          role={accessProfile.role}
          user={{
            name: currentUser.name,
            email: currentUser.email,
            roleLabel: accessProfile.role ? APP_ROLE_LABELS[accessProfile.role] : currentUser.role,
          }}
          onNavigate={(path) => router.push(path)}
          onLogout={handleLogout}
        />

        <main className="min-w-0 flex-1 bg-[radial-gradient(circle_at_top,_rgba(67,57,198,0.12),_transparent_35%),linear-gradient(180deg,_#f8fafc_0%,_#eef2ff_100%)] text-neutral-950">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            <div className="rounded-[30px] border border-black/5 bg-white/85 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.1)] backdrop-blur sm:p-8">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-sm font-medium text-[#4339C6]">Access control workspace</p>
                  <h1 className="mt-1 text-3xl font-semibold tracking-tight">จัดการผู้ดูแลระบบ</h1>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-600">
                    จัดการสิทธิ์ผู้ใช้ตาม role ของระบบ พร้อมตรวจรหัสผ่านของบัญชี Super Admin ก่อน grant access.
                  </p>
                </div>
                <Button className="rounded-xl bg-[#4339C6] hover:bg-[#382faa]" onClick={() => setIsModalOpen(true)}>
                  <UserPlus className="h-4 w-4" />
                  เพิ่ม Admin
                </Button>
              </div>

              <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {roleCounts.map((item) => (
                  <Card key={item.role} className={`border ${roleStyles[item.role]} shadow-none`}>
                    <CardHeader className="pb-3">
                      <Badge variant="outline" className="w-fit bg-white/70">
                        {APP_ROLE_LABELS[item.role]}
                      </Badge>
                      <CardTitle className="pt-2 text-3xl">{item.total}</CardTitle>
                      <CardDescription className="text-current/80">{roleDescriptions[item.role]}</CardDescription>
                    </CardHeader>

                  </Card>
                ))}
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-3">
                <Card className="rounded-2xl border-black/5 bg-white/75 shadow-none">
                  <CardContent className="p-5">
                    <p className="text-3xl font-semibold text-[#4339C6]">{totals.total}</p>
                    <p className="mt-1 text-sm text-neutral-600">Admin ทั้งหมด</p>
                  </CardContent>
                </Card>
                <Card className="rounded-2xl border-black/5 bg-white/75 shadow-none">
                  <CardContent className="p-5">
                    <p className="text-3xl font-semibold text-emerald-600">{totals.active}</p>
                    <p className="mt-1 text-sm text-neutral-600">ใช้งานอยู่</p>
                  </CardContent>
                </Card>
                <Card className="rounded-2xl border-black/5 bg-white/75 shadow-none">
                  <CardContent className="p-5">
                    <p className="text-3xl font-semibold text-orange-500">{totals.inactive}</p>
                    <p className="mt-1 text-sm text-neutral-600">ไม่ใช้งาน</p>
                  </CardContent>
                </Card>
              </div>

              <Card className="mt-8 rounded-[28px] border-black/5 bg-white/80 shadow-none">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-[#4339C6]/10 p-2 text-[#4339C6]">
                      <Users className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle>รายชื่อ Admin</CardTitle>
                      <CardDescription>เปลี่ยน role และสถานะได้จากตารางนี้โดยตรง</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {error && (
                    <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                      {error}
                    </div>
                  )}

                  {loading ? (
                    <div className="flex items-center gap-2 text-sm text-neutral-500">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading admin users...
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-2xl border border-neutral-200">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-neutral-50/80">
                            <TableHead>Email</TableHead>
                            <TableHead>สิทธิ์</TableHead>
                            <TableHead>สถานะ</TableHead>
                            <TableHead>สร้างเมื่อ</TableHead>
                            <TableHead>จัดการ</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {rows.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={5} className="text-center text-neutral-500">
                                No granted accounts yet.
                              </TableCell>
                            </TableRow>
                          ) : (
                            rows.map((row) => (
                              <TableRow key={row.id}>
                                <TableCell className="font-medium">{row.email}</TableCell>
                                <TableCell className="w-[220px]">
                                  <Select value={row.role} onValueChange={(value) => handleRoleChange(row, value as AppRole)}>
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {APP_ROLES.map((role) => (
                                        <SelectItem key={role} value={role}>
                                          {APP_ROLE_LABELS[role]}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </TableCell>
                                <TableCell>
                                  <Badge className={row.is_active ? "bg-emerald-100 text-emerald-700" : "bg-neutral-100 text-neutral-600"}>
                                    {row.is_active ? "ใช้งาน" : "ไม่ใช้งาน"}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-sm text-neutral-500">
                                  {row.created_at ? new Date(row.created_at).toLocaleDateString("th-TH") : "-"}
                                </TableCell>
                                <TableCell>
                                  <Button variant="outline" onClick={() => handleActiveChange(row, !row.is_active)}>
                                    {row.is_active ? "ปิดใช้งาน" : "เปิดใช้งาน"}
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="mt-6 rounded-[24px] border border-black/5 bg-white/70 px-6 py-5 text-sm text-neutral-600 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
                <p className="font-medium text-neutral-950">Signed in hospital</p>
                <p className="mt-1">{currentUser.hospital}</p>
              </div>
            </div>
          </div>
        </main>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>เพิ่ม Admin ใหม่</DialogTitle>
            <DialogDescription>ยืนยันรหัสผ่านของบัญชี Super Admin ปัจจุบันก่อนเพิ่มหรือปรับสิทธิ์ผู้ใช้</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="admin-email">Email</Label>
              <Input
                id="admin-email"
                type="email"
                value={modalState.email}
                onChange={(event) => setModalState((prev) => ({ ...prev, email: event.target.value }))}
                placeholder="staff@example.com"
                disabled={saving}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password">Super Admin password</Label>
              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                <Input
                  id="confirm-password"
                  type="password"
                  value={modalState.confirmPassword}
                  onChange={(event) => setModalState((prev) => ({ ...prev, confirmPassword: event.target.value }))}
                  className="pl-9"
                  placeholder="Confirm current super admin password"
                  disabled={saving}
                />
              </div>
              <p className="text-xs text-neutral-500">ใช้รหัสผ่านของบัญชี Super Admin ที่ล็อกอินอยู่ เพื่อยืนยันการ grant role</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Role</Label>
                <Select
                  value={modalState.role}
                  onValueChange={(value) => setModalState((prev) => ({ ...prev, role: value as AppRole }))}
                  disabled={saving}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {APP_ROLES.map((role) => (
                      <SelectItem key={role} value={role}>
                        {APP_ROLE_LABELS[role]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={modalState.isActive ? "active" : "inactive"}
                  onValueChange={(value) => setModalState((prev) => ({ ...prev, isActive: value === "active" }))}
                  disabled={saving}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">ใช้งาน (Active)</SelectItem>
                    <SelectItem value="inactive">ไม่ใช้งาน (Inactive)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsModalOpen(false);
                setModalState(defaultModalState);
              }}
              disabled={saving}
            >
              ยกเลิก
            </Button>
            <Button className="bg-[#4339C6] hover:bg-[#382faa]" onClick={handleCreateOrGrant} disabled={saving}>
              {saving ? "กำลังบันทึก..." : "เพิ่ม"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
