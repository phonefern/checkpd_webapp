'use client'

import { useEffect, useState } from 'react'
import { FolderDown } from 'lucide-react'
import {
    mapPredictionRiskLabel,
    mapConditionUI,
    mapTestStatusUI
} from './utils'
import RecordFilesDropdown from './RecordFilesDropdown'

type RecordItem = {
    record_id: string
    prediction_risk: boolean | null
    test_result: string
}

type Props = {
    userId: string
    firstname: string
    lastname: string
    condition: string
    open: boolean
    onToggle: () => void
    selectedTests?: string[]
}

export default function RecordDropdown({
    userId,
    firstname,
    lastname,
    condition,
    open,
    onToggle,
    selectedTests
}: Props) {
    const [records, setRecords] = useState<RecordItem[]>([])
    const [loading, setLoading] = useState(false)
    const [fetched, setFetched] = useState(false)
    const [openFiles, setOpenFiles] = useState<string | null>(null)

    const conditionUI = mapConditionUI(condition)

    useEffect(() => {
        if (!open || fetched) return

        const fetchRecords = async () => {
            setLoading(true)
            try {
                const res = await fetch(
                    `/api/storage/list-records?user_id=${userId}`
                )
                const data = await res.json()
                setRecords(Array.isArray(data) ? data : [])
                setFetched(true)
            } catch {
                setRecords([])
            } finally {
                setLoading(false)
            }
        }

        fetchRecords()
    }, [open, fetched, userId])

    if (!open) return null

    return (
        <div className="bg-gray-50 rounded-lg p-4 space-y-3">

            {/* ===== Header ===== */}
            <div
                className="flex items-center justify-between cursor-pointer"
                onClick={onToggle}
            >
                <div className="flex items-center gap-2">
                    <span className="font-semibold">
                        คุณ {firstname} {lastname}
                    </span>

                    {fetched && (
                        <span className="text-sm text-gray-600">
                            มี {records.length} Records
                        </span>
                    )}

                    <span
                        className={`px-2 py-1 rounded-full text-xs ${conditionUI.color}`}
                    >
                        {conditionUI.label}
                    </span>
                </div>

                <span className="text-sm text-purple-700">
                    {open ? 'ซ่อน' : 'แสดง'}
                </span>
            </div>

            {/* ===== Body ===== */}
            {loading && (
                <div className="text-sm text-gray-400">
                    กำลังโหลดข้อมูล record...
                </div>
            )}

            {!loading && records.map(r => {
                const riskUI = mapPredictionRiskLabel(r.prediction_risk)
                const testStatusUI = mapTestStatusUI(r.test_result)
                const isOpen = openFiles === r.record_id

                return (
                    <div key={r.record_id} className="space-y-2">

                        {/* ===== Record row ===== */}
                        <div
                            className="flex items-center justify-between border rounded px-4 py-2 bg-white cursor-pointer"
                            onClick={() =>
                                setOpenFiles(prev =>
                                    prev === r.record_id ? null : r.record_id
                                )
                            }
                        >
                            <div className="flex items-center gap-2">
                                <span className="font-mono text-sm">{r.record_id}</span>
                                <span className={`px-2 py-1 rounded-full text-xs ${riskUI.color}`}>
                                    {riskUI.label}
                                </span>
                                <span className={`px-2 py-1 rounded-full text-xs ${testStatusUI.color}`}>
                                    {testStatusUI.label}
                                </span>
                            </div>

                            <button
                                className="flex items-center gap-2 text-sm text-purple-700 hover:underline"
                                onClick={e => {
                                    e.stopPropagation()
                                    const testsQuery =
                                        selectedTests?.length
                                            ? `&tests=${selectedTests.join(',')}`
                                            : ''
                                    window.open(
                                        `/api/storage/download-zip?user_id=${userId}&record_id=${r.record_id}${testsQuery}`,
                                        '_blank'
                                    )
                                }}
                            >
                                <FolderDown size={16} />
                                Download ZIP
                            </button>
                        </div>

                        {/* ===== File-level (ONLY WHEN CLICKED) ===== */}
                        {isOpen && (
                            <RecordFilesDropdown
                                userId={userId}
                                recordId={r.record_id}
                            />
                        )}
                    </div>
                )
            })}
        </div>
    )
}
