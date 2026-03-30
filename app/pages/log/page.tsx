'use client'

import { useEffect, useState } from 'react'
import { Bell, RefreshCw, Trash2 } from 'lucide-react'
import { getActivityLogs, clearActivityLogs } from '@/lib/activityLog'
import type { ActivityEntry, ActivityAction, ActivityPage } from '@/lib/activityLog'
import SidebarLayout from '@/app/component/layout/SidebarLayout'
import { Button } from '@/components/ui/button'

const ACTION_COLORS: Record<ActivityAction, string> = {
  LOGIN:  'bg-blue-100 text-blue-800',
  LOGOUT: 'bg-gray-100 text-gray-700',
  CREATE: 'bg-green-100 text-green-800',
  UPDATE: 'bg-yellow-100 text-yellow-800',
  DELETE: 'bg-red-100 text-red-800',
  VIEW:   'bg-purple-100 text-purple-800',
}

const PAGE_COLORS: Record<ActivityPage, string> = {
  auth:  'bg-slate-100 text-slate-700',
  users: 'bg-indigo-100 text-indigo-700',
  qa:    'bg-teal-100 text-teal-700',
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'medium' })
}

const ALL_ACTIONS: (ActivityAction | 'ALL')[] = ['ALL', 'LOGIN', 'LOGOUT', 'CREATE', 'UPDATE', 'DELETE', 'VIEW']
const ALL_PAGES: (ActivityPage | 'ALL')[] = ['ALL', 'auth', 'users', 'qa']

export default function LogPage() {
  const [logs, setLogs] = useState<ActivityEntry[]>([])
  const [filterAction, setFilterAction] = useState<ActivityAction | 'ALL'>('ALL')
  const [filterPage, setFilterPage] = useState<ActivityPage | 'ALL'>('ALL')

  const loadLogs = () => setLogs(getActivityLogs())

  useEffect(() => {
    loadLogs()
    window.addEventListener('focus', loadLogs)
    return () => window.removeEventListener('focus', loadLogs)
  }, [])

  const filtered = logs.filter((l) => {
    if (filterAction !== 'ALL' && l.action !== filterAction) return false
    if (filterPage !== 'ALL' && l.page !== filterPage) return false
    return true
  })

  const handleClear = () => {
    if (!confirm('ลบ activity log ทั้งหมด?')) return
    clearActivityLogs()
    setLogs([])
  }

  return (
    <SidebarLayout activePath="/pages/log" mainClassName="bg-gray-50">
      <div className="mx-auto max-w-7xl p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Activity Log</h1>
            <p className="text-sm text-gray-500 mt-1">{filtered.length} รายการ · เก็บใน device นี้ชั่วคราว</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={loadLogs} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClear}
              className="gap-2 text-red-600 border-red-200 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" />
              Clear All
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-4">
          <div className="flex gap-1.5 flex-wrap items-center">
            <span className="text-xs font-medium text-gray-500 mr-1">Action:</span>
            {ALL_ACTIONS.map((a) => (
              <button
                key={a}
                onClick={() => setFilterAction(a)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium border transition ${
                  filterAction === a
                    ? 'bg-gray-900 text-white border-gray-900'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                }`}
              >
                {a}
              </button>
            ))}
          </div>
          <div className="flex gap-1.5 flex-wrap items-center">
            <span className="text-xs font-medium text-gray-500 mr-1">Page:</span>
            {ALL_PAGES.map((p) => (
              <button
                key={p}
                onClick={() => setFilterPage(p)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium border transition ${
                  filterPage === p
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
              <Bell className="h-10 w-10 mb-3 opacity-30" />
              <p className="text-sm">ไม่มีกิจกรรมที่บันทึกไว้</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-500 w-44">เวลา</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500 w-24">Action</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500 w-20">Page</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">รายละเอียด</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500 w-48">User</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{formatTime(log.timestamp)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${ACTION_COLORS[log.action]}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${PAGE_COLORS[log.page]}`}>
                          {log.page}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{log.description}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs truncate max-w-[12rem]">{log.userEmail ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </SidebarLayout>
  )
}
