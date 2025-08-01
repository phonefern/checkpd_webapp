import { NextRequest } from 'next/server'
import { adminDb } from '@/lib/firebaseAdmin'
import { NextResponse } from 'next/server'

export async function GET(
  req: NextRequest,
  context: { params: { thaiid: string } }
) {
  const thaiId = context.params.thaiid

  // 🔍 Example query
  const querySnap = await adminDb
    .collection('users')
    .where('thaiid', '==', thaiId)
    .get()

  if (querySnap.empty) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const uid = querySnap.docs[0].id

  const recordsSnap = await adminDb
    .collection('users')
    .doc(uid)
    .collection('records')
    .get()

  const data = recordsSnap.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }))

  return NextResponse.json({ data })
}
