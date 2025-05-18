import React, { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { DateRange } from "react-day-picker";
import { format, isWithinInterval } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, Plus, X } from "lucide-react";

interface DatePickerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDates: Date[];
  onSelectDates: (dates: Date[]) => void;
  onSave: () => void;
  locationName?: string;
}

export function DatePickerModal({
  open,
  onOpenChange,
  selectedDates,
  onSelectDates,
  onSave,
  locationName
}: DatePickerModalProps) {
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [ranges, setRanges] = useState<DateRange[]>([]);

  // Add a date range
  const addRange = () => {
    if (dateRange?.from && dateRange?.to) {
      // Generate all dates within range
      const newDates: Date[] = [];
      let currentDate = new Date(dateRange.from);
      
      // Include the start and end dates in the range
      while (currentDate <= dateRange.to) {
        newDates.push(new Date(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      // Add to ranges for display
      setRanges([...ranges, dateRange]);
      
      // Update the selectedDates by adding the new dates
      // First create a set of all dates to avoid duplicates
      const uniqueDatesSet = new Set([
        ...selectedDates.map(d => d.toISOString().split('T')[0]),
        ...newDates.map(d => d.toISOString().split('T')[0])
      ]);
      
      // Convert back to date objects
      const uniqueDates = Array.from(uniqueDatesSet).map(dateStr => new Date(dateStr));
      onSelectDates(uniqueDates);
      
      // Reset the range input
      setDateRange(undefined);
    }
  };

  // Remove a date range
  const removeRange = (index: number) => {
    const rangeToRemove = ranges[index];
    const newRanges = [...ranges];
    newRanges.splice(index, 1);
    setRanges(newRanges);
    
    // Remove dates within this range from selectedDates
    if (rangeToRemove.from && rangeToRemove.to) {
      const filteredDates = selectedDates.filter(date => 
        !isWithinInterval(date, { 
          start: rangeToRemove.from!, 
          end: rangeToRemove.to! 
        })
      );
      onSelectDates(filteredDates);
    }
  };

  // Helper to format a date range for display
  const formatDateRange = (range: DateRange) => {
    return range.from && range.to
      ? `${format(range.from, 'MMM d, yyyy')} - ${format(range.to, 'MMM d, yyyy')}`
      : '';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="mb-3">
          <DialogTitle>Set Available Dates</DialogTitle>
          <DialogDescription>
            Choose date ranges when this experience is available {locationName ? `at ${locationName}` : ''}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Calendar for selecting date ranges */}
          <div className="p-3 rounded-md border">
            <Calendar
              mode="range"
              selected={dateRange}
              onSelect={setDateRange}
              numberOfMonths={2}
              className="mx-auto"
              showOutsideDays={false}
            />
          </div>
          
          {/* Date range selection and add button */}
          <div className="flex items-center justify-between bg-gray-50 p-3 rounded-md">
            <div className="text-sm font-medium">
              {dateRange?.from ? (
                <>
                  <span>Selected Range: </span>
                  <span className="text-green-600">
                    {format(dateRange.from, 'MMM d, yyyy')}
                    {dateRange.to && ` - ${format(dateRange.to, 'MMM d, yyyy')}`}
                  </span>
                </>
              ) : (
                <span className="text-gray-500">Select a date range above</span>
              )}
            </div>
            <Button 
              type="button"
              onClick={addRange}
              disabled={!dateRange?.from || !dateRange?.to}
              className="bg-green-600 hover:bg-green-700"
            >
              <Plus className="h-4 w-4 mr-1" /> Add Range
            </Button>
          </div>
          
          {/* Added date ranges list */}
          {ranges.length > 0 && (
            <div>
              <Label className="text-base font-semibold">Added Date Ranges:</Label>
              <ScrollArea className="h-[120px] rounded-md border mt-2">
                <div className="p-2 space-y-2">
                  {ranges.map((range, index) => (
                    <div key={index} className="flex justify-between items-center bg-gray-50 p-2 rounded">
                      <div className="flex items-center gap-2">
                        <CalendarIcon className="h-4 w-4 text-green-600" />
                        <span className="font-medium">{formatDateRange(range)}</span>
                      </div>
                      <button 
                        onClick={() => removeRange(index)} 
                        className="text-gray-500 hover:text-red-500 p-1 rounded-full hover:bg-gray-100"
                        aria-label="Remove date range"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
          
          <div className="flex items-center px-2 py-1 bg-gray-100 rounded-md">
            <span className="font-medium mr-2">Total Selected Dates:</span>
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              {selectedDates.length}
            </Badge>
          </div>
        </div>
        
        <DialogFooter className="mt-4 pt-2 border-t">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            type="button"
            onClick={onSave}
            className="bg-green-600 hover:bg-green-700"
          >
            Save Dates
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}