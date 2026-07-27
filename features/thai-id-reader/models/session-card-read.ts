import type { ThaiIdCardPayload } from "../types";

export type SessionCardRead = {
  thaiId: string;
  readAt: Date;
  data: ThaiIdCardPayload;
};

export function createSessionCardRead(data: ThaiIdCardPayload): SessionCardRead {
  const thaiId = data.citizenID.trim();

  if (!thaiId) {
    throw new Error("Thai ID card response did not include a Thai ID number.");
  }

  return {
    thaiId,
    readAt: new Date(),
    data: { ...data, citizenID: thaiId },
  };
}

/**
 * Thai ID is the session table primary key. A newer scan replaces that person's row.
 */
export function upsertSessionCardReadByThaiId(
  currentReads: SessionCardRead[],
  nextRead: SessionCardRead,
) {
  return [nextRead, ...currentReads.filter((read) => read.thaiId !== nextRead.thaiId)];
}
