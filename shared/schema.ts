import { pgTable, text, serial, integer, boolean, timestamp, decimal, pgEnum, varchar, json, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User roles enum
export const roleEnum = pgEnum('role', ['admin', 'guide']);

// User table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  phone: text("phone"),
  profileImageUrl: varchar("profile_image_url"),
  role: roleEnum("role").notNull().default('guide'),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Experience categories enum
export const categoryEnum = pgEnum('category', [
  'deer_hunting', 
  'duck_hunting', 
  'elk_hunting', 
  'pheasant_hunting', 
  'bass_fishing', 
  'trout_fishing',
  'other_hunting',
  'other_fishing'
]);

// Status enums
export const bookingStatusEnum = pgEnum('booking_status', [
  'pending', 
  'confirmed', 
  'deposit_paid', 
  'paid', 
  'completed', 
  'cancelled'
]);

export const paymentStatusEnum = pgEnum('payment_status', [
  'pending', 
  'processing', 
  'completed', 
  'failed', 
  'refunded'
]);

// Locations table
export const locations = pgTable("locations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  address: text("address"),
  city: text("city").notNull(),
  state: text("state").notNull(),
  zip: text("zip"),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Experiences table
export const experiences = pgTable("experiences", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  duration: integer("duration").notNull(), // in days
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  capacity: integer("capacity").notNull(),
  locationId: integer("location_id").references(() => locations.id), // Legacy field, keeping for backward compatibility
  category: categoryEnum("category").default('other_hunting'), // Default to 'other_hunting' for backward compatibility
  images: jsonb("images").default('[]'),
  availableDates: jsonb("available_dates").default('[]'),
  rules: jsonb("rules").default('[]'), // List of rules like required licenses, etc.
  amenities: jsonb("amenities").default('[]'), // List of available amenities (bird dogs, guided, etc)
  tripIncludes: jsonb("trip_includes").default('[]'), // List of what's included in the trip (lodging, meals, etc)
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ExperienceLocations junction table for many-to-many relationship between experiences and locations
export const experienceLocations = pgTable("experience_locations", {
  id: serial("id").primaryKey(),
  experienceId: integer("experience_id").notNull().references(() => experiences.id),
  locationId: integer("location_id").notNull().references(() => locations.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Experience Add-ons table
export const experienceAddons = pgTable("experience_addons", {
  id: serial("id").primaryKey(),
  experienceId: integer("experience_id").notNull().references(() => experiences.id),
  name: text("name").notNull(),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  isOptional: boolean("is_optional").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Customers table
export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  zip: text("zip"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Bookings table
export const bookings = pgTable("bookings", {
  id: serial("id").primaryKey(),
  bookingNumber: text("booking_number").notNull().unique(),
  experienceId: integer("experience_id").notNull().references(() => experiences.id),
  customerId: integer("customer_id").notNull().references(() => customers.id),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  status: bookingStatusEnum("status").notNull().default('pending'),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// BookingGuides junction table for many-to-many relationship between bookings and guides
export const bookingGuides = pgTable("booking_guides", {
  id: serial("id").primaryKey(),
  bookingId: integer("booking_id").notNull().references(() => bookings.id),
  guideId: integer("guide_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Documents table
export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  path: text("path").notNull(),
  type: text("type").notNull(),
  size: integer("size").notNull(),
  bookingId: integer("booking_id").references(() => bookings.id),
  customerId: integer("customer_id").references(() => customers.id),
  guideId: integer("guide_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Payments table
export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  bookingId: integer("booking_id").notNull().references(() => bookings.id),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  status: paymentStatusEnum("status").notNull().default('pending'),
  paymentMethod: text("payment_method"),
  transactionId: text("transaction_id"),
  qbInvoiceId: text("qb_invoice_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Settings table
export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  companyName: text("company_name").notNull(),
  companyAddress: text("company_address"),
  companyPhone: text("company_phone"),
  companyEmail: text("company_email"),
  companyLogo: text("company_logo"),
  qbClientId: text("qb_client_id"),
  qbClientSecret: text("qb_client_secret"),
  qbRefreshToken: text("qb_refresh_token"),
  qbRealmId: text("qb_realm_id"),
  bookingLink: text("booking_link"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Activities table for recent activity tracking
export const activities = pgTable("activities", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  action: text("action").notNull(),
  details: json("details"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Define relationships
export const usersRelations = relations(users, ({ many }) => ({
  bookingGuides: many(bookingGuides),
  activities: many(activities),
  documents: many(documents),
}));

export const locationsRelations = relations(locations, ({ many }) => ({
  experienceLocations: many(experienceLocations),
  experiences: many(experiences), // Legacy relation, keeping for backward compatibility
}));

export const experiencesRelations = relations(experiences, ({ many, one }) => ({
  bookings: many(bookings),
  experienceLocations: many(experienceLocations),
  experienceAddons: many(experienceAddons),
  location: one(locations, {
    fields: [experiences.locationId],
    references: [locations.id],
  }), // Legacy relation, keeping for backward compatibility
}));

export const experienceLocationsRelations = relations(experienceLocations, ({ one }) => ({
  experience: one(experiences, {
    fields: [experienceLocations.experienceId],
    references: [experiences.id],
  }),
  location: one(locations, {
    fields: [experienceLocations.locationId],
    references: [locations.id],
  }),
}));

export const experienceAddonsRelations = relations(experienceAddons, ({ one }) => ({
  experience: one(experiences, {
    fields: [experienceAddons.experienceId],
    references: [experiences.id],
  }),
}));

export const customersRelations = relations(customers, ({ many }) => ({
  bookings: many(bookings),
  documents: many(documents),
}));

export const bookingsRelations = relations(bookings, ({ one, many }) => ({
  experience: one(experiences, {
    fields: [bookings.experienceId],
    references: [experiences.id],
  }),
  customer: one(customers, {
    fields: [bookings.customerId],
    references: [customers.id],
  }),
  bookingGuides: many(bookingGuides),
  payments: many(payments),
  documents: many(documents),
}));

export const bookingGuidesRelations = relations(bookingGuides, ({ one }) => ({
  booking: one(bookings, {
    fields: [bookingGuides.bookingId],
    references: [bookings.id],
  }),
  guide: one(users, {
    fields: [bookingGuides.guideId],
    references: [users.id],
  }),
}));

export const documentsRelations = relations(documents, ({ one }) => ({
  booking: one(bookings, {
    fields: [documents.bookingId],
    references: [bookings.id],
  }),
  customer: one(customers, {
    fields: [documents.customerId],
    references: [customers.id],
  }),
  guide: one(users, {
    fields: [documents.guideId],
    references: [users.id],
  }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  booking: one(bookings, {
    fields: [payments.bookingId],
    references: [bookings.id],
  }),
}));

export const activitiesRelations = relations(activities, ({ one }) => ({
  user: one(users, {
    fields: [activities.userId],
    references: [users.id],
  }),
}));

// Zod Schemas for insertion
export const insertUserSchema = createInsertSchema(users).omit({ 
  createdAt: true,
  updatedAt: true
});

export const upsertUserSchema = createInsertSchema(users).omit({ 
  createdAt: true,
  updatedAt: true
});

export const insertExperienceSchema = createInsertSchema(experiences).omit({ 
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertCustomerSchema = createInsertSchema(customers).omit({ 
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertBookingSchema = createInsertSchema(bookings).omit({ 
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertBookingGuideSchema = createInsertSchema(bookingGuides).omit({ 
  id: true,
  createdAt: true
});

export const insertDocumentSchema = createInsertSchema(documents).omit({ 
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertPaymentSchema = createInsertSchema(payments).omit({ 
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertSettingsSchema = createInsertSchema(settings).omit({ 
  id: true,
  updatedAt: true
});

export const insertActivitySchema = createInsertSchema(activities).omit({ 
  id: true,
  createdAt: true
});

export const insertLocationSchema = createInsertSchema(locations).omit({ 
  id: true,
  createdAt: true,
  updatedAt: true
});

// Insert experience locations schema
export const insertExperienceLocationSchema = createInsertSchema(experienceLocations).omit({
  id: true,
  createdAt: true
});

// Insert experience addons schema
export const insertExperienceAddonSchema = createInsertSchema(experienceAddons).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

// Export types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpsertUser = z.infer<typeof upsertUserSchema>;

export type Location = typeof locations.$inferSelect;
export type InsertLocation = z.infer<typeof insertLocationSchema>;

export type Experience = typeof experiences.$inferSelect;
export type InsertExperience = z.infer<typeof insertExperienceSchema>;

export type ExperienceLocation = typeof experienceLocations.$inferSelect;
export type InsertExperienceLocation = z.infer<typeof insertExperienceLocationSchema>;

export type ExperienceAddon = typeof experienceAddons.$inferSelect;
export type InsertExperienceAddon = z.infer<typeof insertExperienceAddonSchema>;

export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;

export type Booking = typeof bookings.$inferSelect;
export type InsertBooking = z.infer<typeof insertBookingSchema>;

export type BookingGuide = typeof bookingGuides.$inferSelect;
export type InsertBookingGuide = z.infer<typeof insertBookingGuideSchema>;

export type Document = typeof documents.$inferSelect;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;

export type Payment = typeof payments.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;

export type Settings = typeof settings.$inferSelect;
export type InsertSettings = z.infer<typeof insertSettingsSchema>;

export type Activity = typeof activities.$inferSelect;
export type InsertActivity = z.infer<typeof insertActivitySchema>;
