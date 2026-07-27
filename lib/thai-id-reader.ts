const DEFAULT_BASE_URLS = ["https://localhost:18310", "http://127.0.0.1:18310"] as const;

export type ThaiIdReadErrorCode = "NO_READER" | "NO_CARD" | "CARD_ERROR";

export type ThaiIdCardPayload = {
  citizenID: string;
  titleTH: string;
  titleEN: string;
  fullNameTH: string;
  fullNameEN: string;
  firstNameTH: string;
  firstNameEN: string;
  lastNameTH: string;
  lastNameEN: string;
  dateOfBirth: string;
  gender: "M" | "F";
  cardIssuer: string;
  issueDate: string;
  expireDate: string;
  address: string;
  photoAsBase64Uri: string;
};

type ThaiIdReadResponse =
  | { success: true; data: ThaiIdCardPayload }
  | { success: false; error?: string; code?: ThaiIdReadErrorCode };

export class LocalBridgeConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LocalBridgeConfigurationError";
  }
}

export class LocalBridgeUnreachableError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options?.cause === undefined ? undefined : { cause: options.cause });
    this.name = "LocalBridgeUnreachableError";
  }
}

export class ThaiIdReadUserError extends Error {
  readonly code?: ThaiIdReadErrorCode | "BAD_JSON" | "HTTP_ERROR";

  constructor(message: string, code?: ThaiIdReadUserError["code"]) {
    super(message);
    this.name = "ThaiIdReadUserError";
    this.code = code;
  }
}

let cachedBaseUrl: string | null = null;

function getBridgeToken() {
  return process.env.NEXT_PUBLIC_SOLID_READER_TOKEN?.trim() ?? "";
}

function getBaseUrls() {
  const configured = process.env.NEXT_PUBLIC_SOLID_READER_BASE_URL?.trim();
  if (configured) return [configured];
  if (cachedBaseUrl) return [cachedBaseUrl, ...DEFAULT_BASE_URLS.filter((url) => url !== cachedBaseUrl)];
  return [...DEFAULT_BASE_URLS];
}

async function fetchLocalBridge(path: string, init?: RequestInit) {
  const token = getBridgeToken();
  if (!token) {
    throw new LocalBridgeConfigurationError(
      "Thai ID bridge token is not configured. Ask an administrator to configure this clinic browser.",
    );
  }

  let lastError: unknown = null;
  for (const baseUrl of getBaseUrls()) {
    try {
      const url = new URL(path, baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`);
      const response = await fetch(url, {
        ...init,
        headers: { ...init?.headers, "x-solid-reader-token": token },
      });
      cachedBaseUrl = baseUrl;
      return response;
    } catch (error) {
      if (init?.signal?.aborted) throw error;
      lastError = error;
    }
  }

  throw new LocalBridgeUnreachableError("Cannot reach SolId Reader. Start SolId Reader and try again.", { cause: lastError });
}

export async function pingThaiIdBridge(timeoutMs = 4_000) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetchLocalBridge("/ping", { signal: controller.signal });
  } catch (error) {
    if (error instanceof LocalBridgeConfigurationError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new LocalBridgeUnreachableError("Local bridge ping timed out.", { cause: error });
    }
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export async function readThaiIdCard(): Promise<ThaiIdCardPayload> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 15_000);
  let response: Response;
  try {
    response = await fetchLocalBridge("/read-id", { signal: controller.signal });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new ThaiIdReadUserError("Thai ID card read timed out. Reinsert the card and try again.", "CARD_ERROR");
    }
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }

  if (!response.ok) {
    throw new ThaiIdReadUserError(`Thai ID bridge returned HTTP ${response.status}.`, "HTTP_ERROR");
  }

  let payload: ThaiIdReadResponse;
  try {
    payload = (await response.json()) as ThaiIdReadResponse;
  } catch {
    throw new ThaiIdReadUserError("Thai ID bridge returned malformed JSON.", "BAD_JSON");
  }

  if (!payload || typeof payload !== "object" || typeof payload.success !== "boolean") {
    throw new ThaiIdReadUserError("Thai ID bridge returned an invalid response.", "BAD_JSON");
  }

  if (payload.success) return payload.data;
  if (payload.code === "NO_READER") throw new ThaiIdReadUserError("No card reader detected. Connect a reader and try again.", "NO_READER");
  if (payload.code === "NO_CARD") throw new ThaiIdReadUserError("No card inserted. Insert the Thai ID card and try again.", "NO_CARD");
  if (payload.code === "CARD_ERROR") throw new ThaiIdReadUserError(payload.error?.trim() || "Card read failed. Reinsert the card and try again.", "CARD_ERROR");
  throw new ThaiIdReadUserError(payload.error?.trim() || "Failed to read Thai ID card.");
}

export function formatThaiIdReadError(error: unknown) {
  return error instanceof Error && error.message.trim() ? error.message : "Failed to read Thai ID card.";
}
