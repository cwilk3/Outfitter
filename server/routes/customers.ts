import { Router, Request, Response } from 'express';
import { storage } from '../storage';
import { requireAuth } from '../emailAuth';
import { addOutfitterContext } from '../outfitterContext';
import { asyncHandler, throwError } from '../utils/asyncHandler';
import { insertCustomerSchema } from '@shared/schema';

const router = Router();

// Apply auth and outfitter context to all customer routes
router.use(requireAuth, addOutfitterContext);

// Get all customers with optional search
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const search = req.query.search as string | undefined;
  const outfitterId = req.outfitterId;
  const customers = await storage.listCustomers(outfitterId, search);
  res.json(customers);
}));

// Get customer by ID
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  
  if (isNaN(id)) {
    throwError('Invalid customer ID', 400);
  }
  
  const customer = await storage.getCustomer(id);
  
  if (!customer) {
    throwError('Customer not found', 404);
  }
  
  res.json(customer);
}));

// Create new customer
router.post('/', asyncHandler(async (req: Request, res: Response) => {
  const validatedData = insertCustomerSchema.parse(req.body);
  const customer = await storage.createCustomer(validatedData);
  res.status(201).json(customer);
}));

// Update customer
router.patch('/:id', asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  
  if (isNaN(id)) {
    throwError('Invalid customer ID', 400);
  }
  
  const validatedData = insertCustomerSchema.partial().parse(req.body);
  const updatedCustomer = await storage.updateCustomer(id, validatedData);
  
  if (!updatedCustomer) {
    throwError('Customer not found', 404);
  }
  
  res.json(updatedCustomer);
}));

export default router;