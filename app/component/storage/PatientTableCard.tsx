'use client'

import RecordDropdown from './RecordDropdown'

type SelectedDataset = {
    patientId: string
    recordId: string
    bucketPath: string
}

type Props = {
    data: any[]
    page: number
    pageSize: number

    selectedDatasets: SelectedDataset[]
    selectAll: boolean
    onToggleSelect: (patientId: string, recordId: string) => void

    sawKeys: string[]
    onSaw: (key: string) => void

    selectedTests: string[]
}

export default function PatientTableCard({
    data,
    page,
    pageSize,
    selectedDatasets,
    selectAll,
    onToggleSelect,
    sawKeys,
    onSaw,
    selectedTests,
}: Props) {
    return (
        <div className="space-y-4 p-4">
            {data.map((row, index) => {
                const key = `${row.id}-${row.record_id}`
                const bucketPath = `checkpd/${row.id}/${row.record_id}`

                const isSelected = selectedDatasets.some(
                    d => d.bucketPath === bucketPath
                )

                return (
                    <div
                        key={key}
                        className="border border-purple-900 rounded-lg p-4 bg-gray-50 space-y-3"
                    >
                        {/* Header */}
                        <div className="flex justify-between items-center">
                            <span className="text-m text-gray-500">
                                # {(page - 1) * pageSize + index + 1}
                            </span>

                            <input
                                type="checkbox"
                                checked={selectAll || isSelected}
                                onChange={() =>
                                    onToggleSelect(row.id, row.record_id)
                                }
                                className="scale-200 accent-purple-700"
                            />

                        </div>

                        {/* Name */}
                        <div className="font-semibold text-gray-900">
                            {row.firstname} {row.lastname}
                        </div>

                        {/* ID */}
                        <div className="text-sm text-gray-600">
                            ID: {row.id}
                        </div>

                        {/* Tags */}
                        <div className="flex flex-wrap gap-2 text-xs">
                            {row.condition && (
                                <span className={`px-2 py-1 rounded-full text-xs ${conditionUI.color}`}>
                                    {conditionUI.label}
                                </span>
                            )}
                            {row.area && (
                                <span className="px-2 py-1 rounded bg-gray-200">
                                    {row.area}
                                </span>
                            )}
                        </div>

                        {/* Action */}
                        <button
                            className="text-purple-700 text-sm underline"
                            onClick={() => onSaw(key)}
                        >
                            {sawKeys.includes(key)
                                ? 'Hide Details'
                                : 'Record Details'}
                        </button>

                        {/* Dropdown */}
                        {sawKeys.includes(key) && (
                            <RecordDropdown
                                userId={row.id}
                                firstname={row.firstname}
                                lastname={row.lastname}
                                condition={row.condition}
                                open
                                onToggle={() => onSaw(key)}
                                selectedTests={selectedTests}
                            />
                        )}
                    </div>
                )
            })}
        </div>
    )
}
