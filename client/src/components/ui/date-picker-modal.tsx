import React, { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { DateRange } from "react-day-picker";
import { addDays, format, isWithinInterval } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
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
  const [activeTab, setActiveTab] = useState<string>("individual");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [rangeCount, setRangeCount] = useState<number>(0);
  const [ranges, setRanges] = useState<DateRange[]>([]);

  // Convert the selected individual dates to an array
  const formattedSelectedDates = selectedDates.map(date => 
    format(date, 'MMM d, yyyy')
  );

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
      setRangeCount(rangeCount + 1);
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

  // Remove an individual date
  const removeDate = (dateStr: string) => {
    const dateToRemove = new Date(dateStr);
    const filteredDates = selectedDates.filter(date => 
      date.toISOString().split('T')[0] !== dateToRemove.toISOString().split('T')[0]
    );
    onSelectDates(filteredDates);
  };

  // Helper to format a date range for display
  const formatDateRange = (range: DateRange) => {
    return range.from && range.to
      ? `${format(range.from, 'MMM d')} - ${format(range.to, 'MMM d, yyyy')}`
      : '';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[650px]">
        <DialogHeader>
          <DialogTitle>Set Available Dates</DialogTitle>
          <DialogDescription>
            Choose dates when this experience is available {locationName ? `at ${locationName}` : ''}
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="individual" value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid grid-cols-2">
            <TabsTrigger value="individual">Individual Dates</TabsTrigger>
            <TabsTrigger value="range">Date Ranges</TabsTrigger>
          </TabsList>
          <TabsContent value="individual">
            <div className="my-4">
              <div className="p-3 rounded-md border">
                <Calendar
                  mode="multiple"
                  selected={selectedDates}
                  onSelect={(dates) => onSelectDates(dates || [])}
                  className="w-full"
                />
              </div>
              
              {formattedSelectedDates.length > 0 && (
                <div className="mt-4">
                  <Label>Selected Individual Dates:</Label>
                  <ScrollArea className="h-[100px] rounded-md border p-2 mt-1">
                    <div className="flex flex-wrap gap-2">
                      {formattedSelectedDates.map((date, index) => (
                        <Badge key={index} variant="secondary" className="flex items-center gap-1">
                          <CalendarIcon className="h-3 w-3" />
                          {date}
                          <button 
                            onClick={() => removeDate(date)} 
                            className="ml-1 text-gray-500 hover:text-red-500"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </div>
          </TabsContent>
          <TabsContent value="range">
            <div className="my-4">
              <div className="p-3 rounded-md border mb-4">
                <Calendar
                  mode="range"
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={2}
                  className="w-full"
                />
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm">
                  {dateRange?.from && (
                    <>
                      {`${format(dateRange.from, 'MMM d, yyyy')}`}
                      {dateRange.to && ` - ${format(dateRange.to, 'MMM d, yyyy')}`}
                    </>
                  )}
                </span>
                <Button 
                  type="button" 
                  size="sm" 
                  onClick={addRange}
                  disabled={!dateRange?.from || !dateRange?.to}
                >
                  <Plus className="h-4 w-4 mr-1" /> Add Range
                </Button>
              </div>
              
              {ranges.length > 0 && (
                <div className="mt-4">
                  <Label>Added Date Ranges:</Label>
                  <ScrollArea className="h-[100px] rounded-md border p-2 mt-1">
                    <div className="flex flex-col gap-2">
                      {ranges.map((range, index) => (
                        <div key={index} className="flex justify-between items-center">
                          <Badge variant="outline" className="flex items-center gap-1">
                            <CalendarIcon className="h-3 w-3" />
                            {formatDateRange(range)}
                          </Badge>
                          <button 
                            onClick={() => removeRange(index)} 
                            className="text-gray-500 hover:text-red-500"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
        
        <div className="text-sm mt-2">
          Total Selected Dates: <Badge variant="secondary">{selectedDates.length}</Badge>
        </div>
        
        <DialogFooter className="mt-6">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            type="button"
            onClick={onSave}
          >
            Save Dates
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}