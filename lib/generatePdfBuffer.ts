// app/lib/pdf/generatePdfBuffer.ts
import playwright from 'playwright-core';
import chromium from '@sparticuz/chromium';
import { adminDb } from '@/lib/firebaseAdmin';
import { Timestamp } from 'firebase-admin/firestore';
import { processRecordData } from './processRecordData';
import { generateHTML } from './generateHTML';
import { calculateAgeFromBod } from './calculateAgeFromBod';

export async function generatePdfBuffer(
  userDocId: string,
  recordId: string
): Promise<Buffer> {
  console.log("generatePdfBuffer input:", {
    userDocId,
    recordId,
    typeUser: typeof userDocId,
    typeRecord: typeof recordId,
  });

  const isNumericId = /^[0-9]+$/.test(userDocId);
  const collectionName = isNumericId ? 'temps' : 'users';

  const userDoc = await adminDb.collection(collectionName).doc(userDocId).get();
  if (!userDoc.exists) throw new Error(`User not found: ${userDocId}`);

  const recordDoc = await adminDb
    .collection(collectionName)
    .doc(userDocId)
    .collection('records')
    .doc(recordId)
    .get();

  if (!recordDoc.exists) throw new Error(`Record not found: ${recordId}`);

  const userData = userDoc.data();
  const recordData = await processRecordData(recordDoc);
  const rawRecordData = recordDoc.data();

  const info = {
    name: `${userData?.firstName || ''} ${userData?.lastName || ''}`.trim() || 'ไม่ระบุ',
    age: calculateAgeFromBod(userData?.bod)?.toString() || null,
    date:
      rawRecordData?.createdAt instanceof Timestamp
        ? rawRecordData.createdAt.toDate().toISOString()
        : new Date().toISOString(),
  };

  const html = generateHTML(userData, recordData, info);

  const browser = await playwright.chromium.launch({
    args: chromium.args,
    executablePath: process.env.VERCEL ? await chromium.executablePath() : undefined,
    headless: true,
  });

  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle' });

  const pdf = await page.pdf({ format: 'A4' });
  await browser.close();

  return Buffer.from(pdf);
}
