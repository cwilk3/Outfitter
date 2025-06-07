import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { storage } from '../storage';
import { requireAuth } from '../emailAuth';
import { addOutfitterContext } from '../outfitterContext';
import { asyncHandler, throwError } from '../utils/asyncHandler';
import { insertCustomerSchema } from '@shared/schema';
import { validate, commonSchemas, businessRules } from '../middleware/validation';
import { withTenantValidation, enforceTenantIsolation, validateTenantParam, TenantAwareRequest } from '../middleware/tenantValidation';

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

// Apply auth, outfitter context, and tenant validation to all customer routes
router.use(requireAuth, addOutfitterContext, withTenantValidation(), enforceTenantIsolation('customers'));

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
  validateTenantParam('id', 'customer'),
  asyncHandler(async (req: TenantAwareRequest, res: Response) => {
    const { id } = req.params;
    const outfitterId = req.tenantContext!.outfitterId;
    
    const customer = await storage.getCustomerWithTenant(parseInt(id), outfitterId);
    
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
    const newCustomer = {
      ...req.body,
      outfitterId: (req as any).user?.outfitterId // ADDED: Server-side outfitterId assignment
    };
    const customer = await storage.createCustomer(newCustomer);
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