"use client"

import { MoreVertical, Eye, Pencil, Printer } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { type User } from "@/app/types/user"

interface UserActionsMenuProps {
  user: User
  onEdit: (user: User) => void
  onDetail: (user: User) => void
  isMobile?: boolean
}

export default function UserActionsMenu({ user, onEdit, onDetail, isMobile = false }: UserActionsMenuProps) {
  const canOpenDetail = Boolean(user.thaiid || user.record_id)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={
            isMobile
              ? "h-8 w-8 rounded-md border border-slate-200 bg-white p-0 text-slate-600 shadow-sm cursor-pointer"
              : "h-8 w-8 rounded-md border border-slate-200 bg-white p-0 text-slate-600 shadow-sm opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100 cursor-pointer"
          }
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-52 rounded-lg border-slate-200 bg-white p-1.5 shadow-lg"
      >
        <DropdownMenuLabel className="px-2.5 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
          Actions
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="mx-1 my-1 bg-slate-200" />
        <DropdownMenuItem
          disabled={!canOpenDetail}
          onClick={() => canOpenDetail && onDetail(user)}
          className="cursor-pointer rounded-md px-2.5 py-2 text-slate-700 focus:bg-slate-100 focus:text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Eye className="mr-2 h-4 w-4 text-slate-500" />
          Detail
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => onEdit(user)}
          className="cursor-pointer rounded-md px-2.5 py-2 text-slate-700 focus:bg-slate-100 focus:text-slate-950"
        >
          <Pencil className="mr-2 h-4 w-4 text-slate-500" />
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => window.open(`/api/pdf-v2/${user.id}?record_id=${user.record_id}`, "_blank")}
          className="cursor-pointer rounded-md px-2.5 py-2 text-slate-700 focus:bg-slate-100 focus:text-slate-950"
        >
          <Printer className="mr-2 h-4 w-4 text-slate-500" />
          Print
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

