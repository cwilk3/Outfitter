import {
  users, experiences, customers, bookings, bookingGuides, documents, payments, settings, locations, 
  experienceLocations, experienceAddons, experienceGuides, addonInventoryDates, outfitters, userOutfitters,
  type User, type UpsertUser, type Experience, type InsertExperience, 
  type Customer, type InsertCustomer, type Booking, type InsertBooking,
  type BookingGuide, type InsertBookingGuide, type Document, type InsertDocument,
  type Payment, type InsertPayment, type Settings, type InsertSettings,
  type Location, type InsertLocation,
  type ExperienceLocation, type InsertExperienceLocation, type ExperienceAddon, type InsertExperienceAddon,
  type ExperienceGuide, type InsertExperienceGuide, type Outfitter, type InsertOutfitter,
  type UserOutfitter, type InsertUserOutfitter
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, lte, desc, sql, like, inArray } from "drizzle-orm";

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
  assignGuideToExperience(data: InsertExperienceGuide): Promise<ExperienceGuide>;
  updateGuideAssignment(id: number, data: Partial<InsertExperienceGuide>): Promise<ExperienceGuide | undefined>;
  removeGuideFromExperience(id: number): Promise<void>;
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
  addExperienceLocation(experienceLocation: InsertExperienceLocation): Promise<{ id: number, experienceId: number, locationId: number, createdAt?: Date | null }>;
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
  listBookingGuides(bookingId: number): Promise<BookingGuide[]>;
  
  // Document operations
  getDocument(id: number): Promise<Document | undefined>;
  createDocument(document: InsertDocument): Promise<Document>;
  updateDocument(id: number, document: Partial<InsertDocument>): Promise<Document | undefined>;
  listDocuments(filter?: { bookingId?: number, customerId?: number, guideId?: number }): Promise<Document[]>;
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
    await db.delete(experiences).where(eq(experiences.id, id));
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
  
  async addExperienceLocation(experienceLocation: InsertExperienceLocation): Promise<{ id: number, experienceId: number, locationId: number, createdAt?: Date | null }> {
    // Add detailed logging to track what's happening
    console.log(`📍 addExperienceLocation called: Setting experience ${experienceLocation.experienceId} to location ${experienceLocation.locationId}`);
    
    // Instead of creating a junction table entry, update the experience with the locationId
    const [updatedExperience] = await db
      .update(experiences)
      .set({ 
        locationId: experienceLocation.locationId,
        updatedAt: new Date()
      })
      .where(eq(experiences.id, experienceLocation.experienceId))
      .returning();
    
    if (!updatedExperience) {
      console.error(`📍 ERROR: Experience ${experienceLocation.experienceId} not found when updating location`);
      throw new Error('Experience not found');
    }
    
    console.log(`📍 Successfully updated experience ${experienceLocation.experienceId} with locationId ${experienceLocation.locationId}`);
    
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
        locationId: null,
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
      price: typeof addonData.price === 'number' ? addonData.price.toString() : addonData.price,
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
      price: addonData.price !== undefined && typeof addonData.price === 'number' 
        ? addonData.price.toString() 
        : addonData.price,
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
    if (search) {
      return await db.select().from(customers)
        .where(and(
          eq(customers.outfitterId, outfitterId),
          sql`CONCAT(${customers.firstName}, ' ', ${customers.lastName}, ' ', ${customers.email}) ILIKE ${`%${search}%`}`
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
        conditions.push(gte(bookings.startDate, filters.startDate));
      }
      
      if (filters.endDate) {
        conditions.push(lte(bookings.endDate, filters.endDate));
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

  async listDocuments(filter?: { bookingId?: number, customerId?: number, guideId?: number }): Promise<Document[]> {
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
        query = query.where(and(...conditions));
      }
    }
    
    return query.orderBy(desc(documents.createdAt));
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

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private locations: Map<number, Location>;
  private experiences: Map<number, Experience>;
  private experienceLocations: Map<number, ExperienceLocation>;
  private experienceAddons: Map<number, ExperienceAddon>;
  private experienceGuides: Map<number, ExperienceGuide>;
  private customers: Map<number, Customer>;
  private bookings: Map<number, Booking>;
  private bookingGuides: Map<number, BookingGuide>;
  private documents: Map<number, Document>;
  private payments: Map<number, Payment>;
  private settings: Settings | undefined;
  private activities: Map<number, Activity>;
  
  private currentIds = {
    location: 1,
    experience: 1,
    experienceLocation: 1,
    experienceAddon: 1,
    experienceGuide: 1,
    customer: 1,
    booking: 1,
    bookingGuide: 1,
    document: 1,
    payment: 1,
    activity: 1,
  };
  
  constructor() {
    this.users = new Map();
    this.locations = new Map();
    this.experiences = new Map();
    this.experienceLocations = new Map();
    this.experienceAddons = new Map();
    this.experienceGuides = new Map();
    this.customers = new Map();
    this.bookings = new Map();
    this.bookingGuides = new Map();
    this.documents = new Map();
    this.payments = new Map();
    this.activities = new Map();
    
    // The currentIds are already initialized above, no need to do it again
    
    // Add sample data
    this.seedData();
  }
  
  // Experience Guide management methods
  async getExperienceGuides(experienceId: number): Promise<ExperienceGuide[]> {
    console.log(`[GUIDE_STORAGE] Fetching guides for experience ${experienceId}`);
    
    // Verify the experience exists
    const experience = this.experiences.get(experienceId);
    if (!experience) {
      console.warn(`[GUIDE_STORAGE] Warning: Fetching guides for non-existent experience ID: ${experienceId}`);
      return [];
    }
    
    // Get all guides assigned to this experience
    const result: ExperienceGuide[] = [];
    let count = 0;
    
    for (const guide of this.experienceGuides.values()) {
      if (guide.experienceId === experienceId) {
        result.push(guide);
        count++;
      }
    }
    
    console.log(`[GUIDE_STORAGE] Found ${count} guides assigned to experience ${experienceId} (${experience.name})`);
    
    // Debug logging all guides in memory to help diagnose issues
    console.log(`[GUIDE_STORAGE] All guide assignments in memory (${this.experienceGuides.size} total):`);
    for (const [id, guide] of this.experienceGuides.entries()) {
      console.log(`- Guide ID: ${guide.guideId}, Experience ID: ${guide.experienceId}, Assignment ID: ${id}, Primary: ${guide.isPrimary}`);
    }
    
    // Sort by isPrimary (true first)
    return result.sort((a, b) => (b.isPrimary === true ? 1 : 0) - (a.isPrimary === true ? 1 : 0));
  }
  
  async getExperienceGuideById(id: number): Promise<ExperienceGuide | undefined> {
    return this.experienceGuides.get(id);
  }

  async assignGuideToExperience(data: InsertExperienceGuide): Promise<ExperienceGuide> {
    console.log(`[GUIDE_STORAGE] Assigning guide ${data.guideId} to experience ${data.experienceId}`);
    
    // Double-check the experience exists first
    const experience = this.experiences.get(data.experienceId);
    if (!experience) {
      console.error(`[GUIDE_STORAGE] Error: Attempted to assign guide to non-existent experience ID: ${data.experienceId}`);
      throw new Error(`Experience with ID ${data.experienceId} not found`);
    }
    console.log(`[GUIDE_STORAGE] Found target experience: ${experience.name} (ID: ${experience.id})`);
    
    // Check if guide is already assigned to avoid duplicates
    let existingAssignment: ExperienceGuide | undefined;
    for (const guide of this.experienceGuides.values()) {
      if (guide.experienceId === data.experienceId && guide.guideId === data.guideId) {
        existingAssignment = guide;
        break;
      }
    }
    
    if (existingAssignment) {
      console.log(`[GUIDE_STORAGE] Guide ${data.guideId} is already assigned to experience ${data.experienceId}, updating instead`);
      // Update the existing assignment instead of creating a new one
      existingAssignment.isPrimary = data.isPrimary;
      existingAssignment.updatedAt = new Date();
      this.experienceGuides.set(existingAssignment.id, existingAssignment);
      return existingAssignment;
    }
    
    // If this guide is being set as primary, ensure no other guide is primary
    if (data.isPrimary) {
      for (const guide of this.experienceGuides.values()) {
        if (guide.experienceId === data.experienceId && guide.isPrimary) {
          console.log(`[GUIDE_STORAGE] Removing primary status from guide ${guide.guideId} for experience ${guide.experienceId}`);
          guide.isPrimary = false;
          guide.updatedAt = new Date();
          this.experienceGuides.set(guide.id, guide);
        }
      }
    }
    
    const id = this.currentIds.experienceGuide++;
    const now = new Date();
    const guide: ExperienceGuide = { 
      ...data, 
      id, 
      createdAt: now, 
      updatedAt: now,
      // Ensure isPrimary is never undefined
      isPrimary: data.isPrimary === true ? true : false
    };
    
    console.log(`[GUIDE_STORAGE] Creating new guide assignment with ID ${id}`, guide);
    this.experienceGuides.set(id, guide);
    
    // Verify the assignment was stored correctly
    const verification = this.experienceGuides.get(id);
    if (!verification) {
      console.error(`[GUIDE_STORAGE] Failed to store guide assignment in memory! ID: ${id}`);
    } else {
      console.log(`[GUIDE_STORAGE] Successfully stored guide assignment with ID ${id}`);
    }
    
    return guide;
  }

  async getGuideAssignmentsByGuideId(guideId: string): Promise<ExperienceGuide[]> {
    const result: ExperienceGuide[] = [];
    for (const guide of this.experienceGuides.values()) {
      if (guide.guideId === guideId) {
        result.push(guide);
      }
    }
    return result;
  }
  
  async getGuideAssignmentsByExperienceId(experienceId: number): Promise<ExperienceGuide[]> {
    const result: ExperienceGuide[] = [];
    for (const guide of this.experienceGuides.values()) {
      if (guide.experienceId === experienceId) {
        result.push(guide);
      }
    }
    // Sort by isPrimary (true first)
    return result.sort((a, b) => (b.isPrimary === true ? 1 : 0) - (a.isPrimary === true ? 1 : 0));
  }
  
  async updateGuideAssignment(id: number, data: Partial<InsertExperienceGuide>): Promise<ExperienceGuide | undefined> {
    const guide = this.experienceGuides.get(id);
    if (!guide) return undefined;
    
    // If updating to primary, handle other guides
    if (data.isPrimary) {
      for (const otherGuide of this.experienceGuides.values()) {
        if (
          otherGuide.experienceId === guide.experienceId && 
          otherGuide.id !== id && 
          otherGuide.isPrimary
        ) {
          otherGuide.isPrimary = false;
          otherGuide.updatedAt = new Date();
          this.experienceGuides.set(otherGuide.id, otherGuide);
        }
      }
    }
    
    const updatedGuide: ExperienceGuide = {
      ...guide,
      ...data,
      updatedAt: new Date()
    };
    
    this.experienceGuides.set(id, updatedGuide);
    return updatedGuide;
  }

  async removeGuideFromExperience(id: number): Promise<void> {
    console.log(`[MEM] Starting removeGuideFromExperience for ID: ${id}`);
    
    const guide = this.experienceGuides.get(id);
    if (!guide) {
      console.log(`[MEM] No guide assignment found with ID: ${id}`);
      return;
    }
    
    console.log(`[MEM] Found guide assignment to delete:`, guide);
    
    // Delete the guide assignment
    const deleteResult = this.experienceGuides.delete(id);
    console.log(`[MEM] Deletion operation result: ${deleteResult}`);
    
    // If this was primary, set another guide as primary
    if (guide.isPrimary) {
      let foundNewPrimary = false;
      
      // Find another guide for this experience
      for (const otherGuide of this.experienceGuides.values()) {
        if (otherGuide.experienceId === guide.experienceId) {
          console.log(`[MEM] Setting new primary guide:`, otherGuide);
          otherGuide.isPrimary = true;
          otherGuide.updatedAt = new Date();
          this.experienceGuides.set(otherGuide.id, otherGuide);
          foundNewPrimary = true;
          break;
        }
      }
      
      if (!foundNewPrimary) {
        console.log(`[MEM] No other guide found to set as primary for experience: ${guide.experienceId}`);
      }
    }
    
    // Verify deletion was successful
    const verifyDeleted = this.experienceGuides.get(id);
    if (verifyDeleted) {
      console.error(`[MEM] !!! DELETION FAILED - Guide assignment still exists after deletion:`, verifyDeleted);
      throw new Error('Guide assignment deletion failed - record still exists');
    } else {
      console.log(`[MEM] Guide assignment successfully deleted. Verification passed.`);
    }
  }

  async getExperiencesForGuide(guideId: string): Promise<Experience[]> {
    const experienceIds = new Set<number>();
    
    // Collect all experience IDs associated with this guide
    for (const guide of this.experienceGuides.values()) {
      if (guide.guideId === guideId) {
        experienceIds.add(guide.experienceId);
      }
    }
    
    // Get the corresponding experience objects
    const result: Experience[] = [];
    for (const id of experienceIds) {
      const experience = this.experiences.get(id);
      if (experience) {
        result.push(experience);
      }
    }
    
    return result;
  }


  private seedData() {
    // Add an admin user
    const adminUser: UpsertUser = {
      id: '1',
      firstName: 'John',
      lastName: 'Smith',
      email: 'admin@outfitter.com',
      role: 'admin',
    };
    this.upsertUser(adminUser);
    
    // Add a guide user
    const guideUser: UpsertUser = {
      id: '2',
      firstName: 'Mike',
      lastName: 'Johnson',
      email: 'mike@outfitter.com',
      role: 'guide',
    };
    this.upsertUser(guideUser);
    
    // Add locations
    const texasLocation: InsertLocation = {
      name: 'Texas Ranch',
      city: 'Austin',
      state: 'TX',
      address: '123 Ranch Road',
      zip: '78701',
      description: 'Our premier Texas hunting property with diverse game and scenic views.',
      isActive: true
    };
    this.createLocation(texasLocation);
    
    const oklahomaLocation: InsertLocation = {
      name: 'Oklahoma Lodge',
      city: 'Broken Bow',
      state: 'OK',
      address: '456 Forest Drive',
      zip: '74728',
      description: 'Secluded Oklahoma lodge with access to pristine fishing lakes and hunting grounds.',
      isActive: true
    };
    this.createLocation(oklahomaLocation);
    
    const kansasLocation: InsertLocation = {
      name: 'Kansas Fields',
      city: 'Wichita',
      state: 'KS',
      address: '789 Prairie Lane',
      zip: '67202',
      description: 'Expansive Kansas property featuring prime upland bird hunting.',
      isActive: true
    };
    this.createLocation(kansasLocation);
    
    // Add experiences
    const duckHunt: InsertExperience = {
      name: 'Duck Hunt',
      description: 'An exciting duck hunting adventure in prime wetlands.',
      duration: 2,
      price: '1200',
      capacity: 4,
      category: 'duck_hunting',
      locationId: 1 // Texas Ranch
    };
    this.createExperience(duckHunt);
    
    const elkHunt: InsertExperience = {
      name: 'Elk Hunt',
      description: 'Guided elk hunting in the mountains.',
      duration: 3,
      price: '3500',
      capacity: 2,
      category: 'other_hunting',
      locationId: 2 // Oklahoma Lodge
    };
    this.createExperience(elkHunt);
    
    const bassFishing: InsertExperience = {
      name: 'Bass Fishing',
      description: 'Guided bass fishing on our private lakes.',
      duration: 2,
      price: '850',
      capacity: 3,
      category: 'bass_fishing',
      locationId: 3 // Kansas Fields
    };
    this.createExperience(bassFishing);
    
    const deerHunting: InsertExperience = {
      name: 'Whitetail Deer Hunt',
      description: 'Premium guided deer hunting experience.',
      duration: 3,
      price: '2500',
      capacity: 4, 
      category: 'deer_hunting',
      locationId: 1 // Texas Ranch
    };
    this.createExperience(deerHunting);
    
    const flyfishing: InsertExperience = {
      name: 'Fly Fishing Adventure',
      description: 'Guided fly fishing in pristine mountain streams.',
      duration: 1,
      price: '600',
      capacity: 2,
      category: 'trout_fishing',
      locationId: 2 // Oklahoma Lodge
    };
    this.createExperience(flyfishing);
    
    // Add add-ons for experiences
    const fishingGuide: InsertExperienceAddon = {
      name: 'Professional Guide',
      description: 'Get a professional fishing guide for your experience',
      price: '150',
      experienceId: 3, // Bass Fishing
      isOptional: true
    };
    this.createExperienceAddon(fishingGuide);
    
    const premiumGear: InsertExperienceAddon = {
      name: 'Premium Gear Package',
      description: 'Use our high-end fishing equipment',
      price: '75',
      experienceId: 3, // Bass Fishing
      isOptional: true
    };
    this.createExperienceAddon(premiumGear);
    
    const lunchPackage: InsertExperienceAddon = {
      name: 'Lunch Package',
      description: 'Gourmet lunch provided during your trip',
      price: '50',
      experienceId: 3, // Bass Fishing
      isOptional: true
    };
    this.createExperienceAddon(lunchPackage);
    
    const huntingGuide: InsertExperienceAddon = {
      name: 'Expert Hunting Guide',
      description: 'Personal guide with expert knowledge of the area',
      price: '200',
      experienceId: 1, // Duck Hunt
      isOptional: true
    };
    this.createExperienceAddon(huntingGuide);
    
    const huntingDogs: InsertExperienceAddon = {
      name: 'Hunting Dogs',
      description: 'Trained hunting dogs to assist with your hunt',
      price: '100',
      experienceId: 1, // Duck Hunt
      isOptional: true
    };
    this.createExperienceAddon(huntingDogs);

    // Add experience-location associations
    // Duck Hunt can be offered at both Texas Ranch and Kansas Fields
    this.addExperienceLocation({
      experienceId: 1, // Duck Hunt
      locationId: 1    // Texas Ranch
    });
    this.addExperienceLocation({
      experienceId: 1, // Duck Hunt
      locationId: 3    // Kansas Fields
    });
    
    // Elk Hunt is at Oklahoma Lodge
    this.addExperienceLocation({
      experienceId: 2, // Elk Hunt
      locationId: 2    // Oklahoma Lodge
    });
    
    // Bass Fishing is at Kansas Fields
    this.addExperienceLocation({
      experienceId: 3, // Bass Fishing
      locationId: 3    // Kansas Fields
    });
    
    // Deer Hunting at Texas Ranch
    this.addExperienceLocation({
      experienceId: 4, // Whitetail Deer Hunt
      locationId: 1    // Texas Ranch
    });
    
    // Fly Fishing at Oklahoma Lodge and Kansas Fields
    this.addExperienceLocation({
      experienceId: 5, // Fly Fishing
      locationId: 2    // Oklahoma Lodge
    });
    this.addExperienceLocation({
      experienceId: 5, // Fly Fishing
      locationId: 3    // Kansas Fields
    });
    
    // Add customers
    const customer1: InsertCustomer = {
      firstName: 'Sam',
      lastName: 'Thompson',
      email: 'sam@example.com',
      phone: '555-123-4567',
    };
    this.createCustomer(customer1);
    
    const customer2: InsertCustomer = {
      firstName: 'Robert',
      lastName: 'Martinez',
      email: 'robert@example.com',
      phone: '555-987-6543',
    };
    this.createCustomer(customer2);
    
    const customer3: InsertCustomer = {
      firstName: 'Lisa',
      lastName: 'Garcia',
      email: 'lisa@example.com',
      phone: '555-456-7890',
    };
    this.createCustomer(customer3);
    
    // Add bookings
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    
    const nextWeek = new Date(now);
    nextWeek.setDate(now.getDate() + 7);
    
    const booking1: InsertBooking = {
      bookingNumber: 'B-2023-095',
      experienceId: 1,
      customerId: 1,
      startDate: tomorrow,
      endDate: new Date(tomorrow.getTime() + 2 * 24 * 60 * 60 * 1000),
      status: 'confirmed',
      totalAmount: 1200,
      groupSize: 2,
    };
    this.createBooking(booking1);
    
    const booking2: InsertBooking = {
      bookingNumber: 'B-2023-096',
      experienceId: 2,
      customerId: 2,
      startDate: nextWeek,
      endDate: new Date(nextWeek.getTime() + 3 * 24 * 60 * 60 * 1000),
      status: 'deposit_paid',
      totalAmount: 3500,
      groupSize: 4,
    };
    this.createBooking(booking2);
    
    const twoWeeksFromNow = new Date(now);
    twoWeeksFromNow.setDate(now.getDate() + 14);
    
    const booking3: InsertBooking = {
      bookingNumber: 'B-2023-097',
      experienceId: 3,
      customerId: 3,
      startDate: twoWeeksFromNow,
      endDate: new Date(twoWeeksFromNow.getTime() + 2 * 24 * 60 * 60 * 1000),
      status: 'confirmed',
      totalAmount: 850,
      groupSize: 3,
    };
    this.createBooking(booking3);
    
    // Assign guides to bookings
    this.assignGuideToBooking({
      bookingId: 1,
      guideId: 2,
    });
    
    this.assignGuideToBooking({
      bookingId: 2,
      guideId: 2,
    });
    
    // Add payments
    this.createPayment({
      bookingId: 1,
      amount: 1200,
      status: 'completed',
      paymentMethod: 'credit_card',
      transactionId: 'tx_12345',
    });
    
    this.createPayment({
      bookingId: 2,
      amount: 1750,
      status: 'completed',
      paymentMethod: 'credit_card',
      transactionId: 'tx_23456',
    });
    
    // Add company settings
    this.updateSettings({
      companyName: 'Wilderness Adventures',
      companyAddress: '123 Outfitter Way, Mountain View, CA',
      companyPhone: '800-123-4567',
      companyEmail: 'info@wildernessadventures.com',
      bookingLink: 'https://outfitter.app/book/wilderness-adventures',
    });
    
    // TODO: Re-enable sample activities with valid user IDs after authentication fix
    // this.createActivity({
    //   userId: 1,
    //   action: 'Created new booking',
    //   details: { bookingId: 1, bookingNumber: 'B-2023-095', customerName: 'Sam Thompson' },
    // });
    
    // this.createActivity({
    //   userId: 1,
    //   action: 'Payment received',
    //   details: { bookingId: 1, bookingNumber: 'B-2023-095', amount: 1200 },
    // });
    
    // this.createActivity({
    //   userId: 1,
    //   action: 'Updated trip details',
    //   details: { bookingId: 2, bookingNumber: 'B-2023-096', customerName: 'Robert Martinez' },
    // });
    
    // this.createActivity({
    //   userId: 1,
    //   action: 'Created new customer',
    //   details: { customerId: 3, customerName: 'Lisa Garcia' },
    // });
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const existingUser = await this.getUser(userData.id);
    
    if (existingUser) {
      return this.updateUser(userData.id, userData);
    }
    
    const now = new Date();
    const user: User = { 
      ...userData, 
      createdAt: now, 
      updatedAt: now 
    };
    this.users.set(userData.id, user);
    return user;
  }

  async updateUser(id: string, userData: Partial<UpsertUser>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser: User = { 
      ...user, 
      ...userData, 
      updatedAt: new Date() 
    };
    
    this.users.set(id, updatedUser);
    return updatedUser;
  }
  
  // Keep this for backward compatibility with seedData
  async createUser(userData: any): Promise<User> {
    const idStr = String(++this.currentIds.user);
    const now = new Date();
    
    // Convert fields to match expected User schema
    const user: User = { 
      id: idStr,
      email: userData.email || null,
      firstName: userData.firstName || null,
      lastName: userData.lastName || null,
      phone: userData.phone || null,
      profileImageUrl: userData.profileImageUrl || null,
      role: userData.role || 'guide',
      createdAt: now, 
      updatedAt: now 
    };
    
    this.users.set(idStr, user);
    return user;
  }

  async listUsers(role?: string): Promise<User[]> {
    const users = Array.from(this.users.values());
    if (role) {
      return users.filter(user => user.role === role);
    }
    return users;
  }
  
  // Location operations
  async getLocation(id: number): Promise<Location | undefined> {
    return this.locations.get(id);
  }
  
  async createLocation(locationData: InsertLocation): Promise<Location> {
    const id = this.currentIds.location++;
    const now = new Date();
    const location: Location = { ...locationData, id, createdAt: now, updatedAt: now };
    this.locations.set(id, location);
    return location;
  }
  
  async updateLocation(id: number, locationData: Partial<InsertLocation>): Promise<Location | undefined> {
    const location = this.locations.get(id);
    if (!location) return undefined;
    
    const updatedLocation: Location = { 
      ...location, 
      ...locationData,
      updatedAt: new Date() 
    };
    
    this.locations.set(id, updatedLocation);
    return updatedLocation;
  }
  
  async deleteLocation(id: number): Promise<void> {
    this.locations.delete(id);
  }
  
  async listLocations(activeOnly: boolean = false): Promise<Location[]> {
    const locations = Array.from(this.locations.values());
    if (activeOnly) {
      return locations.filter(location => location.isActive);
    }
    return locations.sort((a, b) => a.name.localeCompare(b.name));
  }

  // Experience operations
  async getExperience(id: number): Promise<Experience | undefined> {
    return this.experiences.get(id);
  }

  async createExperience(experienceData: InsertExperience): Promise<Experience> {
    const id = this.currentIds.experience++;
    const now = new Date();
    const experience: Experience = { ...experienceData, id, createdAt: now, updatedAt: now };
    this.experiences.set(id, experience);
    return experience;
  }

  async updateExperience(id: number, experienceData: Partial<InsertExperience>): Promise<Experience | undefined> {
    const experience = this.experiences.get(id);
    if (!experience) return undefined;
    
    const updatedExperience: Experience = { 
      ...experience, 
      ...experienceData, 
      updatedAt: new Date() 
    };
    
    this.experiences.set(id, updatedExperience);
    return updatedExperience;
  }

  async deleteExperience(id: number): Promise<void> {
    this.experiences.delete(id);
  }

  async listExperiences(locationId?: number): Promise<Experience[]> {
    let experiences = Array.from(this.experiences.values());
    
    if (locationId) {
      // Get experience IDs associated with the location
      const experienceIds = Array.from(this.experienceLocations.values())
        .filter(el => el.locationId === locationId)
        .map(el => el.experienceId);
      
      if (experienceIds.length > 0) {
        // Filter by experience IDs from junction table
        experiences = experiences.filter(e => experienceIds.includes(e.id));
      } else {
        // Fallback to legacy locationId if no matches in junction table
        experiences = experiences.filter(e => e.locationId === locationId);
      }
    }
    
    return experiences.sort((a, b) => a.name.localeCompare(b.name));
  }
  
  // Experience Locations operations
  async getExperienceLocations(experienceId: number): Promise<Location[]> {
    // Find all location IDs associated with this experience
    const locationIds = Array.from(this.experienceLocations.values())
      .filter(el => el.experienceId === experienceId)
      .map(el => el.locationId);
    
    // Get the actual location objects
    return Array.from(this.locations.values())
      .filter(location => locationIds.includes(location.id))
      .sort((a, b) => a.name.localeCompare(b.name));
  }
  
  async getAllExperienceLocations(): Promise<ExperienceLocation[]> {
    // Return all experience-location associations
    return Array.from(this.experienceLocations.values());
  }
  
  async addExperienceLocation(experienceLocation: InsertExperienceLocation): Promise<ExperienceLocation> {
    // Check if relationship already exists
    const existing = Array.from(this.experienceLocations.values()).find(
      el => el.experienceId === experienceLocation.experienceId && 
           el.locationId === experienceLocation.locationId
    );
    
    if (existing) {
      return existing;
    }
    
    const id = this.currentIds.experienceLocation++;
    const now = new Date();
    
    const newExperienceLocation: ExperienceLocation = {
      ...experienceLocation,
      id,
      createdAt: now
    };
    
    this.experienceLocations.set(id, newExperienceLocation);
    
    return newExperienceLocation;
  }
  
  async removeExperienceLocation(experienceId: number, locationId: number): Promise<void> {
    const toRemove = Array.from(this.experienceLocations.entries()).find(
      ([_, el]) => el.experienceId === experienceId && el.locationId === locationId
    );
    
    if (toRemove) {
      this.experienceLocations.delete(toRemove[0]);
    }
  }

  // Experience Add-on operations
  async getExperienceAddons(experienceId: number): Promise<ExperienceAddon[]> {
    // Return all add-ons for this experience
    return Array.from(this.experienceAddons.values())
      .filter(addon => addon.experienceId === experienceId)
      .sort((a, b) => a.name.localeCompare(b.name));
  }
  
  async getExperienceAddon(id: number): Promise<ExperienceAddon | undefined> {
    return this.experienceAddons.get(id);
  }
  
  async createExperienceAddon(addonData: InsertExperienceAddon): Promise<ExperienceAddon> {
    const id = this.currentIds.experienceAddon++;
    const now = new Date();
    
    const addon: ExperienceAddon = { 
      ...addonData, 
      id, 
      createdAt: now, 
      updatedAt: now 
    };
    
    this.experienceAddons.set(id, addon);
    return addon;
  }
  
  async updateExperienceAddon(id: number, addonData: Partial<InsertExperienceAddon>): Promise<ExperienceAddon | undefined> {
    const addon = this.experienceAddons.get(id);
    
    if (!addon) {
      return undefined;
    }
    
    const updatedAddon: ExperienceAddon = { 
      ...addon, 
      ...addonData, 
      updatedAt: new Date() 
    };
    
    this.experienceAddons.set(id, updatedAddon);
    return updatedAddon;
  }
  
  async deleteExperienceAddon(id: number): Promise<void> {
    this.experienceAddons.delete(id);
  }

  // Customer operations
  async getCustomer(id: number): Promise<Customer | undefined> {
    return this.customers.get(id);
  }

  async createCustomer(customerData: InsertCustomer): Promise<Customer> {
    const id = this.currentIds.customer++;
    const now = new Date();
    const customer: Customer = { ...customerData, id, createdAt: now, updatedAt: now };
    this.customers.set(id, customer);
    return customer;
  }

  async updateCustomer(id: number, customerData: Partial<InsertCustomer>): Promise<Customer | undefined> {
    const customer = this.customers.get(id);
    if (!customer) return undefined;
    
    const updatedCustomer: Customer = { 
      ...customer, 
      ...customerData, 
      updatedAt: new Date() 
    };
    
    this.customers.set(id, updatedCustomer);
    return updatedCustomer;
  }

  async listCustomers(search?: string): Promise<Customer[]> {
    const customers = Array.from(this.customers.values());
    
    if (search) {
      const searchLower = search.toLowerCase();
      return customers.filter(customer => 
        `${customer.firstName} ${customer.lastName} ${customer.email}`.toLowerCase().includes(searchLower)
      );
    }
    
    return customers;
  }

  // Booking operations
  async getBooking(id: number): Promise<Booking | undefined> {
    return this.bookings.get(id);
  }

  async createBooking(bookingData: InsertBooking): Promise<Booking> {
    const id = this.currentIds.booking++;
    const now = new Date();
    const booking: Booking = { ...bookingData, id, createdAt: now, updatedAt: now };
    this.bookings.set(id, booking);
    return booking;
  }

  async updateBooking(id: number, bookingData: Partial<InsertBooking>): Promise<Booking | undefined> {
    const booking = this.bookings.get(id);
    if (!booking) return undefined;
    
    const updatedBooking: Booking = { 
      ...booking, 
      ...bookingData, 
      updatedAt: new Date() 
    };
    
    this.bookings.set(id, updatedBooking);
    return updatedBooking;
  }

  async listBookings(filters?: { status?: string, startDate?: Date, endDate?: Date }): Promise<Booking[]> {
    let bookings = Array.from(this.bookings.values());
    
    if (filters) {
      if (filters.status) {
        bookings = bookings.filter(booking => booking.status === filters.status);
      }
      
      if (filters.startDate) {
        bookings = bookings.filter(booking => booking.startDate >= filters.startDate);
      }
      
      if (filters.endDate) {
        bookings = bookings.filter(booking => booking.endDate <= filters.endDate);
      }
    }
    
    return bookings.sort((a, b) => b.startDate.getTime() - a.startDate.getTime());
  }

  async getBookingByNumber(bookingNumber: string): Promise<Booking | undefined> {
    return Array.from(this.bookings.values()).find(
      (booking) => booking.bookingNumber === bookingNumber,
    );
  }

  async assignGuideToBooking(data: InsertBookingGuide): Promise<BookingGuide> {
    const id = this.currentIds.bookingGuide++;
    const now = new Date();
    const bookingGuide: BookingGuide = { ...data, id, createdAt: now };
    this.bookingGuides.set(id, bookingGuide);
    return bookingGuide;
  }

  async removeGuideFromBooking(bookingId: number, guideId: string): Promise<void> {
    const bookingGuidesToDelete = Array.from(this.bookingGuides.entries())
      .filter(([_, bg]) => bg.bookingId === bookingId && bg.guideId === guideId);
    
    for (const [id] of bookingGuidesToDelete) {
      this.bookingGuides.delete(id);
    }
  }

  async listBookingGuides(bookingId: number): Promise<BookingGuide[]> {
    return Array.from(this.bookingGuides.values())
      .filter(bg => bg.bookingId === bookingId);
  }

  // Document operations
  async getDocument(id: number): Promise<Document | undefined> {
    return this.documents.get(id);
  }

  async createDocument(documentData: InsertDocument): Promise<Document> {
    const id = this.currentIds.document++;
    const now = new Date();
    const document: Document = { ...documentData, id, createdAt: now, updatedAt: now };
    this.documents.set(id, document);
    return document;
  }

  async updateDocument(id: number, documentData: Partial<InsertDocument>): Promise<Document | undefined> {
    const document = this.documents.get(id);
    if (!document) return undefined;
    
    const updatedDocument: Document = { 
      ...document, 
      ...documentData, 
      updatedAt: new Date() 
    };
    
    this.documents.set(id, updatedDocument);
    return updatedDocument;
  }

  async listDocuments(filter?: { bookingId?: number, customerId?: number, guideId?: number }): Promise<Document[]> {
    let documents = Array.from(this.documents.values());
    
    if (filter) {
      if (filter.bookingId) {
        documents = documents.filter(doc => doc.bookingId === filter.bookingId);
      }
      
      if (filter.customerId) {
        documents = documents.filter(doc => doc.customerId === filter.customerId);
      }
      
      if (filter.guideId) {
        documents = documents.filter(doc => doc.guideId === filter.guideId);
      }
    }
    
    return documents.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async deleteDocument(id: number): Promise<void> {
    this.documents.delete(id);
  }

  // Payment operations
  async getPayment(id: number): Promise<Payment | undefined> {
    return this.payments.get(id);
  }

  async createPayment(paymentData: InsertPayment): Promise<Payment> {
    const id = this.currentIds.payment++;
    const now = new Date();
    const payment: Payment = { ...paymentData, id, createdAt: now, updatedAt: now };
    this.payments.set(id, payment);
    return payment;
  }

  async updatePayment(id: number, paymentData: Partial<InsertPayment>): Promise<Payment | undefined> {
    const payment = this.payments.get(id);
    if (!payment) return undefined;
    
    const updatedPayment: Payment = { 
      ...payment, 
      ...paymentData, 
      updatedAt: new Date() 
    };
    
    this.payments.set(id, updatedPayment);
    return updatedPayment;
  }

  async listPayments(bookingId?: number): Promise<Payment[]> {
    let payments = Array.from(this.payments.values());
    
    if (bookingId) {
      payments = payments.filter(payment => payment.bookingId === bookingId);
    }
    
    return payments.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  // Settings operations
  async getSettings(): Promise<Settings | undefined> {
    return this.settings;
  }

  async updateSettings(settingsData: InsertSettings): Promise<Settings> {
    const now = new Date();
    const id = 1;
    
    if (this.settings) {
      this.settings = { 
        ...this.settings, 
        ...settingsData, 
        updatedAt: now 
      };
    } else {
      this.settings = { 
        ...settingsData, 
        id, 
        updatedAt: now 
      };
    }
    
    return this.settings;
  }



  // Dashboard operations
  async getDashboardStats(): Promise<any> {
    const now = new Date();
    
    // Get upcoming bookings count
    const upcomingBookings = Array.from(this.bookings.values())
      .filter(booking => 
        booking.startDate >= now && 
        booking.status === 'confirmed'
      ).length;
    
    // Calculate monthly revenue
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    const monthlyRevenue = Array.from(this.payments.values())
      .filter(payment => 
        payment.createdAt >= startOfMonth && 
        payment.createdAt <= endOfMonth &&
        payment.status === 'completed'
      )
      .reduce((total, payment) => total + Number(payment.amount), 0);
    
    // Count active customers
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
    const activeCustomerIds = new Set(
      Array.from(this.bookings.values())
        .filter(booking => 
          booking.createdAt >= threeMonthsAgo &&
          ['confirmed', 'deposit_paid', 'paid', 'completed'].includes(booking.status)
        )
        .map(booking => booking.customerId)
    );
    
    // Count completed trips
    const completedTrips = Array.from(this.bookings.values())
      .filter(booking => booking.status === 'completed').length;
    
    return {
      upcomingBookings,
      monthlyRevenue,
      activeCustomers: activeCustomerIds.size,
      completedTrips
    };
  }

  async getUpcomingBookings(limit: number = 5): Promise<any[]> {
    const now = new Date();
    
    const upcomingBookings = Array.from(this.bookings.values())
      .filter(booking => booking.startDate >= now)
      .sort((a, b) => a.startDate.getTime() - b.startDate.getTime())
      .slice(0, limit);
    
    const result = [];
    
    for (const booking of upcomingBookings) {
      const experience = this.experiences.get(booking.experienceId);
      const customer = this.customers.get(booking.customerId);
      
      if (!experience || !customer) continue;
      
      const bookingGuideRecords = Array.from(this.bookingGuides.values())
        .filter(bg => bg.bookingId === booking.id);
      
      const guides = bookingGuideRecords.map(bg => {
        const guide = this.users.get(bg.guideId);
        if (!guide) return null;
        
        return {
          guideId: guide.id,
          guideFirstName: guide.firstName,
          guideLastName: guide.lastName
        };
      }).filter(Boolean);
      
      result.push({
        id: booking.id,
        bookingNumber: booking.bookingNumber,
        experienceId: experience.id,
        experienceName: experience.name,
        customerId: customer.id,
        customerFirstName: customer.firstName,
        customerLastName: customer.lastName,
        startDate: booking.startDate,
        endDate: booking.endDate,
        status: booking.status,
        totalAmount: booking.totalAmount,
        guides: guides
      });
    }
    
    return result;
  }
}

export const storage = new DatabaseStorage();
