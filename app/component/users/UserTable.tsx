'use client'
// app/component/users/UserTable.tsx
import { User, conditionOptions, provinceOptions, formatToThaiTime } from '@/app/types/user'

interface UserTableProps {
  users: User[]
  editingId: string | null
  currentPage: number
  itemsPerPage: number
  handleConditionChange: (id: string, value: string) => void
  handleProvinceChange: (id: string, value: string) => void
  handleOtherChange: (id: string, value: string) => void
  handleSave: (id: string, condition: string | null, province: string | undefined, other?: string) => void
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
  handleSave,
  setEditingId
}: UserTableProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-100">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">#</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Patient ID</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Name</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Source</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Age/Gender</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Location</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Recorded</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Risk</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Condition</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Other</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {users.map((user, index) => (
            <tr key={user.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {(currentPage - 1) * itemsPerPage + index + 1}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900">{user.id}</div>
                <div className="text-sm text-gray-500">{user.thaiid}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900">
                  {user.firstname} {user.lastname}
                </div>
                <div className="text-sm text-gray-500">{user.record_id}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900">{user.source || '-'}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900">{user.age} years</div>
                <div className="text-sm text-gray-500">{user.gender || '-'}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {editingId === user.id ? (
                  <select
                    value={user.province || ''}
                    onChange={(e) => handleProvinceChange(user.id, e.target.value)}
                    className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                  >
                    {provinceOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <>
                    <div className="text-sm text-gray-900">{user.province || '-'}</div>
                    <div className="text-sm text-gray-500">{user.region || '-'}</div>
                  </>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900">
                  {formatToThaiTime(user.timestamp)}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {user.prediction_risk === true && (
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                    High Risk
                  </span>
                )}
                {user.prediction_risk === false && (
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                    Low Risk
                  </span>
                )}
                {user.prediction_risk === null && (
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                    No Data
                  </span>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {editingId === user.id ? (
                  <select
                    value={user.condition || ''}
                    onChange={(e) => handleConditionChange(user.id, e.target.value)}
                    className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                  >
                    {conditionOptions.filter(opt => opt.value).map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    !user.condition || user.condition === 'Not specified' ? 'bg-gray-100 text-gray-800' :
                    user.condition === 'pd' || user.condition === 'pdm' ? 'bg-purple-100 text-purple-800' :
                    user.condition === 'ctrl' ? 'bg-green-100 text-green-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {user.condition || 'Not specified'}
                  </span>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {editingId === user.id ? (
                  <input
                    type="text"
                    value={user.other || ''}
                    onChange={(e) => handleOtherChange(user.id, e.target.value)}
                    className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                  />
                ) : (
                  <div className="text-sm font-medium text-gray-900">{user.other || '-'}</div>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                {editingId === user.id ? (
                  <div className="space-x-2">
                    <button
                      onClick={() => handleSave(user.id, user.condition, user.province, user.other)}
                      className="text-green-600 hover:text-green-900"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="text-gray-600 hover:text-gray-900"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setEditingId(user.id)}
                    className="text-blue-600 hover:text-blue-900"
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
  )
}