"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileUp, Download, FileText, Package, AlertCircle } from "lucide-react";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";


interface ExportSectionProps {
  userDocId: string;
  recordId: string;
  csvFile: File | null;
  loadingSingle: boolean;
  loadingBatch: boolean;
  onUserDocIdChange: (id: string) => void;
  onRecordIdChange: (id: string) => void;
  onCsvFileChange: (file: File | null) => void;
  onSingleExport: () => void;
  onBatchExport: () => void;
}

export function ExportSection({
  userDocId,
  recordId,
  csvFile,
  loadingSingle,
  loadingBatch,
  onUserDocIdChange,
  onRecordIdChange,
  onCsvFileChange,
  onSingleExport,
  onBatchExport,
}: ExportSectionProps) {
  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2 text-2xl">
          <FileText className="h-6 w-6" />
          ส่งออกรายงาน PDF
        </CardTitle>
        <CardDescription>
          เลือกวิธีการส่งออกรายงานที่ต้องการ
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <Tabs defaultValue="single" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="single" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              รายงานเดี่ยว
            </TabsTrigger>
            <TabsTrigger value="batch" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              รายงานหลายไฟล์
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="single" className="space-y-6 pt-6">
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="userDocId">User Document ID</Label>
                <Input
                  id="userDocId"
                  placeholder="ป้อนรหัสเอกสารผู้ใช้"
                  value={userDocId}
                  onChange={(e) => onUserDocIdChange(e.target.value)}
                  disabled={loadingSingle}
                />
                <p className="text-xs text-muted-foreground">
                  รหัสเอกสารผู้ใช้จาก Firebase
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="recordId">Record ID</Label>
                <Input
                  id="recordId"
                  placeholder="ป้อนรหัสบันทึกการตรวจ"
                  value={recordId}
                  onChange={(e) => onRecordIdChange(e.target.value)}
                  disabled={loadingSingle}
                />
                <p className="text-xs text-muted-foreground">
                  รหัสบันทึกการตรวจที่จะสร้างรายงาน
                </p>
              </div>
            </div>
            
            <Button
              onClick={onSingleExport}
              disabled={!userDocId || !recordId || loadingSingle}
              className="w-full"
              size="lg"
            >
              {loadingSingle ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  กำลังสร้างรายงาน...
                </>
              ) : (
                <>
                  <FileUp className="mr-2 h-4 w-4" />
                  สร้างรายงาน PDF
                </>
              )}
            </Button>
            
            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
              <h4 className="font-medium text-sm flex items-center gap-2">
                <FileText className="h-4 w-4" />
                คู่มือการใช้งาน
              </h4>
              <ul className="text-xs text-muted-foreground space-y-1 pl-2">
                <li>• ใช้ User Document ID จากตารางรายชื่อผู้ใช้</li>
                <li>• ใช้ Record ID จากแผงบันทึกการตรวจ</li>
                <li>• รายงานจะเปิดในแท็บใหม่ของเบราว์เซอร์</li>
              </ul>
            </div>
          </TabsContent>
          
          <TabsContent value="batch" className="space-y-6 pt-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="csvFile">ไฟล์ CSV</Label>
                <div className="flex items-center gap-4">
                  <Input
                    id="csvFile"
                    type="file"
                    accept=".csv"
                    onChange={(e) => onCsvFileChange(e.target.files?.[0] || null)}
                    disabled={loadingBatch}
                    className="flex-1"
                  />
                  {csvFile && (
                    <Badge variant="secondary" className="px-3 py-1">
                      {csvFile.name}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  อัพโหลดไฟล์ CSV ที่มีรายการ UserDocID,RecordID
                </p>
              </div>
              
              <div className="bg-muted/50 p-4 rounded-lg">
                <h4 className="font-medium text-sm mb-2">รูปแบบไฟล์ CSV</h4>
                <div className="font-mono text-xs bg-background p-3 rounded">
                  userDocId1,recordId1<br />
                  userDocId2,recordId2<br />
                  userDocId3,recordId3
                </div>
              </div>
            </div>
            
            <Button
              onClick={onBatchExport}
              disabled={!csvFile || loadingBatch}
              className="w-full"
              size="lg"
              variant="secondary"
            >
              {loadingBatch ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  กำลังสร้าง ZIP...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  สร้างไฟล์ ZIP
                </>
              )}
            </Button>
            
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
              <h4 className="font-medium text-sm text-amber-800 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                ข้อควรระวัง
              </h4>
              <ul className="text-xs text-amber-700 space-y-1 mt-2 pl-2">
                <li>• จำกัดจำนวนแถว: 5-10 records ต่อครั้ง</li>
                <li>• ระบบอาจใช้เวลาสร้างไฟล์หลายนาที</li>
                <li>• แนะนำให้ทดสอบกับไฟล์ขนาดเล็กก่อน</li>
              </ul>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}