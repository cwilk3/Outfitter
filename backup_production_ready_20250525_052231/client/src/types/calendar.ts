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

// Add module declaration for react-big-calendar
declare module 'react-big-calendar' {
  import React from 'react';
  export function momentLocalizer(moment: any): any;
  export const Calendar: React.FC<any>;
}