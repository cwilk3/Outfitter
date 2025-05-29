import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { DatabaseStorage } from '../server/storage';
import { db } from '../server/db';
import { experiences, experienceGuides } from '../shared/schema';

// Mock the database
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

const mockDb = db as jest.Mocked<typeof db>;

describe('DatabaseStorage - Experience Guide Assignment Tests', () => {
  let storage: DatabaseStorage;

  beforeEach(() => {
    storage = new DatabaseStorage();
    jest.clearAllMocks();
  });

  describe('createExperience function', () => {
    describe('Test Case 1.1: When guideId is provided', () => {
      it('should create experience and guide assignment', async () => {
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

        const createdExperience = {
          id: 1,
          ...experienceData,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        // Mock experiences insert
        const mockExperiencesInsert = {
          values: jest.fn().mockReturnThis(),
          returning: jest.fn().mockResolvedValue([createdExperience])
        };
        mockDb.insert.mockReturnValueOnce(mockExperiencesInsert as any);

        // Mock experienceGuides insert
        const mockGuidesInsert = {
          values: jest.fn().mockResolvedValue([{ id: 1, experienceId: 1, guideId: 'guide-123' }])
        };
        mockDb.insert.mockReturnValueOnce(mockGuidesInsert as any);

        // Action
        const result = await storage.createExperience(experienceData);

        // Assertions
        expect(mockDb.insert).toHaveBeenCalledTimes(2);
        expect(mockDb.insert).toHaveBeenNthCalledWith(1, experiences);
        expect(mockExperiencesInsert.values).toHaveBeenCalledWith(experienceData);
        expect(mockExperiencesInsert.returning).toHaveBeenCalled();
        
        expect(mockDb.insert).toHaveBeenNthCalledWith(2, experienceGuides);
        expect(mockGuidesInsert.values).toHaveBeenCalledWith({
          experienceId: 1,
          guideId: 'guide-123'
        });
        
        expect(result).toEqual(createdExperience);
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

        const createdExperience = {
          id: 1,
          ...experienceData,
          guideId: null,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        // Mock experiences insert
        const mockExperiencesInsert = {
          values: jest.fn().mockReturnThis(),
          returning: jest.fn().mockResolvedValue([createdExperience])
        };
        mockDb.insert.mockReturnValueOnce(mockExperiencesInsert as any);

        // Action
        const result = await storage.createExperience(experienceData);

        // Assertions
        expect(mockDb.insert).toHaveBeenCalledTimes(1);
        expect(mockDb.insert).toHaveBeenCalledWith(experiences);
        expect(mockExperiencesInsert.values).toHaveBeenCalledWith(experienceData);
        expect(mockExperiencesInsert.returning).toHaveBeenCalled();
        expect(result).toEqual(createdExperience);
      });
    });
  });

  describe('updateExperience function', () => {
    const mockExistingExperience = {
      id: 1,
      outfitterId: 1,
      guideId: 'old-guide-123'
    };

    beforeEach(() => {
      // Setup for all updateExperience tests
      mockDb.query.experiences.findFirst.mockResolvedValue(mockExistingExperience);
      
      const mockUpdate = {
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([{ id: 1, name: 'Updated Experience' }])
      };
      mockDb.update.mockReturnValue(mockUpdate as any);

      const mockDelete = {
        where: jest.fn().mockResolvedValue(undefined)
      };
      mockDb.delete.mockReturnValue(mockDelete as any);

      const mockInsert = {
        values: jest.fn().mockResolvedValue([{ id: 1 }])
      };
      mockDb.insert.mockReturnValue(mockInsert as any);
    });

    describe('Test Case 2.1: Update experience details only (no change to guideId)', () => {
      it('should update experience without affecting guide assignments', async () => {
        // Action
        const updateData = { name: 'Updated Name', description: 'Updated Description' };
        const result = await storage.updateExperience(1, updateData, 1);

        // Assertions
        expect(mockDb.query.experiences.findFirst).toHaveBeenCalled();
        expect(mockDb.update).toHaveBeenCalledWith(experiences);
        expect(mockDb.delete).not.toHaveBeenCalled();
        expect(mockDb.insert).not.toHaveBeenCalledWith(experienceGuides);
      });
    });

    describe('Test Case 2.2: Assign a guideId to an experience that previously had none', () => {
      it('should assign new guide to experience', async () => {
        // Setup
        mockDb.query.experiences.findFirst.mockResolvedValueOnce({
          id: 1,
          outfitterId: 1,
          guideId: null
        });

        // Action
        const updateData = { guideId: 'new-guide-456' };
        await storage.updateExperience(1, updateData, 1);

        // Assertions
        expect(mockDb.delete).toHaveBeenCalledWith(experienceGuides);
        expect(mockDb.insert).toHaveBeenCalledWith(experienceGuides);
        expect(mockDb.update).toHaveBeenCalledWith(experiences);
      });
    });

    describe('Test Case 2.3: Change guideId on an experience', () => {
      it('should change guide assignment', async () => {
        // Action
        const updateData = { guideId: 'new-guide-789' };
        await storage.updateExperience(1, updateData, 1);

        // Assertions
        expect(mockDb.delete).toHaveBeenCalledWith(experienceGuides);
        expect(mockDb.insert).toHaveBeenCalledWith(experienceGuides);
        expect(mockDb.update).toHaveBeenCalledWith(experiences);
      });
    });

    describe('Test Case 2.4: Remove/unassign guideId (set to null)', () => {
      it('should remove guide assignment', async () => {
        // Action
        const updateData = { guideId: null };
        await storage.updateExperience(1, updateData, 1);

        // Assertions
        expect(mockDb.delete).toHaveBeenCalledWith(experienceGuides);
        expect(mockDb.insert).not.toHaveBeenCalledWith(experienceGuides);
        expect(mockDb.update).toHaveBeenCalledWith(experiences);
      });
    });

    describe('Test Case 2.5: Attempt to update an experience belonging to a different outfitterId', () => {
      it('should return null when outfitterId does not match', async () => {
        // Setup
        mockDb.query.experiences.findFirst.mockResolvedValueOnce(null);

        // Action
        const result = await storage.updateExperience(1, { name: 'Test' }, 999);

        // Assertions
        expect(result).toBeNull();
        expect(mockDb.update).not.toHaveBeenCalled();
      });
    });

    describe('Test Case 2.6: Attempt to update a non-existent experience', () => {
      it('should return null when experience does not exist', async () => {
        // Setup
        mockDb.query.experiences.findFirst.mockResolvedValueOnce(null);

        // Action
        const result = await storage.updateExperience(99999, { name: 'Test' }, 1);

        // Assertions
        expect(result).toBeNull();
        expect(mockDb.update).not.toHaveBeenCalled();
      });
    });
  });
});