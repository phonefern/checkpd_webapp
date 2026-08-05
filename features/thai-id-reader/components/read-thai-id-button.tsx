"use client";

import { motion, useReducedMotion } from "framer-motion";
import { CreditCard, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

type ReadThaiIdButtonProps = {
  onClick: () => void;
  disabled: boolean;
  isReading: boolean;
};

export function ReadThaiIdButton({ onClick, disabled, isReading }: ReadThaiIdButtonProps) {
  const reduceMotion = useReducedMotion();
  const canAnimate = !disabled && !reduceMotion;

  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-busy={isReading}
      className={cn(
        "group relative min-h-14 w-full overflow-hidden rounded-lg px-6 font-medium",
        "sm:min-w-72 sm:w-auto",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        disabled
          ? "cursor-not-allowed bg-primary/50 text-primary-foreground"
          : "bg-primary text-primary-foreground shadow-lg shadow-primary/20",
      )}
      whileHover={canAnimate ? { scale: 1.02 } : undefined}
      whileTap={canAnimate ? { scale: 0.98 } : undefined}
    >
      {canAnimate && !isReading ? (
        <motion.span
          aria-hidden="true"
          className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent"
          animate={{ translateX: ["-100%", "200%"] }}
          transition={{ duration: 2, repeat: Infinity, repeatDelay: 3, ease: "easeInOut" }}
        />
      ) : null}

      {canAnimate && isReading ? (
        <>
          <motion.span
            aria-hidden="true"
            className="absolute inset-0 rounded-lg border-2 border-primary-foreground/30"
            initial={{ scale: 1, opacity: 0.55 }}
            animate={{ scale: 1.5, opacity: 0 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
          />
          <motion.span
            aria-hidden="true"
            className="absolute inset-0 rounded-lg border-2 border-primary-foreground/30"
            initial={{ scale: 1, opacity: 0.55 }}
            animate={{ scale: 1.5, opacity: 0 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut", delay: 0.5 }}
          />
        </>
      ) : null}

      <span className="relative flex items-center justify-center gap-2">
        {isReading ? (
          <><Loader2 className="h-5 w-5 animate-spin" /><span>Reading card…</span></>
        ) : (
          <>
            <motion.span
              animate={reduceMotion ? undefined : { rotateY: [0, 10, 0, -10, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            ><CreditCard className="h-5 w-5" /></motion.span>
            <span>Read Thai ID Card</span>
          </>
        )}
      </span>
    </motion.button>
  );
}
