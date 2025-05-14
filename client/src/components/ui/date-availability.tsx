import * as React from "react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { X, Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface DateAvailabilityProps {
  selectedDates: Date[];
  onChange: (dates: Date[]) => void;
}

export function DateAvailability({ 
  selectedDates, 
  onChange 
}: DateAvailabilityProps) {
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(
    undefined
  );
  
  const addDate = (date: Date | undefined) => {
    if (!date) return;
    
    // Check if date already exists in selectedDates
    const exists = selectedDates.some(d => 
      d.getFullYear() === date.getFullYear() && 
      d.getMonth() === date.getMonth() && 
      d.getDate() === date.getDate()
    );
    
    if (!exists) {
      // Add the date to the array
      onChange([...selectedDates, date]);
    }
    
    // Reset the selected date
    setSelectedDate(undefined);
  };
  
  const removeDate = (dateToRemove: Date) => {
    const updatedDates = selectedDates.filter(date => 
      !(date.getFullYear() === dateToRemove.getFullYear() && 
      date.getMonth() === dateToRemove.getMonth() && 
      date.getDate() === dateToRemove.getDate())
    );
    onChange(updatedDates);
  };
  
  // Function to highlight selected dates in the calendar
  const isDaySelected = (day: Date) => {
    return selectedDates.some(d => 
      d.getFullYear() === day.getFullYear() && 
      d.getMonth() === day.getMonth() && 
      d.getDate() === day.getDate()
    );
  };
  
  // Sort dates in ascending order
  const sortedDates = [...selectedDates].sort((a, b) => a.getTime() - b.getTime());
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="space-y-4">
        <Calendar 
          mode="single"
          selected={selectedDate}
          onSelect={setSelectedDate}
          className="border rounded-md p-3"
          modifiers={{
            selected: isDaySelected
          }}
          modifiersClassNames={{
            selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground"
          }}
          fromDate={new Date()} // Only allow dates from today forward
          disabled={{ before: new Date() }}
        />
        
        <div className="flex justify-center">
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => addDate(selectedDate)}
            disabled={!selectedDate}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            Add Selected Date
          </Button>
        </div>
      </div>
      
      <div className="space-y-4">
        <div className="border rounded-md p-4">
          <h3 className="text-sm font-medium mb-2">Selected Available Dates</h3>
          
          {sortedDates.length > 0 ? (
            <div className="flex flex-wrap gap-2 max-h-60 overflow-y-auto p-1">
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
            <p className="text-sm text-muted-foreground">
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
  );
}