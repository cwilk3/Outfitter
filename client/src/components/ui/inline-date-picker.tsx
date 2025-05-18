import * as React from "react"
import { format } from "date-fns"
import { Calendar } from "@/components/ui/calendar"

interface InlineDatePickerProps {
  date: Date | undefined
  onSelect: (date: Date | undefined) => void
  disabled?: (date: Date) => boolean
}

export function InlineDatePicker({ date, onSelect, disabled }: InlineDatePickerProps) {
  return (
    <div className="w-full">
      <Calendar
        mode="single"
        selected={date}
        onSelect={onSelect}
        disabled={disabled}
        initialFocus
      />
      {date && (
        <div className="border-t mt-2 pt-2 text-center">
          <p className="text-sm text-muted-foreground">
            Selected: {format(date, "PPP")}
          </p>
        </div>
      )}
    </div>
  )
}