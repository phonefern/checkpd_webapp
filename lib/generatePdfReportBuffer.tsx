import { renderToBuffer } from '@react-pdf/renderer';
import { Timestamp } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebaseAdmin';
import { calculateAgeFromBod } from '@/lib/calculateAgeFromBod';
import { PdfReportDocument } from '@/lib/pdfReportDocument';
import { processRecordData } from '@/lib/processRecordData';

export async function generatePdfReportBuffer(
  userDocId: string,
  recordId: string,
  assetBaseUrl?: string | null
): Promise<Buffer> {
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

  return renderToBuffer(
    <PdfReportDocument info={info} recordData={recordData} assetBaseUrl={assetBaseUrl} />
  );
}
