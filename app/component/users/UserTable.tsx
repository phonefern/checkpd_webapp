"use client"
// components/user-table.tsx
import { type User, conditionOptions, provinceOptions, formatToThaiTime } from "@/app/types/user"
import { Pencil, Check, X, Printer, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"

interface UserTableProps {
  users: User[]
  editingId: string | null
  currentPage: number
  itemsPerPage: number
  handleConditionChange: (id: string, value: string) => void
  handleProvinceChange: (id: string, value: string) => void
  handleOtherChange: (id: string, value: string) => void
  handleAreaChange: (id: string, value: string) => void
  handleSave: (
    id: string,
    condition: string | null,
    province: string | undefined,
    other?: string,
    area?: string,
  ) => void
  setEditingId: (id: string | null) => void
  onViewDetail: (user: User) => void
  hasScreeningThaiId: (thaiid: string) => boolean
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
  setEditingId,
  onViewDetail,
  hasScreeningThaiId,
}: UserTableProps) {
  const getConditionBadge = (condition: string | null) => {
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

  const getRiskBadge = (risk: boolean | null) => {
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

  return (
    <div className="w-full space-y-4">
      {/* DESKTOP TABLE */}
      <div className="hidden md:block rounded-lg border border-border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="font-semibold">#</TableHead>
              <TableHead className="font-semibold">Patient ID</TableHead>
              <TableHead className="font-semibold">Name</TableHead>
              <TableHead className="font-semibold">Source</TableHead>
              <TableHead className="font-semibold">Age/Gender</TableHead>
              <TableHead className="font-semibold">Location</TableHead>
              <TableHead className="font-semibold">Recorded</TableHead>
              <TableHead className="font-semibold">Risk</TableHead>
              <TableHead className="font-semibold">Condition</TableHead>
              <TableHead className="font-semibold">Other</TableHead>
              <TableHead className="font-semibold">Area</TableHead>
              <TableHead className="text-right font-semibold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user, index) => (
              <TableRow key={user.id} className="hover:bg-muted/30">
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
                  {editingId === user.id ? (
                    <Select value={user.province || ""} onValueChange={(value) => handleProvinceChange(user.id, value)}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select province" />
                      </SelectTrigger>
                      <SelectContent>
                        {provinceOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <>
                      <div className="text-foreground">{user.province || "-"}</div>
                      <div className="text-xs text-muted-foreground">{user.region || "-"}</div>
                    </>
                  )}
                </TableCell>
                <TableCell className="text-sm text-foreground">{formatToThaiTime(user.timestamp)}</TableCell>
                <TableCell>{getRiskBadge(user.prediction_risk)}</TableCell>
                <TableCell>
                  {editingId === user.id ? (
                    <Select
                      value={user.condition || ""}
                      onValueChange={(value) => handleConditionChange(user.id, value)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select condition" />
                      </SelectTrigger>
                      <SelectContent>
                        {conditionOptions
                          .filter((opt) => opt.value)
                          .map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    getConditionBadge(user.condition)
                  )}
                </TableCell>
                <TableCell>
                  {editingId === user.id ? (
                    <Input
                      type="text"
                      value={user.other || ""}
                      onChange={(e) => handleOtherChange(user.id, e.target.value)}
                      className="w-full"
                    />
                  ) : (
                    <span className="text-foreground">{user.other || "-"}</span>
                  )}
                </TableCell>
                <TableCell>
                  {editingId === user.id ? (
                    <Input
                      type="text"
                      value={user.area || ""}
                      onChange={(e) => handleAreaChange(user.id, e.target.value)}
                      className="w-full"
                    />
                  ) : (
                    <span className="text-foreground">{user.area || "-"}</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {editingId === user.id ? (
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => handleSave(user.id, user.condition, user.province, user.other, user.area)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        <Check className="mr-1 h-4 w-4" />
                        Save
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                        <X className="mr-1 h-4 w-4" />
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-end gap-2">
                      {user.thaiid && hasScreeningThaiId(user.thaiid) && (
                        <Button size="sm" variant="outline" onClick={() => onViewDetail(user)} className="cursor-pointer">
                          <Eye className="mr-1 h-4 w-4" />
                          Detail
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingId(user.id)}
                        className="border-blue-600 text-blue-700 hover:bg-blue-50 dark:border-blue-400 dark:text-blue-400 dark:hover:bg-blue-950 cursor-pointer"
                      >
                        <Pencil className="mr-1 h-4 w-4" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(`/api/pdf/${user.id}?record_id=${user.record_id}`, "_blank")}
                        className="border-violet-600 text-violet-700 hover:bg-violet-50 dark:border-violet-400 dark:text-violet-400 dark:hover:bg-violet-950 cursor-pointer"
                      >
                        <Printer className="mr-1 h-4 w-4" />
                        Print
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* MOBILE CARD VIEW */}
      <div className="md:hidden space-y-4">
        {users.map((user, index) => (
          <Card key={user.id} className="shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start mb-2">
                <Badge variant="outline" className="text-xs">
                  #{(currentPage - 1) * itemsPerPage + index + 1}
                </Badge>
                <div className="flex gap-2">
                  {user.thaiid && hasScreeningThaiId(user.thaiid) && (
                    <Button size="sm" variant="ghost" onClick={() => onViewDetail(user)} className="h-8 text-xs">
                      <Eye className="mr-1 h-3 w-3" />
                      Detail
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => setEditingId(user.id)} className="h-8 text-xs">
                    <Pencil className="mr-1 h-3 w-3" />
                    Edit
                  </Button>
                </div>
              </div>
              <div className="space-y-1">
                <h3 className="font-semibold text-lg text-foreground">
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
              <div className="text-xs text-muted-foreground pt-1">Recorded: {formatToThaiTime(user.timestamp)}</div>
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
