import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { DatabaseStorage } from '../server/storage';

// --- DATABASE MOCKING ---
jest.mock('../server/db', () => ({
  db: {
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    query: {
      experiences: {
        findFirst: jest.fn()
      }
    }
  }
}));

const mockDb = require('../server/db').db;

describe('DatabaseStorage - Experience Guide Assignment Tests', () => {
  let storage: DatabaseStorage;

  beforeEach(() => {
    storage = new DatabaseStorage();
    jest.clearAllMocks();
  });

  describe('createExperience function', () => {
    describe('Test Case 1.1: When guideId is provided', () => {
      it('should create an experience and link a guide if guideId is provided', async () => {
        // Setup
        const experienceData = {
          name: 'Test Experience',
          description: 'Test Description',
          duration: 3,
          price: '500.00',
          capacity: 8,
          locationId: 1,
          outfitterId: 1,
          guideId: 'guide-123'
        };

        const mockNewExperience = { 
          id: 1, 
          name: 'Test Experience', 
          guideId: 'guide-123',
          outfitterId: 1,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        // Mock experiences insert
        mockDb.insert.mockImplementation((table: any) => {
          if (table && table._.name === 'experiences') {
            return { 
              values: jest.fn().mockReturnThis(), 
              returning: jest.fn().mockResolvedValueOnce([mockNewExperience]) 
            };
          }
          if (table && table._.name === 'experience_guides') {
            return { 
              values: jest.fn().mockResolvedValueOnce([{ experienceId: 1, guideId: 'guide-123' }]) 
            };
          }
          return { 
            values: jest.fn().mockReturnThis(), 
            returning: jest.fn().mockResolvedValueOnce([]) 
          };
        });

        // Action
        const result = await storage.createExperience(experienceData);

        // Assertions
        expect(mockDb.insert).toHaveBeenCalledTimes(2);
        expect(result).toEqual(mockNewExperience);
      });
    });

    describe('Test Case 1.2: When guideId is NOT provided', () => {
      it('should create experience without guide assignment', async () => {
        // Setup
        const experienceData = {
          name: 'Test Experience',
          description: 'Test Description',
          duration: 3,
          price: '500.00',
          capacity: 8,
          locationId: 1,
          outfitterId: 1
          // No guideId
        };

        const mockNewExperience = { 
          id: 1, 
          name: 'Test Experience', 
          guideId: null,
          outfitterId: 1,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        // Mock experiences insert only
        mockDb.insert.mockImplementation(() => ({
          values: jest.fn().mockReturnThis(),
          returning: jest.fn().mockResolvedValueOnce([mockNewExperience])
        }));

        // Action
        const result = await storage.createExperience(experienceData);

        // Assertions
        expect(mockDb.insert).toHaveBeenCalledTimes(1);
        expect(result).toEqual(mockNewExperience);
      });
    });
  });

  describe('updateExperience function', () => {
    const mockExistingExperience = {
      id: 1,
      name: 'Existing Experience',
      description: 'Description',
      outfitterId: 1,
      guideId: 'old-guide-123',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    beforeEach(() => {
      // Setup for all updateExperience tests
      mockDb.query.experiences.findFirst.mockResolvedValue(mockExistingExperience);
      
      mockDb.update.mockImplementation(() => ({
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([{ id: 1, name: 'Updated Experience' }])
      }));

      mockDb.delete.mockImplementation(() => ({
        where: jest.fn().mockResolvedValue(undefined)
      }));

      mockDb.insert.mockImplementation(() => ({
        values: jest.fn().mockResolvedValue([{ id: 1 }])
      }));
    });

    describe('Test Case 2.1: Update experience details only (no change to guideId)', () => {
      it('should update experience without affecting guide assignments', async () => {
        // Mock final fetch
        mockDb.query.experiences.findFirst
          .mockResolvedValueOnce(mockExistingExperience) // Initial check
          .mockResolvedValueOnce({ ...mockExistingExperience, name: 'Updated Name' }); // Final fetch

        // Action
        const updateData = { name: 'Updated Name', description: 'Updated Description' };
        const result = await storage.updateExperience(1, updateData, 1);

        // Assertions
        expect(mockDb.query.experiences.findFirst).toHaveBeenCalled();
        expect(mockDb.update).toHaveBeenCalled();
        expect(result).toBeTruthy();
      });
    });

    describe('Test Case 2.2: Assign a guideId to an experience that previously had none', () => {
      it('should assign new guide to experience', async () => {
        // Setup
        const experienceWithoutGuide = { ...mockExistingExperience, guideId: null };
        mockDb.query.experiences.findFirst
          .mockResolvedValueOnce(experienceWithoutGuide)
          .mockResolvedValueOnce({ ...experienceWithoutGuide, guideId: 'new-guide-456' });

        // Action
        const updateData = { guideId: 'new-guide-456' };
        const result = await storage.updateExperience(1, updateData, 1);

        // Assertions
        expect(mockDb.delete).toHaveBeenCalled();
        expect(mockDb.insert).toHaveBeenCalled();
        expect(mockDb.update).toHaveBeenCalled();
        expect(result).toBeTruthy();
      });
    });

    describe('Test Case 2.3: Change guideId on an experience', () => {
      it('should change guide assignment', async () => {
        // Setup
        mockDb.query.experiences.findFirst
          .mockResolvedValueOnce(mockExistingExperience)
          .mockResolvedValueOnce({ ...mockExistingExperience, guideId: 'new-guide-789' });

        // Action
        const updateData = { guideId: 'new-guide-789' };
        const result = await storage.updateExperience(1, updateData, 1);

        // Assertions
        expect(mockDb.delete).toHaveBeenCalled();
        expect(mockDb.insert).toHaveBeenCalled();
        expect(mockDb.update).toHaveBeenCalled();
        expect(result).toBeTruthy();
      });
    });

    describe('Test Case 2.4: Remove/unassign guideId (set to null)', () => {
      it('should remove guide assignment', async () => {
        // Setup
        mockDb.query.experiences.findFirst
          .mockResolvedValueOnce(mockExistingExperience)
          .mockResolvedValueOnce({ ...mockExistingExperience, guideId: null });

        // Action
        const updateData = { guideId: null };
        const result = await storage.updateExperience(1, updateData, 1);

        // Assertions
        expect(mockDb.delete).toHaveBeenCalled();
        expect(mockDb.update).toHaveBeenCalled();
        expect(result).toBeTruthy();
      });
    });

    describe('Test Case 2.5: Attempt to update an experience belonging to a different outfitterId', () => {
      it('should return null when outfitterId does not match', async () => {
        // Setup - return null for tenant check
        mockDb.query.experiences.findFirst.mockResolvedValueOnce(null);

        // Action
        const result = await storage.updateExperience(1, { name: 'Test' }, 999);

        // Assertions
        expect(result).toBeNull();
      });
    });

    describe('Test Case 2.6: Attempt to update a non-existent experience', () => {
      it('should return null when experience does not exist', async () => {
        // Setup - return null for existence check
        mockDb.query.experiences.findFirst.mockResolvedValueOnce(null);

        // Action
        const result = await storage.updateExperience(99999, { name: 'Test' }, 1);

        // Assertions
        expect(result).toBeNull();
      });
    });
  });
});