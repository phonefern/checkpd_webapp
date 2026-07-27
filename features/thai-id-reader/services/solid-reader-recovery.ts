import {
  clearThaiIdBridgeCachedBaseUrl,
  LocalBridgeUnreachableError,
  pingThaiIdBridge,
} from "./thai-id-bridge-client";

export const SOLID_READER_LAUNCH_URI = "solid-reader://launch";
export const SOLID_READER_OPEN_WAIT_MS = 18_000;
export const SOLID_READER_INSTALL_WAIT_MS = 180_000;

export function tryLaunchSolidReader() {
  if (typeof window !== "undefined") window.location.assign(SOLID_READER_LAUNCH_URI);
}

function wait(delayMs: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }

    const handleAbort = () => {
      window.clearTimeout(timeoutId);
      reject(new DOMException("Aborted", "AbortError"));
    };
    const timeoutId = window.setTimeout(() => {
      signal.removeEventListener("abort", handleAbort);
      resolve();
    }, delayMs);
    signal.addEventListener("abort", handleAbort, { once: true });
  });
}

export async function waitForSolidReader(options: {
  maxWaitMs: number;
  signal: AbortSignal;
  pollDelayMs?: number;
  pingTimeoutMs?: number;
}) {
  const {
    maxWaitMs,
    signal,
    pollDelayMs = 1_000,
    pingTimeoutMs = 2_000,
  } = options;
  const deadline = Date.now() + maxWaitMs;

  while (Date.now() < deadline) {
    if (signal.aborted) throw new DOMException("Aborted", "AbortError");

    try {
      const remainingMs = Math.max(500, deadline - Date.now());
      const response = await pingThaiIdBridge(Math.min(pingTimeoutMs, remainingMs), signal);
      if (response.ok && (await response.text()).trim() === "pong") return;
    } catch (error) {
      if (signal.aborted) throw new DOMException("Aborted", "AbortError");
      if (!(error instanceof LocalBridgeUnreachableError)) throw error;
    }

    clearThaiIdBridgeCachedBaseUrl();
    const remainingMs = deadline - Date.now();
    if (remainingMs > 0) await wait(Math.min(pollDelayMs, remainingMs), signal);
  }

  throw new LocalBridgeUnreachableError("SolId Reader did not respond in time.");
}
