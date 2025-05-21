import * as React from "react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format, isSameDay } from "date-fns";
import { X, CalendarRange, Trash2, Check } from "lucide-react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

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
  // State to track dates marked for batch removal
  const [datesMarkedForRemoval, setDatesMarkedForRemoval] = React.useState<Date[]>([]);
  // State to track if we're in batch removal mode
  const [batchRemovalMode, setBatchRemovalMode] = React.useState<boolean>(false);
  
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
  
  // Remove a date from selection (original functionality)
  const removeDate = (dateToRemove: Date) => {
    // If we're in batch removal mode, mark for removal instead of removing immediately
    if (batchRemovalMode) {
      toggleDateForRemoval(dateToRemove);
    } else {
      // Original immediate removal behavior
      const updatedDates = selectedDates.filter(date => !isSameDay(date, dateToRemove));
      onChange(updatedDates);
    }
  };
  
  // Toggle a date for batch removal
  const toggleDateForRemoval = (date: Date) => {
    // Check if date is already marked
    const isMarked = datesMarkedForRemoval.some(d => isSameDay(d, date));
    
    if (isMarked) {
      // Remove from marked dates
      setDatesMarkedForRemoval(prev => 
        prev.filter(d => !isSameDay(d, date))
      );
    } else {
      // Add to marked dates
      setDatesMarkedForRemoval(prev => [...prev, date]);
    }
  };
  
  // Execute batch removal of all marked dates
  const removeMarkedDates = () => {
    if (datesMarkedForRemoval.length === 0) return;
    
    // Remove all marked dates at once
    const updatedDates = selectedDates.filter(date => 
      !datesMarkedForRemoval.some(d => isSameDay(d, date))
    );
    
    // Update parent state
    onChange(updatedDates);
    
    // Reset batch removal state
    setDatesMarkedForRemoval([]);
    setBatchRemovalMode(false);
  };
  
  // Toggle batch removal mode
  const toggleBatchRemovalMode = () => {
    setBatchRemovalMode(prev => !prev);
    // Clear any marked dates when toggling mode off
    if (batchRemovalMode) {
      setDatesMarkedForRemoval([]);
    }
  };
  
  // Select all dates for removal
  const selectAllForRemoval = () => {
    setDatesMarkedForRemoval([...selectedDates]);
  };
  
  // Clear all dates marked for removal
  const clearMarkedDates = () => {
    setDatesMarkedForRemoval([]);
  };
  
  // Clear all selected dates (original functionality)
  const clearAllDates = () => {
    onChange([]);
    setDatesMarkedForRemoval([]);
    setBatchRemovalMode(false);
  };
  
  // Function to highlight selected dates in the calendar
  const isDaySelected = (day: Date) => {
    return selectedDates.some(d => isSameDay(d, day));
  };
  
  // Helper to check if a date is marked for removal
  const isDateMarkedForRemoval = (date: Date) => {
    return datesMarkedForRemoval.some(d => isSameDay(d, date));
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
            <div className="flex flex-col">
              <h3 className="text-sm font-medium">Selected Available Dates</h3>
              
              {batchRemovalMode && datesMarkedForRemoval.length > 0 && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {datesMarkedForRemoval.length} date{datesMarkedForRemoval.length !== 1 ? 's' : ''} selected for removal
                </p>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              {/* Show different actions based on mode */}
              {batchRemovalMode ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={toggleBatchRemovalMode}
                  >
                    Cancel
                  </Button>
                  
                  <Button
                    variant="default"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={removeMarkedDates}
                    disabled={datesMarkedForRemoval.length === 0}
                  >
                    Remove Selected 
                    {datesMarkedForRemoval.length > 0 && ` (${datesMarkedForRemoval.length})`}
                  </Button>
                </>
              ) : (
                <>
                  {selectedDates.length > 1 && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={toggleBatchRemovalMode}
                    >
                      Batch Remove
                    </Button>
                  )}
                  
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
                </>
              )}
            </div>
          </div>
          
          <div className="border rounded-md p-4 min-h-[200px]">
            {sortedDates.length > 0 ? (
              <div className="flex flex-wrap gap-2 max-h-[300px] overflow-y-auto p-1">
                {sortedDates.map((date, index) => {
                  const isMarkedForRemoval = isDateMarkedForRemoval(date);
                  
                  return (
                    <Badge 
                      key={index} 
                      variant={isMarkedForRemoval ? "destructive" : "secondary"}
                      className={cn(
                        "flex items-center gap-1 px-2 py-1.5 h-auto transition-colors",
                        batchRemovalMode && "cursor-pointer hover:bg-muted/80",
                        batchRemovalMode && isMarkedForRemoval && "hover:bg-destructive/80"
                      )}
                      onClick={batchRemovalMode ? () => toggleDateForRemoval(date) : undefined}
                    >
                      <span className="text-xs">{format(date, 'MMM d, yyyy')}</span>
                      
                      {/* Show different icon based on mode and selection state */}
                      {batchRemovalMode ? (
                        isMarkedForRemoval ? (
                          <Check className="h-3 w-3 ml-1" />
                        ) : null
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-4 w-4 p-0 hover:bg-transparent"
                          onClick={() => removeDate(date)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </Badge>
                  );
                })}
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