import * as React from "react"
import { Calendar as CalendarIcon } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { format, startOfDay } from "date-fns"

interface DirectCalendarProps {
  date?: Date
  onSelect: (date: Date | undefined) => void
  disabled?: (date: Date) => boolean
}

export function DirectCalendar({ date, onSelect, disabled }: DirectCalendarProps) {
  return (
    <div className="border rounded-md p-2">
      <Calendar
        mode="single"
        selected={date}
        onSelect={(date) => {
          onSelect(date);
        }}
        disabled={disabled || ((date) => isBefore(date, startOfDay(new Date())))}
        className="w-full"
      />
      {date && (
        <div className="p-2 text-center border-t mt-2">
          <p className="text-sm text-gray-600">
            Selected: <span className="font-medium">{format(date, "PPP")}</span>
          </p>
        </div>
      )}
    </div>
  )
}

// Helper function to check if a date is before another
function isBefore(date1: Date, date2: Date): boolean {
  return date1.getTime() < date2.getTime();
}