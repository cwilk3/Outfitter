import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { storage } from '../storage';
import { requireAuth } from '../emailAuth';
import { addOutfitterContext } from '../outfitterContext';
import { asyncHandler, throwError } from '../utils/asyncHandler';
import { insertExperienceSchema, insertExperienceAddonSchema, insertExperienceLocationSchema } from '@shared/schema';
import { validate, commonSchemas, businessRules } from '../middleware/validation';

const router = Router();

// Role-based permission middleware
const hasRole = (requiredRole: 'admin' | 'guide') => async (req: Request, res: Response, next: Function) => {
  const user = (req as any).user;
  
  if (!user) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  
  if (requiredRole === 'guide' && (user.role === 'admin' || user.role === 'guide')) {
    return next();
  }
  
  if (requiredRole === 'admin' && user.role === 'admin') {
    return next();
  }
  
  return res.status(403).json({ message: 'Insufficient permissions' });
};

const adminOnly = hasRole('admin');

// Apply auth and outfitter context to all experience routes
router.use(requireAuth, addOutfitterContext);

// Get all experiences
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const locationId = req.query.locationId ? parseInt(req.query.locationId as string) : undefined;
  const experiences = await storage.listExperiences(locationId);
  res.json(experiences);
}));

// Create new experience (admin only)
router.post('/', adminOnly, asyncHandler(async (req: Request, res: Response) => {
  const validatedData = insertExperienceSchema.parse(req.body);
  const experience = await storage.createExperience(validatedData);
  res.status(201).json(experience);
}));

// Experience locations
router.get('/:id/locations', asyncHandler(async (req: Request, res: Response) => {
  const experienceId = parseInt(req.params.id);
  const locations = await storage.getExperienceLocations(experienceId);
  res.json(locations);
}));

// Experience add-ons (existing pattern)
router.get('/addons/:experienceId', asyncHandler(async (req: Request, res: Response) => {
  const experienceId = parseInt(req.params.experienceId);
  const user = (req as any).user;
  const outfitterId = user?.outfitterId;

  if (!outfitterId) {
    return res.status(401).json({ error: "Authentication required" });
  }

  // 🔒 TENANT ISOLATION: Verify experience belongs to user's outfitter
  const experience = await storage.getExperience(experienceId);
  if (!experience || experience.outfitterId !== outfitterId) {
    return res.status(404).json({ error: "Experience not found" });
  }

  const addons = await storage.getExperienceAddons(experienceId);
  res.json(addons);
}));

router.post('/addons', asyncHandler(async (req: Request, res: Response) => {
  const validatedData = insertExperienceAddonSchema.parse(req.body);
  
  // Make sure the experience exists
  const experience = await storage.getExperience(validatedData.experienceId);
  if (!experience) {
    return res.status(404).json({ message: 'Experience not found' });
  }
  
  const addon = await storage.createExperienceAddon(validatedData);
  res.status(201).json(addon);
}));

router.patch('/addons/:id', asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const validatedData = insertExperienceAddonSchema.partial().parse(req.body);
  
  const updatedAddon = await storage.updateExperienceAddon(id, validatedData);
  
  if (!updatedAddon) {
    return res.status(404).json({ message: 'Experience add-on not found' });
  }
  
  res.json(updatedAddon);
}));

router.delete('/addons/:id', asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const addon = await storage.getExperienceAddon(id);
  
  if (!addon) {
    return res.status(404).json({ message: 'Experience add-on not found' });
  }
  
  await storage.deleteExperienceAddon(id);
  res.status(204).end();
}));

// Experience guides
router.get('/:experienceId/guides', asyncHandler(async (req: Request, res: Response) => {
  const experienceId = parseInt(req.params.experienceId);
  const guides = await storage.getExperienceGuides(experienceId);
  res.json(guides);
}));

// --- NEW NESTED ADDON ROUTES (Matching Frontend's New Pattern) ---

// GET /api/experiences/:experienceId/addons (NEW PATTERN)
router.get('/:experienceId/addons', asyncHandler(async (req: Request, res: Response) => {
  const experienceId = parseInt(req.params.experienceId);
  const user = (req as any).user;
  const outfitterId = user?.outfitterId;

  if (isNaN(experienceId)) {
    return res.status(400).json({ message: 'Invalid experience ID' });
  }

  if (!outfitterId) {
    return res.status(401).json({ error: "Authentication required" });
  }

  // 🔒 TENANT ISOLATION: Verify experience belongs to user's outfitter
  const experience = await storage.getExperience(experienceId);
  if (!experience || experience.outfitterId !== outfitterId) {
    console.log('🚫 [TENANT-BLOCK] Experience access denied', { 
      experienceId, 
      userOutfitterId: outfitterId, 
      experienceOutfitterId: experience?.outfitterId 
    });
    return res.status(404).json({ error: "Experience not found" });
  }

  console.log('✅ [TENANT-VERIFIED] Fetching addons', { experienceId, outfitterId });
  const addons = await storage.getExperienceAddons(experienceId);
  res.json(addons || []);
}));

// POST /api/experiences/:experienceId/addons (NEW PATTERN - THIS WAS MISSING!)
router.post('/:experienceId/addons', adminOnly, asyncHandler(async (req: Request, res: Response) => {
  const experienceId = parseInt(req.params.experienceId);
  const user = (req as any).user;
  const outfitterId = user?.outfitterId;

  if (isNaN(experienceId)) {
    return res.status(400).json({ message: 'Invalid experience ID' });
  }

  if (!outfitterId) {
    return res.status(401).json({ error: "Authentication required" });
  }

  // 🔒 TENANT ISOLATION: Verify experience belongs to user's outfitter
  const experience = await storage.getExperience(experienceId);
  if (!experience || experience.outfitterId !== outfitterId) {
    console.log('🚫 [TENANT-BLOCK] Experience access denied for addon creation', { 
      experienceId, 
      userOutfitterId: outfitterId, 
      experienceOutfitterId: experience?.outfitterId 
    });
    return res.status(404).json({ error: "Experience not found" });
  }

  // Parse and validate addon data
  const addonData = {
    ...req.body,
    experienceId: experienceId
  };
  
  const validatedData = insertExperienceAddonSchema.parse(addonData);
  
  console.log('✅ [TENANT-VERIFIED] Creating addon', { experienceId, outfitterId, addonData: validatedData });
  const addon = await storage.createExperienceAddon(validatedData);
  
  console.log('📋 [SUCCESS] Addon created', { addonId: addon.id, experienceId });
  res.status(201).json(addon);
}));

// PATCH /api/experiences/:experienceId/addons/:addonId (NEW PATTERN)
router.patch('/:experienceId/addons/:addonId', adminOnly, asyncHandler(async (req: Request, res: Response) => {
  const experienceId = parseInt(req.params.experienceId);
  const addonId = parseInt(req.params.addonId);
  const user = (req as any).user;
  const outfitterId = user?.outfitterId;

  if (isNaN(experienceId) || isNaN(addonId)) {
    return res.status(400).json({ message: 'Invalid experience or addon ID' });
  }

  if (!outfitterId) {
    return res.status(401).json({ error: "Authentication required" });
  }

  // 🔒 TENANT ISOLATION: Verify experience belongs to user's outfitter
  const experience = await storage.getExperience(experienceId);
  if (!experience || experience.outfitterId !== outfitterId) {
    return res.status(404).json({ error: "Experience not found" });
  }

  // Verify addon belongs to this experience
  const existingAddon = await storage.getExperienceAddon(addonId);
  if (!existingAddon || existingAddon.experienceId !== experienceId) {
    return res.status(404).json({ message: 'Addon not found for this experience' });
  }

  const validatedData = insertExperienceAddonSchema.partial().parse(req.body);
  const updatedAddon = await storage.updateExperienceAddon(addonId, validatedData);
  
  if (!updatedAddon) {
    return res.status(404).json({ message: 'Experience add-on not found' });
  }
  
  res.json(updatedAddon);
}));

// DELETE /api/experiences/:experienceId/addons/:addonId (NEW PATTERN)
router.delete('/:experienceId/addons/:addonId', adminOnly, asyncHandler(async (req: Request, res: Response) => {
  const experienceId = parseInt(req.params.experienceId);
  const addonId = parseInt(req.params.addonId);
  const user = (req as any).user;
  const outfitterId = user?.outfitterId;

  if (isNaN(experienceId) || isNaN(addonId)) {
    return res.status(400).json({ message: 'Invalid experience or addon ID' });
  }

  if (!outfitterId) {
    return res.status(401).json({ error: "Authentication required" });
  }

  // 🔒 TENANT ISOLATION: Verify experience belongs to user's outfitter
  const experience = await storage.getExperience(experienceId);
  if (!experience || experience.outfitterId !== outfitterId) {
    return res.status(404).json({ error: "Experience not found" });
  }

  // Verify addon exists and belongs to this experience
  const existingAddon = await storage.getExperienceAddon(addonId);
  if (!existingAddon || existingAddon.experienceId !== experienceId) {
    return res.status(404).json({ message: 'Addon not found for this experience' });
  }

  await storage.deleteExperienceAddon(addonId);
  res.status(204).end();
}));

export default router;