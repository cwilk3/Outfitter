import { Request, Response, NextFunction } from 'express';
import { z, ZodError, ZodSchema } from 'zod';
import { throwError } from '../utils/asyncHandler';

// Validation middleware factory
export const validate = (schema: {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate request body
      if (schema.body) {
        req.body = schema.body.parse(req.body);
      }

      // Validate query parameters
      if (schema.query) {
        req.query = schema.query.parse(req.query);
      }

      // Validate URL parameters
      if (schema.params) {
        req.params = schema.params.parse(req.params);
      }

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errorMessages = error.errors.map(err => {
          const path = err.path.join('.');
          return `${path}: ${err.message}`;
        }).join(', ');
        
        throwError(`Validation failed: ${errorMessages}`, 400);
      }
      next(error);
    }
  };
};

// Common validation schemas
export const commonSchemas = {
  // ID parameter validation
  idParam: z.object({
    id: z.string().regex(/^\d+$/, 'ID must be a positive integer').transform(Number)
  }),

  // Pagination query validation
  paginationQuery: z.object({
    page: z.string().regex(/^\d+$/, 'Page must be a positive integer').transform(Number).optional(),
    limit: z.string().regex(/^\d+$/, 'Limit must be a positive integer').transform(Number).optional(),
    search: z.string().min(1, 'Search term must not be empty').optional()
  }),

  // Sort query validation
  sortQuery: z.object({
    sortBy: z.string().min(1, 'Sort field cannot be empty').optional(),
    sortOrder: z.enum(['asc', 'desc'], { message: 'Sort order must be asc or desc' }).optional()
  }),

  // Date range validation
  dateRangeQuery: z.object({
    startDate: z.string().datetime('Invalid start date format').optional(),
    endDate: z.string().datetime('Invalid end date format').optional()
  }).refine(data => {
    if (data.startDate && data.endDate) {
      return new Date(data.startDate) <= new Date(data.endDate);
    }
    return true;
  }, { message: 'Start date must be before end date' }),

  // Email validation
  email: z.string().email('Invalid email format'),

  // Phone validation
  phone: z.string().regex(/^\+?[\d\s\-\(\)]+$/, 'Invalid phone number format').optional(),

  // URL validation
  url: z.string().url('Invalid URL format').optional(),

  // Non-empty string validation
  nonEmptyString: z.string().min(1, 'Field cannot be empty'),

  // Positive integer validation
  positiveInt: z.number().int().positive('Must be a positive integer'),

  // Non-negative number validation
  nonNegativeNumber: z.number().nonnegative('Must be non-negative'),

  // Boolean validation
  booleanString: z.string().transform(val => val.toLowerCase() === 'true').pipe(z.boolean())
};

// Validation helpers
export const validateArrayLength = (min: number, max?: number) => {
  return z.array(z.any()).min(min, `Array must have at least ${min} items`)
    .max(max || 100, `Array must have at most ${max || 100} items`);
};

export const validateStringLength = (min: number, max: number) => {
  return z.string().min(min, `Must be at least ${min} characters`)
    .max(max, `Must be at most ${max} characters`);
};

// Custom validation for specific business rules
export const businessRules = {
  // Validate booking date is in the future
  futureDate: z.string().datetime().refine(date => {
    return new Date(date) > new Date();
  }, { message: 'Date must be in the future' }),

  // Validate capacity is reasonable
  capacity: z.number().int().min(1, 'Capacity must be at least 1').max(1000, 'Capacity cannot exceed 1000'),

  // Validate price format
  price: z.number().nonnegative('Price must be non-negative').multipleOf(0.01, 'Price must have at most 2 decimal places'),

  // Validate duration in hours
  duration: z.number().positive('Duration must be positive').max(168, 'Duration cannot exceed 168 hours (1 week)'),

  // Validate US state codes
  usState: z.string().length(2, 'State must be a 2-letter code').regex(/^[A-Z]{2}$/, 'State must be uppercase letters'),

  // Validate ZIP code
  zipCode: z.string().regex(/^\d{5}(-\d{4})?$/, 'Invalid ZIP code format')
};