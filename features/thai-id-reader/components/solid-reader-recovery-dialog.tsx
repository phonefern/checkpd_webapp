"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CircleAlert, Download, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import type { SolidReaderDownloadOption } from "../types";
import {
  detectSolidReaderPlatform,
  downloadSolidReader,
  getSolidReaderDownloadOptions,
} from "../services/solid-reader-download";
import {
  LocalBridgeAuthenticationError,
  LocalBridgeConfigurationError,
  LocalBridgeUnreachableError,
} from "../services/thai-id-bridge-client";
import {
  SOLID_READER_INSTALL_WAIT_MS,
  SOLID_READER_OPEN_WAIT_MS,
  tryLaunchSolidReader,
  waitForSolidReader,
} from "../services/solid-reader-recovery";

type RecoveryPhase = "opening" | "install" | "unknown" | "incompatible" | "give_up";

type SolidReaderRecoveryDialogProps = {
  open: boolean;
  onReady: () => void;
  onCancel: () => void;
};

export function SolidReaderRecoveryDialog({ open, onReady, onCancel }: SolidReaderRecoveryDialogProps) {
  const [phase, setPhase] = useState<RecoveryPhase>("opening");
  const [downloads, setDownloads] = useState<SolidReaderDownloadOption[]>([]);
  const [selectedFile, setSelectedFile] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const settledRef = useRef(false);

  const finishReady = useCallback(() => {
    if (settledRef.current) return;
    settledRef.current = true;
    abortRef.current?.abort();
    onReady();
  }, [onReady]);

  const finishCancelled = useCallback(() => {
    if (settledRef.current) return;
    settledRef.current = true;
    abortRef.current?.abort();
    onCancel();
  }, [onCancel]);

  useEffect(() => {
    if (!open) return;

    settledRef.current = false;
    setPhase("opening");
    const options = getSolidReaderDownloadOptions(detectSolidReaderPlatform());
    setDownloads(options);
    setSelectedFile(options[0]?.fileName ?? "");
    const controller = new AbortController();
    abortRef.current = controller;

    return () => controller.abort();
  }, [open]);

  useEffect(() => {
    if (!open || (phase !== "opening" && phase !== "install")) return;
    const controller = abortRef.current;
    if (!controller) return;
    let active = true;

    void waitForSolidReader({
      maxWaitMs: phase === "opening" ? SOLID_READER_OPEN_WAIT_MS : SOLID_READER_INSTALL_WAIT_MS,
      signal: controller.signal,
    })
      .then(() => {
        if (active) finishReady();
      })
      .catch((error: unknown) => {
        if (!active || controller.signal.aborted) return;
        if (error instanceof LocalBridgeAuthenticationError || error instanceof LocalBridgeConfigurationError) {
          setPhase("incompatible");
          return;
        }
        if (!(error instanceof LocalBridgeUnreachableError)) {
          setPhase("give_up");
          return;
        }
        if (phase === "opening") setPhase(downloads.length > 0 ? "install" : "unknown");
        else setPhase("give_up");
      });

    return () => {
      active = false;
    };
  }, [downloads.length, finishReady, open, phase]);

  const selectedDownload = downloads.find((option) => option.fileName === selectedFile) ?? downloads[0];
  const isWaiting = phase === "opening" || phase === "install";
  const canDownload = downloads.length > 0 && (isWaiting || phase === "incompatible");

  function handleDownload() {
    if (!selectedDownload) return;
    downloadSolidReader(selectedDownload);
    setPhase("install");
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) finishCancelled(); }}>
      <DialogContent className="sm:max-w-md" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>
            {phase === "opening" && "Opening SolId Reader"}
            {phase === "install" && "Install SolId Reader"}
            {phase === "unknown" && "Installation is not available for this computer"}
            {phase === "incompatible" && "SolId Reader needs attention"}
            {phase === "give_up" && "SolId Reader is still unavailable"}
          </DialogTitle>
          <DialogDescription className="space-y-3 text-left">
            {phase === "opening" && <span className="block">If your browser asks, choose Open. This page is checking the local reader in the background.</span>}
            {phase === "install" && <span className="block">Download and install SolId Reader, then open it. This page will reconnect automatically while you finish.</span>}
            {phase === "unknown" && <span className="block">Use a supported Windows or Mac clinic computer, or ask IT to install SolId Reader.</span>}
            {phase === "incompatible" && <span className="block">Update SolId Reader and confirm that its bridge token matches this clinic web app.</span>}
            {phase === "give_up" && <span className="block">Open SolId Reader from the Start menu or Applications, then check the connection again.</span>}
            {isWaiting && (
              <span className="flex items-center gap-2 font-medium text-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Checking connection…
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        {canDownload && (
          <div className="space-y-3">
            {downloads.length > 1 && (
              <Select value={selectedFile} onValueChange={setSelectedFile}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Choose Mac type" /></SelectTrigger>
                <SelectContent>
                  {downloads.map((option) => <SelectItem key={option.fileName} value={option.fileName}>{option.label}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            <Button type="button" className="w-full" variant={phase === "opening" ? "outline" : "default"} onClick={handleDownload}>
              <Download className="mr-2 h-4 w-4" /> {selectedDownload?.label ?? "Download SolId Reader"}
            </Button>
          </div>
        )}

        {(phase === "incompatible" || phase === "give_up") && (
          <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
            The card reader page keeps all card data temporary; closing this dialog does not save anything.
          </div>
        )}

        <DialogFooter className="sm:justify-between">
          {isWaiting ? (
            <>
              <Button type="button" variant="secondary" onClick={finishCancelled}>Stop waiting</Button>
              {phase === "install" && <Button type="button" variant="outline" onClick={tryLaunchSolidReader}>Try opening again</Button>}
            </>
          ) : (
            <Button type="button" onClick={finishCancelled}>Close</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
