"use client"

import { type User, formatToThaiTime } from "@/app/types/user"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import UserActionsMenu from "./UserActionsMenu"

interface UserTableProps {
  users: User[]
  currentPage: number
  itemsPerPage: number
  onEdit: (user: User) => void
  onViewDetail: (user: User) => void
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
}: UserTableProps) {
  return (
    <div className="w-full space-y-4">
      <div className="hidden rounded-lg border border-border bg-card shadow-sm md:block">
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
              <TableRow key={`${user.id}-${user.record_id ?? index}`} className="group hover:bg-muted/30">
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
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="space-y-4 md:hidden">
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

