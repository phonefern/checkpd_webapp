"use client"

import { useMemo, useState } from "react"
import { ChevronDown, Plus, X } from "lucide-react"

import otherDiagnosisData from "@/app/component/questions/other_diagnosis_dropdown.json"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import {
  isCustom,
  parseOther,
  serializeOther,
  type OtherDiagnosisTaxonomy,
} from "@/lib/otherDiagnosis"

const taxonomy = otherDiagnosisData as OtherDiagnosisTaxonomy

type OtherDiagnosisSelectProps = {
  value: string | null | undefined
  onChange: (next: string | null) => void
  disabled?: boolean
  className?: string
  mode?: "full" | "filter"
}

export function OtherDiagnosisSelect({
  value,
  onChange,
  disabled = false,
  className,
  mode = "full",
}: OtherDiagnosisSelectProps) {
  const [customText, setCustomText] = useState("")
  const items = useMemo(() => parseOther(value), [value])
  const selected = useMemo(() => new Set(items), [items])

  const setItems = (nextItems: string[]) => {
    onChange(serializeOther(nextItems))
  }

  const addItem = (item: string) => {
    const next = item.trim()
    if (!next || selected.has(next)) return
    setItems([...items, next])
  }

  const removeItem = (index: number) => {
    setItems(items.filter((_, itemIndex) => itemIndex !== index))
  }

  const addCustom = () => {
    const next = customText.trim()
    if (!next) return
    addItem(next)
    setCustomText("")
  }

  const chips = (
    <div className={cn("flex flex-wrap gap-2", mode === "full" && "min-h-8")}>
      {items.length === 0 ? (
        mode === "full" ? <span className="text-sm text-slate-400">-</span> : null
      ) : (
        items.map((item, index) => {
          const custom = isCustom(item, taxonomy)
          return (
            <Badge
              key={`${item}-${index}`}
              variant="outline"
              className={cn(
                "max-w-full gap-1 rounded-md px-2 py-1 text-left whitespace-normal",
                custom
                  ? "border-amber-300 bg-amber-50 text-amber-800"
                  : "border-slate-300 bg-slate-50 text-slate-800"
              )}
            >
              <span className="break-words">{item}</span>
              <button
                type="button"
                onClick={() => removeItem(index)}
                disabled={disabled}
                className="rounded-sm p-0.5 text-slate-500 hover:bg-slate-200 hover:text-slate-900 disabled:pointer-events-none"
                aria-label={`Remove ${item}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )
        })
      )}
    </div>
  )

  const picker = (
    <>
      <select
        value=""
        onChange={(event) => {
          addItem(event.target.value)
          event.target.value = ""
        }}
        disabled={disabled}
        className="w-full rounded-md border border-slate-300 bg-white p-2 text-sm disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
      >
        <option value="">Select diagnosis</option>
        {taxonomy.map((group) => (
          <optgroup key={group.category} label={group.category}>
            {group.diagnosis.map((diagnosis) => (
              <option key={diagnosis} value={diagnosis} disabled={selected.has(diagnosis)}>
                {diagnosis}
              </option>
            ))}
          </optgroup>
        ))}
      </select>

      <div className="flex gap-2">
        <Input
          value={customText}
          onChange={(event) => setCustomText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault()
              addCustom()
            }
          }}
          placeholder="Custom diagnosis"
          disabled={disabled}
          className="min-w-0 flex-1"
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={addCustom}
          disabled={disabled || customText.trim() === ""}
          aria-label="Add custom diagnosis"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </>
  )

  if (mode === "filter") {
    const summary =
      items.length === 0 ? "All other diagnosis" : items.length === 1 ? items[0] : `${items.length} selected`

    return (
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            className={cn(
              "flex h-10 w-full items-center justify-between gap-2 rounded-md border border-gray-300 bg-white px-3 text-left text-sm shadow-xs transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500",
              items.length === 0 && "text-slate-500",
              className
            )}
          >
            <span className="min-w-0 truncate">{summary}</span>
            <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[360px] max-w-[calc(100vw-2rem)] space-y-3 p-3">
          {items.length > 0 && chips}
          <div className="space-y-2">{picker}</div>
        </PopoverContent>
      </Popover>
    )
  }

  return (
    <div
      className={cn(
        "space-y-3 rounded-md border border-slate-200 bg-white p-3",
        disabled && "bg-slate-50 opacity-80",
        className
      )}
    >
      {chips}
      {picker}
    </div>
  )
}
