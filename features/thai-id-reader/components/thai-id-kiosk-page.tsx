"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, CreditCard, Loader2, ScanLine } from "lucide-react";

import { useSession } from "@/app/providers/SessionProvider";
import AuthRedirect from "@/components/AuthRedirect";
import { Button } from "@/components/ui/button";
import { SolidReaderRecoveryDialog } from "@/features/thai-id-reader/components/solid-reader-recovery-dialog";
import { toKioskIdentity, type KioskIdentity } from "@/features/thai-id-reader/models/kiosk-identity";
import {
  LocalBridgeAuthenticationError,
  LocalBridgeConfigurationError,
  LocalBridgeUnreachableError,
  readThaiIdCard,
  ThaiIdReadUserError,
} from "@/features/thai-id-reader/services/thai-id-bridge-client";
import { tryLaunchSolidReader } from "@/features/thai-id-reader/services/solid-reader-recovery";
import type { ThaiIdCardPayload } from "@/features/thai-id-reader/types";

type KioskState =
  | { kind: "ready" }
  | { kind: "reading" }
  | { kind: "saving"; card: ThaiIdCardPayload }
  | { kind: "completed"; identity: KioskIdentity }
  | { kind: "read-error"; message: string }
  | { kind: "save-error"; card: ThaiIdCardPayload };

function stateCopy(state: KioskState) {
  switch (state.kind) {
    case "reading":
      return { title: "กำลังอ่านบัตร กรุณารอสักครู่", detail: "กรุณาอย่านำบัตรออกระหว่างอ่านข้อมูล" };
    case "saving":
      return { title: "กำลังยืนยันข้อมูล…", detail: "กรุณารอสักครู่" };
    case "completed":
      return { title: "เรียบร้อยแล้ว กรุณานำบัตรออก", detail: "คุณสามารถไปยังขั้นตอนถัดไปได้" };
    case "read-error":
      return { title: state.message, detail: "" };
    case "save-error":
      return { title: "ยังยืนยันข้อมูลไม่สำเร็จ", detail: "กรุณาลองอีกครั้ง โดยไม่ต้องอ่านบัตรใหม่" };
    default:
      return { title: "สแกนบัตรประชาชน", detail: "เสียบบัตรประชาชน แล้วกดปุ่มด้านล่าง" };
  }
}

export function ThaiIdKioskPage() {
  const { session, loading } = useSession();
  const reduceMotion = useReducedMotion();
  const [state, setState] = useState<KioskState>({ kind: "ready" });
  const [recoveryOpen, setRecoveryOpen] = useState(false);
  const resetTimerRef = useRef<number | null>(null);
  const retryReadAfterRecoveryRef = useRef(false);

  const clearResetTimer = useCallback(() => {
    if (resetTimerRef.current !== null) {
      window.clearTimeout(resetTimerRef.current);
      resetTimerRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    clearResetTimer();
    retryReadAfterRecoveryRef.current = false;
    setRecoveryOpen(false);
    setState({ kind: "ready" });
  }, [clearResetTimer]);

  const saveCardRead = useCallback(async (card: ThaiIdCardPayload) => {
    const token = session?.access_token;
    if (!token) throw new Error("No active session");

    const response = await fetch("/api/thai-id-reader/reads", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(card),
    });
    if (!response.ok) throw new Error("Card read could not be saved");
  }, [session?.access_token]);

  const saveRead = useCallback(async (card: ThaiIdCardPayload) => {
    setState({ kind: "saving", card });
    try {
      await saveCardRead(card);
      setState({ kind: "completed", identity: toKioskIdentity(card) });
    } catch {
      setState({ kind: "save-error", card });
    }
  }, [saveCardRead]);

  const beginRecovery = useCallback(() => {
    retryReadAfterRecoveryRef.current = true;
    tryLaunchSolidReader();
    setRecoveryOpen(true);
  }, []);

  const startRead = useCallback(async () => {
    if (state.kind === "reading" || state.kind === "saving") return;

    setState({ kind: "reading" });
    try {
      const card = await readThaiIdCard();
      await saveRead(card);
    } catch (error) {
      if (
        error instanceof LocalBridgeUnreachableError ||
        error instanceof LocalBridgeAuthenticationError ||
        error instanceof LocalBridgeConfigurationError
      ) {
        setState({ kind: "ready" });
        beginRecovery();
        return;
      }

      if (error instanceof ThaiIdReadUserError && error.code === "NO_CARD") {
        setState({ kind: "read-error", message: "ยังไม่พบบัตร กรุณาเสียบบัตรให้สุด" });
        return;
      }

      if (error instanceof ThaiIdReadUserError && error.code === "NO_READER") {
        setState({ kind: "read-error", message: "ไม่พบเครื่องอ่านบัตร กรุณาแจ้งเจ้าหน้าที่" });
        return;
      }

      setState({ kind: "read-error", message: "อ่านบัตรไม่สำเร็จ กรุณาลองอีกครั้ง" });
    }
  }, [beginRecovery, saveRead, state.kind]);

  const retry = useCallback(() => {
    if (state.kind === "save-error") {
      void saveRead(state.card);
      return;
    }
    void startRead();
  }, [saveRead, startRead, state]);

  const handleRecoveryReady = useCallback(() => {
    setRecoveryOpen(false);
    if (!retryReadAfterRecoveryRef.current) return;
    retryReadAfterRecoveryRef.current = false;
    void startRead();
  }, [startRead]);

  const handleRecoveryCancel = useCallback(() => {
    retryReadAfterRecoveryRef.current = false;
    setRecoveryOpen(false);
    setState({ kind: "ready" });
  }, []);

  useEffect(() => {
    if (state.kind !== "completed") return;
    resetTimerRef.current = window.setTimeout(reset, 5_000);
    return clearResetTimer;
  }, [clearResetTimer, reset, state.kind]);

  useEffect(() => clearResetTimer, [clearResetTimer]);

  if (loading) return <main className="min-h-screen bg-[#fffcfa]" aria-busy="true" />;
  if (!session) return <AuthRedirect />;

  const copy = stateCopy(state);
  const isBusy = state.kind === "reading" || state.kind === "saving";
  const isComplete = state.kind === "completed";
  const isError = state.kind === "read-error" || state.kind === "save-error";
  const showBeam = state.kind === "reading" || state.kind === "saving";

  return (
    <main className="relative flex min-h-screen overflow-hidden bg-[#fffcfa] px-5 py-8 text-slate-900 sm:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_38%,rgba(218,215,255,0.48),transparent_30%),radial-gradient(circle_at_12%_84%,rgba(241,228,255,0.52),transparent_28%)]" />
      <div className="relative mx-auto flex w-full max-w-3xl flex-col items-center text-center">
        <img src="/brand/checkpd-mark.png" alt="CheckPD" className="h-14 w-14 object-contain" />

        <section className="flex flex-1 flex-col items-center justify-center py-12 sm:py-16" aria-labelledby="kiosk-heading">
          <AnimatePresence mode="wait">
            <motion.div
              key={state.kind}
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
              transition={{ duration: 0.24 }}
            >
              <h1 id="kiosk-heading" className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-5xl">{copy.title}</h1>
              {copy.detail ? <p className="mt-3 text-base text-slate-500 sm:text-lg">{copy.detail}</p> : null}
            </motion.div>
          </AnimatePresence>

          <div className="relative mt-10 flex h-56 w-72 items-center justify-center sm:mt-12 sm:h-64 sm:w-80" aria-hidden="true">
            {!reduceMotion && !isComplete ? (
              <motion.div
                className="absolute size-44 rounded-full border border-[#766ce2]/20"
                animate={showBeam ? { scale: [0.7, 1.32], opacity: [0.28, 0] } : { opacity: [0.12, 0.22, 0.12] }}
                transition={showBeam ? { duration: 1.7, repeat: Infinity, ease: "easeOut" } : { duration: 3, repeat: Infinity, ease: "easeInOut" }}
              />
            ) : null}
            <motion.div
              className="absolute bottom-3 flex h-20 w-64 items-center justify-center rounded-[1.7rem] border border-[#5146cc]/20 bg-white shadow-[0_18px_42px_rgba(67,57,198,0.13)]"
              animate={isComplete ? { boxShadow: "0 18px 42px rgba(16, 185, 129, 0.16)" } : showBeam ? { boxShadow: "0 22px 48px rgba(67, 57, 198, 0.26)" } : { boxShadow: "0 18px 42px rgba(67, 57, 198, 0.13)" }}
              transition={{ duration: 0.45 }}
            >
              <div className="h-3 w-36 rounded-full bg-[#30278f] shadow-[inset_0_1px_4px_rgba(0,0,0,0.32)]" />
            </motion.div>
            <motion.div
              className="absolute z-10 flex h-36 w-56 items-center justify-center overflow-hidden rounded-2xl border border-white bg-gradient-to-br from-[#faf9ff] via-[#ebe9ff] to-[#d9d5ff] shadow-[0_18px_38px_rgba(67,57,198,0.22)]"
              animate={reduceMotion ? { opacity: 1 } : isComplete ? { y: 16, rotateX: 0, rotateZ: 0 } : showBeam ? { y: 28, rotateX: 3, rotateZ: 0 } : { y: [0, -5, 0], rotateX: [0, 2, 0], rotateZ: [-1.5, 1.5, -1.5] }}
              transition={showBeam || isComplete ? { duration: 0.42, ease: "easeOut" } : { duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
            >
              <CreditCard className="size-16 text-[#4339c6]" strokeWidth={1.35} />
              {showBeam ? <motion.div className="absolute inset-x-0 h-5 bg-gradient-to-r from-transparent via-white/90 to-transparent" animate={reduceMotion ? { opacity: 0.55 } : { y: [-76, 76] }} transition={reduceMotion ? { duration: 0.2 } : { duration: state.kind === "saving" ? 2.05 : 1.6, repeat: Infinity, ease: "linear" }} /> : null}
            </motion.div>
            <AnimatePresence>
              {isComplete ? <motion.div className="absolute z-20 flex size-24 items-center justify-center rounded-full bg-emerald-500 text-white shadow-[0_16px_36px_rgba(16,185,129,0.32)]" initial={{ opacity: 0, scale: 0.65 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.45, ease: "easeOut" }}><Check className="size-12" strokeWidth={2.5} /></motion.div> : null}
            </AnimatePresence>
          </div>

          {isComplete ? (
            <motion.div className="mt-7 space-y-1 text-lg" initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12, duration: 0.25 }}>
              <p className="font-semibold text-slate-900">{state.identity.firstName} {state.identity.maskedSurname}</p>
              <p className="font-mono text-sm tracking-[0.14em] text-slate-500">{state.identity.maskedCitizenId}</p>
            </motion.div>
          ) : null}

          <div className="mt-10 min-h-14">
            {isComplete ? <Button type="button" size="lg" variant="outline" className="h-14 min-w-60 rounded-2xl border-[#4339c6]/20 px-7 text-base text-[#4339c6] hover:bg-[#4339c6]/5" onClick={reset}>สำหรับคนถัดไป</Button> : isError ? <Button type="button" size="lg" className="h-14 min-w-60 rounded-2xl bg-[#4339c6] px-7 text-base shadow-[0_12px_28px_rgba(67,57,198,0.22)] hover:bg-[#3730a3]" onClick={retry}>ลองอีกครั้ง</Button> : <motion.button type="button" className="relative flex h-16 min-w-72 items-center justify-center gap-3 overflow-hidden rounded-2xl bg-[#4339c6] px-8 text-lg font-semibold text-white shadow-[0_14px_30px_rgba(67,57,198,0.28)] outline-none transition hover:bg-[#3730a3] focus-visible:ring-4 focus-visible:ring-[#4339c6]/30 disabled:cursor-not-allowed disabled:opacity-75" onClick={() => void startRead()} disabled={isBusy} whileTap={reduceMotion ? undefined : { scale: 0.98 }}>
              {!reduceMotion && !isBusy ? <motion.span className="absolute inset-y-0 w-16 -skew-x-12 bg-white/20" animate={{ x: [-380, 420] }} transition={{ duration: 0.85, delay: 4.4, repeat: Infinity, repeatDelay: 4.4, ease: "easeInOut" }} /> : null}
              {isBusy ? <Loader2 className="size-5 animate-spin" aria-hidden="true" /> : <ScanLine className="size-5" aria-hidden="true" />}
              <span>{isBusy ? (state.kind === "saving" ? "กำลังยืนยันข้อมูล…" : "กำลังอ่านบัตร…") : "เริ่มสแกนบัตรประชาชน"}</span>
            </motion.button>}
          </div>
        </section>

        <p className="pb-1 text-sm text-slate-400" aria-live="polite">{isComplete ? "พร้อมสำหรับผู้เข้าร่วมคนถัดไป" : "ข้อมูลใช้สำหรับการตรวจสุขภาพในงานนี้"}</p>
      </div>
      <SolidReaderRecoveryDialog open={recoveryOpen} onReady={handleRecoveryReady} onCancel={handleRecoveryCancel} variant="kiosk" />
    </main>
  );
}
