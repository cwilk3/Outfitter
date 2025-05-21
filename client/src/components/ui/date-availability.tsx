import * as React from "react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format, isSameDay } from "date-fns";
import { X, CalendarRange, Trash2 } from "lucide-react";
import { Label } from "@/components/ui/label";

interface DateAvailabilityProps {
  selectedDates: Date[];
  onChange: (dates: Date[]) => void;
}

// Import necessary types from react-day-picker
import { DateRange } from 'react-day-picker';

export function DateAvailability({ 
  selectedDates, 
  onChange 
}: DateAvailabilityProps) {
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>(undefined);
  
  // Function to add a range of dates
  const addDateRange = () => {
    if (!dateRange || !dateRange.from) return;
    
    const endDate = dateRange.to || dateRange.from;
    
    // Get all dates in the range
    const newDates: Date[] = [];
    let currentDate = new Date(dateRange.from);
    
    while (currentDate <= endDate) {
      // Check if date is not already in selectedDates
      const exists = selectedDates.some(d => isSameDay(d, currentDate));
      
      if (!exists) {
        newDates.push(new Date(currentDate));
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // Add the new dates to the selection
    onChange([...selectedDates, ...newDates]);
    
    // Reset the range
    setDateRange(undefined);
  };
  
  // Remove a date from selection
  const removeDate = (dateToRemove: Date) => {
    const updatedDates = selectedDates.filter(date => !isSameDay(date, dateToRemove));
    onChange(updatedDates);
  };
  
  // Clear all selected dates
  const clearAllDates = () => {
    onChange([]);
  };
  
  // Function to highlight selected dates in the calendar
  const isDaySelected = (day: Date) => {
    return selectedDates.some(d => isSameDay(d, day));
  };
  
  // Sort dates in ascending order
  const sortedDates = [...selectedDates].sort((a, b) => a.getTime() - b.getTime());
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-6">
        <div className="space-y-4 flex-1">
          <div className="mb-2">
            <h3 className="text-sm font-medium">Select Available Dates</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Select a date range when this experience is available for booking.
            </p>
          </div>
          
          <Calendar 
            mode="range"
            selected={dateRange}
            onSelect={(range) => {
              if (range) {
                setDateRange(range);
                
                // Highlight the selected range immediately visually
                // by showing it differently from already confirmed dates
                const rangeClass = "bg-primary/40 text-primary-foreground";
                
                // Add a custom modifier for the current range
                const dayElements = document.querySelectorAll('.rdp-day');
                dayElements.forEach(day => {
                  // Reset any temporary selection styling
                  day.classList.remove('temp-selected');
                });
                
                // If we have a valid range, mark days as visually selected
                if (range.from && range.to) {
                  const start = range.from.getTime();
                  const end = range.to.getTime();
                  
                  dayElements.forEach(day => {
                    const dateAttr = day.getAttribute('data-date');
                    if (dateAttr) {
                      const dayDate = new Date(dateAttr);
                      const dayTime = dayDate.getTime();
                      
                      if (dayTime >= start && dayTime <= end) {
                        day.classList.add('temp-selected');
                      }
                    }
                  });
                }
              }
            }}
            className="border rounded-md p-3"
            modifiers={{
              selected: isDaySelected,
              // Add a modifier for the temporary selection
              tempSelected: (date) => {
                if (!dateRange || !dateRange.from) return false;
                const end = dateRange.to || dateRange.from;
                return date >= dateRange.from && date <= end;
              }
            }}
            modifiersClassNames={{
              selected: "bg-primary text-primary-foreground",
              tempSelected: "bg-primary/40 text-primary-foreground" // Lighter primary color for temp selection
            }}
            fromDate={new Date()} // Only allow dates from today forward
            disabled={{ before: new Date() }}
          />
          
          <div className="flex justify-center">
            <Button 
              variant="outline" 
              className="w-full"
              onClick={addDateRange}
              disabled={!dateRange || !dateRange.from}
            >
              <CalendarRange className="mr-2 h-4 w-4" />
              Add Date Range
            </Button>
          </div>
        </div>
        
        <div className="space-y-4 flex-1">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium">Selected Available Dates</h3>
            
            {selectedDates.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-muted-foreground hover:text-destructive"
                onClick={clearAllDates}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                Clear All
              </Button>
            )}
          </div>
          
          <div className="border rounded-md p-4 min-h-[200px]">
            {sortedDates.length > 0 ? (
              <div className="flex flex-wrap gap-2 max-h-[300px] overflow-y-auto p-1">
                {sortedDates.map((date, index) => (
                  <Badge 
                    key={index} 
                    variant="secondary"
                    className="flex items-center gap-1 px-2 py-1.5 h-auto"
                  >
                    <span className="text-xs">{format(date, 'MMM d, yyyy')}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-4 w-4 p-0 hover:bg-transparent"
                      onClick={() => removeDate(date)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                No dates selected. Choose dates from the calendar.
              </p>
            )}
          </div>
          
          <div className="text-sm text-muted-foreground space-y-2">
            <p>
              <strong>Note:</strong> Selected dates will be shown as available for booking 
              in the customer booking calendar.
            </p>
            <p>
              When a date is booked, the system will automatically mark it as unavailable 
              for other customers.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}