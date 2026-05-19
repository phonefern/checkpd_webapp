"use client"

import TablePagination from "@/app/component/users/Pagination"
import { type DashboardTableRow } from "./types"

type Props = {
  rows: DashboardTableRow[]
  totalCount: number
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
}

function riskText(value: boolean | null): string {
  if (value === true) return "กลุ่มเสี่ยง"
  if (value === false) return "ไม่เสี่ยง"
  return "ไม่ทราบผล"
}

export default function DashboardUserTable({ rows, totalCount, currentPage, totalPages, onPageChange }: Props) {
  return (
    <div className="rounded-xl border bg-white">
      <div className="border-b px-4 py-3 text-sm font-semibold text-slate-700">รายชื่อผู้ถูกคัดกรอง ({totalCount.toLocaleString()})</div>
      <div className="overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs text-slate-500">
            <tr>
              <th className="px-3 py-2">เพศ</th>
              <th className="px-3 py-2">อายุ</th>
              <th className="px-3 py-2">จังหวัด</th>
              <th className="px-3 py-2">ผลการทำแบบทดสอบ</th>
              <th className="px-3 py-2">ความเสี่ยง</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td className="px-3 py-8 text-center text-slate-500" colSpan={5}>
                  ไม่พบข้อมูลตามเงื่อนไขที่เลือก
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.user_id} className="border-t">
                  <td className="px-3 py-2">{row.gender || "-"}</td>
                  <td className="px-3 py-2">{row.age ?? "-"}</td>
                  <td className="px-3 py-2">{row.province || "-"}</td>
                  <td className="px-3 py-2">{row.test_result || "-"}</td>
                  <td className="px-3 py-2">{riskText(row.prediction_risk)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <TablePagination
        currentPage={currentPage}
        totalPages={Math.max(totalPages, 1)}
        totalCount={totalCount}
        itemsPerPage={20}
        setCurrentPage={onPageChange}
      />
    </div>
  )
}
