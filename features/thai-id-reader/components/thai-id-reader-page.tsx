"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { BadgeCheck, CircleAlert, CreditCard, RotateCcw, Trash2 } from "lucide-react";

import SidebarLayout from "@/app/component/layout/SidebarLayout";
import { useSession } from "@/app/providers/SessionProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  formatThaiIdReadError,
  LocalBridgeAuthenticationError,
  LocalBridgeConfigurationError,
  LocalBridgeUnreachableError,
  pingThaiIdBridge,
  readThaiIdCard,
  ThaiIdCardPayload,
  ThaiIdReadUserError,
} from "@/features/thai-id-reader/services/thai-id-bridge-client";
import { tryLaunchSolidReader } from "@/features/thai-id-reader/services/solid-reader-recovery";
import { SolidReaderRecoveryDialog } from "@/features/thai-id-reader/components/solid-reader-recovery-dialog";
import { ReadThaiIdButton } from "@/features/thai-id-reader/components/read-thai-id-button";
import { ThaiIdScanState } from "@/features/thai-id-reader/components/thai-id-scan-state";
import { createSessionCardRead, upsertSessionCardReadByThaiId } from "@/features/thai-id-reader/models/session-card-read";
import type { SessionCardRead } from "@/features/thai-id-reader/models/session-card-read";

type BridgeStatus = "checking" | "connected" | "not_running" | "not_responding" | "not_configured";
type ReaderStatus = "unknown" | "checking" | "ready" | "no_reader";
type CardStatus = "unknown" | "checking" | "inserted" | "no_card" | "read_error";
type SaveStatus = "idle" | "saving" | "saved" | "error";

const statusText: Record<BridgeStatus, string> = {
  checking: "Checking…", connected: "Connected", not_running: "Not running", not_responding: "Not responding", not_configured: "Token not configured",
};

function formatDate(value: Date) { return value.toLocaleString("th-TH"); }
function genderLabel(gender: ThaiIdCardPayload["gender"]) { return gender === "M" ? "Male / ชาย" : "Female / หญิง"; }

export function ThaiIdReaderPage() {
  const router = useRouter();
  const { session } = useSession();
  const [bridgeStatus, setBridgeStatus] = useState<BridgeStatus>("checking");
  const [readerStatus, setReaderStatus] = useState<ReaderStatus>("unknown");
  const [cardStatus, setCardStatus] = useState<CardStatus>("unknown");
  const [isReading, setIsReading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reads, setReads] = useState<SessionCardRead[]>([]);
  const [expandedThaiId, setExpandedThaiId] = useState<string | null>(null);
  const [recoveryOpen, setRecoveryOpen] = useState(false);
  const retryReadAfterRecoveryRef = useRef(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const latestReadRef = useRef<ThaiIdCardPayload | null>(null);

  const checkBridge = useCallback(async () => {
    setBridgeStatus("checking");
    try {
      const response = await pingThaiIdBridge();
      setBridgeStatus(response.ok && (await response.text()).trim() === "pong" ? "connected" : "not_responding");
    } catch (checkError) {
      if (checkError instanceof LocalBridgeConfigurationError) setBridgeStatus("not_configured");
      else if (checkError instanceof LocalBridgeAuthenticationError) {
        setBridgeStatus("not_responding");
        setError(formatThaiIdReadError(checkError));
      } else setBridgeStatus("not_running");
    }
  }, []);

  useEffect(() => {
    if (recoveryOpen) return;
    void checkBridge();
    const intervalId = window.setInterval(() => void checkBridge(), 10_000);
    return () => window.clearInterval(intervalId);
  }, [checkBridge, recoveryOpen]);

  const beginRecovery = useCallback((retryRead: boolean) => {
    retryReadAfterRecoveryRef.current = retryRead;
    tryLaunchSolidReader();
    setRecoveryOpen(true);
  }, []);

  const saveCardRead = useCallback(async (data: ThaiIdCardPayload) => {
    const token = session?.access_token;
    if (!token) {
      setSaveStatus("error");
      setSaveError("Your session is not ready. Please reload the page and try again.");
      return;
    }

    setSaveStatus("saving");
    setSaveError(null);
    try {
      const response = await fetch("/api/thai-id-reader/reads", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      });
      const payload = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(payload?.error ?? "Unable to save this card read.");

      setSaveStatus("saved");
    } catch (saveFailure) {
      setSaveStatus("error");
      setSaveError(saveFailure instanceof Error ? saveFailure.message : "Unable to save this card read.");
    }
  }, [session?.access_token]);

  const handleRead = useCallback(async () => {
    setIsReading(true);
    setError(null);
    setReaderStatus("checking");
    setCardStatus("checking");
    try {
      const data = await readThaiIdCard();
      latestReadRef.current = data;
      setSaveStatus("idle");
      setSaveError(null);
      const read = createSessionCardRead(data);
      setReads((current) => upsertSessionCardReadByThaiId(current, read));
      setExpandedThaiId(read.thaiId);
      setBridgeStatus("connected");
      setReaderStatus("ready");
      setCardStatus("inserted");
      void saveCardRead(data);
    } catch (readError) {
      if (readError instanceof LocalBridgeConfigurationError) {
        setBridgeStatus("not_configured"); setReaderStatus("unknown"); setCardStatus("unknown");
      } else if (readError instanceof LocalBridgeUnreachableError) {
        setBridgeStatus("not_running"); setReaderStatus("unknown"); setCardStatus("unknown");
        beginRecovery(true);
      } else if (readError instanceof LocalBridgeAuthenticationError) {
        setBridgeStatus("not_responding"); setReaderStatus("unknown"); setCardStatus("unknown");
        beginRecovery(true);
      } else if (readError instanceof ThaiIdReadUserError) {
        setBridgeStatus("connected");
        setReaderStatus(readError.code === "NO_READER" ? "no_reader" : "ready");
        setCardStatus(readError.code === "NO_CARD" ? "no_card" : "read_error");
      } else setCardStatus("read_error");
      setError(formatThaiIdReadError(readError));
    } finally { setIsReading(false); }
  }, [beginRecovery, saveCardRead]);

  const handleRecoveryReady = useCallback(() => {
    setRecoveryOpen(false);
    setBridgeStatus("connected");
    setReaderStatus("unknown");
    setCardStatus("unknown");
    setError(null);
    const shouldRetryRead = retryReadAfterRecoveryRef.current;
    retryReadAfterRecoveryRef.current = false;
    if (shouldRetryRead) void handleRead();
  }, [handleRead]);

  const handleRecoveryCancel = useCallback(() => {
    retryReadAfterRecoveryRef.current = false;
    setRecoveryOpen(false);
  }, []);

  const latestRead = reads[0] ?? null;
  const canRead = bridgeStatus === "connected" && !isReading;
  const readerLabel = useMemo(() => readerStatus === "ready" ? "Ready" : readerStatus === "checking" ? "Checking…" : readerStatus === "no_reader" ? "No reader" : "Unknown", [readerStatus]);
  const cardLabel = useMemo(() => cardStatus === "inserted" ? "Card read" : cardStatus === "checking" ? "Reading…" : cardStatus === "no_card" ? "No card" : cardStatus === "read_error" ? "Read error" : "Unknown", [cardStatus]);

  return <SidebarLayout activePath="/pages/thai-id-reader" mainClassName="bg-gray-50">
    <div className="mx-auto w-full max-w-6xl space-y-6 p-4 md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4"><div className="flex items-start gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#4339C6]/10 text-[#4339C6]"><CreditCard className="h-6 w-6" /></div><div><h1 className="text-xl font-semibold md:text-2xl">Read Thai ID Card</h1><p className="text-sm text-muted-foreground">สำหรับเจ้าหน้าที่ — อ่านและบันทึกข้อมูลบัตรจากเครื่องนี้</p></div></div><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => router.push("/pages/thai-id-reader/kiosk")}>Open participant kiosk</Button><Button variant="outline" onClick={() => void checkBridge()} disabled={bridgeStatus === "checking"}><RotateCcw className="mr-2 h-4 w-4" />Check connection</Button></div></div>
      <div className="grid gap-3 sm:grid-cols-3">{[["Bridge", statusText[bridgeStatus]], ["Reader", readerLabel], ["Card", cardLabel]].map(([label, value]) => <Card key={label} className="rounded-2xl shadow-sm"><CardContent className="flex items-center justify-between p-4"><span className="text-sm text-muted-foreground">{label}</span><span className="font-medium">{value}</span></CardContent></Card>)}</div>
      <Card className="rounded-2xl shadow-sm"><CardHeader><CardTitle>Thai ID Card Reader</CardTitle><CardDescription>Insert a card, then read it from this clinic computer.</CardDescription></CardHeader><CardContent className="space-y-4">{error ? <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"><div className="flex items-start gap-2"><CircleAlert className="mt-0.5 h-4 w-4 shrink-0" /><span>{error}</span></div><p className="mt-2 text-destructive/80">Check that SolId Reader is running, the reader is connected, and a card is inserted.</p></div> : null}<div className="flex flex-wrap gap-3"><ReadThaiIdButton onClick={() => void handleRead()} disabled={!canRead} isReading={isReading} />{bridgeStatus !== "connected" && bridgeStatus !== "checking" && bridgeStatus !== "not_configured" ? <Button size="lg" variant="outline" className="min-h-14 w-full sm:w-auto" onClick={() => beginRecovery(false)}>Open or install SolId Reader</Button> : null}</div>{!canRead && !isReading ? <p className="text-sm text-muted-foreground">{bridgeStatus === "not_configured" ? "Ask an administrator to configure the SolId Reader bridge token for this web app." : "Connect SolId Reader before reading a card."}</p> : null}</CardContent></Card>
      {latestRead ? <motion.div key={`${latestRead.thaiId}-${latestRead.readAt.getTime()}`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}><Card className="rounded-2xl border-emerald-200 shadow-sm"><CardHeader className="flex-row items-center gap-2 space-y-0"><BadgeCheck className="h-5 w-5 text-emerald-600" /><CardTitle className="text-base">Latest card read</CardTitle></CardHeader><CardContent className="flex flex-wrap items-start gap-5">{latestRead.data.photoAsBase64Uri ? <img src={latestRead.data.photoAsBase64Uri} alt="Thai ID card holder" className="h-28 w-24 rounded-lg border object-cover" /> : null}<div className="space-y-1 text-sm"><p className="font-semibold">{latestRead.data.fullNameTH || latestRead.data.fullNameEN}</p><p>{latestRead.data.citizenID}</p><p className="text-muted-foreground">{latestRead.data.dateOfBirth} · {genderLabel(latestRead.data.gender)}</p></div></CardContent></Card></motion.div> : null}
      {latestRead ? <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-white p-3 text-sm shadow-sm"><span className="font-medium">{saveStatus === "saving" ? "Saving card record…" : saveStatus === "saved" ? "Card record saved" : saveStatus === "error" ? "Card read, but it was not saved" : "Card read"}</span>{saveError ? <span className="text-destructive">{saveError}</span> : null}{saveStatus === "error" ? <Button size="sm" variant="outline" onClick={() => { if (latestReadRef.current) void saveCardRead(latestReadRef.current); }}>Retry save</Button> : null}</div> : null}

      <Card className="rounded-2xl shadow-sm"><CardHeader className="flex-row flex-wrap items-center justify-between gap-3 space-y-0"><div><CardTitle>Temporary Card Read Results</CardTitle><CardDescription>Visible only while this page remains open. This local list clears, while successful scans are saved securely.</CardDescription></div><Button variant="outline" onClick={() => { setReads([]); setExpandedThaiId(null); }} disabled={reads.length === 0}><Trash2 className="mr-2 h-4 w-4" />Clear results</Button></CardHeader><CardContent>{reads.length === 0 ? <div className="rounded-xl border border-dashed"><ThaiIdScanState isReading={isReading} /></div> : <div className="overflow-x-auto rounded-xl border"><Table><TableHeader><TableRow><TableHead>Photo</TableHead><TableHead>Thai ID</TableHead><TableHead>Name</TableHead><TableHead>Birth date</TableHead><TableHead>Gender</TableHead><TableHead>Read at</TableHead><TableHead>Details</TableHead></TableRow></TableHeader><TableBody>{reads.map((read) => <Fragment key={read.thaiId}><TableRow><TableCell>{read.data.photoAsBase64Uri ? <img src={read.data.photoAsBase64Uri} alt="Thai ID card holder" className="h-10 w-8 rounded object-cover" /> : "-"}</TableCell><TableCell className="font-mono text-xs">{read.data.citizenID}</TableCell><TableCell>{read.data.fullNameTH || read.data.fullNameEN || "-"}</TableCell><TableCell>{read.data.dateOfBirth || "-"}</TableCell><TableCell>{genderLabel(read.data.gender)}</TableCell><TableCell className="whitespace-nowrap text-xs">{formatDate(read.readAt)}</TableCell><TableCell><Button size="sm" variant="outline" onClick={() => setExpandedThaiId((current) => current === read.thaiId ? null : read.thaiId)}>{expandedThaiId === read.thaiId ? "Hide" : "View"}</Button></TableCell></TableRow>{expandedThaiId === read.thaiId ? <TableRow><TableCell colSpan={7} className="bg-muted/30"><div className="grid gap-4 p-2 text-sm md:grid-cols-2"><p><span className="text-muted-foreground">Thai name:</span> {read.data.fullNameTH || "-"}</p><p><span className="text-muted-foreground">English name:</span> {read.data.fullNameEN || "-"}</p><p><span className="text-muted-foreground">Card issuer:</span> {read.data.cardIssuer || "-"}</p><p><span className="text-muted-foreground">Issue / expiry:</span> {read.data.issueDate || "-"} / {read.data.expireDate || "-"}</p><p className="md:col-span-2"><span className="text-muted-foreground">Address:</span> {read.data.address || "-"}</p></div></TableCell></TableRow> : null}</Fragment>)}</TableBody></Table></div>}</CardContent></Card>
    </div>
    <SolidReaderRecoveryDialog open={recoveryOpen} onReady={handleRecoveryReady} onCancel={handleRecoveryCancel} />
  </SidebarLayout>;
}
