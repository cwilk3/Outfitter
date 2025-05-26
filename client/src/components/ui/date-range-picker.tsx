import * as React from "react";
import { addDays, format, isBefore, startOfDay } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";

export interface Booking {
  startDate: Date;
  endDate: Date;
  bookedCount: number;
}

interface DateRangePickerProps {
  dateRange: DateRange | undefined;
  onSelect: (dateRange: DateRange | undefined) => void;
  experience: {
    duration: number;
    capacity: number;
    availableDates?: string[] | Date[];
  };
  bookings?: Booking[];
  availableRanges?: { from: Date; to: Date }[];
  guestCount?: number;
  className?: string;
  disabled?: boolean;
}

export function DateRangePicker({ 
  dateRange, 
  onSelect, 
  experience,
  bookings = [],
  availableRanges = [],
  guestCount = 1,
  className,
  disabled = false
}: DateRangePickerProps) {
  // State to control the dropdown
  const [isOpen, setIsOpen] = React.useState(false);
  
  // Add safety check for undefined experience with default values
  const { 
    duration = 1,
    capacity = 1
  } = experience || {};
  
  // Get today's date at the start of the day
  const today = startOfDay(new Date());
  

  
  // Function to check if a date should be disabled based on availableRanges
  const isDateDisabled = (date: Date) => {
    const checkDate = startOfDay(date); // Normalize for consistent comparison (start of day)

    // 1. Disable dates in the past
    if (checkDate < today) return true;

    // 2. If no availableRanges data is provided (e.g., still loading, error, or no slots available)
    //    then disable all future dates.
    if (!availableRanges || availableRanges.length === 0) {
      return true;
    }

    // 3. Check if 'checkDate' is a valid start date for a trip of 'duration' based on `availableRanges`.
    //    A date is ENABLED ONLY if:
    //    a) It falls within one of the `availableRanges` (which are already filtered by requestedGroupSize and capacity by the backend).
    //    b) The *entire duration* of the experience, starting from `checkDate`, fits within an `availableRange`.
    
    let isSelectableStart = false;

    for (const range of availableRanges) {
      const rangeStart = startOfDay(range.from);
      // The `range.to` from backend's `availableSlots` is exclusive (slotEnd = currentSlotStart + duration).
      const rangeEndExclusive = startOfDay(range.to); 

      // Check if `checkDate` is on or after the available range start
      // AND if `checkDate` is before the available range exclusive end
      if (checkDate >= rangeStart && checkDate < rangeEndExclusive) {
        // Now, check if the entire `duration` of the experience starting from `checkDate` fits within *this specific* available range.
        const potentialTripEndExclusive = addDays(checkDate, duration); // The exclusive end date of the potential trip

        if (potentialTripEndExclusive <= rangeEndExclusive) {
          // Found a valid range where this date can start a full trip.
          isSelectableStart = true;
          break; // No need to check other ranges if one works
        }
      }
    }

    // If after checking all availableRanges, this date cannot be a valid start date, disable it.
    if (!isSelectableStart) return true;

    return false; // If all checks pass, the date is enabled (selectable as a start date)
  };
  
  // Handle date selection
  const handleDateSelect = (range: DateRange | undefined) => {
    if (!range || !range.from) {
      // If no range or no start date, reset selection
      onSelect(undefined);
      return;
    }
    
    // Create a copy of the start date
    const startDate = new Date(range.from);
    
    // Calculate end date based on experience duration
    const endDate = addDays(startDate, duration - 1);
    
    // Create the final date range
    const finalRange = {
      from: startDate,
      to: endDate
    };
    
    // Update the parent component
    onSelect(finalRange);
    
    // Close the dropdown
    setIsOpen(false);
  };
  
  return (
    <div className={className}>
      <div className="relative w-full">
        {/* Date Selection Button */}
        <Button
          type="button"
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !dateRange && "text-muted-foreground"
          )}
          onClick={() => setIsOpen(!isOpen)}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {dateRange?.from ? (
            dateRange.to ? (
              <>
                {format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}
              </>
            ) : (
              format(dateRange.from, "LLL dd, y")
            )
          ) : (
            <span>Select dates</span>
          )}
        </Button>
        
        {/* Calendar Dropdown */}
        {isOpen && (
          <div className="absolute left-0 top-full mt-2 z-50 bg-white border rounded-md shadow-lg">
            <div className="p-3 border-b">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-sm">Select Start Date</h4>
                <Button 
                  type="button"
                  variant="ghost" 
                  size="sm" 
                  className="h-7 w-7 p-0" 
                  onClick={() => setIsOpen(false)}
                >
                  <span className="text-lg">&times;</span>
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Experience duration: {duration} {duration === 1 ? 'day' : 'days'}
              </p>
              <div className="flex items-center mt-2 space-x-4 text-xs">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-green-500 rounded-full mr-1"></div>
                  <span>Available</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-primary rounded-full mr-1"></div>
                  <span>Selected</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-gray-300 rounded-full mr-1 line-through"></div>
                  <span>Unavailable</span>
                </div>
              </div>
            </div>
            
            <div className="p-4">
              <Calendar
                initialFocus
                mode="single"
                defaultMonth={dateRange?.from}
                selected={dateRange?.from}
                onSelect={(date) => {
                  if (date) {
                    handleDateSelect({ from: date, to: addDays(date, duration - 1) });
                  } else {
                    handleDateSelect(undefined);
                  }
                }}
                numberOfMonths={1}
                disabled={isDateDisabled}
                fromDate={new Date()}
                fixedWeeks
                className="rounded-md"
                modifiersClassNames={{
                  selected: "bg-primary text-primary-foreground",
                  disabled: "text-muted-foreground opacity-50 line-through"
                }}
              />
            </div>
            
            {dateRange?.from && dateRange?.to && (
              <div className="p-3 border-t bg-muted/20">
                <p className="text-xs font-medium">
                  Selected: {format(dateRange.from, "MMMM d")} - {format(dateRange.to, "MMMM d, yyyy")}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}