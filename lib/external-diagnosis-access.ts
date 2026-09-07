import { timingSafeEqual } from "crypto";

export class DiagnosisApiAccessError extends Error {
  constructor(
    message: string,
    public readonly status: 401 | 429
  ) {
    super(message);
    this.name = "DiagnosisApiAccessError";
  }
}

type PartnerApiKey = {
  name: string;
  secret: string;
};

export function requireDiagnosisApiKey(request: Request): { partner: string } {
  const incomingKey = request.headers.get("x-api-key")?.trim();
  if (!incomingKey) {
    throw new DiagnosisApiAccessError("Unauthorized.", 401);
  }

  const configuredKeys = parsePartnerApiKeys(process.env.DIAGNOSIS_PARTNER_API_KEYS);
  if (configuredKeys.length === 0) {
    console.warn(
      "[external-diagnosis-access] DIAGNOSIS_PARTNER_API_KEYS has no valid entries — expected comma-separated \"name:secret\" pairs. Every request will be rejected until this is fixed."
    );
  }

  const match = configuredKeys.find((configured) => timingSafeEqualStr(configured.secret, incomingKey));

  if (!match) {
    throw new DiagnosisApiAccessError("Unauthorized.", 401);
  }

  return { partner: match.name };
}

function parsePartnerApiKeys(value: string | undefined): PartnerApiKey[] {
  return (value ?? "")
    .split(",")
    .map((pair) => pair.trim())
    .filter(Boolean)
    .map((pair) => {
      const separatorIndex = pair.indexOf(":");
      if (separatorIndex <= 0) return null;

      const name = pair.slice(0, separatorIndex).trim();
      const secret = pair.slice(separatorIndex + 1).trim();
      if (!name || !secret) return null;

      return { name, secret };
    })
    .filter((key): key is PartnerApiKey => key !== null);
}

function timingSafeEqualStr(expected: string, actual: string): boolean {
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(actual);

  if (expectedBuffer.length !== actualBuffer.length) return false;

  return timingSafeEqual(expectedBuffer, actualBuffer);
}
