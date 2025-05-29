// Test setup file for Jest
import { beforeAll, afterAll } from '@jest/globals';

beforeAll(async () => {
  // Setup test environment
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/test';
});

afterAll(async () => {
  // Cleanup after all tests
});