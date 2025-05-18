import * as React from "react"
import { format } from "date-fns"
import { Calendar } from "@/components/ui/calendar"

interface VisibleDatePickerProps {
  date: Date | undefined
  onSelect: (date: Date | undefined) => void
  disabledDates?: (date: Date) => boolean
}

export function VisibleDatePicker({ date, onSelect, disabledDates }: VisibleDatePickerProps) {
  return (
    <div className="rounded-md border">
      <Calendar
        mode="single"
        selected={date}
        onSelect={onSelect}
        disabled={disabledDates}
        initialFocus
      />
      {date && (
        <div className="p-2 text-center border-t">
          <p className="text-xs font-medium">
            Selected: {format(date, "MMMM d, yyyy")}
          </p>
        </div>
      )}
    </div>
  )
}