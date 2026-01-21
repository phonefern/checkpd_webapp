// app/lib/pdf/processRecordData.ts
import { Timestamp } from 'firebase-admin/firestore';

export async function processRecordData(recordDoc: any) {
  const recordData = recordDoc.data();
  const allowedJsonFields = [
    'balance',
    'dualtap',
    'dualtapright',
    'gaitwalk',
    'pinchtosize',
    'pinchtosizeright',
    'questionnaire',
    'tremorpostural',
    'tremorresting',
    'prediction',
    'diagnose',
    'voiceAhh',
    'voiceYPL',
  ];

  const groupedData: Record<string, any> = {};

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

  return groupedData;
}
