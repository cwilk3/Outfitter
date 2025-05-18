// Application Type Definitions

// Extend the types from shared/schema.ts for frontend use
import type {
  User,
  Booking,
  Customer,
  Payment,
  Document,
  Settings,
  Activity,
  Experience as BaseExperience,
  Location as BaseLocation,
  ExperienceLocation as BaseExperienceLocation,
  ExperienceAddon
} from "@shared/schema";

// Re-export types
export type {
  User,
  Booking,
  Customer,
  Payment,
  Document,
  Settings,
  Activity,
  ExperienceAddon
};

// Experience type with additional fields needed in the frontend
export interface Experience extends BaseExperience {
  location?: Location;
}

// Location type with capacity, duration, and price fields
export interface Location extends BaseLocation {
  capacity?: number;
  duration?: number;
  price?: number | string;
}

// ExperienceLocation with availableDates, capacity, duration, and price
export interface ExperienceLocation extends Omit<BaseExperienceLocation, 'availableDates'> {
  capacity: number;
  duration: number;
  price: string | number;
  availableDates?: string[] | string;
}

// Types for date ranges in booking flow
export interface DateRange {
  from: Date;
  to: Date;
}