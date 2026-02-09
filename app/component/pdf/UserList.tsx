"use client";

import { useState } from "react";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Search, User } from "lucide-react";
import { UserRow } from "@/app/pages/pdf/types";

interface UserListProps {
  users: UserRow[];
  loading: boolean;
  searchQuery: string;
  selectedUserId: string;
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
  onSearchChange,
  onUserSelect,
  currentUsers,
  paginationInfo,
}: UserListProps) {
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
                  <TableHead>เลขบัตรประชาชน</TableHead>
                  <TableHead>วันที่สร้าง</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentUsers.map((user) => (
                  <TableRow
                    key={user.userDocId}
                    onClick={() => onUserSelect(user)}
                    className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                      selectedUserId === user.userDocId ? "bg-primary/5 border-l-4 border-l-primary" : ""
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
                    <TableCell className="font-mono font-sarabun">
                      {user.thaiId || "-"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground font-sarabun">
                      {user.timestamp?.toDate().toLocaleDateString("th-TH") || "-"}
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