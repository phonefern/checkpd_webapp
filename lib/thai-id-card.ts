import { z } from "zod";

export function isValidThaiIdChecksum(thaiId: string) {
  if (!/^\d{13}$/.test(thaiId)) return false;

  const sum = thaiId
    .slice(0, 12)
    .split("")
    .reduce((total, digit, index) => total + Number(digit) * (13 - index), 0);
  const expectedCheckDigit = (11 - (sum % 11)) % 10;

  return Number(thaiId[12]) === expectedCheckDigit;
}

const optionalText = z.string().trim().max(4_000);

export const thaiIdCardPayloadSchema = z.object({
  citizenID: z.string().trim().regex(/^\d{13}$/, "Thai ID must contain exactly 13 digits").refine(isValidThaiIdChecksum, "Thai ID checksum is invalid"),
  titleTH: optionalText,
  titleEN: optionalText,
  fullNameTH: optionalText,
  fullNameEN: optionalText,
  firstNameTH: optionalText,
  firstNameEN: optionalText,
  lastNameTH: optionalText,
  lastNameEN: optionalText,
  dateOfBirth: optionalText,
  gender: z.enum(["M", "F"]),
  cardIssuer: optionalText,
  issueDate: optionalText,
  expireDate: optionalText,
  address: optionalText,
  photoAsBase64Uri: z.string().max(2 * 1024 * 1024).refine(
    (value) => value === "" || /^data:image\/(?:jpeg|jpg|png);base64,/i.test(value),
    "Photo must be a JPEG or PNG data URI"
  ),
});

export type ThaiIdCardPayloadInput = z.infer<typeof thaiIdCardPayloadSchema>;
