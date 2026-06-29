'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  updateDoc,
} from 'firebase/firestore'
import { db } from '@/lib/firebaseClient'
import SidebarLayout from '@/app/component/layout/SidebarLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  CalendarClock,
  CalendarDays,
  Check,
  Hash,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from 'lucide-react'

type EventItem = {
  id: string
  active?: boolean
  createdAt?: Timestamp | null
  name?: {
    en?: string
    th?: string
  }
}

function formatDate(ts?: Timestamp | null) {
  if (!ts) return '-'
  return ts.toDate().toLocaleString('th-TH')
}

export default function EventPage() {
  const [events, setEvents] = useState<EventItem[]>([])
  const [nameEn, setNameEn] = useState('')
  const [nameTh, setNameTh] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editNameEn, setEditNameEn] = useState('')
  const [editNameTh, setEditNameTh] = useState('')
  const [savingEditId, setSavingEditId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [resyncing, setResyncing] = useState(false)

  // Mirror an event change into Supabase checkpd.events so checkpd.users.event_id
  // can resolve name_en/name_th by join. Firebase stays the source of truth — a
  // failed mirror does NOT roll back Firebase; surface a hint to use "Resync".
  const syncToSupabase = async (payload: Record<string, unknown>) => {
    try {
      const res = await fetch('/api/events/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        console.error('events sync failed', j)
        setError(`Supabase sync failed: ${j.error || res.status}. Firebase saved — try "Resync".`)
      }
    } catch (err) {
      console.error('events sync error', err)
      setError('Supabase sync failed (network). Firebase saved — try "Resync".')
    }
  }

  const handleResync = async () => {
    setError(null)
    setResyncing(true)
    try {
      const res = await fetch('/api/events/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ op: 'resync' }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) setError(`Resync failed: ${j.error || res.status}`)
    } catch (err) {
      console.error(err)
      setError('Resync failed (network)')
    } finally {
      setResyncing(false)
    }
  }

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'events'),
      (snap) => {
        const rows = snap.docs.map((eventDoc) => {
          const data = eventDoc.data() as Omit<EventItem, 'id'>
          return { id: eventDoc.id, ...data }
        })

        setEvents(rows)
        setLoading(false)
      },
      (err) => {
        console.error(err)
        setError('Load events failed')
        setLoading(false)
      }
    )

    return () => unsub()
  }, [])

  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => {
      const timeA = a.createdAt?.toMillis() ?? 0
      const timeB = b.createdAt?.toMillis() ?? 0
      return timeB - timeA
    })
  }, [events])

  const activeCount = useMemo(() => events.filter((e) => e.active).length, [events])

  const handleAddEvent = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    const en = nameEn.trim()
    const th = nameTh.trim()

    if (!en || !th) {
      setError('Please provide both EN and TH names')
      return
    }

    try {
      setSubmitting(true)
      const ref = await addDoc(collection(db, 'events'), {
        active: true,
        createdAt: serverTimestamp(),
        name: { en, th },
      })

      await syncToSupabase({
        op: 'upsert',
        event: { id: ref.id, name_en: en, name_th: th, active: true, created_at: new Date().toISOString() },
      })

      setNameEn('')
      setNameTh('')
    } catch (err) {
      console.error(err)
      setError('Create event failed')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteEvent = async (eventId: string) => {
    const confirmed = window.confirm('Delete this event?')
    if (!confirmed) return

    setError(null)
    setDeletingId(eventId)

    try {
      await deleteDoc(doc(db, 'events', eventId))
      await syncToSupabase({ op: 'delete', id: eventId })
    } catch (err) {
      console.error(err)
      setError('Delete event failed')
    } finally {
      setDeletingId(null)
    }
  }

  const handleToggleActive = async (eventId: string, currentActive?: boolean) => {
    setError(null)
    setTogglingId(eventId)

    try {
      await updateDoc(doc(db, 'events', eventId), {
        active: !currentActive,
      })
      const item = events.find((e) => e.id === eventId)
      await syncToSupabase({
        op: 'upsert',
        event: {
          id: eventId,
          name_en: item?.name?.en ?? null,
          name_th: item?.name?.th ?? null,
          active: !currentActive,
          created_at: item?.createdAt?.toDate().toISOString() ?? null,
        },
      })
    } catch (err) {
      console.error(err)
      setError('Update active status failed')
    } finally {
      setTogglingId(null)
    }
  }

  const startEdit = (item: EventItem) => {
    setError(null)
    setEditingId(item.id)
    setEditNameEn(item.name?.en ?? '')
    setEditNameTh(item.name?.th ?? '')
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditNameEn('')
    setEditNameTh('')
  }

  const handleSaveEdit = async (eventId: string) => {
    const en = editNameEn.trim()
    const th = editNameTh.trim()

    if (!en || !th) {
      setError('Please provide both EN and TH names')
      return
    }

    setError(null)
    setSavingEditId(eventId)

    try {
      await updateDoc(doc(db, 'events', eventId), {
        name: { en, th },
      })
      const item = events.find((e) => e.id === eventId)
      await syncToSupabase({
        op: 'upsert',
        event: {
          id: eventId,
          name_en: en,
          name_th: th,
          active: item?.active ?? null,
          created_at: item?.createdAt?.toDate().toISOString() ?? null,
        },
      })
      cancelEdit()
    } catch (err) {
      console.error(err)
      setError('Update event name failed')
    } finally {
      setSavingEditId(null)
    }
  }

  const ActiveToggle = ({ item }: { item: EventItem }) => (
    <button
      type="button"
      onClick={() => handleToggleActive(item.id, item.active)}
      disabled={togglingId === item.id || savingEditId === item.id}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition disabled:opacity-60 ${
        item.active
          ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
          : 'bg-muted text-muted-foreground hover:bg-muted/80'
      }`}
      title="คลิกเพื่อสลับสถานะ active"
    >
      {togglingId === item.id ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <span className={`h-2 w-2 rounded-full ${item.active ? 'bg-emerald-500' : 'bg-gray-400'}`} />
      )}
      {item.active ? 'Active' : 'Inactive'}
    </button>
  )

  return (
    <SidebarLayout activePath="/pages/event" mainClassName="bg-gray-50">
      <div className="mx-auto w-full max-w-5xl p-4 md:p-8">
        {/* Header */}
        <div className="mb-6 flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#4339C6]/10 text-[#4339C6]">
            <CalendarDays className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold md:text-2xl">Event Management</h1>
            <p className="text-sm text-muted-foreground">
              เพิ่ม / แก้ไข / ลบ event (Firestore <code>events</code> + sync ไป Supabase)
            </p>
          </div>
        </div>

        {/* Add Event */}
        <Card className="mb-6 rounded-2xl shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Plus className="h-4 w-4" /> Add Event
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddEvent} className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="event-en">Name (EN)</Label>
                <Input
                  id="event-en"
                  value={nameEn}
                  onChange={(e) => setNameEn(e.target.value)}
                  placeholder="e.g. Self-screening"
                  disabled={submitting}
                  className="h-11 text-base"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="event-th">Name (TH)</Label>
                <Input
                  id="event-th"
                  value={nameTh}
                  onChange={(e) => setNameTh(e.target.value)}
                  placeholder="e.g. ทำด้วยตนเอง"
                  disabled={submitting}
                  className="h-11 text-base"
                />
              </div>
              <div className="sm:col-span-2">
                <Button type="submit" disabled={submitting} className="h-11 w-full sm:w-auto">
                  {submitting ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…</>
                  ) : (
                    <><Plus className="mr-2 h-4 w-4" /> Add Event</>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Events list */}
        <Card className="rounded-2xl shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-base">
                Events
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-normal text-muted-foreground">
                  {sortedEvents.length} total · {activeCount} active
                </span>
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={handleResync}
                disabled={resyncing}
                title="Re-mirror all events from Firebase into Supabase checkpd.events"
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${resyncing ? 'animate-spin' : ''}`} />
                {resyncing ? 'Resyncing…' : 'Resync'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" /> กำลังโหลด…
              </div>
            ) : sortedEvents.length === 0 ? (
              <div className="rounded-xl border border-dashed py-12 text-center text-sm text-muted-foreground">
                ยังไม่มี event — เพิ่มได้จากฟอร์มด้านบน
              </div>
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden overflow-x-auto rounded-md border md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name EN</TableHead>
                        <TableHead>Name TH</TableHead>
                        <TableHead>Active</TableHead>
                        <TableHead className="hidden lg:table-cell">Doc ID</TableHead>
                        <TableHead className="hidden lg:table-cell">Created At</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedEvents.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">
                            {editingId === item.id ? (
                              <Input
                                value={editNameEn}
                                onChange={(e) => setEditNameEn(e.target.value)}
                                disabled={savingEditId === item.id}
                                className="h-9"
                              />
                            ) : (
                              item.name?.en ?? '-'
                            )}
                          </TableCell>
                          <TableCell>
                            {editingId === item.id ? (
                              <Input
                                value={editNameTh}
                                onChange={(e) => setEditNameTh(e.target.value)}
                                disabled={savingEditId === item.id}
                                className="h-9"
                              />
                            ) : (
                              item.name?.th ?? '-'
                            )}
                          </TableCell>
                          <TableCell><ActiveToggle item={item} /></TableCell>
                          <TableCell className="hidden font-mono text-xs text-muted-foreground lg:table-cell">
                            {item.id}
                          </TableCell>
                          <TableCell className="hidden whitespace-nowrap text-sm text-muted-foreground lg:table-cell">
                            {formatDate(item.createdAt)}
                          </TableCell>
                          <TableCell className="space-x-1 text-right">
                            {editingId === item.id ? (
                              <>
                                <Button size="sm" onClick={() => handleSaveEdit(item.id)} disabled={savingEditId === item.id}>
                                  {savingEditId === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                                </Button>
                                <Button variant="outline" size="sm" onClick={cancelEdit} disabled={savingEditId === item.id}>
                                  <X className="h-4 w-4" />
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button variant="outline" size="sm" onClick={() => startEdit(item)} disabled={deletingId === item.id || togglingId === item.id}>
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button variant="destructive" size="sm" onClick={() => handleDeleteEvent(item.id)} disabled={deletingId === item.id || togglingId === item.id}>
                                  {deletingId === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                </Button>
                              </>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile cards */}
                <div className="space-y-3 md:hidden">
                  {sortedEvents.map((item) => (
                    <div key={item.id} className="rounded-xl border bg-card p-4 shadow-sm">
                      {editingId === item.id ? (
                        <div className="space-y-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Name (EN)</Label>
                            <Input value={editNameEn} onChange={(e) => setEditNameEn(e.target.value)} disabled={savingEditId === item.id} className="h-11 text-base" />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Name (TH)</Label>
                            <Input value={editNameTh} onChange={(e) => setEditNameTh(e.target.value)} disabled={savingEditId === item.id} className="h-11 text-base" />
                          </div>
                          <div className="flex gap-2">
                            <Button className="h-11 flex-1" onClick={() => handleSaveEdit(item.id)} disabled={savingEditId === item.id}>
                              {savingEditId === item.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />} Save
                            </Button>
                            <Button variant="outline" className="h-11 flex-1" onClick={cancelEdit} disabled={savingEditId === item.id}>
                              <X className="mr-2 h-4 w-4" /> Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate font-medium">{item.name?.en ?? '-'}</p>
                              <p className="truncate text-sm text-muted-foreground">{item.name?.th ?? '-'}</p>
                            </div>
                            <ActiveToggle item={item} />
                          </div>
                          <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                            <p className="flex items-center gap-1.5">
                              <Hash className="h-3 w-3 shrink-0" />
                              <span className="truncate font-mono">{item.id}</span>
                            </p>
                            <p className="flex items-center gap-1.5">
                              <CalendarClock className="h-3 w-3 shrink-0" />
                              {formatDate(item.createdAt)}
                            </p>
                          </div>
                          <div className="mt-3 flex gap-2 border-t pt-3">
                            <Button variant="outline" className="h-10 flex-1" onClick={() => startEdit(item)} disabled={deletingId === item.id || togglingId === item.id}>
                              <Pencil className="mr-2 h-4 w-4" /> Edit
                            </Button>
                            <Button variant="destructive" className="h-10 flex-1" onClick={() => handleDeleteEvent(item.id)} disabled={deletingId === item.id || togglingId === item.id}>
                              {deletingId === item.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />} Delete
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </SidebarLayout>
  )
}
