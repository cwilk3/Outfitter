// Application Type Definitions
import { 
  Experience as SchemaExperience, 
  Location as SchemaLocation,
  ExperienceLocation as SchemaExperienceLocation,
  ExperienceAddon as SchemaExperienceAddon
} from "@shared/schema";

// Re-export the types from shared/schema.ts with proper exports
export * from "@shared/schema";

// Experience type with additional fields needed in the frontend
export interface Experience extends SchemaExperience {
  location?: Location;
}

// Location type with capacity, duration, and price fields
export interface Location extends SchemaLocation {
  capacity?: number;
  duration?: number;
  price?: number | string;
}

// ExperienceLocation with availableDates
export interface ExperienceLocation extends SchemaExperienceLocation {
  availableDates?: string[] | string;
}

// Experience Addon type
export type ExperienceAddon = SchemaExperienceAddon;

// Types for date ranges in booking flow
export interface DateRange {
  from: Date;
  to: Date;
}