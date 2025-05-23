// User types now imported from shared schema
// Remove duplicate User interface - use shared schema instead

// Location types
export interface Location {
  id: number;
  name: string;
  address?: string;
  city: string;
  state: string;
  zip?: string;
  description?: string;
  images?: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Experience-Location types
export interface ExperienceLocation {
  id: number;
  experienceId: number;
  locationId: number;
  createdAt: string;
}

// Experience addon types
export interface ExperienceAddon {
  id: number;
  experienceId: number;
  name: string;
  description?: string;
  price: number;
  isOptional: boolean;
  createdAt: string;
  updatedAt: string;
}

// Experience types
export interface Experience {
  id: number;
  name: string;
  description: string;
  duration: number;
  price: number;
  capacity: number;
  location: string;
  category: string;
  locationId?: number; // Legacy field
  images?: string[]; // Array of image URLs
  availableDates?: string[]; // Array of available date strings
  rules?: string[]; // Array of rules like required licenses
  amenities?: string[]; // Array of available amenities
  tripIncludes?: string[]; // Array of what's included in the trip
  createdAt: string;
  updatedAt: string;
  // These are not in the DB schema, but we'll populate them on the frontend
  locations?: Location[];
  addons?: ExperienceAddon[];
}

// Customer types
export interface Customer {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// Booking types
export interface Booking {
  id: number;
  bookingNumber: string;
  experienceId: number;
  customerId: number;
  startDate: string;
  endDate: string;
  status: 'pending' | 'confirmed' | 'deposit_paid' | 'paid' | 'completed' | 'cancelled';
  totalAmount: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BookingGuide {
  id: number;
  bookingId: number;
  guideId: number;
  createdAt: string;
}

// Document types
export interface Document {
  id: number;
  name: string;
  path: string;
  type: string;
  size: number;
  bookingId?: number;
  customerId?: number;
  guideId?: number;
  createdAt: string;
  updatedAt: string;
}

// Payment types
export interface Payment {
  id: number;
  bookingId: number;
  amount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';
  paymentMethod?: string;
  transactionId?: string;
  qbInvoiceId?: string;
  createdAt: string;
  updatedAt: string;
}

// Settings types
export interface Settings {
  id: number;
  companyName: string;
  companyAddress?: string;
  companyPhone?: string;
  companyEmail?: string;
  companyLogo?: string;
  qbClientId?: string;
  qbClientSecret?: string;
  qbRefreshToken?: string;
  qbRealmId?: string;
  bookingLink?: string;
  updatedAt: string;
}

// Activity types
export interface Activity {
  id: number;
  userId?: number;
  action: string;
  details?: Record<string, any>;
  createdAt: string;
}

// Dashboard stats
export interface DashboardStats {
  upcomingBookings: number;
  monthlyRevenue: number;
  activeCustomers: number;
  completedTrips: number;
}

// Guide assignment types
export interface ExperienceGuide {
  id: number;
  experienceId: number;
  guideId: string;
  isPrimary: boolean;
  createdAt?: string;
  updatedAt?: string;
  profileImageUrl?: string;
}

// Form input types
export interface ExperienceInput {
  name: string;
  description: string;
  duration: number;
  price: number;
  capacity: number;
  location: string;
  category: string;
  selectedLocationIds?: number[]; // Used for UI only, to track selected locations
}

export interface CustomerInput {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  notes?: string;
}

export interface BookingInput {
  bookingNumber: string;
  experienceId: number;
  customerId: number;
  startDate: string;
  endDate: string;
  status: string;
  totalAmount: number;
  notes?: string;
}

export interface UpcomingBooking {
  id: number;
  bookingNumber: string;
  experienceId: number;
  experienceName: string;
  customerId: number;
  customerFirstName: string;
  customerLastName: string;
  startDate: string;
  endDate: string;
  status: string;
  totalAmount: number;
  guides: {
    guideId: number;
    guideFirstName: string;
    guideLastName: string;
  }[];
}
