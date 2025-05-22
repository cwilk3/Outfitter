import { Booking, Experience, Customer } from './index';

// React Big Calendar types
export interface CalendarEvent {
  id: number;
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
  resource: {
    booking: Booking;
    experience?: Experience;
    customer?: Customer;
  };
}

export interface CalendarEventStyleGetterProps {
  event: CalendarEvent;
}

// No need for module augmentation, we'll use any types