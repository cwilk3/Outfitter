import * as React from "react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { addDays, format, isSameDay, isWithinInterval } from "date-fns";
import { X, Calendar as CalendarIcon, CalendarRange, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

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
  const [rangeMode, setRangeMode] = React.useState<'single' | 'range' | 'chunk'>('chunk');
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>(undefined);
  
  const [chunkSize, setChunkSize] = React.useState<number>(3);
  const [anchorDate, setAnchorDate] = React.useState<Date | undefined>(undefined);
  
  // Function to add a single date
  const addSingleDate = (date: Date | undefined) => {
    if (!date) return;
    
    // Check if date already exists in selectedDates
    const exists = selectedDates.some(d => isSameDay(d, date));
    
    if (!exists) {
      // Add the date to the array
      onChange([...selectedDates, date]);
    }
  };
  
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
  
  // Function to add a chunk of dates
  const addChunk = () => {
    if (!anchorDate) return;
    
    const newDates: Date[] = [];
    
    // Add the anchor date and the next (chunkSize - 1) days
    for (let i = 0; i < chunkSize; i++) {
      const date = addDays(anchorDate, i);
      const exists = selectedDates.some(d => isSameDay(d, date));
      
      if (!exists) {
        newDates.push(date);
      }
    }
    
    // Add the new dates to the selection
    onChange([...selectedDates, ...newDates]);
    
    // Reset the anchor date
    setAnchorDate(undefined);
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
  
  // Get the selection mode UI
  const renderSelectionMode = () => {
    switch (rangeMode) {
      case 'single':
        return (
          <Calendar 
            mode="single"
            selected={anchorDate}
            onSelect={date => {
              setAnchorDate(date);
              if (date) addSingleDate(date);
            }}
            className="border rounded-md p-3"
            modifiers={{
              selected: isDaySelected
            }}
            modifiersClassNames={{
              selected: "bg-primary text-primary-foreground"
            }}
            fromDate={new Date()} // Only allow dates from today forward
            disabled={{ before: new Date() }}
          />
        );
        
      case 'range':
        return (
          <>
            <Calendar 
              mode="range"
              selected={dateRange}
              onSelect={(range) => {
                if (range) setDateRange(range);
              }}
              className="border rounded-md p-3"
              modifiers={{
                selected: isDaySelected
              }}
              modifiersClassNames={{
                selected: "bg-primary text-primary-foreground"
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
          </>
        );
        
      case 'chunk':
        return (
          <>
            <Calendar 
              mode="single"
              selected={anchorDate}
              onSelect={setAnchorDate}
              className="border rounded-md p-3"
              modifiers={{
                selected: isDaySelected,
                chunkPreview: (date) => {
                  if (!anchorDate) return false;
                  return isWithinInterval(date, {
                    start: anchorDate,
                    end: addDays(anchorDate, chunkSize - 1)
                  });
                }
              }}
              modifiersClassNames={{
                selected: "bg-primary text-primary-foreground",
                chunkPreview: "bg-primary/30 text-primary-foreground"
              }}
              fromDate={new Date()} // Only allow dates from today forward
              disabled={{ before: new Date() }}
            />
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="chunk-size">Chunk Size:</Label>
                <ToggleGroup type="single" value={String(chunkSize)} onValueChange={(value) => value && setChunkSize(Number(value))}>
                  <ToggleGroupItem value="3">3</ToggleGroupItem>
                  <ToggleGroupItem value="5">5</ToggleGroupItem>
                  <ToggleGroupItem value="7">7</ToggleGroupItem>
                  <ToggleGroupItem value="14">14</ToggleGroupItem>
                </ToggleGroup>
              </div>
              
              <Button 
                variant="outline" 
                className="w-full"
                onClick={addChunk}
                disabled={!anchorDate}
              >
                <CalendarRange className="mr-2 h-4 w-4" />
                Add {chunkSize} Day Chunk
              </Button>
            </div>
          </>
        );
        
      default:
        return null;
    }
  };
  
  // Sort dates in ascending order
  const sortedDates = [...selectedDates].sort((a, b) => a.getTime() - b.getTime());
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-6">
        <div className="space-y-4 flex-1">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium">Select Available Dates</h3>
            
            <RadioGroup 
              className="flex space-x-2" 
              defaultValue="chunk"
              value={rangeMode}
              onValueChange={(value) => setRangeMode(value as 'single' | 'range' | 'chunk')}
            >
              <div className="flex items-center space-x-1">
                <RadioGroupItem value="single" id="select-single" />
                <Label htmlFor="select-single" className="text-xs">Single</Label>
              </div>
              <div className="flex items-center space-x-1">
                <RadioGroupItem value="range" id="select-range" />
                <Label htmlFor="select-range" className="text-xs">Range</Label>
              </div>
              <div className="flex items-center space-x-1">
                <RadioGroupItem value="chunk" id="select-chunk" />
                <Label htmlFor="select-chunk" className="text-xs">Chunk</Label>
              </div>
            </RadioGroup>
          </div>
          
          {renderSelectionMode()}
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