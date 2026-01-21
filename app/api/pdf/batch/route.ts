import { NextRequest, NextResponse } from 'next/server';
import { parse } from 'csv-parse/sync';
import JSZip from 'jszip';

export const runtime = 'nodejs';

import { generatePdfBuffer } from '@/lib/generatePdfBuffer';

const MAX_BATCH = 100;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'กรุณาอัปโหลดไฟล์ CSV' },
        { status: 400 }
      );
    }

    // ===== อ่าน CSV =====
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

    // ===== จำกัด batch size =====
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

    // ===== Generate PDF ทีละรายการ =====
    for (const row of rows) {
      const { userDocId, record_id } = row;

      try {
        const pdfBuffer = await generatePdfBuffer(
          userDocId,
          record_id
        );

        zip.file(
          `report_${userDocId}_${record_id}.pdf`,
          pdfBuffer
        );
      } catch (err: any) {
        // ถ้า error → ใส่ไฟล์ error ลง zip
        zip.file(
          `ERROR_${userDocId}_${record_id}.txt`,
          err.message || 'Unknown error'
        );
      }
    }

    // ===== สร้าง ZIP =====
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
    console.error('batch pdf error:', err);
    return NextResponse.json(
      { error: 'Batch PDF failed', detail: err.message },
      { status: 500 }
    );
  }
}
