"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, FileText, X, AlertCircle, ArrowLeft, CheckCircle, HelpCircle, UserPlus } from "lucide-react";
import { UserRow, RecordRow } from "@/app/pages/pdf/types";
import type { QaCreatedIdentity } from "@/app/component/qa/QaCreateModal";

interface RecordsPanelProps {
  selectedUser: UserRow | null;
  records: RecordRow[];
  selectedRecordId: string;
  loading: boolean;
  onClose: () => void;
  onRecordSelect: (recordId: string) => void;
  onExport: () => void;
  isExporting: boolean;
  qaIdentity?: QaCreatedIdentity;
  onQaRegister?: () => void;
  variant?: "sidebar" | "dialog";
}

export function RecordsPanel({
  selectedUser,
  records,
  selectedRecordId,
  loading,
  onClose,
  onRecordSelect,
  onExport,
  isExporting,
  qaIdentity,
  onQaRegister,
  variant = "sidebar",
}: RecordsPanelProps) {
  const formatTime = (timestamp?: any) => {
    if (!timestamp) return "-";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString("th-TH", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getRiskConfig = (risk?: boolean | null) => {
    switch (risk) {
      case true:
        return {
          icon: AlertCircle,
          label: "เสี่ยง",
          variant: "destructive" as const,
          description: "มีความเสี่ยงที่ต้องตรวจสอบ",
        };
      case false:
        return {
          icon: CheckCircle,
          label: "ปกติ",
          variant: "default" as const,
          description: "ผลการตรวจสอบปกติ",
        };
      default:
        return {
          icon: HelpCircle,
          label: "ไม่มีผล",
          variant: "outline" as const,
          description: "ยังไม่ได้ประเมินความเสี่ยง",
        };
    }
  };

  if (!selectedUser) return null;

  const exportButtonLabel = qaIdentity?.id
    ? `เปิดรายงาน PDF (ID ${qaIdentity.id})`
    : "เปิดรายงาน PDF";

  const recordPicker = records.length > 0 && (
    <div className="space-y-2">
      <Label className="text-sm font-medium">เลือกรายการตรวจ</Label>
      <ScrollArea className={variant === "dialog" ? "h-[min(45dvh,360px)] pr-4" : "h-[280px] pr-4"}>
        <RadioGroup value={selectedRecordId} onValueChange={onRecordSelect} className="space-y-2">
          {records.map((record) => {
            const riskConfig = getRiskConfig(record.risk);
            const Icon = riskConfig.icon;
            const inputId = `${variant}-${record.recordId}`;

            return (
              <div key={record.recordId}>
                <RadioGroupItem value={record.recordId} id={inputId} className="sr-only" />
                <Label
                  htmlFor={inputId}
                  className={`flex min-h-[48px] cursor-pointer flex-col rounded-lg border p-4 transition-all hover:border-primary/50 active:bg-muted ${
                    selectedRecordId === record.recordId ? "border-primary bg-primary/5" : "border-muted"
                  }`}
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className={`h-3 w-3 shrink-0 rounded-full ${selectedRecordId === record.recordId ? "bg-primary" : "bg-muted"}`} />
                      <span className="sarabun max-w-[200px] truncate text-xs">{record.recordId}</span>
                    </div>
                    <Badge variant={riskConfig.variant} className="shrink-0">
                      <Icon className="h-3 w-3" />
                      {riskConfig.label}
                    </Badge>
                  </div>
                  <div className="flex items-end justify-between gap-2">
                    <span className="text-xs text-muted-foreground">{riskConfig.description}</span>
                    <span className="text-right text-xs text-muted-foreground">{formatTime(record.timestamp)}</span>
                  </div>
                </Label>
              </div>
            );
          })}
        </RadioGroup>
      </ScrollArea>
    </div>
  );

  const qaRegistration = !qaIdentity?.id && (records.length > 0 || variant === "dialog") && (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
      <div className="flex items-start gap-2">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="font-medium">ยังไม่ได้ลงทะเบียน QA</p>
          <p className="mt-0.5 text-xs text-amber-800">ลงทะเบียนก่อนพิมพ์เพื่อให้รายงานมี Patient ID และ QR</p>
        </div>
      </div>
      {onQaRegister && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onQaRegister}
          disabled={!selectedUser.thaiId}
          title={!selectedUser.thaiId ? "ต้องมีเลขบัตรประชาชนก่อน" : undefined}
          className={`mt-3 w-full border-amber-300 bg-white text-amber-900 hover:bg-amber-100 active:bg-amber-100 ${
            variant === "dialog" ? "min-h-[48px]" : ""
          }`}
        >
          <UserPlus className="mr-2 h-4 w-4" />
          ลงทะเบียน QA
        </Button>
      )}
    </div>
  );

  const exportActions = (records.length > 0 || variant === "dialog") && (
    <div className={variant === "dialog" ? "sticky bottom-0 -mx-4 space-y-2 border-t bg-background/95 px-4 py-4 backdrop-blur" : "space-y-2"}>
      <Button
        type="button"
        onClick={onExport}
        disabled={!selectedRecordId || isExporting}
        className={variant === "dialog" ? "min-h-[48px] w-full" : "w-full"}
        size="lg"
      >
        {isExporting ? (
          <><Loader2 className="mr-2 h-4 w-4 animate-spin" />กำลังเปิด PDF...</>
        ) : (
          <><FileText className="mr-2 h-4 w-4" />{exportButtonLabel}</>
        )}
      </Button>
      <div className="space-y-1 text-center text-xs text-muted-foreground">
        <p>• รายงานจะเปิดในแท็บใหม่ของเบราว์เซอร์</p>
        <p>• ระบบใช้ข้อมูลล่าสุดจากฐานข้อมูล</p>
      </div>
    </div>
  );

  const panelBody = (
    <>
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="mr-2 h-6 w-6 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">กำลังโหลดบันทึก...</p>
        </div>
      ) : (
        <>
          {records.length === 0 && (
            <div className="rounded-lg border py-8 text-center">
              <FileText className="mx-auto mb-4 h-12 w-12 text-gray-300" />
              <p className="text-sm text-muted-foreground">ไม่พบบันทึกการตรวจ</p>
            </div>
          )}
          {recordPicker}
          {qaRegistration}
          {exportActions}
        </>
      )}
    </>
  );

  if (variant === "dialog") {
    return (
      <div className="h-full overflow-y-auto bg-background">
        <div className="sticky top-0 z-10 border-b bg-background/95 px-4 py-3 backdrop-blur">
          <div className="flex items-start gap-3 pr-2">
            <Button type="button" variant="ghost" onClick={onClose} className="min-h-[48px] shrink-0 px-2 active:bg-muted">
              <ArrowLeft className="mr-1 h-5 w-5" />ปิด
            </Button>
            <div className="min-w-0 pt-1">
              <p className="truncate font-semibold">{selectedUser.firstName} {selectedUser.lastName}</p>
              <p className="truncate text-xs text-muted-foreground">thaiid: {selectedUser.thaiId || "ไม่ระบุ"}</p>
            </div>
          </div>
        </div>
        <div className="space-y-4 p-4 pb-0">{panelBody}</div>
      </div>
    );
  }

  return (
    <Card className="sticky top-6 h-fit">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />ผลการทดสอบจาก App Check PD
            </CardTitle>
            <CardDescription>
              {selectedUser.firstName} {selectedUser.lastName}
              <span className="mt-1 block text-xs">thaiid: {selectedUser.thaiId || "ไม่ระบุ"}</span>
            </CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">{panelBody}</CardContent>
    </Card>
  );
}
