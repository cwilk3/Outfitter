import React from "react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Select Available Dates</DialogTitle>
          <DialogDescription>
            Choose dates when this experience is available {locationName ? `at ${locationName}` : ''}
          </DialogDescription>
        </DialogHeader>
        
        <div className="my-6">
          <div className="p-3 rounded-md border">
            <Calendar
              mode="multiple"
              selected={selectedDates}
              onSelect={(dates) => onSelectDates(dates || [])}
              className="w-full"
            />
          </div>
        </div>
        
        <DialogFooter>
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