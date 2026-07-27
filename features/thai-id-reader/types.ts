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

export type ThaiIdReadResponse =
  | { success: true; data: ThaiIdCardPayload }
  | { success: false; error?: string; code?: ThaiIdReadErrorCode };

export type SolidReaderPlatform = "windows" | "mac" | "unknown";

export type SolidReaderDownloadOption = {
  label: string;
  fileName: string;
  url: string;
};
