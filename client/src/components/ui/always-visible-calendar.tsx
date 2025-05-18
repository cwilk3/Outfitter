import * as React from "react";
import { addDays, format, isBefore, isAfter, isSameDay, startOfDay } from "date-fns";
import { DateRange } from "react-day-picker";
import { Calendar } from "@/components/ui/calendar";

interface AlwaysVisibleCalendarProps {
  dateRange: DateRange | undefined;
  onUpdate: (dateRange: DateRange | undefined) => void;
  disabled?: (date: Date) => boolean;
  experience?: {
    duration: number;
  };
}

export function AlwaysVisibleCalendar({
  dateRange,
  onUpdate,
  disabled,
  experience
}: AlwaysVisibleCalendarProps) {
  const handleSelect = (date: Date | undefined) => {
    if (!date) {
      onUpdate(undefined);
      return;
    }
    
    // If we have an experience with duration, calculate end date
    if (experience?.duration) {
      const endDate = addDays(date, experience.duration - 1);
      onUpdate({ from: date, to: endDate });
    } else {
      // Otherwise just set the from date
      onUpdate({ from: date, to: undefined });
    }
  };

  return (
    <div className="rounded-md">
      <Calendar
        mode="single"
        selected={dateRange?.from}
        onSelect={handleSelect}
        disabled={disabled}
        initialFocus
        modifiers={{
          range: {
            from: dateRange?.from || new Date(0),
            to: dateRange?.to || new Date(0)
          }
        }}
        className="p-0"
        classNames={{
          day_range_middle: "day-range-middle bg-primary/20 text-primary-foreground rounded-none",
          day_range_start: "day-range-start bg-primary text-primary-foreground rounded-l-md",
          day_range_end: "day-range-end bg-primary text-primary-foreground rounded-r-md",
        }}
      />
      {dateRange?.from && dateRange.to && (
        <div className="p-3 bg-muted/20 text-center border-t">
          <p className="text-xs font-medium">
            {format(dateRange.from, "MMMM d")} - {format(dateRange.to, "MMMM d, yyyy")}
          </p>
        </div>
      )}
    </div>
  );
}