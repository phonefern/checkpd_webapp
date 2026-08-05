import type { ThaiIdCardPayload } from "../types";

export type KioskIdentity = {
  firstName: string;
  maskedSurname: string;
  maskedCitizenId: string;
};

function graphemes(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return [];

  if (typeof Intl.Segmenter !== "undefined") {
    return Array.from(new Intl.Segmenter("th", { granularity: "grapheme" }).segment(trimmed), ({ segment }) => segment);
  }

  return Array.from(trimmed);
}

export function maskThaiSurname(value: string) {
  const [first] = graphemes(value);
  return first ? `${first}•••` : "•••";
}

export function maskThaiCitizenId(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 13) return "•-••••-•••••-••-•";
  return `${digits[0]}-••••-•••••-••-${digits[12]}`;
}

export function toKioskIdentity(card: ThaiIdCardPayload): KioskIdentity {
  return {
    firstName: card.firstNameTH.trim() || card.fullNameTH.trim().split(/\s+/)[0] || "",
    maskedSurname: maskThaiSurname(card.lastNameTH),
    maskedCitizenId: maskThaiCitizenId(card.citizenID),
  };
}
