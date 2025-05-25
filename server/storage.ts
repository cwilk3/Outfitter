import {
  users, experiences, customers, bookings, bookingGuides, documents, payments, settings, locations, 
  experienceLocations, experienceAddons, experienceGuides, addonInventoryDates, outfitters, userOutfitters, activities,
  type User, type UpsertUser, type Experience, type InsertExperience, 
  type Customer, type InsertCustomer, type Booking, type InsertBooking,
  type BookingGuide, type InsertBookingGuide, type Document, type InsertDocument,
  type Payment, type InsertPayment, type Settings, type InsertSettings,
  type Location, type InsertLocation, type Activity, type InsertActivity,
  type ExperienceLocation, type InsertExperienceLocation, type ExperienceAddon, type InsertExperienceAddon,
  type ExperienceGuide, type InsertExperienceGuide, type Outfitter, type InsertOutfitter,
  type UserOutfitter, type InsertUserOutfitter
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, lte, desc, sql, like, inArray, exists } from "drizzle-orm";

// Interface for storage operations
export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUserWithPassword(user: { email: string; passwordHash: string; firstName?: string | null; lastName?: string | null; phone?: string | null; role?: 'admin' | 'guide' }): Promise<User>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUser(id: string, user: Partial<UpsertUser>): Promise<User | undefined>;
  getUserWithRole(userId: string): Promise<User & {outfitterId: number} | undefined>;
  listUsers(role?: string): Promise<User[]>;
  
  // Outfitter operations
  createOutfitter(outfitter: InsertOutfitter): Promise<Outfitter>;
  getOutfitter(id: number): Promise<Outfitter | undefined>;
  updateOutfitter(id: number, outfitter: Partial<InsertOutfitter>): Promise<Outfitter | undefined>;
  listOutfitters(): Promise<Outfitter[]>;
  
  // User-Outfitter relationship operations
  createUserOutfitter(data: InsertUserOutfitter): Promise<UserOutfitter>;
  addUserToOutfitter(userId: string, outfitterId: number, role: 'admin' | 'guide'): Promise<UserOutfitter>;
  getUserOutfitters(userId: string): Promise<(UserOutfitter & { outfitter: Outfitter })[]>;
  getOutfitterUsers(outfitterId: number): Promise<(UserOutfitter & { user: User })[]>;
  removeUserFromOutfitter(userId: string, outfitterId: number): Promise<void>;
  
  // Experience Guide operations
  getExperienceGuides(experienceId: number): Promise<ExperienceGuide[]>;
  getExperienceGuideById(id: number): Promise<ExperienceGuide | undefined>;
  getExperienceGuideByIdWithTenant(id: number, outfitterId: number): Promise<ExperienceGuide | undefined>;
  assignGuideToExperience(data: InsertExperienceGuide): Promise<ExperienceGuide>;
  updateGuideAssignment(id: number, data: Partial<InsertExperienceGuide>): Promise<ExperienceGuide | undefined>;
  removeGuideFromExperience(id: number): Promise<void>;
  removeGuideFromExperienceWithTenant(id: number, outfitterId: number): Promise<void>;
  getExperiencesForGuide(guideId: string): Promise<Experience[]>;

  // Location operations
  getLocation(id: number): Promise<Location | undefined>;
  createLocation(location: InsertLocation): Promise<Location>;
  updateLocation(id: number, location: Partial<InsertLocation>): Promise<Location | undefined>;
  deleteLocation(id: number): Promise<void>;
  listLocations(activeOnly?: boolean): Promise<Location[]>;

  // Experience operations
  getExperience(id: number): Promise<Experience | undefined>;
  createExperience(experience: InsertExperience): Promise<Experience>;
  updateExperience(id: number, experience: Partial<InsertExperience>): Promise<Experience | undefined>;
  deleteExperience(id: number): Promise<void>;
  listExperiences(locationId?: number): Promise<Experience[]>;
  
  // Experience Locations operations
  getExperienceLocations(experienceId: number): Promise<Location[]>;
  getAllExperienceLocations(): Promise<{ id: number, experienceId: number, locationId: number, createdAt?: Date | null }[]>;
  addExperienceLocation(experienceLocation: InsertExperienceLocation, outfitterIdFromAuth: number): Promise<{ id: number, experienceId: number, locationId: number, createdAt?: Date | null } | undefined>;
  removeExperienceLocation(experienceId: number, locationId: number): Promise<void>;
  
  // Experience Add-ons operations
  getExperienceAddons(experienceId: number): Promise<ExperienceAddon[]>;
  getExperienceAddon(id: number): Promise<ExperienceAddon | undefined>;
  createExperienceAddon(addon: InsertExperienceAddon): Promise<ExperienceAddon>;
  updateExperienceAddon(id: number, addon: Partial<InsertExperienceAddon>): Promise<ExperienceAddon | undefined>;
  deleteExperienceAddon(id: number): Promise<void>;
  
  // Customer operations
  getCustomer(id: number): Promise<Customer | undefined>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomer(id: number, customer: Partial<InsertCustomer>): Promise<Customer | undefined>;
  listCustomers(outfitterId: number, search?: string): Promise<Customer[]>;
  
  // Booking operations
  getBooking(id: number): Promise<Booking | undefined>;
  createBooking(booking: InsertBooking): Promise<Booking>;
  updateBooking(id: number, booking: Partial<InsertBooking>): Promise<Booking | undefined>;
  listBookings(filters?: { status?: string, startDate?: Date, endDate?: Date }): Promise<Booking[]>;
  getBookingByNumber(bookingNumber: string): Promise<Booking | undefined>;
  assignGuideToBooking(bookingGuide: InsertBookingGuide): Promise<BookingGuide>;
  removeGuideFromBooking(bookingId: number, guideId: string): Promise<void>;
  removeGuideFromBookingWithTenant(bookingId: number, guideId: string, outfitterId: number): Promise<void>;
  listBookingGuides(bookingId: number): Promise<BookingGuide[]>;
  
  // Document operations
  getDocument(id: number): Promise<Document | undefined>;
  createDocument(document: InsertDocument): Promise<Document>;
  updateDocument(id: number, document: Partial<InsertDocument>): Promise<Document | undefined>;
  listDocuments(filter?: { bookingId?: number, customerId?: number, guideId?: string }): Promise<Document[]>;
  deleteDocument(id: number): Promise<void>;
  
  // Payment operations
  getPayment(id: number): Promise<Payment | undefined>;
  createPayment(payment: InsertPayment): Promise<Payment>;
  updatePayment(id: number, payment: Partial<InsertPayment>): Promise<Payment | undefined>;
  listPayments(bookingId?: number): Promise<Payment[]>;
  
  // Settings operations
  getSettings(): Promise<Settings | undefined>;
  updateSettings(settings: InsertSettings): Promise<Settings>;
  

  
  // Dashboard operations
  getDashboardStats(): Promise<any>;
  
  // Additional methods needed by routes (avoid duplication with main interface)
  createUser(user: UpsertUser): Promise<User>;
  getGuideAssignmentsByGuideId(guideId: string): Promise<any[]>;
  

}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUserWithPassword(userData: { 
    email: string; 
    passwordHash: string; 
    firstName?: string | null; 
    lastName?: string | null; 
    phone?: string | null; 
    role?: 'admin' | 'guide' 
  }): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        id: Math.random().toString(36).substring(2, 15),
        email: userData.email,
        passwordHash: userData.passwordHash,
        firstName: userData.firstName,
        lastName: userData.lastName,
        phone: userData.phone,
        role: userData.role || 'admin',
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateUser(id: string, userData: Partial<UpsertUser>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({...userData, updatedAt: new Date()})
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async getUserWithRole(userId: string): Promise<User & {outfitterId: number} | undefined> {
    const [result] = await db
      .select({
        id: users.id,
        email: users.email,
        passwordHash: users.passwordHash,
        firstName: users.firstName,
        lastName: users.lastName,
        phone: users.phone,
        profileImageUrl: users.profileImageUrl,
        role: users.role,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        outfitterId: userOutfitters.outfitterId
      })
      .from(users)
      .innerJoin(userOutfitters, eq(users.id, userOutfitters.userId))
      .where(eq(users.id, userId))
      .limit(1);
    
    return result;
  }

  async listUsers(role?: 'admin' | 'guide'): Promise<User[]> {
    if (role) {
      return db.select().from(users).where(eq(users.role, role));
    }
    return db.select().from(users);
  }

  // Outfitter operations
  async createOutfitter(outfitterData: InsertOutfitter): Promise<Outfitter> {
    const [outfitter] = await db
      .insert(outfitters)
      .values(outfitterData)
      .returning();
    return outfitter;
  }

  async getOutfitter(id: number): Promise<Outfitter | undefined> {
    const [outfitter] = await db.select().from(outfitters).where(eq(outfitters.id, id));
    return outfitter;
  }

  async updateOutfitter(id: number, outfitterData: Partial<InsertOutfitter>): Promise<Outfitter | undefined> {
    const [outfitter] = await db
      .update(outfitters)
      .set({
        ...outfitterData,
        updatedAt: new Date(),
      })
      .where(eq(outfitters.id, id))
      .returning();
    return outfitter;
  }

  async listOutfitters(): Promise<Outfitter[]> {
    return db.select().from(outfitters).orderBy(outfitters.name);
  }

  // User-Outfitter relationship operations
  async createUserOutfitter(data: InsertUserOutfitter): Promise<UserOutfitter> {
    const [userOutfitter] = await db
      .insert(userOutfitters)
      .values(data)
      .returning();
    return userOutfitter;
  }

  async addUserToOutfitter(userId: string, outfitterId: number, role: 'admin' | 'guide'): Promise<UserOutfitter> {
    const [userOutfitter] = await db
      .insert(userOutfitters)
      .values({ userId, outfitterId, role })
      .returning();
    return userOutfitter;
  }

  async getUserOutfitters(userId: string): Promise<(UserOutfitter & { outfitter: Outfitter })[]> {
    return db
      .select({
        id: userOutfitters.id,
        userId: userOutfitters.userId,
        outfitterId: userOutfitters.outfitterId,
        role: userOutfitters.role,
        isActive: userOutfitters.isActive,
        createdAt: userOutfitters.createdAt,
        updatedAt: userOutfitters.updatedAt,
        outfitter: outfitters
      })
      .from(userOutfitters)
      .innerJoin(outfitters, eq(userOutfitters.outfitterId, outfitters.id))
      .where(eq(userOutfitters.userId, userId));
  }

  async getOutfitterUsers(outfitterId: number): Promise<(UserOutfitter & { user: User })[]> {
    return db
      .select({
        id: userOutfitters.id,
        userId: userOutfitters.userId,
        outfitterId: userOutfitters.outfitterId,
        role: userOutfitters.role,
        isActive: userOutfitters.isActive,
        createdAt: userOutfitters.createdAt,
        updatedAt: userOutfitters.updatedAt,
        user: users
      })
      .from(userOutfitters)
      .innerJoin(users, eq(userOutfitters.userId, users.id))
      .where(eq(userOutfitters.outfitterId, outfitterId));
  }

  async removeUserFromOutfitter(userId: string, outfitterId: number): Promise<void> {
    await db
      .delete(userOutfitters)
      .where(
        and(
          eq(userOutfitters.userId, userId),
          eq(userOutfitters.outfitterId, outfitterId)
        )
      );
  }

  // Location operations
  async getLocation(id: number): Promise<Location | undefined> {
    const [location] = await db.select().from(locations).where(eq(locations.id, id));
    return location;
  }
  
  async createLocation(locationData: InsertLocation): Promise<Location> {
    const [location] = await db
      .insert(locations)
      .values(locationData)
      .returning();
    return location;
  }
  
  async updateLocation(id: number, locationData: Partial<InsertLocation>): Promise<Location | undefined> {
    const [location] = await db
      .update(locations)
      .set({
        ...locationData,
        updatedAt: new Date(),
      })
      .where(eq(locations.id, id))
      .returning();
    return location;
  }
  
  async deleteLocation(id: number): Promise<void> {
    await db.delete(locations).where(eq(locations.id, id));
  }
  
  async listLocations(activeOnly: boolean = false): Promise<Location[]> {
    if (activeOnly) {
      return await db.select().from(locations)
        .where(eq(locations.isActive, true))
        .orderBy(locations.name);
    }
    
    return await db.select().from(locations).orderBy(locations.name);
  }

  // Experience operations
  async getExperience(id: number): Promise<Experience | undefined> {
    const [experience] = await db.select().from(experiences).where(eq(experiences.id, id));
    return experience;
  }

  async createExperience(experienceData: InsertExperience): Promise<Experience> {
    console.log('CRITICAL DEBUG: createExperience called with:', {
      name: experienceData.name,
      outfitterId: experienceData.outfitterId,
      allData: experienceData
    });
    const [experience] = await db
      .insert(experiences)
      .values(experienceData)
      .returning();
    return experience;
  }

  async updateExperience(id: number, experienceData: Partial<InsertExperience>): Promise<Experience | undefined> {
    // First, get the current experience data to ensure we don't lose the locationId
    const currentExperience = await this.getExperience(id);
    if (!currentExperience) {
      console.log(`[STORAGE] ERROR: Experience with ID ${id} not found in updateExperience`);
      return undefined;
    }
    
    console.log(`[STORAGE] Current experience before update:`, JSON.stringify(currentExperience, null, 2));
    console.log(`[STORAGE] Incoming update data:`, JSON.stringify(experienceData, null, 2));
    
    // Make sure we preserve the locationId if it's not explicitly provided
    const updateData = {
      ...experienceData,
      // Critical: Keep the original locationId if not provided in update
      locationId: experienceData.locationId !== undefined ? experienceData.locationId : currentExperience.locationId,
      updatedAt: new Date()
    };
    
    console.log(`[STORAGE] Final update data with preserved locationId:`, JSON.stringify(updateData, null, 2));
    console.log(`[STORAGE] LocationId being used for update: ${updateData.locationId} (original: ${currentExperience.locationId})`);
    
    const [experience] = await db
      .update(experiences)
      .set(updateData)
      .where(eq(experiences.id, id))
      .returning();
      
    if (!experience) {
      console.log(`[STORAGE] ERROR: Failed to update experience with ID ${id}`);
      return undefined;
    }
    
    console.log(`[STORAGE] Experience after update:`, JSON.stringify(experience, null, 2));
    return experience;
  }
  
  // Helper method to get experience locations by experience ID
  async getExperienceLocationsByExperience(experienceId: number): Promise<{ id: number, experienceId: number, locationId: number }[]> {
    // Check if there are any entries in the experienceLocations junction table
    const junctionEntries = await db
      .select()
      .from(experienceLocations)
      .where(eq(experienceLocations.experienceId, experienceId));
      
    // Also check the direct locationId on the experience
    const [experience] = await db
      .select()
      .from(experiences)
      .where(eq(experiences.id, experienceId));
      
    console.log(`[STORAGE] Junction table entries for experience ${experienceId}:`, JSON.stringify(junctionEntries, null, 2));
    console.log(`[STORAGE] Direct locationId for experience ${experienceId}:`, experience ? experience.locationId : 'Experience not found');
    
    if (junctionEntries.length === 0 && !experience) {
      return [];
    }
    
    const result = junctionEntries.map(entry => ({
      id: entry.id,
      experienceId: entry.experienceId,
      locationId: entry.locationId
    }));
    
    // If there are no junction entries but the experience has a locationId,
    // include it in the result to maintain consistency
    if (result.length === 0 && experience && experience.locationId) {
      result.push({
        id: experience.id,
        experienceId: experience.id,
        locationId: experience.locationId as number
      });
    }
    
    return result;
  }



  async deleteExperience(id: number): Promise<void> {
    console.log(`[STORAGE] Deleting experience ID: ${id}`);
    
    // Step 1: Delete all associated add-ons for this experience
    // Use a transaction to ensure atomicity: either all or none are deleted.
    await db.transaction(async (tx) => {
      // First, get all addon IDs related to this experience
      const addonsToDelete = await tx.select({ id: experienceAddons.id }).from(experienceAddons).where(eq(experienceAddons.experienceId, id));
      
      // Delete each addon, which should also delete its inventory dates if configured with cascade or handled in deleteExperienceAddon
      for (const addon of addonsToDelete) {
        console.log(`[STORAGE] Deleting associated addon ID: ${addon.id}`);
        await tx.delete(addonInventoryDates).where(eq(addonInventoryDates.addonId, addon.id)); // Delete inventory dates first
        await tx.delete(experienceAddons).where(eq(experienceAddons.id, addon.id)); // Then delete the addon
      }
      
      // Step 2: Delete the experience-location associations
      await tx.delete(experienceLocations).where(eq(experienceLocations.experienceId, id));

      // Step 3: Delete any guide assignments for this experience
      await tx.delete(experienceGuides).where(eq(experienceGuides.experienceId, id));

      // Step 4: Delete the experience itself
      console.log(`[STORAGE] Finally deleting experience ID: ${id}`);
      await tx.delete(experiences).where(eq(experiences.id, id));
    });

    console.log(`[STORAGE] Successfully deleted experience ID: ${id} and all related data.`);
  }

  async listExperiences(locationId?: number): Promise<Experience[]> {
    if (locationId) {
      return await db.select().from(experiences)
        .where(eq(experiences.locationId, locationId))
        .orderBy(experiences.name);
    }
    
    return await db.select().from(experiences).orderBy(experiences.name);
  }
  
  // Experience Locations operations
  async getExperienceLocations(experienceId: number): Promise<Location[]> {
    // Get the experience to find its locationId
    const [experience] = await db
      .select()
      .from(experiences)
      .where(eq(experiences.id, experienceId));
    
    if (!experience || !experience.locationId) {
      return [];
    }
    
    // Return the single location associated with this experience
    const [location] = await db
      .select()
      .from(locations)
      .where(eq(locations.id, experience.locationId));
    
    return location ? [location] : [];
  }
  
  async getAllExperienceLocations(): Promise<{ experienceId: number, locationId: number, id: number, createdAt?: Date | null }[]> {
    // Since we're transitioning away from the junction table, use the direct relationship
    // and format the result in the same shape as the old junction table
    const experienceData = await db
      .select({
        id: experiences.id,
        locationId: experiences.locationId,
        createdAt: experiences.createdAt
      })
      .from(experiences)
      .where(
        // Only include experiences that have a locationId
        sql`${experiences.locationId} IS NOT NULL`
      );
      
    // Transform the results to match the expected format
    return experienceData.map(exp => ({
      id: exp.id, // Using experience ID as the junction ID 
      experienceId: exp.id,
      locationId: exp.locationId as number,
      createdAt: exp.createdAt
    }));
  }
  
  async addExperienceLocation(
    experienceLocation: InsertExperienceLocation,
    outfitterIdFromAuth: number // New parameter: Pass the outfitterId directly from auth
  ): Promise<{ id: number, experienceId: number, locationId: number, createdAt?: Date | null } | undefined> { // Changed return type to allow undefined
    console.log(`📍 addExperienceLocation called with: Experience ID ${experienceLocation.experienceId}, Location ID ${experienceLocation.locationId}, Outfitter ID from Auth: ${outfitterIdFromAuth}`);

    // Step 1: Fetch the experience to check its current outfitterId
    const experience = await db.select().from(experiences).where(eq(experiences.id, experienceLocation.experienceId)).limit(1);
    const currentExperience = experience[0];

    if (!currentExperience) {
      console.error(`📍 ERROR: Experience ${experienceLocation.experienceId} not found in addExperienceLocation`);
      return undefined; // Experience not found
    }

    // Step 2: Tenant isolation and outfitterId assignment logic
    // CRITICAL: If currentExperience.outfitterId is NULL, we set it to outfitterIdFromAuth
    if (currentExperience.outfitterId === null || currentExperience.outfitterId === undefined) {
      console.log(`📍 Experience ${currentExperience.id} has NULL outfitterId. Assigning ${outfitterIdFromAuth}.`);
      // This is the crucial part: set the outfitterId for newly created experiences
      currentExperience.outfitterId = outfitterIdFromAuth;
    } else if (currentExperience.outfitterId !== outfitterIdFromAuth) {
      // If the experience already has an outfitterId and it doesn't match the current user's outfitterId, block the operation.
      console.warn(`[TENANT-BLOCK] Unauthorized attempt to update experience ${experienceLocation.experienceId}. User outfitterId: ${outfitterIdFromAuth}, Experience outfitterId: ${currentExperience.outfitterId}`);
      return undefined; // Not authorized to update this experience
    }

    // Step 3: Proceed with update only if tenant check passes (or was just assigned)
    const [updatedExperience] = await db
      .update(experiences)
      .set({
        locationId: experienceLocation.locationId,
        outfitterId: currentExperience.outfitterId, // Use the (potentially newly assigned) outfitterId
        updatedAt: new Date()
      })
      .where(eq(experiences.id, experienceLocation.experienceId))
      .returning();

    if (!updatedExperience) {
      console.error(`📍 ERROR: Failed to update experience ${experienceLocation.experienceId} with location and outfitterId`);
      return undefined;
    }

    console.log(`📍 Successfully updated experience ${updatedExperience.id} with locationId ${updatedExperience.locationId} and outfitterId ${updatedExperience.outfitterId}`);

    // Return in the format expected by the existing code
    return {
      id: updatedExperience.id,
      experienceId: updatedExperience.id,
      locationId: updatedExperience.locationId as number,
      createdAt: updatedExperience.createdAt
    };
  }
  
  async removeExperienceLocation(experienceId: number, _locationId: number): Promise<void> {
    // Instead of deleting a junction entry, set the locationId to null
    await db
      .update(experiences)
      .set({
        locationId: undefined,
        updatedAt: new Date()
      })
      .where(eq(experiences.id, experienceId));
  }
  
  // Experience Add-ons operations
  async getExperienceAddons(experienceId: number): Promise<ExperienceAddon[]> {
    return db
      .select()
      .from(experienceAddons)
      .where(eq(experienceAddons.experienceId, experienceId))
      .orderBy(experienceAddons.name);
  }
  
  async getExperienceAddon(id: number): Promise<ExperienceAddon | undefined> {
    const [addon] = await db
      .select()
      .from(experienceAddons)
      .where(eq(experienceAddons.id, id));
    return addon;
  }
  
  async createExperienceAddon(addonData: InsertExperienceAddon): Promise<ExperienceAddon> {
    // Preprocess numeric fields
    const processedData = {
      ...addonData,
      price: addonData.price,
      // Make sure inventory fields are properly initialized
      inventory: addonData.inventory || 0,
      maxPerBooking: addonData.maxPerBooking || 0
    };
    
    const [addon] = await db
      .insert(experienceAddons)
      .values(processedData)
      .returning();
    return addon;
  }
  
  async updateExperienceAddon(id: number, addonData: Partial<InsertExperienceAddon>): Promise<ExperienceAddon | undefined> {
    // Preprocess numeric fields if present
    const processedData = {
      ...addonData,
      price: addonData.price,
      // Handle inventory fields properly
      inventory: addonData.inventory !== undefined ? addonData.inventory : undefined,
      maxPerBooking: addonData.maxPerBooking !== undefined ? addonData.maxPerBooking : undefined,
      updatedAt: new Date()
    };
    
    const [addon] = await db
      .update(experienceAddons)
      .set(processedData)
      .where(eq(experienceAddons.id, id))
      .returning();
    return addon;
  }
  
  async deleteExperienceAddon(id: number): Promise<void> {
    // First delete any associated inventory date records
    await db
      .delete(addonInventoryDates)
      .where(eq(addonInventoryDates.addonId, id));
      
    // Then delete the add-on itself
    await db
      .delete(experienceAddons)
      .where(eq(experienceAddons.id, id));
  }
  
  // EXPERIENCE GUIDE MANAGEMENT
  
  // Get all guides assigned to an experience
  async getExperienceGuides(experienceId: number): Promise<ExperienceGuide[]> {
    return await db
      .select()
      .from(experienceGuides)
      .where(eq(experienceGuides.experienceId, experienceId))
      .orderBy(experienceGuides.isPrimary);
  }
  
  // Get specific guide assignment by ID
  async getExperienceGuideById(id: number): Promise<ExperienceGuide | undefined> {
    const [assignment] = await db
      .select()
      .from(experienceGuides)
      .where(eq(experienceGuides.id, id));
    
    return assignment;
  }

  // Assign a guide to an experience
  async assignGuideToExperience(data: InsertExperienceGuide): Promise<ExperienceGuide> {
    // If this guide is being set as primary, ensure no other guide for this experience is primary
    if (data.isPrimary) {
      await db
        .update(experienceGuides)
        .set({ isPrimary: false })
        .where(
          and(
            eq(experienceGuides.experienceId, data.experienceId),
            eq(experienceGuides.isPrimary, true)
          )
        );
    }
    
    const [guide] = await db
      .insert(experienceGuides)
      .values(data)
      .returning();
    
    return guide;
  }

  // Update a guide assignment
  async updateGuideAssignment(id: number, data: Partial<InsertExperienceGuide>): Promise<ExperienceGuide | undefined> {
    // If updating to primary, ensure no other guide for this experience is primary
    if (data.isPrimary) {
      // Get the experience ID for this guide assignment
      const [currentAssignment] = await db
        .select()
        .from(experienceGuides)
        .where(eq(experienceGuides.id, id));
      
      if (currentAssignment) {
        await db
          .update(experienceGuides)
          .set({ isPrimary: false })
          .where(
            and(
              eq(experienceGuides.experienceId, currentAssignment.experienceId),
              eq(experienceGuides.isPrimary, true),
              sql`${experienceGuides.id} != ${id}`
            )
          );
      }
    }
    
    const [updatedGuide] = await db
      .update(experienceGuides)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(eq(experienceGuides.id, id))
      .returning();
    
    return updatedGuide;
  }

  // Remove a guide from an experience
  async removeGuideFromExperience(id: number): Promise<void> {
    console.log(`[DB] Starting removeGuideFromExperience for ID: ${id}`);
    
    try {
      // Get the assignment before deleting to check if it's primary
      const [assignment] = await db
        .select()
        .from(experienceGuides)
        .where(eq(experienceGuides.id, id));
      
      if (!assignment) {
        console.log(`[DB] No guide assignment found with ID: ${id}`);
        return;
      }
      
      console.log(`[DB] Found guide assignment to delete:`, assignment);
      
      // Use a transaction to ensure all operations are atomic
      await db.transaction(async (tx) => {
        // Delete the guide assignment first
        const deleteResult = await tx
          .delete(experienceGuides)
          .where(eq(experienceGuides.id, id))
          .returning();
        
        console.log(`[DB] Delete result:`, deleteResult);
        
        // If this was a primary guide, set another guide as primary if available
        if (assignment.isPrimary) {
          const [nextGuide] = await tx
            .select()
            .from(experienceGuides)
            .where(eq(experienceGuides.experienceId, assignment.experienceId))
            .limit(1);
          
          if (nextGuide) {
            console.log(`[DB] Setting new primary guide:`, nextGuide);
            await tx
              .update(experienceGuides)
              .set({ isPrimary: true })
              .where(eq(experienceGuides.id, nextGuide.id));
          }
        }
      });
      
      // Verify deletion was successful
      const [verifyDeleted] = await db
        .select()
        .from(experienceGuides)
        .where(eq(experienceGuides.id, id));
      
      if (verifyDeleted) {
        console.error(`[DB] !!! DELETION FAILED - Guide assignment still exists after deletion:`, verifyDeleted);
        throw new Error('Guide assignment deletion failed - record still exists');
      } else {
        console.log(`[DB] Guide assignment successfully deleted. Verification passed.`);
      }
    } catch (error) {
      console.error(`[DB] Error in removeGuideFromExperience:`, error);
      throw error; // Rethrow for proper error handling upstream
    }
  }

  // Get all experiences assigned to a guide
  async getExperiencesForGuide(guideId: string): Promise<Experience[]> {
    return await db
      .select({
        experience: experiences
      })
      .from(experienceGuides)
      .innerJoin(experiences, eq(experienceGuides.experienceId, experiences.id))
      .where(eq(experienceGuides.guideId, guideId))
      .then(rows => rows.map(row => row.experience));
  }
  
  // ADDON INVENTORY PER-DAY TRACKING
  
  // Get inventory usage for add-on by date
  async getAddonInventoryByDate(addonId: number, date: Date): Promise<{addonId: number, date: Date, usedInventory: number} | undefined> {
    const [inventory] = await db
      .select()
      .from(addonInventoryDates)
      .where(
        and(
          eq(addonInventoryDates.addonId, addonId),
          eq(addonInventoryDates.date, date)
        )
      );
    return inventory;
  }
  
  // Check if add-on has available inventory for a specific date
  async checkAddonAvailability(addonId: number, date: Date, quantityRequested: number): Promise<boolean> {
    try {
      // Get the add-on to check max inventory
      const addon = await this.getExperienceAddon(addonId);
      if (!addon || addon.inventory === null || addon.inventory === undefined) {
        return false; // If add-on doesn't exist or has no inventory, it's not available
      }
      
      // Get current inventory usage for this date
      const inventoryUsage = await this.getAddonInventoryByDate(addonId, date);
      const currentlyUsed = inventoryUsage ? inventoryUsage.usedInventory : 0;
      
      // Check if there's enough inventory available
      return (addon.inventory - currentlyUsed) >= quantityRequested;
    } catch (error) {
      console.error(`Error checking add-on availability for ${addonId} on ${date}:`, error);
      return false;
    }
  }
  
  // Update inventory usage for an add-on on a specific date (when booking/canceling)
  async updateAddonInventoryUsage(addonId: number, date: Date, quantityChange: number): Promise<boolean> {
    try {
      // Check if there's an existing inventory record for this date
      const inventoryUsage = await this.getAddonInventoryByDate(addonId, date);
      
      if (inventoryUsage) {
        // Update existing record
        const newUsedInventory = inventoryUsage.usedInventory + quantityChange;
        
        // Ensure we don't go below 0
        const finalQuantity = newUsedInventory < 0 ? 0 : newUsedInventory;
        
        await db
          .update(addonInventoryDates)
          .set({ 
            usedInventory: finalQuantity,
            updatedAt: new Date()
          })
          .where(
            and(
              eq(addonInventoryDates.addonId, addonId),
              eq(addonInventoryDates.date, date)
            )
          );
      } else {
        // Create new record if quantityChange is positive
        if (quantityChange > 0) {
          await db
            .insert(addonInventoryDates)
            .values({
              addonId,
              date,
              usedInventory: quantityChange,
            });
        }
      }
      
      return true;
    } catch (error) {
      console.error(`Error updating add-on inventory for ${addonId} on ${date}:`, error);
      return false;
    }
  }

  // Customer operations
  async getCustomer(id: number): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers).where(eq(customers.id, id));
    return customer;
  }

  async createCustomer(customerData: InsertCustomer): Promise<Customer> {
    const [customer] = await db
      .insert(customers)
      .values(customerData)
      .returning();
    return customer;
  }

  async updateCustomer(id: number, customerData: Partial<InsertCustomer>): Promise<Customer | undefined> {
    const [customer] = await db
      .update(customers)
      .set({...customerData, updatedAt: new Date()})
      .where(eq(customers.id, id))
      .returning();
    return customer;
  }

  async listCustomers(outfitterId: number, search?: string): Promise<Customer[]> {
    if (search && search.trim()) {
      return await db.select().from(customers)
        .where(and(
          eq(customers.outfitterId, outfitterId),
          sql`CONCAT(COALESCE(${customers.firstName}, ''), ' ', COALESCE(${customers.lastName}, ''), ' ', ${customers.email}) ILIKE ${`%${search}%`}`
        ));
    }
    
    return await db.select().from(customers)
      .where(eq(customers.outfitterId, outfitterId));
  }

  // Booking operations
  async getBooking(id: number): Promise<Booking | undefined> {
    const [booking] = await db.select().from(bookings).where(eq(bookings.id, id));
    return booking;
  }

  async createBooking(bookingData: InsertBooking): Promise<Booking> {
    const [booking] = await db
      .insert(bookings)
      .values(bookingData)
      .returning();
    return booking;
  }

  async updateBooking(id: number, bookingData: Partial<InsertBooking>): Promise<Booking | undefined> {
    const [booking] = await db
      .update(bookings)
      .set({...bookingData, updatedAt: new Date()})
      .where(eq(bookings.id, id))
      .returning();
    return booking;
  }

  async listBookings(filters?: { status?: string, startDate?: Date, endDate?: Date }): Promise<Booking[]> {
    if (filters) {
      const conditions = [];
      
      if (filters.status) {
        conditions.push(eq(bookings.status, filters.status as any));
      }
      
      if (filters.startDate) {
        const startDate = filters.startDate instanceof Date ? filters.startDate : new Date(filters.startDate);
        conditions.push(gte(bookings.startDate, startDate));
      }
      
      if (filters.endDate) {
        const endDate = filters.endDate instanceof Date ? filters.endDate : new Date(filters.endDate);
        conditions.push(lte(bookings.endDate, endDate));
      }
      
      if (conditions.length > 0) {
        return await db.select().from(bookings)
          .where(and(...conditions))
          .orderBy(desc(bookings.startDate));
      }
    }
    
    return await db.select().from(bookings).orderBy(desc(bookings.startDate));
  }

  async getBookingByNumber(bookingNumber: string): Promise<Booking | undefined> {
    const [booking] = await db.select().from(bookings).where(eq(bookings.bookingNumber, bookingNumber));
    return booking;
  }

  async assignGuideToBooking(data: InsertBookingGuide): Promise<BookingGuide> {
    const [bookingGuide] = await db
      .insert(bookingGuides)
      .values(data)
      .returning();
    return bookingGuide;
  }

  async removeGuideFromBooking(bookingId: number, guideId: string): Promise<void> {
    await db
      .delete(bookingGuides)
      .where(
        and(
          eq(bookingGuides.bookingId, bookingId),
          eq(bookingGuides.guideId, guideId)
        )
      );
  }

  async listBookingGuides(bookingId: number): Promise<BookingGuide[]> {
    return db.select().from(bookingGuides).where(eq(bookingGuides.bookingId, bookingId));
  }

  // Document operations
  async getDocument(id: number): Promise<Document | undefined> {
    const [document] = await db.select().from(documents).where(eq(documents.id, id));
    return document;
  }

  async createDocument(documentData: InsertDocument): Promise<Document> {
    const [document] = await db
      .insert(documents)
      .values(documentData)
      .returning();
    return document;
  }

  async updateDocument(id: number, documentData: Partial<InsertDocument>): Promise<Document | undefined> {
    const [document] = await db
      .update(documents)
      .set({...documentData, updatedAt: new Date()})
      .where(eq(documents.id, id))
      .returning();
    return document;
  }

  async listDocuments(filter?: { bookingId?: number, customerId?: number, guideId?: string }): Promise<Document[]> {
    let query = db.select().from(documents);
    
    if (filter) {
      const conditions = [];
      
      if (filter.bookingId) {
        conditions.push(eq(documents.bookingId, filter.bookingId));
      }
      
      if (filter.customerId) {
        conditions.push(eq(documents.customerId, filter.customerId));
      }
      
      if (filter.guideId) {
        conditions.push(eq(documents.guideId, filter.guideId));
      }
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as any;
      }
    }
    
    return await query.orderBy(desc(documents.createdAt));
  }

  async deleteDocument(id: number): Promise<void> {
    await db
      .delete(documents)
      .where(eq(documents.id, id));
  }

  // Payment operations
  async getPayment(id: number): Promise<Payment | undefined> {
    const [payment] = await db.select().from(payments).where(eq(payments.id, id));
    return payment;
  }

  async createPayment(paymentData: InsertPayment): Promise<Payment> {
    const [payment] = await db
      .insert(payments)
      .values(paymentData)
      .returning();
    return payment;
  }

  async updatePayment(id: number, paymentData: Partial<InsertPayment>): Promise<Payment | undefined> {
    const [payment] = await db
      .update(payments)
      .set({...paymentData, updatedAt: new Date()})
      .where(eq(payments.id, id))
      .returning();
    return payment;
  }

  async listPayments(bookingId?: number): Promise<Payment[]> {
    if (bookingId) {
      return db.select().from(payments).where(eq(payments.bookingId, bookingId));
    }
    return db.select().from(payments).orderBy(desc(payments.createdAt));
  }

  // Settings operations
  async getSettings(): Promise<Settings | undefined> {
    const [settingsRecord] = await db.select().from(settings);
    return settingsRecord;
  }

  async updateSettings(settingsData: InsertSettings): Promise<Settings> {
    const existingSettings = await this.getSettings();
    
    if (existingSettings) {
      const [result] = await db
        .update(settings)
        .set({...settingsData, updatedAt: new Date()})
        .where(eq(settings.id, existingSettings.id))
        .returning();
      return result;
    } else {
      const [result] = await db
        .insert(settings)
        .values(settingsData)
        .returning();
      return result;
    }
  }



  // Dashboard operations
  async getDashboardStats(): Promise<any> {
    // Get upcoming bookings count
    const now = new Date();
    const upcomingBookingsResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(bookings)
      .where(and(
        gte(bookings.startDate, now),
        eq(bookings.status, 'confirmed')
      ));
    
    // Get monthly revenue
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    const monthlyRevenueResult = await db
      .select({ 
        sum: sql<string>`SUM(${payments.amount})` 
      })
      .from(payments)
      .where(and(
        gte(payments.createdAt, startOfMonth),
        lte(payments.createdAt, endOfMonth),
        eq(payments.status, 'completed')
      ));
    
    // Get active customers count
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
    const activeCustomersResult = await db
      .select({ count: sql<number>`count(DISTINCT ${bookings.customerId})` })
      .from(bookings)
      .where(and(
        gte(bookings.createdAt, threeMonthsAgo),
        inArray(bookings.status, ['confirmed', 'deposit_paid', 'paid', 'completed'])
      ));
    
    // Get completed trips count
    const completedTripsResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(bookings)
      .where(eq(bookings.status, 'completed'));
    
    return {
      upcomingBookings: upcomingBookingsResult[0]?.count || 0,
      monthlyRevenue: parseFloat(monthlyRevenueResult[0]?.sum || '0'),
      activeCustomers: activeCustomersResult[0]?.count || 0,
      completedTrips: completedTripsResult[0]?.count || 0
    };
  }

  async getUpcomingBookings(limit: number = 5): Promise<any[]> {
    const now = new Date();
    
    const upcomingBookings = await db.select({
      id: bookings.id,
      bookingNumber: bookings.bookingNumber,
      experienceId: bookings.experienceId,
      experienceName: experiences.name,
      customerId: bookings.customerId,
      customerFirstName: customers.firstName,
      customerLastName: customers.lastName,
      startDate: bookings.startDate,
      endDate: bookings.endDate,
      status: bookings.status,
      totalAmount: bookings.totalAmount
    })
    .from(bookings)
    .innerJoin(experiences, eq(bookings.experienceId, experiences.id))
    .innerJoin(customers, eq(bookings.customerId, customers.id))
    .where(gte(bookings.startDate, now))
    .orderBy(bookings.startDate)
    .limit(limit);
    
    // For each booking, get the guide information
    const result = [];
    
    for (const booking of upcomingBookings) {
      const guides = await db.select({
        guideId: users.id,
        guideFirstName: users.firstName,
        guideLastName: users.lastName
      })
      .from(bookingGuides)
      .innerJoin(users, eq(bookingGuides.guideId, users.id))
      .where(eq(bookingGuides.bookingId, booking.id));
      
      result.push({
        ...booking,
        guides: guides
      });
    }
    
    return result;
  }

  // Missing methods required by IStorage interface
  async createUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .returning();
    return user;
  }

  async getGuideAssignmentsByGuideId(guideId: string): Promise<ExperienceGuide[]> {
    return await db
      .select()
      .from(experienceGuides)
      .where(eq(experienceGuides.guideId, guideId));
  }


}

export const storage = new DatabaseStorage();
