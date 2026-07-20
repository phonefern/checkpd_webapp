import { renderToBuffer } from '@react-pdf/renderer';
import { Timestamp } from 'firebase-admin/firestore';
import QRCode from 'qrcode';
import { adminDb } from '@/lib/firebaseAdmin';
import { calculateAgeFromBod } from '@/lib/calculateAgeFromBod';
import { PdfReportDocument } from '@/lib/pdfReportDocument';
import { processRecordData } from '@/lib/processRecordData';
import { supabaseServer } from '@/lib/supabase-server';

type PdfReportQaOptions = {
  qaId?: number | null;
  qaUid?: string | null;
  enableQaLookup?: boolean;
};

type QaBridge = {
  qaId: number | null;
  qaUid: string;
  qrDataUri: string | null;
};

function clean(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeBaseUrl(baseUrl?: string | null) {
  if (!baseUrl) return null;
  return baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
}

async function lookupQaIdentity(
  filters: { qaId?: number | null; qaUid?: string | null; thaiid?: string | null },
): Promise<{ id: number | null; patient_uid: string | null } | null> {
  let query = supabaseServer
    .schema('core')
    .from('patients_v2')
    .select('id,patient_uid')
    .limit(1);

  if (filters.qaId) {
    query = query.eq('id', filters.qaId);
  } else if (filters.qaUid) {
    query = query
      .eq('patient_uid', filters.qaUid)
      .order('collection_date', { ascending: false, nullsFirst: false })
      .order('id', { ascending: false });
  } else if (filters.thaiid) {
    query = query
      .eq('thaiid', filters.thaiid)
      .order('collection_date', { ascending: false, nullsFirst: false })
      .order('id', { ascending: false });
  } else {
    return null;
  }

  const { data, error } = await query.maybeSingle();
  if (error) throw new Error(`patients_v2 identity lookup: ${error.message}`);
  return data as { id: number | null; patient_uid: string | null } | null;
}

async function buildQaBridge(
  userData: Record<string, any> | undefined,
  assetBaseUrl: string | null | undefined,
  options?: PdfReportQaOptions,
): Promise<QaBridge | null> {
  let qaId = options?.qaId ?? null;
  let qaUid = clean(options?.qaUid) || null;
  const thaiid = clean(userData?.thaiId) || clean(userData?.thaiid) || null;

  try {
    if ((!qaId || !qaUid) && qaId) {
      const matched = await lookupQaIdentity({ qaId });
      qaUid = qaUid ?? matched?.patient_uid ?? null;
    }

    if ((!qaId || !qaUid) && qaUid) {
      const matched = await lookupQaIdentity({ qaUid });
      qaId = qaId ?? matched?.id ?? null;
    }

    if ((!qaId || !qaUid) && options?.enableQaLookup && thaiid) {
      const matched = await lookupQaIdentity({ thaiid });
      qaId = qaId ?? matched?.id ?? null;
      qaUid = qaUid ?? matched?.patient_uid ?? null;
    }
  } catch (error) {
    console.warn('PDF QA identity lookup failed:', error);
  }

  if (!qaUid) return null;

  const baseUrl = normalizeBaseUrl(assetBaseUrl) ?? 'http://localhost:3000';
  const qaParams = new URLSearchParams({ focus_uid: qaUid });
  if (qaId != null) qaParams.set('focus_id', String(qaId));
  const qaUrl = `${baseUrl}/pages/qa?${qaParams.toString()}`;

  try {
    const qrDataUri = await QRCode.toDataURL(qaUrl, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 180,
    });
    return { qaId, qaUid, qrDataUri };
  } catch (error) {
    console.warn('PDF QR generation failed:', error);
    return { qaId, qaUid, qrDataUri: null };
  }
}

export async function generatePdfReportBuffer(
  userDocId: string,
  recordId: string,
  assetBaseUrl?: string | null,
  qaOptions?: PdfReportQaOptions,
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
  const qaBridge = await buildQaBridge(userData, assetBaseUrl, qaOptions);

  const info = {
    name: `${userData?.firstName || ''} ${userData?.lastName || ''}`.trim() || 'ไม่ระบุ',
    age: calculateAgeFromBod(userData?.bod)?.toString() || null,
    date:
      rawRecordData?.createdAt instanceof Timestamp
        ? rawRecordData.createdAt.toDate().toISOString()
        : new Date().toISOString(),
  };

  return renderToBuffer(
    <PdfReportDocument
      info={info}
      recordData={recordData}
      assetBaseUrl={assetBaseUrl}
      qaBridge={qaBridge}
    />
  );
}
