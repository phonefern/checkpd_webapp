import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { Timestamp } from 'firebase-admin/firestore';

export async function GET(req: NextRequest, context: any) {
  try {
    const { userDocId } = context.params;

    const isNumericId = /^[0-9]+$/.test(userDocId);
    const collectionName = isNumericId ? 'temps' : 'users';

    const userDoc = await adminDb.collection(collectionName).doc(userDocId).get();
    if (!userDoc.exists) {
      return NextResponse.json(
        { error: `User not found in ${collectionName}: ${userDocId}` },
        { status: 404 }
      );
    }

    const recordsSnap = await adminDb
      .collection(collectionName)
      .doc(userDocId)
      .collection('records')
      .get();

    if (recordsSnap.empty) {
      return NextResponse.json({ error: 'No records found' }, { status: 404 });
    }

    const allFields = Array.from(
      new Set(recordsSnap.docs.flatMap((doc) => Object.keys(doc.data())))
    );

    const allowedFields = [
      'balance', 'dualtap', 'dualtapright', 'gaitwalk', 'pinchtosize',
      'pinchtosizeright', 'questionnaire', 'tremorpostural',
      'tremorresting', 'voiceAhh', 'voiceYPL',
    ];

    const groupedData: Record<string, any[]> = {};

    allowedFields.forEach((field) => {
      const fieldRecords = recordsSnap.docs
        .filter((doc) => {
          const docData = doc.data();
          return Object.keys(docData).some(
            (key) => key.toLowerCase() === field.toLowerCase()
          );
        })
        .map((doc) => {
          const docData = doc.data();
          const fieldKey =
            Object.keys(docData).find(
              (key) => key.toLowerCase() === field.toLowerCase()
            ) || field;

          return {
            docId: doc.id,
            ...(typeof docData[fieldKey] === 'object'
              ? docData[fieldKey]
              : { value: docData[fieldKey] }),
            timestamp:
              docData.createdAt instanceof Timestamp
                ? docData.createdAt.toDate()
                : null,
          };
        });

      if (fieldRecords.length > 0) {
        groupedData[field] = fieldRecords;
      }
    });

    return NextResponse.json({
      success: true,
      collection: collectionName,
      userDocId,
      tests: Object.keys(groupedData),
      data: groupedData,
      debug: { allFields },
    });
  } catch (err: any) {
    console.error('API Error:', err);
    return NextResponse.json(
      { error: `Server error: ${err.message}` },
      { status: 500 }
    );
  }
}
