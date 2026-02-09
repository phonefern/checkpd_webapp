"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, FileText, X, AlertCircle, CheckCircle, HelpCircle } from "lucide-react";
import { UserRow, RecordRow } from "@/app/pages/pdf/types";

interface RecordsPanelProps {
  selectedUser: UserRow | null;
  records: RecordRow[];
  selectedRecordId: string;
  loading: boolean;
  onClose: () => void;
  onRecordSelect: (recordId: string) => void;
  onExport: () => void;
  isExporting: boolean;
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

  return (
    <Card className="sticky top-6 h-fit">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              ผลการทดสอบจาก App Check PD
            </CardTitle>
            <CardDescription>
              {selectedUser.firstName} {selectedUser.lastName}
              <span className="block text-xs mt-1">
                thaiid: {selectedUser.thaiId || "ไม่ระบุ"}
              </span>
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
            <p className="text-sm text-muted-foreground">กำลังโหลดบันทึก...</p>
          </div>
        ) : records.length === 0 ? (
          <div className="text-center py-8 border rounded-lg">
            <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">ไม่พบบันทึกการตรวจ</p>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <Label className="text-sm font-medium">เลือกรายการตรวจ</Label>
              <ScrollArea className="h-[280px] pr-4">
                <RadioGroup
                  value={selectedRecordId}
                  onValueChange={onRecordSelect}
                  className="space-y-2"
                >
                  {records.map((record) => {
                    const riskConfig = getRiskConfig(record.risk);
                    const Icon = riskConfig.icon;
                    
                    return (
                      <div key={record.recordId}>
                        <RadioGroupItem
                          value={record.recordId}
                          id={record.recordId}
                          className="sr-only"
                        />
                        <Label
                          htmlFor={record.recordId}
                          className={`flex flex-col p-4 border rounded-lg cursor-pointer transition-all hover:border-primary/50 ${
                            selectedRecordId === record.recordId
                              ? "border-primary bg-primary/5"
                              : "border-muted"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                              <div className={`h-3 w-3 rounded-full ${
                                selectedRecordId === record.recordId
                                  ? "bg-primary"
                                  : "bg-muted"
                              }`} />
                              <span className="sarabun text-xs truncate max-w-[200px]">
                                {record.recordId}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="w-3 h-3" />
                              <Badge variant={riskConfig.variant}>
                                <Icon className="h-3 w-3" />
                                {riskConfig.label}
                              </Badge>
                            </div>
                          </div>
                          
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-muted-foreground">
                              {riskConfig.description}
                            </span>
                            <span className="ml-2 text-xs text-muted-foreground">
                              {formatTime(record.timestamp)}
                            </span>
                          </div>
                        </Label>
                      </div>
                    );
                  })}
                </RadioGroup>
              </ScrollArea>
            </div>

            <Button
              onClick={onExport}
              disabled={!selectedRecordId || isExporting}
              className="w-full"
              size="lg"
            >
              {isExporting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  กำลังเปิด PDF...
                </>
              ) : (
                <>
                  <FileText className="mr-2 h-4 w-4" />
                  เปิดรายงาน PDF
                </>
              )}
            </Button>
            
            <div className="text-xs text-muted-foreground text-center space-y-1">
              <p>• รายงานจะเปิดในแท็บใหม่ของเบราว์เซอร์</p>
              <p>• ระบบใช้ข้อมูลล่าสุดจากฐานข้อมูล</p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}