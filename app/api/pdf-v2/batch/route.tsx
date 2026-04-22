import { NextRequest, NextResponse } from 'next/server';
import { parse } from 'csv-parse/sync';
import JSZip from 'jszip';
import { generatePdfReportBuffer } from '@/lib/generatePdfReportBuffer';
import { checkRateLimit, getClientIdentifier } from '@/lib/rateLimit';

export const runtime = 'nodejs';

const MAX_BATCH = 100;
const PDF_RATE_LIMIT = 10;
const PDF_RATE_WINDOW_MS = 60 * 1000;

export async function POST(req: NextRequest) {
  try {
    const id = getClientIdentifier(req);
    const { ok, resetAt } = checkRateLimit(id, PDF_RATE_LIMIT, PDF_RATE_WINDOW_MS);
    if (!ok) {
      return NextResponse.json(
        { error: 'เกินจำนวนการขอ PDF ต่อนาที กรุณาลองใหม่ในภายหลัง' },
        { status: 429, headers: { 'X-RateLimit-Reset': String(resetAt), 'Retry-After': '60' } }
      );
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'กรุณาอัปโหลดไฟล์ CSV' },
        { status: 400 }
      );
    }

    const csvText = await file.text();

    const rows: {
      userDocId: string;
      record_id: string;
    }[] = parse(csvText, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'CSV ไม่มีข้อมูล' },
        { status: 400 }
      );
    }

    if (rows.length > MAX_BATCH) {
      return NextResponse.json(
        {
          error: `batch ใหญ่เกินไป (สูงสุด ${MAX_BATCH} รายการ)`,
          count: rows.length,
        },
        { status: 400 }
      );
    }

    const zip = new JSZip();

    for (const row of rows) {
      const { userDocId, record_id } = row;

      try {
        const pdfBuffer = await generatePdfReportBuffer(userDocId, record_id, req.nextUrl.origin);
        zip.file(`report_${userDocId}_${record_id}.pdf`, pdfBuffer);
      } catch (err: any) {
        zip.file(
          `ERROR_${userDocId}_${record_id}.txt`,
          err.message || 'Unknown error'
        );
      }
    }

    const zipBuffer = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    });

    return new Response(new Uint8Array(zipBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition':
          'attachment; filename="pdf_reports.zip"',
      },
    });
  } catch (err: any) {
    console.error('batch pdf-v2 error:', err);
    return NextResponse.json(
      { error: 'Batch PDF failed', detail: err.message },
      { status: 500 }
    );
  }
}
