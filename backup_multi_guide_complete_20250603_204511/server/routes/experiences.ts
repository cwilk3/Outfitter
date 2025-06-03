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
  const experiences = await storage.listExperiences(locationId, (req as any).outfitterId);
  res.json(experiences);
}));

// Create new experience (admin only)
router.post('/', adminOnly, asyncHandler(async (req: Request, res: Response) => {
  console.log('🎯 [ROUTE-HIT] Experience creation route reached!', { body: req.body, user: (req as any).user?.id });
  const validatedData = insertExperienceSchema.parse(req.body);
  const user = (req as any).user;
  const experienceData = {
    ...validatedData,
    outfitterId: (req as any).user?.outfitterId,
    guideId: validatedData.guideId, // Ensure this line is present or added
  };

  const experience = await storage.createExperience({
    ...experienceData,
    assignedGuideIds: validatedData.assignedGuideIds // Pass through the correct object array type
  });
  res.status(201).json(experience);
}));

router.put('/:id', adminOnly, asyncHandler(async (req: Request, res: Response) => {
  const experienceId = parseInt(req.params.id);
  const user = (req as any).user;
  const outfitterId = user?.outfitterId;

  if (isNaN(experienceId)) {
    return res.status(400).json({ message: 'Invalid experience ID' });
  }

  if (!outfitterId) {
    return res.status(401).json({ error: "Authentication required" });
  }

  // Validate request body - .partial() allows for updating only some fields
  const validatedData = insertExperienceSchema.partial().parse(req.body);

  // TENANT ISOLATION: Verify experience belongs to user's outfitter BEFORE update
  const existingExperience = await storage.getExperience(experienceId); // Assuming storage.getExperience fetches by ID
  if (!existingExperience || existingExperience.outfitterId !== outfitterId) {
    return res.status(404).json({ error: "Experience not found or not authorized" });
  }
  
  console.log('✅ [TENANT-VERIFIED] Updating experience', { experienceId, outfitterId, updateData: validatedData });

  // The 'storage.updateExperience' function will be created in the next step
  const updatedExperience = await storage.updateExperience(experienceId, validatedData, outfitterId);

  if (!updatedExperience) {
    // This might occur if the update failed internally or experience disappeared
    return res.status(404).json({ message: 'Experience not found or update failed' });
  }
  
  console.log('🔄 [SUCCESS] Experience updated', { experienceId });
  res.status(200).json(updatedExperience);
}));

// Delete experience (admin only)
router.delete('/:id', adminOnly, asyncHandler(async (req: Request, res: Response) => {
  const experienceId = parseInt(req.params.id);
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
    return res.status(404).json({ error: "Experience not found" });
  }

  console.log('✅ [TENANT-VERIFIED] Deleting experience', { experienceId, outfitterId });
  await storage.deleteExperience(experienceId);
  
  console.log('🗑️ [SUCCESS] Experience deleted', { experienceId });
  res.status(204).end();
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

// Define schema for guide assignment payload
const assignGuideSchema = z.object({
  guideId: z.string().min(1, 'Guide ID is required'),
  isPrimary: z.boolean().optional().default(false),
});

// POST /api/experiences/:id/guides - Assign a guide to an experience (admin only)
router.post('/:id/guides', adminOnly, asyncHandler(async (req: Request, res: Response) => {
  console.log('--- DIAGNOSTIC: POST /api/experiences/:id/guides ---');
  console.log('🔍 [ASSIGN_GUIDE_PERSIST_DEBUG] Route Hit. Experience ID param:', req.params.id);
  console.log('🔍 [ASSIGN_GUIDE_PERSIST_DEBUG] Request Body RAW:', JSON.stringify(req.body, null, 2));

  const experienceId = parseInt(req.params.id);
  const user = (req as any).user;
  const outfitterId = user?.outfitterId;

  // Validate path parameter
  if (isNaN(experienceId)) {
    console.error('❌ [ASSIGN_GUIDE_PERSIST_ERROR] Invalid experience ID format from param.');
    return res.status(400).json({ message: 'Invalid experience ID format.' });
  }

  // Validate request body
  const validationResult = assignGuideSchema.safeParse(req.body);
  if (!validationResult.success) {
    console.error('❌ [ASSIGN_GUIDE_PERSIST_ERROR] Invalid request data:', validationResult.error.errors);
    return res.status(400).json({ 
      message: 'Invalid request data', 
      errors: validationResult.error.errors 
    });
  }

  const { guideId, isPrimary } = validationResult.data;

  console.log('🔍 [ASSIGN_GUIDE_PERSIST_DEBUG] Validated Payload: guideId:', guideId, 'isPrimary:', isPrimary);

  // Basic authentication/authorization checks
  if (!user || !outfitterId) {
    console.error('❌ [ASSIGN_GUIDE_PERSIST_ERROR] Authentication or outfitter context missing.');
    return res.status(401).json({ error: 'Authentication required' });
  }

  // 🔒 TENANT ISOLATION: Verify experience belongs to user's outfitter BEFORE assignment
  const existingExperience = await storage.getExperience(experienceId);
  if (!existingExperience || existingExperience.outfitterId !== outfitterId) {
    console.error('❌ [ASSIGN_GUIDE_PERSIST_ERROR] Experience not found or not authorized for assignment. ID:', experienceId, 'Outfitter:', outfitterId);
    return res.status(404).json({ error: 'Experience not found or not authorized for assignment.' });
  }

  // Check existing guide assignments for primary guide enforcement
  const existingGuides = await storage.getExperienceGuides(experienceId);
  console.log('🔍 [PRIMARY_GUIDE_ENFORCEMENT] Existing guides:', existingGuides);

  // If setting as primary, remove primary status from all other guides
  let finalIsPrimary = isPrimary;
  if (existingGuides.length === 0) {
    // First guide must be primary
    finalIsPrimary = true;
    console.log('🔄 [PRIMARY_GUIDE_ENFORCEMENT] First guide assignment - forcing primary status');
  } else if (isPrimary) {
    // Remove primary status from existing guides
    console.log('🔄 [PRIMARY_GUIDE_ENFORCEMENT] New primary guide - removing primary from existing guides');
    for (const existingGuide of existingGuides) {
      if (existingGuide.isPrimary) {
        await storage.updateGuideAssignment(existingGuide.id, { isPrimary: false }, outfitterId);
      }
    }
  }

  console.log('✅ [ASSIGN_GUIDE_ROUTE] Assigning guide', { experienceId, guideId, outfitterId, isPrimary: finalIsPrimary });

  try {
    // Use storage.assignGuideToExperience for proper guide assignment
    const guideAssignment = await storage.assignGuideToExperience({
      experienceId,
      guideId,
      isPrimary: finalIsPrimary
    });

    if (!guideAssignment) {
      console.error('❌ [ASSIGN_GUIDE_ROUTE] Failed to assign guide:', { experienceId, guideId });
      return res.status(500).json({ message: 'Failed to assign guide.' });
    }

    console.log('🔄 [SUCCESS] Guide assigned to experience:', { experienceId, guideId, assignmentId: guideAssignment.id });
    res.status(201).json(guideAssignment);
  } catch (error) {
    console.error('❌ [ASSIGN_GUIDE_ROUTE] Error during guide assignment:', error);
    res.status(500).json({ message: 'Internal server error during guide assignment.' });
  }
}));

// DELETE /api/experiences/:id/guides/:guideId - Remove a guide from an experience (admin only)
router.delete('/:id/guides/:guideId', adminOnly, asyncHandler(async (req: Request, res: Response) => {
  const experienceId = parseInt(req.params.id);
  const guideId = req.params.guideId;
  const user = (req as any).user;
  const outfitterId = user?.outfitterId;

  // Validate path parameters
  if (isNaN(experienceId)) {
    return res.status(400).json({ message: 'Invalid experience ID format.' });
  }
  if (!guideId || typeof guideId !== 'string' || guideId.trim() === '') {
    return res.status(400).json({ message: 'Invalid guide ID format.' });
  }

  // Basic authentication/authorization checks
  if (!user || !outfitterId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // 🔒 TENANT ISOLATION: Verify experience belongs to user's outfitter BEFORE unassignment
  const existingExperience = await storage.getExperience(experienceId);
  if (!existingExperience || existingExperience.outfitterId !== outfitterId) {
    // Return 404 to obscure existence for security
    return res.status(404).json({ error: 'Experience not found or not authorized for unassignment.' });
  }

  console.log('✅ [UNASSIGN_GUIDE_ROUTE] Attempting to unassign guide', { experienceId, guideId, outfitterId });

  try {
    // Call storage function to remove the guide assignment
    // This function will also handle setting guideId to null on the experiences table
    const success = await storage.removeGuideFromExperienceByGuideId(experienceId, guideId, outfitterId);

    if (!success) {
      // This might happen if the guide was not assigned, or experience ID mismatch
      return res.status(404).json({ message: 'Guide not assigned to this experience or unassignment failed.' });
    }

    console.log('🔄 [SUCCESS] Guide unassigned from experience:', { experienceId, guideId });
    res.status(204).end(); // 204 No Content for successful deletion
  } catch (error) {
    console.error('❌ [UNASSIGN_GUIDE_ROUTE] Error during guide unassignment:', error);
    res.status(500).json({ message: 'Internal server error during guide unassignment.' });
  }
}));

router.get('/experience-locations', asyncHandler(async (req: Request, res: Response) => {
  const locations = await storage.getAllExperienceLocations();
  res.json(locations);
}));

router.delete('/experience-locations/:experienceId/:locationId', adminOnly, asyncHandler(async (req: Request, res: Response) => {
  const experienceId = parseInt(req.params.experienceId);
  const locationId = parseInt(req.params.locationId);
  
  await storage.removeExperienceLocation(experienceId, locationId);
  res.status(204).end();
}));

export default router;