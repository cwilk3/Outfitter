import * as React from "react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format, isSameDay } from "date-fns";
import { X, CalendarRange, Trash2, Save, RotateCcw } from "lucide-react";
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
  // Create a working copy of selected dates - completely separate from parent state
  const [workingDates, setWorkingDates] = React.useState<Date[]>([]);
  // Track if we have unsaved changes
  const [hasUnsavedChanges, setHasUnsavedChanges] = React.useState(false);
  
  // Initialize workingDates when component mounts or selectedDates changes
  React.useEffect(() => {
    // Deep copy of dates to ensure we're not sharing references
    const datesCopy = selectedDates.map(date => new Date(date.getTime()));
    setWorkingDates(datesCopy);
    setHasUnsavedChanges(false);
  }, [selectedDates]);
  
  // Function to add a range of dates
  const addDateRange = () => {
    if (!dateRange || !dateRange.from) return;
    
    const endDate = dateRange.to || dateRange.from;
    
    // Get all dates in the range
    const newDates: Date[] = [];
    let currentDate = new Date(dateRange.from);
    
    while (currentDate <= endDate) {
      // Check if date is not already in workingDates
      const exists = workingDates.some(d => isSameDay(d, currentDate));
      
      if (!exists) {
        newDates.push(new Date(currentDate));
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // Add the new dates to the selection (but don't save yet)
    const updatedDates = [...workingDates, ...newDates];
    setWorkingDates(updatedDates);
    setHasUnsavedChanges(true);
    
    // Reset the range
    setDateRange(undefined);
  };
  
  // Remove a date from selection (but don't save yet)
  const removeDate = (dateToRemove: Date) => {
    // Use isSameDay to match dates since times might differ
    const updatedDates = workingDates.filter(date => !isSameDay(date, dateToRemove));
    setWorkingDates(updatedDates);
    setHasUnsavedChanges(true);
  };
  
  // Save changes back to parent component
  const saveChanges = (e: React.MouseEvent) => {
    // Stop event propagation to prevent dialog closing
    e.stopPropagation();
    onChange(workingDates);
    setHasUnsavedChanges(false);
  };
  
  // Cancel changes and revert to original dates
  const cancelChanges = (e: React.MouseEvent) => {
    // Stop event propagation to prevent dialog closing
    e.stopPropagation();
    // Deep copy of dates to ensure we're not sharing references
    const datesCopy = selectedDates.map(date => new Date(date.getTime()));
    setWorkingDates(datesCopy);
    setHasUnsavedChanges(false);
  };
  
  // Clear all selected dates
  const clearAllDates = (e: React.MouseEvent) => {
    // Stop event propagation to prevent dialog closing
    e.stopPropagation();
    setWorkingDates([]);
    setHasUnsavedChanges(true);
  };
  
  // Function to highlight selected dates in the calendar
  const isDaySelected = (day: Date) => {
    return workingDates.some(d => isSameDay(d, day));
  };
  
  // Sort dates in ascending order
  const sortedDates = [...workingDates].sort((a, b) => a.getTime() - b.getTime());
  
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
            <div className="flex items-center">
              <h3 className="text-sm font-medium">Selected Available Dates</h3>
              
              {hasUnsavedChanges && (
                <span className="ml-2 px-1.5 py-0.5 text-[10px] font-medium bg-blue-100 text-blue-700 rounded">
                  MODIFIED
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              {workingDates.length > 0 && (
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
          
          {/* Save/Cancel buttons */}
          {hasUnsavedChanges && (
            <div className="flex items-center gap-2 justify-end mt-4 bg-blue-50 p-3 rounded-lg border border-blue-100">
              <div className="mr-auto text-xs text-blue-700">
                <span className="font-medium">Unsaved changes.</span> Apply or discard your date changes.
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={cancelChanges}
                className="bg-white hover:bg-gray-50"
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                Cancel
              </Button>
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={saveChanges}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Save className="h-3.5 w-3.5 mr-1.5" />
                Save Changes
              </Button>
            </div>
          )}
          
          <div className="text-sm text-muted-foreground space-y-2 mt-2">
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