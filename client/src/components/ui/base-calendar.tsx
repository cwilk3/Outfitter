import * as React from "react"
import { Calendar as CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { Calendar } from "@/components/ui/calendar"

interface BaseCalendarProps {
  date: Date | undefined
  onSelect: (date: Date | undefined) => void
  disabled?: (date: Date) => boolean
}

export function BaseCalendar({ date, onSelect, disabled }: BaseCalendarProps) {
  return (
    <div className="w-full space-y-2">
      <Calendar
        mode="single"
        selected={date}
        onSelect={onSelect}
        disabled={disabled}
        className="rounded-md border"
      />
      
      {date && (
        <div className="text-center text-sm text-muted-foreground">
          <p>Selected: {format(date, "PPP")}</p>
        </div>
      )}
    </div>
  )
}