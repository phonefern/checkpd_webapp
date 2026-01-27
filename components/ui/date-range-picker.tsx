"use client";

import * as React from "react";
import {
  format,
  getDaysInMonth,
  startOfMonth,
  addMonths,
  subMonths,
  isSameDay,
  isWithinInterval,
  startOfDay,
} from "date-fns";
import { th } from "date-fns/locale";
import {
  Calendar as CalendarIcon,
  ChevronUp,
  ChevronDown,
  ChevronDownIcon,
} from "lucide-react";
import type { DateRange } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DateRangePickerProps {
  dateRange: DateRange | undefined;
  onDateRangeChange: (range: DateRange | undefined) => void;
  className?: string;
}

type SelectionMode = "from" | "to";
type ViewMode = "days" | "yearMonth";

const months = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export function DateRangePicker({
  dateRange,
  onDateRangeChange,
  className,
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [selectionMode, setSelectionMode] =
    React.useState<SelectionMode>("from");
  const [viewDate, setViewDate] = React.useState(new Date());
  const [viewMode, setViewMode] = React.useState<ViewMode>("days");
  const [expandedYear, setExpandedYear] = React.useState<number | null>(null);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => currentYear - 2 + i);
  const weekDays = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  const daysInMonth = getDaysInMonth(viewDate);
  const firstDayOfMonth = startOfMonth(viewDate).getDay();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const prevMonth = subMonths(viewDate, 1);
  const daysInPrevMonth = getDaysInMonth(prevMonth);
  const prevMonthDays = Array.from(
    { length: firstDayOfMonth },
    (_, i) => daysInPrevMonth - firstDayOfMonth + i + 1
  );

  const totalCells = Math.ceil((firstDayOfMonth + daysInMonth) / 7) * 7;
  const nextMonthDays = Array.from(
    { length: totalCells - firstDayOfMonth - daysInMonth },
    (_, i) => i + 1
  );

  /* ---------- navigation ---------- */
  const handlePrevMonth = () => setViewDate(subMonths(viewDate, 1));
  const handleNextMonth = () => setViewDate(addMonths(viewDate, 1));

  /* ---------- selection ---------- */
  const handleDaySelect = (day: number) => {
    const newDate = startOfDay(
      new Date(viewDate.getFullYear(), viewDate.getMonth(), day)
    );

    if (selectionMode === "from") {
      onDateRangeChange({ from: newDate, to: undefined });
      setSelectionMode("to");
    } else {
      const from = dateRange?.from;
      if (from) {
        onDateRangeChange(
          newDate >= from ? { from, to: newDate } : { from: newDate, to: from }
        );
      }
      setSelectionMode("from");
    }
  };

  const handleClear = () => {
    setSelectionMode("from");
    onDateRangeChange(undefined);
  };

  const handleToday = () => {
    const today = startOfDay(new Date());
    setViewDate(today);
    if (selectionMode === "from") {
      onDateRangeChange({ from: today, to: undefined });
      setSelectionMode("to");
    } else {
      const from = dateRange?.from;
      if (from) {
        onDateRangeChange(
          today >= from ? { from, to: today } : { from: today, to: from }
        );
      }
      setSelectionMode("from");
    }
  };

  /* ---------- helpers ---------- */
  const isFromDate = (d: number) =>
    dateRange?.from &&
    isSameDay(
      new Date(viewDate.getFullYear(), viewDate.getMonth(), d),
      dateRange.from
    );

  const isToDate = (d: number) =>
    dateRange?.to &&
    isSameDay(
      new Date(viewDate.getFullYear(), viewDate.getMonth(), d),
      dateRange.to
    );

  const isInRange = (d: number) =>
    dateRange?.from &&
    dateRange?.to &&
    isWithinInterval(
      new Date(viewDate.getFullYear(), viewDate.getMonth(), d),
      { start: dateRange.from, end: dateRange.to }
    ) &&
    !isFromDate(d) &&
    !isToDate(d);

  const isToday = (d: number) =>
    isSameDay(
      new Date(viewDate.getFullYear(), viewDate.getMonth(), d),
      new Date()
    );

  /* ---------- year / month picker ---------- */
  const handleYearMonthClick = () => {
    setViewMode("yearMonth");
    setExpandedYear(viewDate.getFullYear());
  };

  const handleYearToggle = (year: number) => {
    setExpandedYear(expandedYear === year ? null : year);
  };

  const handleMonthSelect = (year: number, monthIndex: number) => {
    setViewDate(new Date(year, monthIndex, 1));
    setViewMode("days");
    setExpandedYear(null);
  };

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-[270px] h-[50px] justify-start text-base font-normal",
              !dateRange && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-3 h-4 w-4" />
            {dateRange?.from ? (
              dateRange.to ? (
                <>
                  {format(dateRange.from, "d MMM yyyy", { locale: th })} –{" "}
                  {format(dateRange.to, "d MMM yyyy", { locale: th })}
                </>
              ) : (
                <>
                  {format(dateRange.from, "d MMM yyyy", { locale: th })} –
                  เลือกวันสิ้นสุด
                </>
              )
            ) : (
              <span>เลือกช่วงวันที่</span>
            )}
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-[250px] p-0" align="end">
          <div className="p-3">
            {viewMode === "days" ? (
              <>
                {/* header */}
                <div className="mb-3 flex items-center justify-between">
                  <button
                    onClick={handleYearMonthClick}
                    className="flex items-center gap-1 text-sm font-medium hover:text-primary"
                  >
                    {format(viewDate, "MMMM yyyy")}
                    <ChevronDownIcon className="h-4 w-4" />
                  </button>

                  {/* 🔽 month control (changed from year) */}
                  <div className="flex flex-col">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-4 w-6"
                      onClick={handlePrevMonth}
                    >
                      <ChevronUp className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-4 w-6"
                      onClick={handleNextMonth}
                    >
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                {/* weekdays */}
                <div className="mb-1 grid grid-cols-7 text-center text-xs text-muted-foreground">
                  {weekDays.map((d) => (
                    <div key={d} className="h-8 w-8 flex items-center justify-center">
                      {d}
                    </div>
                  ))}
                </div>

                {/* calendar grid */}
                <div className="grid grid-cols-7">
                  {prevMonthDays.map((d, i) => (
                    <div
                      key={`p-${i}`}
                      className="h-8 w-8 flex items-center justify-center text-xs text-muted-foreground/40"
                    >
                      {d}
                    </div>
                  ))}

                  {days.map((d) => (
                    <div
                      key={d}
                      className={cn(
                        "relative h-8 w-8 flex items-center justify-center",
                        isInRange(d) && "bg-primary/10"
                      )}
                    >
                      <button
                        onClick={() => handleDaySelect(d)}
                        className={cn(
                          "h-7 w-7 rounded-full text-xs hover:bg-accent",
                          isFromDate(d) &&
                          "bg-primary text-primary-foreground",
                          isToDate(d) &&
                          "bg-primary text-primary-foreground",
                          isToday(d) &&
                          !isFromDate(d) &&
                          !isToDate(d) &&
                          "font-bold text-primary bg-blue-100"
                        )}
                      >
                        {d}
                      </button>
                    </div>
                  ))}

                  {nextMonthDays.map((d, i) => (
                    <div
                      key={`n-${i}`}
                      className="h-8 w-8 flex items-center justify-center text-xs text-muted-foreground/40"
                    >
                      {d}
                    </div>
                  ))}
                </div>

                {/* footer */}
                <div className="mt-3 flex justify-between border-t pt-3">
                  <Button variant="ghost" size="sm" onClick={handleClear}>
                    Clear
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleToday}>
                    Today
                  </Button>
                </div>

                <div className="mt-2 text-center text-xs text-muted-foreground">
                  {selectionMode === "from"
                    ? "เลือกวันเริ่มต้น"
                    : "เลือกวันสิ้นสุด"}
                </div>
              </>
            ) : (
              <>
                {/* year / month picker */}
                <div className="mb-3">
                  <button
                    onClick={() => setViewMode("days")}
                    className="flex items-center gap-1 text-sm font-medium hover:text-primary"
                  >
                    {format(viewDate, "MMMM yyyy")}
                    <ChevronDownIcon className="h-4 w-4" />
                  </button>
                </div>

                <div className="max-h-[280px] overflow-y-auto">
                  {years.map((year) => (
                    <div key={year} className="border-b last:border-b-0">
                      <button
                        onClick={() => handleYearToggle(year)}
                        className="flex w-full justify-between py-2 px-1 text-sm font-medium hover:text-primary"
                      >
                        {year}
                        <ChevronDown
                          className={cn(
                            "h-4 w-4 transition-transform",
                            expandedYear === year && "rotate-180"
                          )}
                        />
                      </button>

                      {expandedYear === year && (
                        <div className="grid grid-cols-4 gap-1 pb-2">
                          {months.map((m, i) => (
                            <button
                              key={m}
                              onClick={() => handleMonthSelect(year, i)}
                              className={cn(
                                "py-1.5 text-xs rounded hover:bg-accent",
                                viewDate.getFullYear() === year &&
                                viewDate.getMonth() === i &&
                                "bg-primary text-primary-foreground"
                              )}
                            >
                              {m}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
