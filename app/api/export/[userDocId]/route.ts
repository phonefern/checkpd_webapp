import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebaseAdmin'

export async function GET(
  req: NextRequest,
  context: { params: { userDocId: string } }
) {
  try {
    const { params } = await Promise.resolve(context); // Await params
    const { userDocId } = params;

    // Verify user exists
    const userDoc = await adminDb.collection('users').doc(userDocId).get();
    if (!userDoc.exists) {
      return NextResponse.json({ error: `User not found: ${userDocId}` }, { status: 404 });
    }

    // Get all records
    const recordsSnap = await adminDb
      .collection('users')
      .doc(userDocId)
      .collection('records')
      .get();

    if (recordsSnap.empty) {
      return NextResponse.json({ error: 'No records found' }, { status: 404 });
    }

    // Debug: Log all fields found
    const allFields = Array.from(new Set(
      recordsSnap.docs.flatMap(doc => Object.keys(doc.data()))
    ));
    console.log("All fields in documents:", allFields);

    // Define allowed test types (case insensitive)
    const allowedFields = [
      'balance',
      'dualtap',
      'dualtapright',
      'gaitwalk',
      'pinchtosize',
      'pinchtosizeright',
      'questionnaire',
      'tremorpostural',
      'tremorresting',
      'voiceAhh',
      'voiceYPL',
      

    ];

    // Organize data by test type
    const groupedData: Record<string, any[]> = {};

    allowedFields.forEach(field => {
      const fieldRecords = recordsSnap.docs
        .filter(doc => {
          const docData = doc.data();
          return Object.keys(docData).some(
            key => key.toLowerCase() === field.toLowerCase()
          );
        })
        .map(doc => {
          const docData = doc.data();
          const fieldKey = Object.keys(docData).find(
            key => key.toLowerCase() === field.toLowerCase()
          ) || field;
          
          return {
            docId: doc.id,
            ...(typeof docData[fieldKey] === 'object' 
              ? docData[fieldKey] 
              : { value: docData[fieldKey] }),
            timestamp: docData.createdAt?.toDate?.() || null
          };
        });

      if (fieldRecords.length > 0) {
        groupedData[field] = fieldRecords;
      } else {
        console.log(`No data found for field: ${field}`);
      }
    });

    return NextResponse.json({ 
      success: true,
      userDocId,
      tests: Object.keys(groupedData),
      data: groupedData,
      debug: { allFields } // สำหรับตรวจสอบ
    });

  } catch (err: any) {
    console.error("API Error:", err);
    return NextResponse.json(
      { error: `Server error: ${err.message}` }, 
      { status: 500 }
    );
  }
}