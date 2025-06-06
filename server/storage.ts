import {
  users, experiences, customers, bookings, bookingGuides, documents, payments, settings, locations, 
  experienceLocations, experienceAddons, experienceGuides, addonInventoryDates, outfitters, userOutfitters, activities,
  type User, type UpsertUser, type Experience, type InsertExperience, type ExperienceWithGuides,
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
  getUsersByOutfitterId(outfitterId: number, roles?: string[]): Promise<User[]>;
  
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
  updateGuideAssignment(id: number, data: Partial<InsertExperienceGuide>, outfitterId: number): Promise<ExperienceGuide | undefined>;
  removeGuideFromExperience(id: number): Promise<void>;
  removeGuideFromExperienceWithTenant(id: number, outfitterId: number): Promise<void>;
  removeGuideFromExperienceByGuideId(experienceId: number, guideId: string, outfitterId: number): Promise<boolean>;
  getExperiencesForGuide(guideId: string): Promise<Experience[]>;

  // Location operations
  getLocation(id: number): Promise<Location | undefined>;
  createLocation(location: InsertLocation): Promise<Location>;
  updateLocation(id: number, location: Partial<InsertLocation>): Promise<Location | undefined>;
  deleteLocation(id: number): Promise<void>;
  listLocations(activeOnly?: boolean, outfitterId?: number): Promise<Location[]>;

  // Experience operations
  getExperience(id: number): Promise<ExperienceWithGuides | undefined>;
  createExperience(experience: InsertExperience & { assignedGuideIds?: string[] }): Promise<Experience>;
  updateExperience(experienceId: number, updateData: Partial<InsertExperience & { assignedGuideIds?: Array<{ guideId: string, isPrimary?: boolean }> }>, outfitterId: number): Promise<Experience | null>;
  deleteExperience(id: number): Promise<void>;
  listExperiences(locationId?: number, outfitterId?: number): Promise<ExperienceWithGuides[]>;
  
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
  listBookings(outfitterId?: number, filters?: { status?: string, startDate?: Date, endDate?: Date }): Promise<Booking[]>;
  getBookingByNumber(bookingNumber: string): Promise<Booking | undefined>;
  assignGuideToBooking(bookingGuide: InsertBookingGuide): Promise<BookingGuide>;
  removeGuideFromBooking(bookingId: number, guideId: string): Promise<void>;
  removeGuideFromBookingWithTenant(bookingId: number, guideId: string, outfitterId: number): Promise<void>;
  listBookingGuides(bookingId: number): Promise<BookingGuide[]>;
  
  // Availability operations for public booking
  getOccupancyForExperienceSlots(experienceId: number, slots: Array<{startDate: Date, endDate: Date}>): Promise<Array<{slot: {startDate: Date, endDate: Date}, occupiedCount: number}>>;
  listBookingsForExperienceByDateRange(experienceId: number, rangeStartDate: Date, rangeEndDate: Date, statuses?: string[]): Promise<Booking[]>;
  
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
  getUpcomingBookings(limit?: number, outfitterId?: number): Promise<any[]>;
  
  // Additional methods needed by routes (avoid duplication with main interface)
  createUser(user: UpsertUser): Promise<User>;
  getGuideAssignmentsByGuideId(guideId: string): Promise<any[]>;
  
  // Add missing interface methods  
  getExperienceGuideByIdWithTenant(id: number, outfitterId: number): Promise<any>;
  removeGuideFromExperienceWithTenant(id: number, outfitterId: number): Promise<void>;
  removeGuideFromBookingWithTenant(bookingId: number, guideId: string, outfitterId: number): Promise<void>;

  // User deletion operations
  checkUserDeletability(userId: string, outfitterId: number): Promise<{ canDelete: boolean; blockers: string[] }>;

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

  async getUsersByOutfitterId(outfitterId: number, roles?: string[]): Promise<User[]> {
    let query = db
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
        outfitterId: userOutfitters.outfitterId // Select outfitterId from the joined table
      })
      .from(users)
      .innerJoin(userOutfitters, eq(users.id, userOutfitters.userId))
      .where(eq(userOutfitters.outfitterId, outfitterId));
    
    if (roles && roles.length > 0) {
      const validRoles = roles.filter(role => role === 'admin' || role === 'guide') as ('admin' | 'guide')[];
      if (validRoles.length > 0) {
        // Replace the existing where clause instead of chaining
        query = db.select({
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
        .where(and(
          eq(userOutfitters.outfitterId, outfitterId),
          inArray(users.role, validRoles)
        ));
      }
    }
    
    const result = await query;
    return result;
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
  
  async listLocations(activeOnly: boolean = false, outfitterId?: number): Promise<Location[]> {
    const conditions = [];
    
    if (activeOnly) {
      conditions.push(eq(locations.isActive, true));
    }
    
    // Crucially, add outfitterId filtering if provided
    if (outfitterId) {
      conditions.push(eq(locations.outfitterId, outfitterId));
    }
    
    // Apply conditions if any, otherwise return all (though outfitterId should always be present for authenticated calls)
    if (conditions.length > 0) {
      return await db.select().from(locations)
        .where(and(...conditions))
        .orderBy(locations.name);
    }
    
    // This path should ideally not be reached for authenticated users
    return await db.select().from(locations).orderBy(locations.name);
  }

  // Experience operations
  async getExperience(id: number): Promise<ExperienceWithGuides | undefined> {
    const experienceWithGuides = await db.query.experiences.findFirst({
      where: eq(experiences.id, id),
      with: {
        experienceGuides: {
          with: {
            user: true, // Join to get user details for each guide
          },
        },
      },
    });

    if (!experienceWithGuides) {
      return undefined;
    }

    // Transform the result to include assignedGuides array
    const assignedGuidesFormatted = experienceWithGuides.experienceGuides.map(
      (ag) => ({
        id: ag.id, // Junction table ID
        guideId: ag.guideId,
        isPrimary: ag.isPrimary || false, // Handle null values
        guideUser: ag.user
          ? {
              id: ag.user.id,
              email: ag.user.email,
              firstName: ag.user.firstName,
              lastName: ag.user.lastName,
              profileImageUrl: ag.user.profileImageUrl,
              role: ag.user.role,
            }
          : undefined,
      })
    );

    // Return the experience with the new assignedGuides array
    const { experienceGuides: _, ...experienceWithoutJunction } = experienceWithGuides;
    return {
      ...experienceWithoutJunction,
      assignedGuides: assignedGuidesFormatted,
    };
  }

  async createExperience(experienceData: InsertExperience & { assignedGuideIds?: Array<{ guideId: string; isPrimary?: boolean }> }): Promise<Experience> {
    // Use a database transaction for atomicity (highly recommended for multiple inserts)
    const newExperience = await db.transaction(async (tx) => {
      // Step 1: Create the main experience record
      // Extract assignedGuideIds before database insert since it's not a database column
      const { assignedGuideIds, ...dbExperienceData } = experienceData;
      
      const [createdExperience] = await tx.insert(experiences).values({
        ...dbExperienceData,
        // IMPORTANT: Still set experiences.guideId for now for compatibility, use first primary guide if available
        guideId: (assignedGuideIds && assignedGuideIds.length > 0) 
                   ? assignedGuideIds[0].guideId : experienceData.guideId || null, // Default to first assigned guide if any, fallback to existing guideId
        createdAt: new Date(),
        updatedAt: new Date(),
      }).returning();

      if (!createdExperience) {
        console.error('❌ [CREATE_EXP_GUIDES_PERSIST] Failed to create experience record during transaction.');
        throw new Error('Failed to create experience.');
      }
      console.log('🔍 [CREATE_EXP_GUIDES_PERSIST] Main experience record created:', createdExperience.id);

      // Step 2: Create entries in experienceGuides for all assigned guides with proper primary enforcement
      if (experienceData.assignedGuideIds && experienceData.assignedGuideIds.length > 0) {
        // Enforce primary guide rules: only one primary guide allowed
        let primaryCount = 0;
        const guideAssignments = experienceData.assignedGuideIds.map((guide, index) => {
          let isPrimary = false;
          
          if (guide.isPrimary === true && primaryCount === 0) {
            // Allow first guide marked as primary
            isPrimary = true;
            primaryCount++;
          } else if (index === 0 && primaryCount === 0) {
            // If no guide is explicitly marked primary, make first guide primary
            isPrimary = true;
            primaryCount++;
          }
          
          return {
            experienceId: createdExperience.id,
            guideId: guide.guideId,
            isPrimary: isPrimary
          };
        });
        
        console.log('🔍 [CREATE_EXP_GUIDES_PERSIST] Primary guide enforcement applied. Assignments:', JSON.stringify(guideAssignments, null, 2));
        await tx.insert(experienceGuides).values(guideAssignments);
        console.log('✅ [CREATE_EXP_GUIDES_PERSIST] Multiple guide assignments inserted successfully.');
      } else if (experienceData.guideId) {
        // Fallback: Handle legacy single guideId assignment
        const singleGuideAssignment = {
          experienceId: createdExperience.id,
          guideId: experienceData.guideId,
          isPrimary: true // Single guide is primary by default
        };
        console.log('🔍 [CREATE_EXP_GUIDES_PERSIST] Attempting to insert single legacy guide assignment:', JSON.stringify(singleGuideAssignment, null, 2));
        await tx.insert(experienceGuides).values(singleGuideAssignment);
        console.log('✅ [CREATE_EXP_GUIDES_PERSIST] Single legacy guide assignment inserted successfully.');
      } else {
        console.log('ℹ️ [CREATE_EXP_GUIDES_PERSIST] No guide assignments to insert for this experience.');
      }
      
      return createdExperience;
    });

    return newExperience;
  }

  async updateExperience(
    experienceId: number, 
    updateData: Partial<InsertExperience & { assignedGuideIds?: Array<{ guideId: string, isPrimary?: boolean }> }>, 
    outfitterId: number
  ): Promise<Experience | null> {
    // Use a database transaction for atomicity
    const finalUpdatedExperience = await db.transaction(async (tx) => {
      // Step 1: Verify the experience exists and belongs to the outfitter.
      const existingExperience = await tx.query.experiences.findFirst({
        where: (exp, { eq, and }) => and(eq(exp.id, experienceId), eq(exp.outfitterId, outfitterId)),
        columns: { id: true, outfitterId: true, guideId: true }
      });

      if (!existingExperience) {
        console.error(`[STORAGE_UPDATE_FAIL] Experience ID ${experienceId} not found or not owned by outfitter ID ${outfitterId}.`);
        throw new Error('Experience not found or not authorized.');
      }

      const { assignedGuideIds, guideId: legacyGuideId, ...otherExperienceData } = updateData;
      let currentExperienceDetails: Experience | undefined = undefined;

      // Step 2: Update main experience details if other data is provided
      if (Object.keys(otherExperienceData).length > 0) {
        const results = await tx.update(experiences)
          .set({ ...otherExperienceData, updatedAt: new Date() })
          .where(eq(experiences.id, experienceId))
          .returning();
        currentExperienceDetails = results[0];
        if (!currentExperienceDetails) {
            console.error(`[STORAGE_UPDATE_FAIL] Failed to update core details for experience ID ${experienceId}.`);
            throw new Error('Failed to update experience core details.');
        }
      }

      // Step 3: Handle assignedGuideIds (multi-guide management)
      if (assignedGuideIds !== undefined) {
        // Get current assignments from experienceGuides table
        const currentAssignedGuides = await tx.query.experienceGuides.findMany({
          where: eq(experienceGuides.experienceId, experienceId),
          columns: { guideId: true, isPrimary: true, id: true }
        });

        // Guides to add: in new list, not in current list
        const guidesToAdd = assignedGuideIds.filter(
          newGuide => !currentAssignedGuides.some(existingGuide => existingGuide.guideId === newGuide.guideId)
        );

        // Guides to remove: in current list, not in new list
        const guidesToRemove = currentAssignedGuides.filter(
          existingGuide => !assignedGuideIds.some(newGuide => newGuide.guideId === existingGuide.guideId)
        );
        
        // Guides to update (for isPrimary status change): in both lists but different isPrimary
        const guidesToUpdatePrimary = assignedGuideIds.filter(newGuide =>
          currentAssignedGuides.some(existingGuide => 
            existingGuide.guideId === newGuide.guideId && 
            existingGuide.isPrimary !== (newGuide.isPrimary || false)
          )
        );
        
        // Perform deletions
        if (guidesToRemove.length > 0) {
          const guideIdsToRemove = guidesToRemove.map(g => g.guideId);
          await tx.delete(experienceGuides)
            .where(and(
              eq(experienceGuides.experienceId, experienceId),
              inArray(experienceGuides.guideId, guideIdsToRemove)
            ));
        }

        // Perform additions
        if (guidesToAdd.length > 0) {
          const guideAssignments = guidesToAdd.map(guide => ({
            experienceId: experienceId,
            guideId: guide.guideId,
            isPrimary: guide.isPrimary || false
          }));
          await tx.insert(experienceGuides).values(guideAssignments);
        }

        // Perform isPrimary updates
        if (guidesToUpdatePrimary.length > 0) {
          for (const guide of guidesToUpdatePrimary) {
            await tx.update(experienceGuides)
              .set({ isPrimary: guide.isPrimary || false })
              .where(and(
                eq(experienceGuides.experienceId, experienceId),
                eq(experienceGuides.guideId, guide.guideId)
              ));
          }
        }

        // Step 4: Update experiences.guideId for compatibility (set to primary guide or null)
        const primaryGuide = assignedGuideIds.find(guide => guide.isPrimary === true);
        const newPrimaryGuideId = primaryGuide ? primaryGuide.guideId : 
          (assignedGuideIds.length > 0 ? assignedGuideIds[0].guideId : null);

        await tx.update(experiences)
          .set({ guideId: newPrimaryGuideId, updatedAt: new Date() })
          .where(eq(experiences.id, experienceId));
      }

      // Step 4: Handle legacy guideId updates (for backward compatibility)
      else if (updateData.hasOwnProperty('guideId')) {
        // Remove all existing guide assignments
        await tx.delete(experienceGuides)
          .where(eq(experienceGuides.experienceId, experienceId));

        if (legacyGuideId && typeof legacyGuideId === 'string' && legacyGuideId.trim() !== '') {
          // Add new single guide assignment
          await tx.insert(experienceGuides).values({
            experienceId: experienceId,
            guideId: legacyGuideId,
            isPrimary: true
          });
          
          // Update experiences.guideId
          await tx.update(experiences)
            .set({ guideId: legacyGuideId, updatedAt: new Date() })
            .where(eq(experiences.id, experienceId));
        } else {
          // Set guideId to null
          await tx.update(experiences)
            .set({ guideId: null, updatedAt: new Date() })
            .where(eq(experiences.id, experienceId));
        }
      }
      
      // Step 5: Fetch and return the final state of the experience
      const finalUpdatedExperience = await tx.query.experiences.findFirst({
        where: eq(experiences.id, experienceId),
      });

      return finalUpdatedExperience || null;
    });

    return finalUpdatedExperience;
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
    console.log(`[STORAGE][DEBUG] Deleting experience ID: ${id} - ENTERING FUNCTION`);
    
    try {
      console.log(`[STORAGE][DEBUG] Deleting experience ID: ${id} - ABOUT TO START TRANSACTION`);
      
      await db.transaction(async (tx) => {
        console.log(`[STORAGE][DEBUG] Deleting experience ID: ${id} - INSIDE TRANSACTION CALLBACK`);
        
        // Step 1: Delete all associated add-ons for this experience
        const addonsToDelete = await tx.select({ id: experienceAddons.id }).from(experienceAddons).where(eq(experienceAddons.experienceId, id));
        
        console.log(`[STORAGE][DEBUG] Found ${addonsToDelete.length} addons to delete for experience ID: ${id}`);

        for (const addon of addonsToDelete) {
          console.log(`[STORAGE][DEBUG] Deleting associated addon ID: ${addon.id} and its inventory dates`);
          await tx.delete(addonInventoryDates).where(eq(addonInventoryDates.addonId, addon.id));
          await tx.delete(experienceAddons).where(eq(experienceAddons.id, addon.id));
        }
        
        // Step 2: Delete the experience-location associations
        console.log(`[STORAGE][DEBUG] Deleting experience-location associations for experience ID: ${id}`);
        await tx.delete(experienceLocations).where(eq(experienceLocations.experienceId, id));
    
        // Step 3: Delete any guide assignments for this experience
        console.log(`[STORAGE][DEBUG] Deleting guide assignments for experience ID: ${id}`);
        await tx.delete(experienceGuides).where(eq(experienceGuides.experienceId, id));
    
        // Step 4: Delete the experience itself
        console.log(`[STORAGE][DEBUG] Finally deleting experience ID: ${id}`);
        await tx.delete(experiences).where(eq(experiences.id, id));
        
        console.log(`[STORAGE][DEBUG] Transaction for ID ${id} completed successfully.`);
      });
      
      console.log(`[STORAGE][DEBUG] Deleting experience ID: ${id} - AFTER TRANSACTION BLOCK`);

    } catch (error) {
      console.error(`[STORAGE][ERROR] CRITICAL ERROR IN deleteExperience transaction for ID ${id}:`, error);
      throw error;
    }
    
    console.log(`[STORAGE][DEBUG] Successfully deleted experience ID: ${id} and all related data - EXITING FUNCTION.`);
  }

  async listExperiences(locationId?: number, outfitterId?: number): Promise<ExperienceWithGuides[]> {
    const conditions = [];
    
    if (locationId) {
      conditions.push(eq(experiences.locationId, locationId));
    }
    
    if (outfitterId) {
      conditions.push(eq(experiences.outfitterId, outfitterId));
    }
    
    const allExperiences = await db.query.experiences.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      orderBy: experiences.name,
      with: {
        experienceGuides: {
          with: {
            user: true, // Join to get user details for each guide
          },
        },
      },
    });

    // Transform the result to include assignedGuides array for each experience
    return allExperiences.map(experienceWithGuides => {
      const assignedGuidesFormatted = experienceWithGuides.experienceGuides.map(
        (ag) => ({
          id: ag.id, // Junction table ID
          guideId: ag.guideId,
          isPrimary: ag.isPrimary || false, // Handle null values
          guideUser: ag.user
            ? {
                id: ag.user.id,
                email: ag.user.email,
                firstName: ag.user.firstName,
                lastName: ag.user.lastName,
                profileImageUrl: ag.user.profileImageUrl,
                role: ag.user.role,
              }
            : undefined,
        })
      );
      
      const { experienceGuides: _, ...experienceWithoutJunction } = experienceWithGuides;
      return {
        ...experienceWithoutJunction,
        assignedGuides: assignedGuidesFormatted,
      };
    });
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


    // Step 1: Fetch the experience to check its current outfitterId
    const experience = await db.select().from(experiences).where(eq(experiences.id, experienceLocation.experienceId)).limit(1);
    const currentExperience = experience[0];

    if (!currentExperience) {
      return undefined; // Experience not found
    }

    // Step 2: Tenant isolation and outfitterId assignment logic
    // CRITICAL: If currentExperience.outfitterId is NULL, we set it to outfitterIdFromAuth
    if (currentExperience.outfitterId === null || currentExperience.outfitterId === undefined) {

      // This is the crucial part: set the outfitterId for newly created experiences
      currentExperience.outfitterId = outfitterIdFromAuth;
    } else if (currentExperience.outfitterId !== outfitterIdFromAuth) {
      // If the experience already has an outfitterId and it doesn't match the current user's outfitterId, block the operation.

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
      return undefined;
    }



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
  async updateGuideAssignment(id: number, data: Partial<InsertExperienceGuide>, outfitterId: number): Promise<ExperienceGuide | undefined> {
    // First, verify the guide assignment exists and belongs to the outfitter
    const existingAssignment = await db.query.experienceGuides.findFirst({
      where: (ag, { eq }) => eq(ag.id, id),
      with: {
        experience: {
          columns: { outfitterId: true }
        }
      }
    });

    if (!existingAssignment || existingAssignment.experience.outfitterId !== outfitterId) {
      return undefined;
    }

    // If updating to primary, ensure no other guide for this experience is primary
    if (data.isPrimary) {
      await db
        .update(experienceGuides)
        .set({ isPrimary: false })
        .where(
          and(
            eq(experienceGuides.experienceId, existingAssignment.experienceId),
            eq(experienceGuides.isPrimary, true),
            sql`${experienceGuides.id} != ${id}`
          )
        );
    }
    
    const [updatedGuide] = await db
      .update(experienceGuides)
      .set({
        isPrimary: data.isPrimary,
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

  // Remove a guide from an experience by guideId (new implementation for DELETE route)
  async removeGuideFromExperienceByGuideId(experienceId: number, guideId: string, outfitterId: number): Promise<boolean> {
    // First, verify the experience exists and belongs to the outfitter
    const existingExperience = await db.query.experiences.findFirst({
      where: (exp, { eq, and }) => and(eq(exp.id, experienceId), eq(exp.outfitterId, outfitterId)),
      columns: { id: true, outfitterId: true, guideId: true } // Still need guideId for primary check later
    });

    if (!existingExperience) {
      console.error(`[STORAGE_REMOVE_FAIL] Experience ID ${experienceId} not found or not owned by outfitter ID ${outfitterId} for removal.`);
      return false; // Experience not found or not authorized
    }

    // NEW CHECK: Verify the specific guide is actually assigned in experienceGuides
    const assignmentExists = await db.query.experienceGuides.findFirst({
      where: (ag, { eq, and }) => and(
        eq(ag.experienceId, experienceId),
        eq(ag.guideId, guideId)
      )
    });

    if (!assignmentExists) {
      console.warn(`[STORAGE_REMOVE_WARN] Attempted to remove guide ${guideId} from experience ${experienceId}, but no such assignment exists in experienceGuides table.`);
      return false; // Guide not found for this experience in the junction table
    }

    // Use a transaction for atomicity if multiple DB operations are involved
    try {
      await db.transaction(async (tx) => {
        // Check if the guide being removed is the primary guide
        const isPrimaryGuide = assignmentExists.isPrimary;
        
        // Step 1: Remove the specific guide from the junction table
        await tx.delete(experienceGuides)
          .where(and(
            eq(experienceGuides.experienceId, experienceId),
            eq(experienceGuides.guideId, guideId)
          ));

        // Step 2: If the removed guide was the primary guide, handle primary guide promotion
        if (isPrimaryGuide) {
          // Find remaining guides for this experience
          const remainingGuides = await tx
            .select()
            .from(experienceGuides)
            .where(eq(experienceGuides.experienceId, experienceId))
            .limit(1);
          
          if (remainingGuides.length > 0) {
            // Promote the first remaining guide to primary
            console.log(`🔄 [PRIMARY_GUIDE_PROMOTION] Promoting guide ${remainingGuides[0].guideId} to primary after removing ${guideId}`);
            await tx
              .update(experienceGuides)
              .set({ isPrimary: true, updatedAt: new Date() })
              .where(eq(experienceGuides.id, remainingGuides[0].id));
            
            // Update experiences.guideId to the new primary guide for compatibility
            await tx
              .update(experiences)
              .set({ guideId: remainingGuides[0].guideId, updatedAt: new Date() })
              .where(eq(experiences.id, experienceId));
          } else {
            // No remaining guides, set experiences.guideId to null
            await tx
              .update(experiences)
              .set({ guideId: null, updatedAt: new Date() })
              .where(eq(experiences.id, experienceId));
          }
        }
      });

      console.log(`[STORAGE_REMOVE_SUCCESS] Guide ${guideId} successfully unassigned from experience ${experienceId}.`);
      return true;
    } catch (error) {
      console.error(`[STORAGE_REMOVE_ERROR] Database error during guide unassignment for experience ${experienceId}, guide ${guideId}:`, error);
      return false;
    }
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

  async listBookings(outfitterId?: number, filters?: { status?: string, startDate?: Date, endDate?: Date }): Promise<Booking[]> {
    const conditions = [];
    
    // Always filter by outfitterId when provided
    if (outfitterId) {
      conditions.push(eq(bookings.outfitterId, outfitterId));
    }
    
    if (filters) {
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
    }
    
    if (conditions.length > 0) {
      return await db.select().from(bookings)
        .where(and(...conditions))
        .orderBy(desc(bookings.startDate));
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

  // Availability operations for public booking
  async getOccupancyForExperienceSlots(
    experienceId: number, 
    slots: Array<{startDate: Date, endDate: Date}>
  ): Promise<Array<{slot: {startDate: Date, endDate: Date}, occupiedCount: number}>> {
    console.log(`[AVAIL-DEBUG] getOccupancyForExperienceSlots for Experience ID: ${experienceId}`, { slotsCount: slots.length }); // Log 1
    const results = [];
    
    for (const slot of slots) {
      console.log(`[AVAIL-DEBUG] Checking slot: ${slot.startDate.toISOString()} to ${slot.endDate.toISOString()}`); // Log 2
      // Query active bookings that overlap with this specific slot
      const overlappingBookings = await db
        .select({
          id: bookings.id, // Include ID for easier debugging
          groupSize: bookings.groupSize,  // CRITICAL FIX: Use actual groupSize
          startDate: bookings.startDate,
          endDate: bookings.endDate,
        })
        .from(bookings)
        .where(
          and(
            eq(bookings.experienceId, experienceId),
            // Booking overlaps if: booking.startDate < slot.endDate AND booking.endDate > slot.startDate
            sql`${bookings.startDate} < ${slot.endDate.toISOString()}`,
            sql`${bookings.endDate} > ${slot.startDate.toISOString()}`,
            // Only count active bookings that occupy capacity, including pending
            inArray(bookings.status, ['pending', 'confirmed', 'deposit_paid', 'paid', 'completed'])
          )
        );
      
      console.log(`[AVAIL-DEBUG] Overlapping bookings found for slot:`, overlappingBookings); // Log 3
      
      // CRITICAL FIX: Sum the actual groupSize values to get true occupancy
      const occupiedCount = overlappingBookings.reduce((sum, booking) => sum + (booking.groupSize || 0), 0);
      
      console.log(`[AVAIL-DEBUG] Slot Occupancy for ${slot.startDate.toISOString()}: ${occupiedCount}`); // Log 4
      
      results.push({
        slot: { startDate: slot.startDate, endDate: slot.endDate },
        occupiedCount
      });
    }
    
    console.log(`[AVAIL-DEBUG] getOccupancyForExperienceSlots - Final results count: ${results.length}`); // Log 5
    return results;
  }

  async listBookingsForExperienceByDateRange(
    experienceId: number, 
    rangeStartDate: Date, 
    rangeEndDate: Date, 
    statuses?: string[]
  ): Promise<Booking[]> {
    const conditions = [
      eq(bookings.experienceId, experienceId),
      // Booking overlaps with date range if: booking.startDate < rangeEndDate AND booking.endDate > rangeStartDate
      sql`${bookings.startDate} < ${rangeEndDate.toISOString()}`,
      sql`${bookings.endDate} > ${rangeStartDate.toISOString()}`
    ];
    
    // Add status filter if provided
    if (statuses && statuses.length > 0) {
      conditions.push(inArray(bookings.status, statuses as any[]));
    }
    
    return await db
      .select()
      .from(bookings)
      .where(and(...conditions))
      .orderBy(desc(bookings.startDate));
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

  async getUpcomingBookings(limit: number = 5, outfitterId?: number): Promise<any[]> {
    const now = new Date();
    const conditions = [gte(bookings.startDate, now)]; // Start with the date condition
    
    // Crucially, add outfitterId filtering if provided
    if (outfitterId) {
      conditions.push(eq(bookings.outfitterId, outfitterId));
    }

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
    .where(and(...conditions)) // Use 'and' to combine all conditions
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

  // Add missing interface method implementations
  async getExperienceGuideByIdWithTenant(id: number, outfitterId: number): Promise<any> {
    const result = await db.query.experienceGuides.findFirst({
      where: (guide, { eq }) => eq(guide.id, id),
      with: {
        experience: {
          columns: { outfitterId: true }
        }
      }
    });
    
    if (!result || result.experience.outfitterId !== outfitterId) {
      return undefined;
    }
    
    return result;
  }

  async removeGuideFromExperienceWithTenant(param1: string | number, param2: number, param3?: number): Promise<void> {
    if (typeof param1 === 'number' && param3 === undefined) {
      // Overload 1: removeGuideFromExperienceWithTenant(id: number, outfitterId: number)
      const id = param1;
      const outfitterId = param2;
      
      const result = await this.getExperienceGuideByIdWithTenant(id, outfitterId);
      if (!result) {
        throw new Error('Experience guide not found or unauthorized');
      }
      
      await db.delete(experienceGuides).where(eq(experienceGuides.id, id));
    } else if (typeof param1 === 'string' && param3 !== undefined) {
      // Overload 2: removeGuideFromExperienceWithTenant(guideId: string, experienceId: number, outfitterId: number)
      const guideId = param1;
      const experienceId = param2;
      const outfitterId = param3;
      
      // First verify the experience belongs to the outfitter
      const experience = await db.query.experiences.findFirst({
        where: (exp, { eq, and }) => and(eq(exp.id, experienceId), eq(exp.outfitterId, outfitterId)),
        columns: { id: true }
      });

      if (!experience) {
        throw new Error('Experience not found or unauthorized');
      }

      await db.delete(experienceGuides)
        .where(and(
          eq(experienceGuides.guideId, guideId),
          eq(experienceGuides.experienceId, experienceId)
        ));
    } else {
      throw new Error('Invalid parameters for removeGuideFromExperienceWithTenant');
    }
  }

  async removeGuideFromBookingWithTenant(param1: string | number, param2: string | number, param3?: number): Promise<void> {
    if (typeof param1 === 'number' && typeof param2 === 'string' && param3 !== undefined) {
      // Overload 1: removeGuideFromBookingWithTenant(bookingId: number, guideId: string, outfitterId: number)
      const bookingId = param1;
      const guideId = param2;
      const outfitterId = param3;
      
      // First verify the booking belongs to the outfitter through the experience
      const booking = await db.query.bookings.findFirst({
        where: (b, { eq }) => eq(b.id, bookingId),
        with: {
          experience: {
            columns: { outfitterId: true }
          }
        }
      });

      if (!booking || booking.experience.outfitterId !== outfitterId) {
        throw new Error('Booking not found or unauthorized');
      }

      await db.delete(bookingGuides)
        .where(and(
          eq(bookingGuides.guideId, guideId),
          eq(bookingGuides.bookingId, bookingId)
        ));
    } else if (typeof param1 === 'string' && typeof param2 === 'number' && param3 !== undefined) {
      // Overload 2: removeGuideFromBookingWithTenant(guideId: string, bookingId: number, outfitterId: number)
      const guideId = param1;
      const bookingId = param2;
      const outfitterId = param3;
      
      // First verify the booking belongs to the outfitter through the experience
      const booking = await db.query.bookings.findFirst({
        where: (b, { eq }) => eq(b.id, bookingId),
        with: {
          experience: {
            columns: { outfitterId: true }
          }
        }
      });

      if (!booking || booking.experience.outfitterId !== outfitterId) {
        throw new Error('Booking not found or unauthorized');
      }

      await db.delete(bookingGuides)
        .where(and(
          eq(bookingGuides.guideId, guideId),
          eq(bookingGuides.bookingId, bookingId)
        ));
    } else {
      throw new Error('Invalid parameters for removeGuideFromBookingWithTenant');
    }
  }

}

export const storage = new DatabaseStorage();
