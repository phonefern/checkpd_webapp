"use client";

import Link from "next/link";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Search, User, ClipboardCheck } from "lucide-react";
import { UserRow } from "@/app/pages/pdf/types";

interface UserListProps {
    users: UserRow[];
    loading: boolean;
    searchQuery: string;
    selectedUserId: string;
    screeningThaiIds: string[];
    screeningCheckedThaiIds: string[];
    screeningLoading: boolean;
    screeningError: string | null;
    onSearchChange: (query: string) => void;
    onUserSelect: (user: UserRow) => void;
    currentUsers: UserRow[];
    paginationInfo: {
        currentPage: number;
        totalPages: number;
        startIndex: number;
        endIndex: number;
        totalItems: number;
    };
}

export function UserList({
    users,
    loading,
    searchQuery,
    selectedUserId,
    screeningThaiIds,
    screeningCheckedThaiIds,
    screeningLoading,
    screeningError,
    onSearchChange,
    onUserSelect,
    currentUsers,
    paginationInfo,
}: UserListProps) {
    const getSourceBadge = (source?: string) => {
        if (source === "temps") {
            return (
                <Badge variant="secondary" className="font-normal">
                    Staff
                </Badge>
            );
        }
        return (
            <Badge variant="outline" className="font-normal">
                Users
            </Badge>
        );
    };

    const hasScreeningThaiId = (thaiid?: string) => {
        if (!thaiid) return false;
        return screeningThaiIds.includes(thaiid);
    };

    const isScreeningChecked = (thaiid?: string) => {
        if (!thaiid) return false;
        return screeningCheckedThaiIds.includes(thaiid);
    };

    const buildAssessmentHref = (user: UserRow) => {
        const thaiid = (user.thaiId || "").trim();
        if (!thaiid) return "/pages/papers/assessment";
        const params = new URLSearchParams();
        params.set("patient_thaiid", thaiid);
        if (user.firstName) params.set("first_name", user.firstName);
        if (user.lastName) params.set("last_name", user.lastName);
        if (user.gender) params.set("gender", user.gender);
        if (typeof user.age === "number" && Number.isFinite(user.age)) {
            params.set("age", String(user.age));
        }
        return `/pages/papers/assessment?${params.toString()}`;
    };

    const buildCheckInHref = (user: UserRow) => {
        const thaiid = (user.thaiId || "").trim();
        if (!thaiid) return "/pages/papers/check-in";
        const params = new URLSearchParams();
        params.set("thaiid", thaiid);
        if (user.firstName) params.set("firstName", user.firstName);
        if (user.lastName) params.set("lastName", user.lastName);
        if (user.gender) params.set("gender", user.gender);
        if (typeof user.age === "number" && Number.isFinite(user.age)) {
            params.set("age", String(user.age));
        }
        // After check-in completes, continue to QA assessment.
        params.set("next", buildAssessmentHref(user));
        return `/pages/papers/check-in?${params.toString()}`;
    };

    const buildQaHref = (user: UserRow) => {
        const thaiid = (user.thaiId || "").trim();
        if (!thaiid) return "/pages/papers/check-in";
        // If already has screening -> go Assessment QA, else go Check-in first.
        if (isScreeningChecked(thaiid) && hasScreeningThaiId(thaiid)) {
            return buildAssessmentHref(user);
        }
        return buildCheckInHref(user);
    };

    return (
        <Card className="lg:col-span-2">
            <CardHeader>
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <User className="h-5 w-5" />
                            รายชื่อผู้ใช้
                        </CardTitle>
                        <CardDescription>
                            Realtime updates from Firebase
                        </CardDescription>
                    </div>
                    <Badge variant={searchQuery ? "outline" : "secondary"} className="px-3 py-1">
                        {searchQuery
                            ? `${paginationInfo.totalItems} / ${users.length} รายการ`
                            : `${users.length} รายการทั้งหมด`}
                    </Badge>
                </div>
                <div className="flex items-center justify-between">
                    <div className="text-xs text-muted-foreground">
                        {screeningLoading
                            ? "กำลังโหลดสถานะ screening..."
                            : screeningError
                                ? `โหลดสถานะ screening ไม่สำเร็จ: ${screeningError}`
                                : "สถานะ screening อ้างอิงจากตาราง pd_screenings (Supabase) โดยเทียบด้วย thaiid"}
                    </div>
                </div>
            </CardHeader>

            <CardContent>
                <div className="relative mb-6">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                        type="text"
                        placeholder="ค้นหาด้วยชื่อ, นามสกุล, หรือเลขบัตรประชาชน..."
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="pl-10"
                    />
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                        <p className="text-sm text-muted-foreground">กำลังโหลดข้อมูลผู้ใช้...</p>
                    </div>
                ) : currentUsers.length === 0 ? (
                    <div className="text-center py-12 border rounded-lg">
                        <Search className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                        <h3 className="font-semibold text-lg mb-2">
                            {searchQuery ? "ไม่พบผลการค้นหา" : "ไม่มีข้อมูลผู้ใช้"}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                            {searchQuery
                                ? "ลองค้นหาด้วยคำอื่นหรือล้างคำค้นหา"
                                : "ระบบจะแสดงข้อมูลผู้ใช้ที่นี่"}
                        </p>
                    </div>
                ) : (
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[180px]">User ID</TableHead>
                                    <TableHead>ชื่อ</TableHead>
                                    <TableHead>นามสกุล</TableHead>
                                    <TableHead>เพศ</TableHead>
                                    <TableHead>อายุ</TableHead>
                                    <TableHead>เลขบัตรประชาชน</TableHead>
                                    <TableHead>Screening</TableHead>
                                    <TableHead>Source</TableHead>
                                    <TableHead>วันที่สร้าง</TableHead>
                                    <TableHead className="w-[140px]">QA</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {currentUsers.map((user) => (
                                    <TableRow
                                        key={user.userDocId}
                                        onClick={() => onUserSelect(user)}
                                        className={`cursor-pointer transition-colors hover:bg-muted/50 ${selectedUserId === user.userDocId ? "bg-primary/5 border-l-4 border-l-primary" : ""
                                            }`}
                                    >
                                        <TableCell className="text-xs font-sarabun">
                                            <div className="truncate max-w-[180px]" title={user.userDocId}>
                                                {user.userDocId}
                                            </div>
                                        </TableCell>
                                        <TableCell className="font-medium font-sarabun">{user.firstName || "-"}</TableCell>
                                        <TableCell className="font-sarabun">{user.lastName || "-"}</TableCell>
                                        <TableCell className="font-sarabun">
                                            <Badge variant="outline" className="font-normal">
                                                {user.gender === "male" ? "ชาย" :
                                                    user.gender === "female" ? "หญิง" : "-"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="font-sarabun">
                                            {typeof user.age === "number" ? user.age : "-"}
                                        </TableCell>
                                        <TableCell className="font-mono font-sarabun">
                                            {user.thaiId || "-"}
                                        </TableCell>
                                        <TableCell className="font-sarabun">
                                            {!user.thaiId ? (
                                                <Badge variant="outline" className="font-normal">
                                                    -
                                                </Badge>
                                            ) : !isScreeningChecked(user.thaiId) ? (
                                                <Badge variant="outline" className="font-normal">
                                                    {screeningLoading ? "..." : "-"}
                                                </Badge>
                                            ) : hasScreeningThaiId(user.thaiId) ? (
                                                <Badge className="font-normal bg-emerald-600 hover:bg-emerald-600">
                                                    มี
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="font-normal">
                                                    ไม่มี
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {getSourceBadge(user.source)}
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground font-sarabun">
                                            {user.timestamp?.toDate().toLocaleDateString("th-TH") || "-"}
                                        </TableCell>
                                        <TableCell>
                                            <Link
                                                href={buildQaHref(user)}
                                                onClick={(e) => e.stopPropagation()}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className={!user.thaiId ? "pointer-events-none opacity-50" : ""}
                                                title={!user.thaiId ? "ต้องมีเลขบัตรประชาชนก่อน" : "ไปทำ QA ต่อ (ถ้าไม่มี screening จะไปหน้า check-in ก่อน)"}
                                            >
                                                <Button
                                                    type="button"
                                                    variant="secondary"
                                                    size="sm"
                                                    className="gap-2 w-full cursor-pointer"
                                                    disabled={!user.thaiId || (!isScreeningChecked(user.thaiId) && !screeningError)}
                                                >
                                                    <ClipboardCheck className="h-4 w-4 cursor-pointer" />
                                                    QA
                                                </Button>
                                            </Link>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}