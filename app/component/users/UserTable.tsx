'use client'
// app/component/users/UserTable.tsx
import { User, conditionOptions, provinceOptions, formatToThaiTime } from '@/app/types/user'
import { Pencil, Check, X } from "lucide-react";

interface UserTableProps {
  users: User[]
  editingId: string | null
  currentPage: number
  itemsPerPage: number
  handleConditionChange: (id: string, value: string) => void
  handleProvinceChange: (id: string, value: string) => void
  handleOtherChange: (id: string, value: string) => void
  handleAreaChange: (id: string, value: string) => void
  handleSave: (id: string, condition: string | null, province: string | undefined, other?: string, area?: string) => void
  setEditingId: (id: string | null) => void
}

export default function UserTable({
  users,
  editingId,
  currentPage,
  itemsPerPage,
  handleConditionChange,
  handleProvinceChange,
  handleOtherChange,
  handleAreaChange,
  handleSave,
  setEditingId
}: UserTableProps) {
  return (
    <div className="w-full">

      {/* DESKTOP TABLE */}
      <div className="hidden md:block overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">#</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Patient ID</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Name</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Source</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Age/Gender</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Location</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Recorded</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Risk</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Condition</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Other</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Area</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((user, index) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-4 py-4 text-sm text-gray-500">{(currentPage - 1) * itemsPerPage + index + 1}</td>
                <td className="px-4 py-4 text-sm">
                  <div className="font-medium text-gray-900">{user.id}</div>
                  <div className="text-gray-500">{user.thaiid}</div>
                </td>
                <td className="px-4 py-4 text-sm">
                  <div className="font-medium text-gray-900">{user.firstname} {user.lastname}</div>
                  <div className="text-gray-500">{user.record_id}</div>
                </td>
                <td className="px-4 py-4 text-sm text-gray-900">{user.source || '-'}</td>
                <td className="px-4 py-4 text-sm">
                  <div>{user.age} years</div>
                  <div className="text-gray-500">{user.gender || '-'}</div>
                </td>
                <td className="px-4 py-4 text-sm">
                  {editingId === user.id ? (
                    <select
                      value={user.province || ''}
                      onChange={(e) => handleProvinceChange(user.id, e.target.value)}
                      className="block w-full border rounded p-2"
                    >
                      {provinceOptions.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  ) : (
                    <>
                      <div className="text-gray-900">{user.province || '-'}</div>
                      <div className="text-gray-500">{user.region || '-'}</div>
                    </>
                  )}
                </td>
                <td className="px-4 py-4 text-sm text-gray-900">{formatToThaiTime(user.timestamp)}</td>
                <td className="px-4 py-4 text-sm">
                  {user.prediction_risk === true && (
                    <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">High Risk</span>
                  )}
                  {user.prediction_risk === false && (
                    <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">Low Risk</span>
                  )}
                  {user.prediction_risk === null && (
                    <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">No Data</span>
                  )}
                </td>
                <td className="px-4 py-4 text-sm">
                  {editingId === user.id ? (
                    <select
                      value={user.condition || ''}
                      onChange={(e) => handleConditionChange(user.id, e.target.value)}
                      className="block w-full border rounded p-2"
                    >
                      {conditionOptions.filter(opt => opt.value).map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  ) : (
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${!user.condition || user.condition === 'Not specified' ? 'bg-gray-100 text-gray-800' :
                      user.condition === 'pd' || user.condition === 'pdm' ? 'bg-purple-100 text-purple-800' :
                        user.condition === 'ctrl' ? 'bg-green-100 text-green-800' :
                          'bg-yellow-100 text-yellow-800'
                      }`}>                      {user.condition || 'Not specified'}
                    </span>
                  )}
                </td>
                <td className="px-4 py-4 text-sm">
                  {editingId === user.id ? (
                    <input type="text" className="w-full border rounded p-2" value={user.other || ''} onChange={(e) => handleOtherChange(user.id, e.target.value)} />
                  ) : (
                    user.other || '-'
                  )}
                </td>
                <td className="px-4 py-4 text-sm">
                  {editingId === user.id ? (
                    <input type="text" className="w-full border rounded p-2" value={user.area || ''} onChange={(e) => handleAreaChange(user.id, e.target.value)} />
                  ) : (
                    user.area || '-'
                  )}
                </td>
                <td className="px-4 py-4 text-right text-sm">
                  {editingId === user.id ? (
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => handleSave(user.id, user.condition, user.province, user.other, user.area)}
                        className="px-3 py-1.5 rounded-lg bg-green-500 text-white hover:bg-green-600 transition"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-3 py-1.5 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 transition"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setEditingId(user.id)}
                      className="px-3 py-1.5 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition shadow-sm"
                    >
                      Edit
                    </button>
                  )}
                </td>


              </tr>
            ))}
          </tbody>
        </table>
      </div>


      {/* MOBILE CARD VIEW */}
      <div className="md:hidden space-y-4">
        {users.map((user, index) => (
          <div key={user.id} className="border rounded-xl shadow-sm p-4 bg-white">
            <div className="flex justify-between items-center mb-2">
              <div className="text-sm text-gray-500">#{(currentPage - 1) * itemsPerPage + index + 1}</div>
              <button
                onClick={() => setEditingId(user.id)}
                className="text-blue-600 text-sm"
              >Edit</button>
            </div>

            <div className="text-lg font-semibold">{user.firstname} {user.lastname}</div>
            <div className="text-sm text-gray-500 mb-3">ID: {user.id}</div>

            <div className="text-sm mb-1">Age: {user.age}</div>
            <div className="text-sm mb-1">Gender: {user.gender || '-'}</div>
            <div className="text-sm mb-1">Province: {user.province || '-'}</div>
            <div className="text-sm mb-1">Recorded: {formatToThaiTime(user.timestamp)}</div>

            <div className="mt-3">
              {user.prediction_risk === true && <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">High Risk</span>}
              {user.prediction_risk === false && <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">Low Risk</span>}
              {user.prediction_risk === null && <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">No Data</span>}
            </div>
          </div>
        ))}
      </div>

    </div>
  )
}
