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
      await addDoc(collection(db, 'events'), {
        active: true,
        createdAt: serverTimestamp(),
        name: { en, th },
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
      cancelEdit()
    } catch (err) {
      console.error(err)
      setError('Update event name failed')
    } finally {
      setSavingEditId(null)
    }
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl p-4 md:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Event Management</h1>
        <p className="text-sm text-muted-foreground">
          Add, edit, and delete data in Firestore collection `events`
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Add Event</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddEvent} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="event-en">Name (EN)</Label>
              <Input
                id="event-en"
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
                placeholder="e.g. Test"
                disabled={submitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="event-th">Name (TH)</Label>
              <Input
                id="event-th"
                value={nameTh}
                onChange={(e) => setNameTh(e.target.value)}
                placeholder="e.g. ทดสอบ"
                disabled={submitting}
              />
            </div>

            <div className="md:col-span-2">
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Saving...' : 'Add Event'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Events ({sortedEvents.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Doc ID</TableHead>
                  <TableHead>Name EN</TableHead>
                  <TableHead>Name TH</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedEvents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      No events
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedEvents.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono text-xs">{item.id}</TableCell>
                      <TableCell>
                        {editingId === item.id ? (
                          <Input
                            value={editNameEn}
                            onChange={(e) => setEditNameEn(e.target.value)}
                            disabled={savingEditId === item.id}
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
                          />
                        ) : (
                          item.name?.th ?? '-'
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant={item.active ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => handleToggleActive(item.id, item.active)}
                          disabled={togglingId === item.id || savingEditId === item.id}
                        >
                          {togglingId === item.id
                            ? 'Updating...'
                            : item.active
                              ? 'active: true'
                              : 'active: false'}
                        </Button>
                      </TableCell>
                      <TableCell>{formatDate(item.createdAt)}</TableCell>
                      <TableCell className="space-x-2 text-right">
                        {editingId === item.id ? (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleSaveEdit(item.id)}
                              disabled={savingEditId === item.id}
                            >
                              {savingEditId === item.id ? 'Saving...' : 'Save'}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={cancelEdit}
                              disabled={savingEditId === item.id}
                            >
                              Cancel
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => startEdit(item)}
                              disabled={deletingId === item.id || togglingId === item.id}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteEvent(item.id)}
                              disabled={deletingId === item.id || togglingId === item.id}
                            >
                              {deletingId === item.id ? 'Deleting...' : 'Delete'}
                            </Button>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
