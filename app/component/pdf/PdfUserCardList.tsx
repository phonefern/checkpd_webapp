"use client";

import type { QaCreatedIdentity } from "@/app/component/qa/QaCreateModal";
import { extractProvince, type UserRow } from "@/app/pages/pdf/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  IdCard,
  MapPin,
  UserRound,
} from "lucide-react";

interface PdfUserCardListProps {
  users: UserRow[];
  selectedUserId: string;
  qaIdentityByUser: Record<string, QaCreatedIdentity>;
  onUserSelect: (user: UserRow) => void;
  onQaClick: (user: UserRow) => void;
}

const genderLabel = (gender?: string) => {
  if (gender === "male") return "ชาย";
  if (gender === "female") return "หญิง";
  return "ไม่ระบุเพศ";
};

export function PdfUserCardList({
  users,
  selectedUserId,
  qaIdentityByUser,
  onUserSelect,
  onQaClick,
}: PdfUserCardListProps) {
  return (
    <div className="space-y-3">
      {users.map((user) => {
        const qaIdentity = qaIdentityByUser[user.userDocId];
        const province = extractProvince(user.liveAddress);
        const displayName = [user.firstName, user.lastName].filter(Boolean).join(" ") || "ไม่ระบุชื่อ";
        const isSelected = selectedUserId === user.userDocId;

        return (
          <article
            key={user.userDocId}
            className={`overflow-hidden rounded-xl border bg-background shadow-sm transition-colors ${
              isSelected ? "border-primary ring-1 ring-primary/20" : "border-border"
            }`}
          >
            <button
              type="button"
              onClick={() => onUserSelect(user)}
              className="w-full min-h-[48px] px-4 py-3 text-left transition-colors active:bg-muted"
              aria-label={`เลือก ${displayName} เพื่อดูรายการตรวจ`}
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="min-w-0 truncate font-semibold text-foreground">{displayName}</h3>
                <Badge variant={user.source === "temps" ? "secondary" : "outline"} className="shrink-0 font-normal">
                  {user.source === "temps" ? "Staff" : "Users"}
                </Badge>
              </div>

              <div className="mt-2 space-y-1.5 text-sm text-muted-foreground">
                <p className="flex items-center gap-2">
                  <UserRound className="h-4 w-4 shrink-0" />
                  <span>
                    {genderLabel(user.gender)}
                    {typeof user.age === "number" ? ` · ${user.age} ปี` : ""}
                    {province ? ` · ${province}` : ""}
                  </span>
                </p>
                <p className="flex items-center gap-2">
                  <IdCard className="h-4 w-4 shrink-0" />
                  <span className="font-mono text-xs">{user.thaiId || "ไม่ระบุเลขบัตรประชาชน"}</span>
                </p>
                {!province && user.liveAddress && (
                  <p className="flex items-start gap-2">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                    <span className="line-clamp-1">{user.liveAddress}</span>
                  </p>
                )}
                <p className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 shrink-0" />
                  <span>{user.timestamp?.toDate().toLocaleDateString("th-TH") || "ไม่ระบุวันที่"}</span>
                </p>
              </div>
            </button>

            <div className="grid grid-cols-2 border-t bg-muted/20">
              <Button
                type="button"
                variant="ghost"
                disabled={!user.thaiId}
                title={!user.thaiId ? "ต้องมีเลขบัตรประชาชนก่อน" : "เพิ่ม/แก้ไขข้อมูล QA"}
                onClick={() => onQaClick(user)}
                className={`min-h-[48px] rounded-none border-r active:bg-muted ${
                  qaIdentity?.id ? "text-emerald-700" : "text-amber-700"
                }`}
              >
                {qaIdentity?.id ? (
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                ) : (
                  <ClipboardCheck className="mr-2 h-4 w-4" />
                )}
                {qaIdentity?.id ? `QA #${qaIdentity.id}` : "ลงทะเบียน QA"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => onUserSelect(user)}
                className="min-h-[48px] rounded-none active:bg-muted"
              >
                <FileText className="mr-2 h-4 w-4" />
                ดู / พิมพ์
              </Button>
            </div>
          </article>
        );
      })}
    </div>
  );
}
