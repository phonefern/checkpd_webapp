import { Filter, X } from 'lucide-react'

interface Props {
  filteredCount: number
  totalCount: number
  activeFilters: string[]
  onRemoveFilter: (filter: string) => void
  onClearAllFilters: () => void
}

export default function PatientTableHeader({
  filteredCount,
  totalCount,
  activeFilters,
  onRemoveFilter,
  onClearAllFilters
}: Props) {
  return (
    <div className="mb-4 space-y-1">

      {/* Line 1 */}
      <h2 className="text-lg font-semibold">
        รายการผู้ป่วย
      </h2>

      {/* Line 2 */}
      <p className="text-b text-gray-600">
        {filteredCount} จากทั้งหมด {totalCount} คน
      </p>

      {/* Line 3 */}
      <div className="flex items-start gap-2 text-b">
        <Filter size={16} className="text-purple-700 mt-0.5" />
        <span className="text-gray-700">Filter :</span>

        {/* Badges */}
        <div className="flex flex-wrap gap-2">
          {activeFilters.length === 0 ? (
            <span className="text-gray-400">None</span>
          ) : (
            activeFilters.map((f) => (
              <button
                key={f}
                onClick={() => onRemoveFilter(f)}
                className="
                  flex items-center gap-1
                  px-2 py-0.5
                  rounded-full
                  bg-purple-100
                  border border-purple-700
                  text-purple-800
                  text-b
                "
              >
                {f}
                <X size={12} />
              </button>
            ))
          )}
        </div>

        {/* Clear all */}
        {activeFilters.length > 0 && (
          <button
            onClick={onClearAllFilters}
            className="ml-2 text-b text-white rounded-full bg-purple-900 px-2 py-0.5 hover:text-purple-200"
          >
            CLEAR ALL
          </button>
        )}
      </div>

    </div>
  )
}
