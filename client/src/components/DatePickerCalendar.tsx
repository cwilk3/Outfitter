import React from "react";
import { Calendar } from "@/components/ui/calendar";
import { DateRange } from "react-day-picker";
import { addDays, format, isBefore, isAfter, isSameDay, startOfDay } from "date-fns";

interface DatePickerCalendarProps {
  dateRange: DateRange | undefined;
  onDateChange: (range: DateRange | undefined) => void;
  experienceDuration: number;
  disableDates?: (date: Date) => boolean;
}

export function DatePickerCalendar({
  dateRange,
  onDateChange,
  experienceDuration,
  disableDates
}: DatePickerCalendarProps) {
  return (
    <div className="rounded-md border p-3">
      <Calendar
        mode="single"
        selected={dateRange?.from}
        onSelect={(date) => {
          if (!date) {
            onDateChange(undefined);
            return;
          }
          
          // Auto-calculate end date based on duration
          const endDate = addDays(date, experienceDuration - 1);
          
          // Update the selection
          onDateChange({
            from: date,
            to: endDate
          });
        }}
        disabled={disableDates}
      />
      
      {dateRange?.from && dateRange.to && (
        <div className="border-t mt-3 pt-3 text-sm text-center text-gray-600">
          <p>
            Selected dates: {format(dateRange.from, "MMM d")} - {format(dateRange.to, "MMM d, yyyy")}
          </p>
        </div>
      )}
    </div>
  );
}