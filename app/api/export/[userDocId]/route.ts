// app/api/export/[userDocId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { Timestamp } from 'firebase-admin/firestore';

// ✅ API Route
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ userDocId: string }> }   // ⬅️ แก้ให้เป็น Promise
) {
  try {
    const params = await context.params;                 // ⬅️ ต้อง await ก่อน
    const { userDocId } = params;
    const { searchParams } = new URL(req.url);
    const recordId = searchParams.get('record_id');
    const downloadField = searchParams.get('download'); // 🎯 ถ้ามี → ต้องการไฟล์ wav

    const isNumericId = /^[0-9]+$/.test(userDocId);
    const collectionName = isNumericId ? 'temps' : 'users';

    const userDoc = await adminDb.collection(collectionName).doc(userDocId).get();
    if (!userDoc.exists) {
      return NextResponse.json(
        { error: `User not found in ${collectionName}: ${userDocId}` },
        { status: 404 }
      );
    }

    // ✅ กรณีมี record_id
    if (recordId) {
      const recordDoc = await adminDb
        .collection(collectionName)
        .doc(userDocId)
        .collection('records')
        .doc(recordId)
        .get();

      if (!recordDoc.exists) {
        return NextResponse.json(
          { error: `Record not found: ${recordId}` },
          { status: 404 }
        );
      }

      const recordData = await processRecordData(recordDoc);

      // ✅ ถ้ามี query ?download=voiceAhh → return .wav
      if (downloadField) {
        const wavFile = recordData.wavFiles.find(
          (w) => w.field.toLowerCase() === downloadField.toLowerCase()
        );
        if (!wavFile || !wavFile.downloadUrl) {
          return NextResponse.json(
            { error: `WAV file not found for field: ${downloadField}` },
            { status: 404 }
          );
        }

        // 🔥 fetch ไฟล์จาก Firebase Storage
        const res = await fetch(wavFile.downloadUrl);
        if (!res.ok) {
          return NextResponse.json(
            { error: `Failed to fetch WAV file: ${res.statusText}` },
            { status: res.status }
          );
        }

        const arrayBuffer = await res.arrayBuffer();

        return new NextResponse(arrayBuffer, {
          headers: {
            'Content-Type': 'audio/wav',
            'Content-Disposition': `attachment; filename="${recordId}_${downloadField}.wav"`,
          },
        });
      }

      // ✅ ถ้าไม่มี query download → return JSON
      return NextResponse.json({
        success: true,
        collection: collectionName,
        userDocId,
        recordId,
        tests: recordData.tests,
        data: recordData.data,
        wavFiles: recordData.wavFiles,
      });
    }

    // ✅ กรณีไม่มี record_id → return JSON เหมือนเดิม
    const recordsSnap = await adminDb
      .collection(collectionName)
      .doc(userDocId)
      .collection('records')
      .get();

    if (recordsSnap.empty) {
      return NextResponse.json({ error: 'No records found' }, { status: 404 });
    }

    const recordsData = await Promise.all(
      recordsSnap.docs.map((doc) => processRecordData(doc))
    );

    return NextResponse.json({
      success: true,
      collection: collectionName,
      userDocId,
      totalRecords: recordsData.length,
      tests: [...new Set(recordsData.flatMap((record) => record.tests))],
      data: Object.fromEntries(
        recordsData.flatMap((record) =>
          Object.entries(record.data).map(([key, value]) => [key, value])
        )
      ),
      wavFiles: recordsData.flatMap((record) => record.wavFiles),
    });
  } catch (err: any) {
    console.error('API Error:', err);
    return NextResponse.json(
      { error: `Server error: ${err.message}` },
      { status: 500 }
    );
  }
}

// ✅ processRecordData (เหมือนเดิม)
async function processRecordData(recordDoc: any) {
  const recordData = recordDoc.data();
  const allowedJsonFields = [
    'balance', 'dualtap', 'dualtapright', 'gaitwalk', 'pinchtosize',
    'pinchtosizeright', 'questionnaire', 'tremorpostural', 'tremorresting'
  ];
  const allowedWavFields = ['voiceAhh', 'voiceYPL'];

  const groupedData: Record<string, any> = {};
  const wavFiles: Array<{ field: string; downloadUrl: string; metadata: any }> = [];

  // ✅ JSON fields
  allowedJsonFields.forEach((field) => {
    const fieldKey = Object.keys(recordData).find(
      (key) => key.toLowerCase() === field.toLowerCase()
    );
    if (fieldKey && recordData[fieldKey] !== undefined) {
      groupedData[field] = {
        ...(typeof recordData[fieldKey] === 'object'
          ? recordData[fieldKey]
          : { value: recordData[fieldKey] }),
        recordId: recordDoc.id,
        timestamp:
          recordData.createdAt instanceof Timestamp
            ? recordData.createdAt.toDate().toISOString()
            : recordData.createdAt || null,
      };
    }
  });

  // ✅ WAV fields
  allowedWavFields.forEach((field) => {
    const fieldKey = Object.keys(recordData).find(
      (key) => key.toLowerCase() === field.toLowerCase()
    );
    if (fieldKey && recordData[fieldKey] !== undefined) {
      const fieldData = recordData[fieldKey];
      let downloadUrl = null;
      if (typeof fieldData === 'object' && fieldData !== null) {
        const urlKeys = ['downloadUrl', 'downloadURL', 'url', 'fileUrl', 'audioUrl'];
        for (const key of urlKeys) {
          if (fieldData[key]) {
            downloadUrl = fieldData[key];
            break;
          }
        }
        if (!downloadUrl && fieldData.data && typeof fieldData.data === 'object') {
          for (const key of urlKeys) {
            if (fieldData.data[key]) {
              downloadUrl = fieldData.data[key];
              break;
            }
          }
        }
      }
      if (downloadUrl) {
        wavFiles.push({
          field,
          downloadUrl,
          metadata: {
            recordId: recordDoc.id,
            timestamp:
              recordData.createdAt instanceof Timestamp
                ? recordData.createdAt.toDate().toISOString()
                : recordData.createdAt || null,
            ...(typeof fieldData === 'object' ? fieldData : { value: fieldData }),
          },
        });
      }
    }
  });

  return {
    recordId: recordDoc.id,
    timestamp:
      recordData.createdAt instanceof Timestamp
        ? recordData.createdAt.toDate().toISOString()
        : recordData.createdAt || null,
    tests: Object.keys(groupedData),
    data: groupedData,
    wavFiles,
  };
}