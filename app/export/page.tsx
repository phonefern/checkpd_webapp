'use client'

import { useState } from 'react'

export default function ExportPage() {
  const [thaiId, setThaiId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleExport = async () => {
    setLoading(true)
    setError('')

    try {
      const res = await fetch(`/api/export/${thaiId}`)
      if (!res.ok) {
        throw new Error('Failed to fetch data')
      }

      const { data } = await res.json()

      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${thaiId}_records.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err: any) {
      setError(err.message || 'Unexpected error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="p-6 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-4">Export Patient Records</h1>
      <input
        type="text"
        value={thaiId}
        onChange={(e) => setThaiId(e.target.value)}
        placeholder="Enter Thai ID"
        className="border border-gray-300 p-2 w-full rounded mb-4"
      />
      <button
        onClick={handleExport}
        disabled={!thaiId || loading}
        className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50"
      >
        {loading ? 'Exporting...' : 'Export JSON'}
      </button>

      {error && <p className="text-red-500 mt-4">{error}</p>}
    </main>
  )
}
