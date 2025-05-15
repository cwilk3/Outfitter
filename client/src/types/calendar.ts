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

// Declare module if types are not found
declare module 'react-big-calendar';