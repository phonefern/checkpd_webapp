import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { Timestamp } from 'firebase-admin/firestore';
import { supabaseServer, hasServiceRole } from '@/lib/supabase-server';
import { adminDb } from '@/lib/firebaseAdmin';

export const runtime = 'nodejs';

type EventMirror = {
  id: string;
  name_en: string | null;
  name_th: string | null;
  active: boolean | null;
  created_at: string | null;
};

// Mirror the app's cookie-presence auth posture (middleware guards /pages/* only,
// not /api/*). Not cryptographic, but consistent with the rest of the project and
// strictly more than the other (open) API routes.
async function isAuthenticated(): Promise<boolean> {
  const store = await cookies();
  return store
    .getAll()
    .some((c) => c.name.startsWith('sb-') && c.name.includes('auth-token'));
}

function normalizeCreatedAt(value: unknown): string | null {
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && typeof (value as any).toDate === 'function') {
    try { return (value as any).toDate().toISOString(); } catch { return null; }
  }
  return null;
}

export async function POST(req: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  if (!hasServiceRole) {
    return NextResponse.json(
      { error: 'SUPABASE_SERVICE_ROLE_KEY not configured — cannot write checkpd schema' },
      { status: 500 },
    );
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 });
  }

  const events = supabaseServer.schema('checkpd').from('events');

  try {
    if (body?.op === 'upsert') {
      const e = body.event ?? {};
      if (!e.id) return NextResponse.json({ error: 'event.id required' }, { status: 400 });
      const row: EventMirror = {
        id: String(e.id),
        name_en: e.name_en ?? null,
        name_th: e.name_th ?? null,
        active: typeof e.active === 'boolean' ? e.active : null,
        created_at: normalizeCreatedAt(e.created_at),
      };
      const { error } = await events.upsert({ ...row, synced_at: new Date().toISOString() });
      if (error) throw error;
      return NextResponse.json({ ok: true, id: row.id });
    }

    if (body?.op === 'delete') {
      if (!body.id) return NextResponse.json({ error: 'id required' }, { status: 400 });
      // .order() required: the project's db-max-rows forces an order on mutations.
      const { error } = await events.delete().eq('id', String(body.id)).order('id');
      if (error) throw error;
      return NextResponse.json({ ok: true, id: String(body.id) });
    }

    if (body?.op === 'resync') {
      // Full sync from Firebase (source of truth): upsert all + remove stale rows.
      const snap = await adminDb.collection('events').get();
      const rows = snap.docs.map((d) => {
        const data = d.data() as any;
        return {
          id: d.id,
          name_en: data?.name?.en ?? null,
          name_th: data?.name?.th ?? null,
          active: typeof data?.active === 'boolean' ? data.active : null,
          created_at: normalizeCreatedAt(data?.createdAt),
          synced_at: new Date().toISOString(),
        };
      });

      if (rows.length) {
        const { error: upErr } = await events.upsert(rows);
        if (upErr) throw upErr;
      }

      // delete any mirror row whose id no longer exists in Firebase.
      // .order() required: the project's db-max-rows forces an order on mutations.
      const liveIds = rows.map((r) => r.id);
      const prune = liveIds.length
        ? await events
            .delete()
            .not('id', 'in', `(${liveIds.map((id) => `"${id}"`).join(',')})`)
            .order('id')
        : await events.delete().neq('id', '__never__').order('id');
      if (prune.error) throw prune.error;

      return NextResponse.json({ ok: true, synced: rows.length });
    }

    return NextResponse.json({ error: 'unknown op' }, { status: 400 });
  } catch (err: any) {
    console.error('events sync error:', err);
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
  }
}
