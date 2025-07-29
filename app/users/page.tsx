'use client'

import { Timestamp } from 'next/dist/server/lib/cache-handlers/types'
import { useEffect, useState } from 'react'




type User = {
  id: string
  firstname: string
  lastname: string
  age: number
  prediction_risk: boolean | null
  recorder: string
  condition: string
  province?: string
  region?: string
  gender?: string
  source?: string
  timestamp?: Timestamp
  last_update?: Timestamp
}

const formatToThaiTime = (timestamp: Timestamp | undefined) => {
  if (!timestamp) return '-'

  const date = new Date(timestamp as unknown as string | number)
  // บวกเวลา 7 ชั่วโมง (UTC+7)
  date.setHours(date.getHours() + 7)

  return date.toLocaleString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}


export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchId, setSearchId] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 100
  const [editingId, setEditingId] = useState<string | null>(null)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  useEffect(() => {
    const fetchUsers = async () => {
      const res = await fetch('/api/users')
      const data = await res.json()

      // Sort by timestamp (latest first)
      const sortedData = data.sort(
        (a: User, b: User) =>
          new Date(b.timestamp as unknown as string).getTime() -
          new Date(a.timestamp as unknown as string).getTime()
      )

      setUsers(sortedData)
      setFilteredUsers(sortedData)
      setLoading(false)
    }

    fetchUsers()
  }, [])


  const handleConditionChange = (id: string, value: string) => {
    setUsers((prev) =>
      prev.map((user) =>
        user.id === id ? { ...user, condition: value } : user
      )
    )
  }

  const handleSave = async (id: string, condition: string | null) => {
    const res = await fetch('/api/users/update-condition', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, condition }),
    })
    if (res.ok) {
      alert(' Updated successfully')
    } else {
      alert(' Failed to update')
    }
  }

useEffect(() => {
  const filtered = users.filter((user) => {
    const search = searchId.toLowerCase()
    const matchSearch =
      user.id.toLowerCase().includes(search) ||
      user.firstname.toLowerCase().includes(search) ||
      user.lastname.toLowerCase().includes(search)

    const timestamp = new Date(user.timestamp as unknown as string).getTime()
    const start = startDate ? new Date(startDate).getTime() : null
    const end = endDate ? new Date(endDate).getTime() + 86400000 : null // +1 วัน

    const inRange =
      (!start || timestamp >= start) && (!end || timestamp <= end)

    return matchSearch && inRange
  })

  setFilteredUsers(filtered)
  setCurrentPage(1)
}, [searchId, users, startDate, endDate])


  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const currentUsers = filteredUsers.slice(startIndex, startIndex + itemsPerPage)

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">PD Screening Data View System</h1>

      <div className="mb-4 flex items-center">
        <input
          type="text"
          placeholder="Search by ID, Recorder, Source, First Name, Last Name"
          value={searchId}
          onChange={(e) => setSearchId(e.target.value)}
          className="border border-gray-300 p-2 rounded w-64"
        />
        <p className="text-sm text-gray-500 mx-4">Showing {filteredUsers.length} results</p>
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="border p-2 rounded"
        />
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="border p-2 rounded"
        />
      </div>


      {loading ? (
        <p>Loading...</p>
      ) : (
        <>
          <table className="w-full border-collapse border border-gray-300 text-sm">
            <thead className="bg-gray">
              <tr>
                <th className="border p-2">#</th>
                <th className="border p-2">ID</th>
                <th className="border p-2">Recorder</th>
                <th className="border p-2">Source</th>
                <th className="border p-2">First Name</th>
                <th className="border p-2">Last Name</th>
                <th className="border p-2">Gender</th>
                <th className="border p-2">Province</th>
                <th className="border p-2">Region</th>
                <th className="border p-2">Age</th>
                <th className="border p-2">Timestamp</th>
                <th className="border p-2">Lastupdate</th>
                <th className="border p-2">Prediction Risk</th>
                <th className="border p-2">Condition</th>
                
              </tr>
            </thead>
            <tbody>
              {currentUsers.map((user, index) => (
                <tr key={user.id}>
                  <td className="border p-2">{startIndex + index + 1}</td>
                  <td className="border p-2">{user.id}</td> 
                  <td className="border p-2">{user.recorder}</td>
                  <td className="border p-2">{user.source || '-'}</td>
                  <td className="border p-2">{user.firstname}</td>
                  <td className="border p-2">{user.lastname}</td>
                  <td className="border p-2">{user.gender}</td>
                  <td className="border p-2">{user.province || '-'}</td>
                  <td className="border p-2">{user.region || '-'}</td>
                  <td className="border p-2">{user.age}</td>
                  <td className="border p-2">{formatToThaiTime(user.timestamp)}</td>
                  <td className="border p-2">{formatToThaiTime(user.last_update)}</td>

                  <td className="border p-2">
                    {user.prediction_risk === true && (
                      <span className="text-red-600 font-semibold">มีความเสี่ยง</span>
                    )}
                    {user.prediction_risk === false && (
                      <span className="text-green-600">ไม่มีความเสี่ยง</span>
                    )}
                    {user.prediction_risk === null && (
                      <span className="text-gray-400">ไม่มีข้อมูล</span>
                    )}
                  </td>
                  <td className="border p-2">
                    {editingId === user.id ? (
                      <select
                        value={user.condition || ''}
                        onChange={(e) => handleConditionChange(user.id, e.target.value)}
                        className="border rounded px-2 py-1"
                      >
                        <option value="">-- เลือก --</option>
                        <option value="cdt7">cdt7</option>
                        <option value="ctrl">ctrl</option>
                        <option value="pd">pd</option>
                        <option value="pdm">pdm</option>
                        <option value="pksm">pksm</option>
                        <option value="other">other</option>
                        <option value="">unknown</option>
                        <option value="nodiag">nodiag</option>
                        <option value="noresult">normal_no_predict</option>
                        <option value="normal">normal_check</option>
                      </select>
                    ) : (
                      <span className="font-medium text-blue-700">
                        {user.condition || <span className="text-gray-400">-</span>}
                      </span>
                    )}
                  </td>

                  <td className="border p-2">
                    {editingId === user.id ? (
                      <button
                        onClick={async () => {
                          await handleSave(user.id, user.condition)
                          setEditingId(null)
                        }}
                        className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded"
                      >
                        Save
                      </button>
                    ) : (
                      <button
                        onClick={() => setEditingId(user.id)}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded"
                      >
                        Edit
                      </button>
                    )}
                  </td>

                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="flex justify-between mt-4 items-center">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 border rounded disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-sm">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 border rounded disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  )
}

