"use client";

import { motion, useReducedMotion } from "framer-motion";

type ThaiIdScanStateProps = {
  isReading: boolean;
};

export function ThaiIdScanState({ isReading }: ThaiIdScanStateProps) {
  const reduceMotion = useReducedMotion();
  const repeat = reduceMotion ? 0 : Infinity;

  return (
    <div className="flex min-h-64 flex-col items-center justify-center gap-5 px-4 py-10 text-center">
      <div className="relative">
        <motion.div
          className="relative flex h-28 w-28 items-center justify-center overflow-hidden rounded-2xl border-2 bg-card shadow-lg"
          animate={isReading && !reduceMotion ? { boxShadow: ["0 8px 22px rgb(67 57 198 / 0.12)", "0 12px 36px rgb(67 57 198 / 0.30)", "0 8px 22px rgb(67 57 198 / 0.12)"] } : undefined}
          transition={{ duration: 2, repeat, ease: "easeInOut" }}
        >
          {isReading ? (
            <>
              <motion.span
                aria-hidden="true"
                className="absolute inset-x-4 h-0.5 bg-gradient-to-r from-transparent via-[#4339C6] to-transparent"
                animate={reduceMotion ? undefined : { top: ["20%", "80%", "20%"] }}
                transition={{ duration: 2, repeat, ease: "easeInOut" }}
              />
              <motion.span
                animate={reduceMotion ? undefined : { opacity: [0.55, 1, 0.55], scale: [0.95, 1, 0.95] }}
                transition={{ duration: 1.5, repeat, ease: "easeInOut" }}
              ><CardScanIcon className="h-14 w-14 text-[#4339C6]" /></motion.span>
            </>
          ) : (
            <>
              <motion.span
                animate={reduceMotion ? undefined : { y: [0, -5, 0], opacity: [0.45, 0.7, 0.45] }}
                transition={{ duration: 3, repeat, ease: "easeInOut" }}
              ><CardPlaceholderIcon className="h-14 w-14 text-muted-foreground/60" /></motion.span>
              <ScanCorners />
            </>
          )}
        </motion.div>

        {isReading && !reduceMotion ? (
          <>
            <motion.span aria-hidden="true" className="absolute inset-0 rounded-2xl border-2 border-[#4339C6]/40" animate={{ scale: [1, 1.3, 1.3], opacity: [0.6, 0, 0] }} transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }} />
            <motion.span aria-hidden="true" className="absolute inset-0 rounded-2xl border-2 border-[#4339C6]/40" animate={{ scale: [1, 1.3, 1.3], opacity: [0.6, 0, 0] }} transition={{ duration: 2, repeat: Infinity, ease: "easeOut", delay: 0.8 }} />
          </>
        ) : null}
      </div>

      <div className="space-y-1">
        {isReading ? (
          <motion.p className="text-base font-medium text-foreground" animate={reduceMotion ? undefined : { opacity: [1, 0.7, 1] }} transition={{ duration: 1.5, repeat }}>
            Reading card…
          </motion.p>
        ) : <p className="text-base font-medium text-muted-foreground">No cards read in this session.</p>}
        <p className="text-sm text-muted-foreground/80">
          {isReading ? "กำลังอ่านข้อมูลจากบัตร" : "Insert a Thai ID card, then select Read Thai ID Card."}
        </p>
      </div>
    </div>
  );
}

function ScanCorners() {
  return <>
    <span aria-hidden="true" className="absolute left-2 top-2 h-3 w-3 rounded-tl border-l border-t border-muted-foreground/25" />
    <span aria-hidden="true" className="absolute right-2 top-2 h-3 w-3 rounded-tr border-r border-t border-muted-foreground/25" />
    <span aria-hidden="true" className="absolute bottom-2 left-2 h-3 w-3 rounded-bl border-b border-l border-muted-foreground/25" />
    <span aria-hidden="true" className="absolute bottom-2 right-2 h-3 w-3 rounded-br border-b border-r border-muted-foreground/25" />
  </>;
}

function CardPlaceholderIcon({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true"><rect width="20" height="14" x="2" y="5" rx="2" /><path d="M2 10h20" /></svg>;
}

function CardScanIcon({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true"><rect width="20" height="14" x="2" y="5" rx="2" /><circle cx="8" cy="12" r="2" /><path d="M14 10h4" /><path d="M14 14h4" /></svg>;
}
