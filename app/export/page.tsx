'use client'

import { useState } from 'react'
import { collection, getDocs, doc } from 'firebase/firestore'
import { firestore } from '@/lib/firebase'

export default function ExportPage() {
  const [thaiid, setThaiid] = useState('')
  const [loading, setLoading] = useState(false)

  const handleExport = async () => {
    if (!thaiid) return alert('Please enter a ThaiID')

    setLoading(true)

    try {
      const tempCollectionRef = collection(firestore, 'users', thaiid, 'temp')
      const snapshot = await getDocs(tempCollectionRef)

      if (snapshot.empty) {
        alert('No data found for this ThaiID.')
        setLoading(false)
        return
      }

      // สมมติ export อันแรกที่เจอ
      const docData = snapshot.docs[0].data()

      const recordedData = docData.recordedData
      if (!recordedData || !Array.isArray(recordedData)) {
        alert('No recordedData available in this document.')
        setLoading(false)
        return
      }

      // เตรียมข้อมูลสำหรับ export
      const exportObject = {
        thaiid,
        recordedData,
        exportedAt: new Date().toISOString(),
      }

      const blob = new Blob([JSON.stringify(exportObject, null, 2)], {
        type: 'application/json',
      })

      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `recorded_${thaiid}.json`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Export failed:', err)
      alert('Error occurred during export.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-md mx-auto">
      <h1 className="text-xl font-bold mb-4">Export Patient Data</h1>

      <input
        type="text"
        placeholder="Enter ThaiID"
        value={thaiid}
        onChange={(e) => setThaiid(e.target.value)}
        className="border p-2 w-full mb-4"
      />

      <button
        onClick={handleExport}
        disabled={loading}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Exporting...' : 'Export JSON'}
      </button>
    </div>
  )
}
