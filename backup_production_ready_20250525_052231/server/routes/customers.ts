import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { storage } from '../storage';
import { requireAuth } from '../emailAuth';
import { addOutfitterContext } from '../outfitterContext';
import { asyncHandler, throwError } from '../utils/asyncHandler';
import { insertCustomerSchema } from '@shared/schema';
import { validate, commonSchemas, businessRules } from '../middleware/validation';

const router = Router();

// Validation schemas for customers
const customerValidation = {
  // Query validation for list customers
  listQuery: z.object({
    search: z.string().min(1, 'Search term must not be empty').optional(),
    page: z.string().regex(/^\d+$/, 'Page must be a positive integer').transform(Number).optional(),
    limit: z.string().regex(/^\d+$/, 'Limit must be a positive integer').transform(Number).optional()
  }),

  // Parameter validation for customer ID
  customerIdParam: z.object({
    id: z.string().regex(/^\d+$/, 'Customer ID must be a positive integer').transform(Number)
  }),

  // Enhanced customer creation with validation
  createCustomer: insertCustomerSchema.extend({
    email: commonSchemas.email,
    phone: commonSchemas.phone,
    firstName: z.string().min(1, 'First name is required').max(50, 'First name too long'),
    lastName: z.string().min(1, 'Last name is required').max(50, 'Last name too long')
  }),

  // Update customer validation (partial)
  updateCustomer: insertCustomerSchema.partial().refine(data => {
    return Object.keys(data).length > 0;
  }, { message: 'At least one field must be provided for update' })
};

// Apply auth and outfitter context to all customer routes
router.use(requireAuth, addOutfitterContext);

// Get all customers with validation
router.get('/', 
  validate({ query: customerValidation.listQuery }),
  asyncHandler(async (req: Request, res: Response) => {
    const { search } = req.query;
    const outfitterId = (req as any).outfitterId;
    const customers = await storage.listCustomers(outfitterId, typeof search === 'string' ? search : undefined);
    res.json(customers);
  })
);

// Get customer by ID with validation
router.get('/:id', 
  validate({ params: customerValidation.customerIdParam }),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const customer = await storage.getCustomer(parseInt(id));
    
    if (!customer) {
      throwError('Customer not found', 404);
    }
    
    res.json(customer);
  })
);

// Create new customer with validation
router.post('/', 
  validate({ body: customerValidation.createCustomer }),
  asyncHandler(async (req: Request, res: Response) => {
    const customer = await storage.createCustomer(req.body);
    res.status(201).json(customer);
  })
);

// Update customer with validation
router.patch('/:id', 
  validate({ 
    params: customerValidation.customerIdParam,
    body: customerValidation.updateCustomer 
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const updatedCustomer = await storage.updateCustomer(parseInt(id), req.body);
    
    if (!updatedCustomer) {
      throwError('Customer not found', 404);
    }
    
    res.json(updatedCustomer);
  })
);

export default router;