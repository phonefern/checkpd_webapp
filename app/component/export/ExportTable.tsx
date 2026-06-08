'use client'

import TablePagination from '@/app/component/users/Pagination'
import { formatToThaiTime, getRecordKey, type ExportUser } from '@/lib/exportZip'
import { EXPORT_ITEMS_PER_PAGE } from './useExportRecords'

type Props = {
  users: ExportUser[]
  loading: boolean
  currentPage: number
  totalPages: number
  totalCount: number
  selectedUsers: Set<string>
  selectAll: boolean
  setSelectAll: (value: boolean) => void
  setCurrentPage: (page: number) => void
  onUserSelect: (user: ExportUser) => void
}

function RiskBadge({ risk }: { risk: boolean | null }) {
  if (risk === true) return <span className="inline-flex rounded-full bg-red-100 px-2 text-xs font-semibold leading-5 text-red-800">High Risk</span>
  if (risk === false) return <span className="inline-flex rounded-full bg-green-100 px-2 text-xs font-semibold leading-5 text-green-800">Low Risk</span>
  return <span className="inline-flex rounded-full bg-gray-100 px-2 text-xs font-semibold leading-5 text-gray-800">No Data</span>
}

function ConditionBadge({ condition }: { condition?: string | null }) {
  return (
    <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
      !condition || condition === 'Not specified' ? 'bg-gray-100 text-gray-800' :
      condition === 'pd' || condition === 'pdm' ? 'bg-purple-100 text-purple-800' :
      condition === 'cdt7' ? 'bg-blue-100 text-blue-800' :
      condition === 'ctrl' ? 'bg-green-100 text-green-800' :
      'bg-yellow-100 text-yellow-800'
    }`}>
      {condition || 'Not specified'}
    </span>
  )
}

export default function ExportTable({
  users,
  loading,
  currentPage,
  totalPages,
  totalCount,
  selectedUsers,
  selectAll,
  setSelectAll,
  setCurrentPage,
  onUserSelect,
}: Props) {
  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-slate-700" />
      </div>
    )
  }

  return (
    <>
      {/* ── Desktop / tablet: scrollable table ── */}
      <div className="hidden overflow-x-auto rounded-lg border border-gray-200 md:block">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700">
                <input
                  type="checkbox"
                  checked={selectAll}
                  onChange={(e) => setSelectAll(e.target.checked)}
                  className="rounded border-gray-300 text-slate-900 focus:ring-slate-500"
                />
              </th>
              <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700 lg:table-cell">#</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700">Patient ID</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700">Name</th>
              <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700 xl:table-cell">Source</th>
              <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700 lg:table-cell">Age/Gender</th>
              <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700 lg:table-cell">Location</th>
              <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700 xl:table-cell">Recorded</th>
              <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700 xl:table-cell">Last Update</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700">Risk</th>
              <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700 sm:table-cell">Condition</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {users.map((user, index) => (
              <tr key={`${getRecordKey(user)}||${user.last_update || index}`} className="hover:bg-gray-50">
                <td className="whitespace-nowrap px-4 py-4">
                  <input
                    type="checkbox"
                    checked={selectedUsers.has(getRecordKey(user))}
                    onChange={() => onUserSelect(user)}
                    className="rounded border-gray-300 text-slate-900 focus:ring-slate-500"
                  />
                </td>
                <td className="hidden whitespace-nowrap px-4 py-4 text-sm text-gray-500 lg:table-cell">
                  {(currentPage - 1) * EXPORT_ITEMS_PER_PAGE + index + 1}
                </td>
                <td className="whitespace-nowrap px-4 py-4">
                  <div className="text-sm font-medium text-gray-900">{user.id}</div>
                  <div className="text-sm text-gray-500">{user.record_id || '-'}</div>
                  <div className="text-sm text-gray-500">{user.thaiid}</div>
                </td>
                <td className="whitespace-nowrap px-4 py-4">
                  <div className="text-sm font-medium text-gray-900">
                    {user.firstname} {user.lastname}
                  </div>
                  <div className="text-sm text-gray-500">{user.recorder}</div>
                </td>
                <td className="hidden whitespace-nowrap px-4 py-4 xl:table-cell">
                  <div className="text-sm font-medium text-gray-900">{user.source || '-'}</div>
                </td>
                <td className="hidden whitespace-nowrap px-4 py-4 lg:table-cell">
                  <div className="text-sm text-gray-900">{user.age} years</div>
                  <div className="text-sm text-gray-500">{user.gender || '-'}</div>
                </td>
                <td className="hidden whitespace-nowrap px-4 py-4 lg:table-cell">
                  <div className="text-sm text-gray-900">{user.province || '-'}</div>
                  <div className="text-sm text-gray-500">{user.region || '-'}</div>
                </td>
                <td className="hidden whitespace-nowrap px-4 py-4 xl:table-cell">
                  <div className="text-sm text-gray-900">{formatToThaiTime(user.timestamp)}</div>
                </td>
                <td className="hidden whitespace-nowrap px-4 py-4 xl:table-cell">
                  <div className="text-sm text-gray-900">{formatToThaiTime(user.last_update)}</div>
                </td>
                <td className="whitespace-nowrap px-4 py-4"><RiskBadge risk={user.prediction_risk} /></td>
                <td className="hidden whitespace-nowrap px-4 py-4 sm:table-cell"><ConditionBadge condition={user.condition} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Mobile: card list ── */}
      <div className="space-y-3 md:hidden">
        <label className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700">
          <input
            type="checkbox"
            checked={selectAll}
            onChange={(e) => setSelectAll(e.target.checked)}
            className="rounded border-gray-300 text-slate-900 focus:ring-slate-500"
          />
          เลือกทั้งหมด (ตามตัวกรอง)
        </label>

        {users.map((user, index) => {
          const checked = selectedUsers.has(getRecordKey(user))
          return (
            <div
              key={`${getRecordKey(user)}||${user.last_update || index}`}
              className={`rounded-lg border bg-white p-4 shadow-sm transition-colors ${checked ? 'border-emerald-400 ring-1 ring-emerald-200' : 'border-gray-200'}`}
            >
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onUserSelect(user)}
                  className="mt-1 rounded border-gray-300 text-slate-900 focus:ring-slate-500"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="truncate text-sm font-semibold text-gray-900">
                      {user.firstname} {user.lastname}
                    </h3>
                    <span className="shrink-0 text-xs text-gray-400">
                      #{(currentPage - 1) * EXPORT_ITEMS_PER_PAGE + index + 1}
                    </span>
                  </div>
                  <p className="truncate text-xs text-gray-500">ID: {user.id}</p>
                  <p className="truncate text-xs text-gray-500">Record: {user.record_id || '-'}</p>
                  <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-gray-600">
                    <span>{user.age} ปี · {user.gender || '-'}</span>
                    <span className="truncate">{user.province || '-'}</span>
                    <span className="col-span-2 truncate text-gray-400">{formatToThaiTime(user.timestamp)}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <RiskBadge risk={user.prediction_risk} />
                    <ConditionBadge condition={user.condition} />
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <TablePagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalCount={totalCount}
        itemsPerPage={EXPORT_ITEMS_PER_PAGE}
        setCurrentPage={setCurrentPage}
      />
    </>
  )
}
