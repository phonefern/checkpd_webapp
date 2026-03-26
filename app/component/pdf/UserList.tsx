"use client";

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
import { Loader2, Search, User, ClipboardCheck, X } from "lucide-react";
import { UserRow, provinceOptions, extractProvince } from "@/app/pages/pdf/types";

interface UserListProps {
    users: UserRow[];
    loading: boolean;
    searchQuery: string;
    selectedUserId: string;
    screeningThaiIds: string[];
    screeningCheckedThaiIds: string[];
    screeningLoading: boolean;
    screeningError: string | null;
    provinceFilter: string;
    dateFrom: string;
    dateTo: string;
    onSearchChange: (query: string) => void;
    onProvinceChange: (v: string) => void;
    onDateFromChange: (v: string) => void;
    onDateToChange: (v: string) => void;
    onUserSelect: (user: UserRow) => void;
    onQaClick: (user: UserRow) => void;
    currentUsers: UserRow[];
    paginationInfo: {
        currentPage: number;
        totalPages: number;
        startIndex: number;
        endIndex: number;
        totalItems: number;
    };
}

const toDateStr = (d: Date) => d.toISOString().split("T")[0];

export function UserList({
    users,
    loading,
    searchQuery,
    selectedUserId,
    screeningThaiIds,
    screeningCheckedThaiIds,
    screeningLoading,
    screeningError,
    provinceFilter,
    dateFrom,
    dateTo,
    onSearchChange,
    onProvinceChange,
    onDateFromChange,
    onDateToChange,
    onUserSelect,
    onQaClick,
    currentUsers,
    paginationInfo,
}: UserListProps) {
    const getSourceBadge = (source?: string) => {
        if (source === "temps") {
            return <Badge variant="secondary" className="font-normal">Staff</Badge>;
        }
        return <Badge variant="outline" className="font-normal">Users</Badge>;
    };

    const hasScreeningThaiId = (thaiid?: string) => !!thaiid && screeningThaiIds.includes(thaiid);
    const isScreeningChecked = (thaiid?: string) => !!thaiid && screeningCheckedThaiIds.includes(thaiid);

    const hasActiveFilter = !!(provinceFilter || dateFrom || dateTo);

    const setPreset = (preset: "today" | "week" | "month" | "year") => {
        const now = new Date();
        switch (preset) {
            case "today":
                onDateFromChange(toDateStr(now)); onDateToChange(toDateStr(now)); break;
            case "week": {
                const d = new Date(now); d.setDate(d.getDate() - 6);
                onDateFromChange(toDateStr(d)); onDateToChange(toDateStr(now)); break;
            }
            case "month": {
                onDateFromChange(toDateStr(new Date(now.getFullYear(), now.getMonth(), 1)));
                onDateToChange(toDateStr(now)); break;
            }
            case "year": {
                onDateFromChange(toDateStr(new Date(now.getFullYear(), 0, 1)));
                onDateToChange(toDateStr(now)); break;
            }
        }
    };

    const clearFilters = () => {
        onProvinceChange("");
        onDateFromChange("");
        onDateToChange("");
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
                        <CardDescription>Realtime updates from Firebase</CardDescription>
                    </div>
                    <Badge variant={hasActiveFilter || searchQuery ? "outline" : "secondary"} className="px-3 py-1">
                        {hasActiveFilter || searchQuery
                            ? `${paginationInfo.totalItems} / ${users.length} รายการ`
                            : `${users.length} รายการทั้งหมด`}
                    </Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                    {screeningLoading
                        ? "กำลังโหลดสถานะ screening..."
                        : screeningError
                            ? `โหลดสถานะ screening ไม่สำเร็จ: ${screeningError}`
                            : "สถานะ screening อ้างอิงจากตาราง pd_screenings (Supabase) โดยเทียบด้วย thaiid"}
                </div>
            </CardHeader>

            <CardContent className="space-y-3">
                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                        type="text"
                        placeholder="ค้นหาด้วยชื่อ, นามสกุล, หรือเลขบัตรประชาชน..."
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="pl-10"
                    />
                </div>

                {/* Filters */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {/* Province */}
                    <select
                        value={provinceFilter}
                        onChange={(e) => onProvinceChange(e.target.value === "null" ? "" : e.target.value)}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-background"
                    >
                        <option value="">ทุกจังหวัด</option>
                        {provinceOptions
                            .filter((o) => o.value !== "null")
                            .map((o) => (
                                <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                    </select>

                    {/* Date from */}
                    <input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => onDateFromChange(e.target.value)}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-background"
                        placeholder="จากวันที่"
                    />

                    {/* Date to */}
                    <input
                        type="date"
                        value={dateTo}
                        onChange={(e) => onDateToChange(e.target.value)}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-background"
                        placeholder="ถึงวันที่"
                    />
                </div>

                {/* Presets + clear */}
                <div className="flex flex-wrap gap-1 items-center">
                    <span className="text-xs text-muted-foreground mr-1">ช่วงเวลา:</span>
                    {(["today", "week", "month", "year"] as const).map((p) => (
                        <Button key={p} variant="outline" size="sm" className="h-7 px-2 text-xs"
                            onClick={() => setPreset(p)}>
                            {p === "today" ? "วันนี้" : p === "week" ? "7 วัน" : p === "month" ? "เดือนนี้" : "ปีนี้"}
                        </Button>
                    ))}
                    {hasActiveFilter && (
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-red-500 hover:text-red-600 ml-1"
                            onClick={clearFilters}>
                            <X className="h-3 w-3 mr-1" />ล้างตัวกรอง
                        </Button>
                    )}
                </div>

                {/* Table */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                        <p className="text-sm text-muted-foreground">กำลังโหลดข้อมูลผู้ใช้...</p>
                    </div>
                ) : currentUsers.length === 0 ? (
                    <div className="text-center py-12 border rounded-lg">
                        <Search className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                        <h3 className="font-semibold text-lg mb-2">
                            {searchQuery || hasActiveFilter ? "ไม่พบผลการค้นหา" : "ไม่มีข้อมูลผู้ใช้"}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                            {searchQuery || hasActiveFilter
                                ? "ลองเปลี่ยนเงื่อนไขการกรองหรือล้างตัวกรอง"
                                : "ระบบจะแสดงข้อมูลผู้ใช้ที่นี่"}
                        </p>
                    </div>
                ) : (
                    <div className="rounded-md border overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[160px]">User ID</TableHead>
                                    <TableHead>ชื่อ</TableHead>
                                    <TableHead>นามสกุล</TableHead>
                                    <TableHead>เพศ</TableHead>
                                    <TableHead>อายุ</TableHead>
                                    <TableHead>เลขบัตรประชาชน</TableHead>
                                    <TableHead>จังหวัด</TableHead>
                                    <TableHead>Screening</TableHead>
                                    <TableHead>Source</TableHead>
                                    <TableHead>วันที่สร้าง</TableHead>
                                    <TableHead className="w-[100px]">QA</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {currentUsers.map((user) => {
                                    const province = extractProvince(user.liveAddress);
                                    return (
                                        <TableRow
                                            key={user.userDocId}
                                            onClick={() => onUserSelect(user)}
                                            className={`cursor-pointer transition-colors hover:bg-muted/50 ${selectedUserId === user.userDocId ? "bg-primary/5 border-l-4 border-l-primary" : ""}`}
                                        >
                                            <TableCell className="text-xs font-sarabun">
                                                <div className="truncate max-w-[160px]" title={user.userDocId}>
                                                    {user.userDocId}
                                                </div>
                                            </TableCell>
                                            <TableCell className="font-medium font-sarabun">{user.firstName || "-"}</TableCell>
                                            <TableCell className="font-sarabun">{user.lastName || "-"}</TableCell>
                                            <TableCell className="font-sarabun">
                                                <Badge variant="outline" className="font-normal">
                                                    {user.gender === "male" ? "ชาย" : user.gender === "female" ? "หญิง" : "-"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="font-sarabun">
                                                {typeof user.age === "number" ? user.age : "-"}
                                            </TableCell>
                                            <TableCell className="font-mono text-xs">{user.thaiId || "-"}</TableCell>
                                            <TableCell className="font-sarabun">
                                                {province ? (
                                                    <Badge variant="outline" className="font-normal text-xs whitespace-nowrap">
                                                        {province}
                                                    </Badge>
                                                ) : user.liveAddress ? (
                                                    <span className="text-xs text-muted-foreground truncate max-w-[100px] block" title={user.liveAddress}>
                                                        {user.liveAddress}
                                                    </span>
                                                ) : "-"}
                                            </TableCell>
                                            <TableCell className="font-sarabun">
                                                {!user.thaiId ? (
                                                    <Badge variant="outline" className="font-normal">-</Badge>
                                                ) : !isScreeningChecked(user.thaiId) ? (
                                                    <Badge variant="outline" className="font-normal">
                                                        {screeningLoading ? "..." : "-"}
                                                    </Badge>
                                                ) : hasScreeningThaiId(user.thaiId) ? (
                                                    <Badge className="font-normal bg-emerald-600 hover:bg-emerald-600">มี</Badge>
                                                ) : (
                                                    <Badge variant="outline" className="font-normal">ไม่มี</Badge>
                                                )}
                                            </TableCell>
                                            <TableCell>{getSourceBadge(user.source)}</TableCell>
                                            <TableCell className="text-sm text-muted-foreground font-sarabun">
                                                {user.timestamp?.toDate().toLocaleDateString("th-TH") || "-"}
                                            </TableCell>
                                            <TableCell>
                                                <Button
                                                    type="button"
                                                    variant="secondary"
                                                    size="sm"
                                                    className="gap-1 w-full cursor-pointer"
                                                    disabled={!user.thaiId}
                                                    title={!user.thaiId ? "ต้องมีเลขบัตรประชาชนก่อน" : "เพิ่ม/แก้ไขข้อมูล QA"}
                                                    onClick={(e) => { e.stopPropagation(); onQaClick(user); }}
                                                >
                                                    <ClipboardCheck className="h-4 w-4" />QA
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
