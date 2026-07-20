import { NextRequest, NextResponse } from 'next/server';
import { generatePdfReportBuffer } from '@/lib/generatePdfReportBuffer';
import { checkRateLimit, getClientIdentifier } from '@/lib/rateLimit';

export const runtime = 'nodejs';
export const maxDuration = 30;

const PDF_RATE_LIMIT = 15;
const PDF_RATE_WINDOW_MS = 60 * 1000;

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ userDocId: string }> }
) {
  try {
    const id = getClientIdentifier(req);
    const { ok, resetAt } = checkRateLimit(id, PDF_RATE_LIMIT, PDF_RATE_WINDOW_MS);
    if (!ok) {
      return NextResponse.json(
        { error: 'เกินจำนวนการขอ PDF ต่อนาที กรุณาลองใหม่ในภายหลัง' },
        { status: 429, headers: { 'X-RateLimit-Reset': String(resetAt), 'Retry-After': '60' } }
      );
    }

    const { userDocId } = await context.params;
    const { searchParams } = new URL(req.url);
    const recordId = searchParams.get('record_id');
    const qaIdParam = searchParams.get('qa_id');
    const qaUid = searchParams.get('qa_uid')?.trim() || null;
    const qaId = qaIdParam && /^[0-9]+$/.test(qaIdParam) ? Number(qaIdParam) : null;

    if (!recordId) {
      return NextResponse.json({ error: 'กรุณาระบุ record_id' }, { status: 400 });
    }

    const pdfBuffer = await generatePdfReportBuffer(userDocId, recordId, req.nextUrl.origin, {
      qaId,
      qaUid,
      enableQaLookup: true,
    });

    return new Response(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(
          `report_${userDocId}_${recordId}.pdf`
        )}`,
      },
    });
  } catch (err: any) {
    console.error('pdf-v2 generation error:', err);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดขณะสร้าง PDF', details: err.message || String(err) },
      { status: 500 }
    );
  }
}
