"use client"

import { type User, formatToThaiTime } from "@/app/types/user"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react"
import UserActionsMenu from "./UserActionsMenu"

export function rowKey(user: User): string {
  return `${user.id}||${user.record_id ?? ""}`
}

export type SortColumn =
  | "id"
  | "firstname"
  | "source"
  | "age"
  | "province"
  | "timestamp"
  | "prediction_risk"
  | "condition"
  | "other"
  | "area"

export type SortDirection = "asc" | "desc"

// Sortable columns offered in the mobile picker (desktop uses clickable headers).
export const SORT_OPTIONS: { value: SortColumn; label: string }[] = [
  { value: "timestamp", label: "Recorded" },
  { value: "id", label: "Patient ID" },
  { value: "firstname", label: "Name" },
  { value: "source", label: "Source" },
  { value: "age", label: "Age" },
  { value: "province", label: "Location" },
  { value: "prediction_risk", label: "Risk" },
  { value: "condition", label: "Condition" },
  { value: "other", label: "Other" },
  { value: "area", label: "Area" },
]

interface UserTableProps {
  users: User[]
  currentPage: number
  itemsPerPage: number
  onEdit: (user: User) => void
  onViewDetail: (user: User) => void
  selectedKeys: Set<string>
  onSelectionChange: (keys: Set<string>) => void
  sortColumn: SortColumn
  sortDirection: SortDirection
  onSort: (column: SortColumn) => void
}

export function getConditionBadge(condition: string | null) {
  if (!condition || condition === "Not specified") {
    return (
      <Badge variant="outline" className="bg-muted">
        Not specified
      </Badge>
    )
  }
  if (condition === "pd" || condition === "pdm") {
    return (
      <Badge className="bg-violet-100 text-violet-800 hover:bg-violet-100 dark:bg-violet-900/30 dark:text-violet-300">
        {condition.toUpperCase()}
      </Badge>
    )
  }
  if (condition === "ctrl") {
    return (
      <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300">
        Control
      </Badge>
    )
  }
  return <Badge variant="secondary">{condition}</Badge>
}

export function getRiskBadge(risk: boolean | null) {
  if (risk === true) {
    return (
      <Badge variant="destructive" className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
        High Risk
      </Badge>
    )
  }
  if (risk === false) {
    return (
      <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300">
        Low Risk
      </Badge>
    )
  }
  return (
    <Badge variant="outline" className="bg-muted">
      No Data
    </Badge>
  )
}

export default function UserTable({
  users,
  currentPage,
  itemsPerPage,
  onEdit,
  onViewDetail,
  selectedKeys,
  onSelectionChange,
  sortColumn,
  sortDirection,
  onSort,
}: UserTableProps) {
  const pageKeys = users.map(rowKey)

  function SortableHead({
    column,
    label,
    className,
  }: {
    column: SortColumn
    label: string
    className?: string
  }) {
    const active = sortColumn === column
    return (
      <TableHead className={className}>
        <button
          type="button"
          onClick={() => onSort(column)}
          className={`group/sort -ml-1 inline-flex items-center gap-1 rounded px-1 py-0.5 font-semibold transition-colors hover:text-foreground ${
            active ? "text-foreground" : "text-muted-foreground"
          }`}
          title={`Sort by ${label}`}
        >
          {label}
          {active ? (
            sortDirection === "asc" ? (
              <ArrowUp className="h-3.5 w-3.5" />
            ) : (
              <ArrowDown className="h-3.5 w-3.5" />
            )
          ) : (
            <ChevronsUpDown className="h-3.5 w-3.5 opacity-40 group-hover/sort:opacity-70" />
          )}
        </button>
      </TableHead>
    )
  }
  const allPageSelected = pageKeys.length > 0 && pageKeys.every((k) => selectedKeys.has(k))
  const somePageSelected = pageKeys.some((k) => selectedKeys.has(k))

  function toggleAll() {
    const next = new Set(selectedKeys)
    if (allPageSelected) {
      pageKeys.forEach((k) => next.delete(k))
    } else {
      pageKeys.forEach((k) => next.add(k))
    }
    onSelectionChange(next)
  }

  function toggleRow(key: string) {
    const next = new Set(selectedKeys)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    onSelectionChange(next)
  }

  return (
    <div className="w-full space-y-4">
      <div className="hidden rounded-lg border border-border bg-card shadow-sm md:block">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="w-10">
                <input
                  type="checkbox"
                  checked={allPageSelected}
                  ref={(el) => { if (el) el.indeterminate = !allPageSelected && somePageSelected }}
                  onChange={toggleAll}
                  className="cursor-pointer accent-blue-600"
                  title="Select all on this page"
                />
              </TableHead>
              <TableHead className="font-semibold">#</TableHead>
              <SortableHead column="id" label="Patient ID" />
              <SortableHead column="firstname" label="Name" />
              <SortableHead column="source" label="Source" />
              <SortableHead column="age" label="Age/Gender" />
              <SortableHead column="province" label="Location" />
              <SortableHead column="timestamp" label="Recorded" />
              <SortableHead column="prediction_risk" label="Risk" />
              <SortableHead column="condition" label="Condition" />
              <SortableHead column="other" label="Other" />
              <SortableHead column="area" label="Area" />
              <TableHead className="text-right font-semibold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user, index) => {
              const key = rowKey(user)
              return (
              <TableRow key={`${user.id}-${user.record_id ?? index}`} className="group hover:bg-muted/30">
                <TableCell className="w-10">
                  <input
                    type="checkbox"
                    checked={selectedKeys.has(key)}
                    onChange={() => toggleRow(key)}
                    className="cursor-pointer accent-blue-600"
                  />
                </TableCell>
                <TableCell className="text-muted-foreground">{(currentPage - 1) * itemsPerPage + index + 1}</TableCell>
                <TableCell>
                  <div className="font-medium text-foreground">{user.id}</div>
                  <div className="text-xs text-muted-foreground">{user.thaiid}</div>
                </TableCell>
                <TableCell>
                  <div className="font-medium text-foreground">
                    {user.firstname} {user.lastname}
                  </div>
                  <div className="text-xs text-muted-foreground">{user.record_id}</div>
                </TableCell>
                <TableCell className="text-foreground">{user.source || "-"}</TableCell>
                <TableCell>
                  <div className="text-foreground">{user.age} years</div>
                  <div className="text-xs text-muted-foreground">{user.gender || "-"}</div>
                </TableCell>
                <TableCell>
                  <div className="text-foreground">{user.province || "-"}</div>
                  <div className="text-xs text-muted-foreground">{user.region || "-"}</div>
                </TableCell>
                <TableCell className="text-sm text-foreground">{formatToThaiTime(user.timestamp)}</TableCell>
                <TableCell>{getRiskBadge(user.prediction_risk)}</TableCell>
                <TableCell>{getConditionBadge(user.condition)}</TableCell>
                <TableCell>
                  <span className="text-foreground">{user.other || "-"}</span>
                </TableCell>
                <TableCell>
                  <span className="text-foreground">{user.area || "-"}</span>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end">
                    <UserActionsMenu user={user} onEdit={onEdit} onDetail={onViewDetail} />
                  </div>
                </TableCell>
              </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      <div className="space-y-4 md:hidden">
        <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 shadow-sm">
          <label htmlFor="mobile-sort" className="text-sm font-medium text-muted-foreground">
            Sort by
          </label>
          <select
            id="mobile-sort"
            value={sortColumn}
            onChange={(e) => onSort(e.target.value as SortColumn)}
            className="flex-1 rounded-md border border-input bg-background px-2 py-1.5 text-sm text-foreground"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => onSort(sortColumn)}
            className="inline-flex items-center gap-1 rounded-md border border-input bg-background px-2 py-1.5 text-sm font-medium text-foreground"
            title={sortDirection === "asc" ? "Ascending" : "Descending"}
          >
            {sortDirection === "asc" ? (
              <>
                <ArrowUp className="h-4 w-4" /> Asc
              </>
            ) : (
              <>
                <ArrowDown className="h-4 w-4" /> Desc
              </>
            )}
          </button>
        </div>
        {users.map((user, index) => (
          <Card key={`${user.id}-${user.record_id ?? index}`} className="shadow-sm">
            <CardHeader className="pb-3">
              <div className="mb-2 flex items-start justify-between">
                <Badge variant="outline" className="text-xs">
                  #{(currentPage - 1) * itemsPerPage + index + 1}
                </Badge>
                <UserActionsMenu user={user} onEdit={onEdit} onDetail={onViewDetail} isMobile />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-semibold text-foreground">
                  {user.firstname} {user.lastname}
                </h3>
                <p className="text-sm text-muted-foreground">ID: {user.id}</p>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Age:</span>{" "}
                  <span className="font-medium text-foreground">{user.age}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Gender:</span>{" "}
                  <span className="font-medium text-foreground">{user.gender || "-"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Province:</span>{" "}
                  <span className="font-medium text-foreground">{user.province || "-"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Source:</span>{" "}
                  <span className="font-medium text-foreground">{user.source || "-"}</span>
                </div>
              </div>
              <div className="pt-1 text-xs text-muted-foreground">Recorded: {formatToThaiTime(user.timestamp)}</div>
              <div className="flex gap-2 pt-2">
                {getRiskBadge(user.prediction_risk)}
                {getConditionBadge(user.condition)}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

