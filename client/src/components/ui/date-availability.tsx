import React, { useState } from "react";
import { DayPicker } from "react-day-picker";
import { format } from "date-fns";
import { Calendar, ChevronLeft, ChevronRight, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";

interface DateAvailabilityProps {
  selectedDates: Date[];
  onChange: (dates: Date[]) => void;
  className?: string;
}

export function DateAvailability({ 
  selectedDates = [], 
  onChange, 
  className 
}: DateAvailabilityProps) {
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [popoverOpen, setPopoverOpen] = useState(false);
  
  // Toggle date selection
  const handleSelect = (day: Date) => {
    const selected = selectedDates.some(
      selectedDay => selectedDay.toDateString() === day.toDateString()
    );
    
    if (selected) {
      onChange(
        selectedDates.filter(
          selectedDay => selectedDay.toDateString() !== day.toDateString()
        )
      );
    } else {
      onChange([...selectedDates, day]);
    }
  };

  // Helper to format dates
  const formatDate = (date: Date): string => {
    return format(date, "MMM d, yyyy");
  };
  
  // Remove date badge
  const removeDate = (index: number) => {
    const newDates = [...selectedDates];
    newDates.splice(index, 1);
    onChange(newDates);
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex flex-col space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Available Dates</h3>
          <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 border-dashed">
                <Calendar className="mr-2 h-4 w-4" />
                Select Dates
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <DayPicker
                mode="multiple"
                selected={selectedDates}
                onSelect={(days) => onChange(days || [])}
                month={currentMonth}
                onMonthChange={setCurrentMonth}
                classNames={{
                  months: "flex flex-col sm:flex-row",
                  month: "space-y-4",
                  caption: "flex justify-center pt-1 relative items-center",
                  caption_label: "text-sm font-medium",
                  nav: "space-x-1 flex items-center",
                  nav_button: cn(
                    "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
                  ),
                  nav_button_previous: "absolute left-1",
                  nav_button_next: "absolute right-1",
                  table: "w-full border-collapse space-y-1",
                  head_row: "flex",
                  head_cell:
                    "text-muted-foreground rounded-md w-8 font-normal text-[0.8rem]",
                  row: "flex w-full mt-2",
                  cell: cn(
                    "relative p-0 text-center text-sm focus-within:relative focus-within:z-20 [&:has([aria-selected])]:bg-accent",
                    "first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md"
                  ),
                  day: cn(
                    "h-8 w-8 p-0 font-normal aria-selected:opacity-100"
                  ),
                  day_range_end: "day-range-end",
                  day_selected:
                    "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                  day_today: "bg-accent text-accent-foreground",
                  day_outside: "text-muted-foreground opacity-50",
                  day_disabled: "text-muted-foreground opacity-50",
                  day_range_middle:
                    "aria-selected:bg-accent aria-selected:text-accent-foreground",
                  day_hidden: "invisible",
                }}
                components={{
                  IconLeft: () => <ChevronLeft className="h-4 w-4" />,
                  IconRight: () => <ChevronRight className="h-4 w-4" />,
                }}
                footer={
                  <div className="p-3 border-t text-sm text-center">
                    <p className="text-muted-foreground flex items-center justify-center">
                      <Info className="h-3 w-3 mr-1" />
                      Click days to mark as available
                    </p>
                  </div>
                }
              />
            </PopoverContent>
          </Popover>
        </div>
        
        {selectedDates.length === 0 ? (
          <p className="text-sm text-muted-foreground">No available dates selected yet.</p>
        ) : (
          <div className="flex flex-wrap gap-2 mt-2">
            {selectedDates.sort((a, b) => a.getTime() - b.getTime()).map((date, index) => (
              <Badge key={index} variant="secondary" className="flex items-center gap-1">
                <span>{formatDate(date)}</span>
                <button
                  type="button"
                  onClick={() => removeDate(index)}
                  className="ml-1 rounded-full hover:bg-muted p-0.5"
                >
                  <span className="sr-only">Remove</span>
                  <ChevronRight className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}