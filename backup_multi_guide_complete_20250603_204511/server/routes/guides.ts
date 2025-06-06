import { Router, Request, Response } from 'express';
import { storage } from '../storage';
import { requireAuth } from '../emailAuth';
import { addOutfitterContext } from '../outfitterContext';
import { asyncHandler, throwError } from '../utils/asyncHandler';
import { insertExperienceGuideSchema } from '@shared/schema';

const router = Router();

// Role-based permission middleware
const hasRole = (requiredRole: 'admin' | 'guide') => async (req: Request, res: Response, next: Function) => {
  const user = (req as any).user;
  
  if (!user) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }
  
  if (requiredRole === 'guide' && (user.role === 'admin' || user.role === 'guide')) {
    return next();
  }
  
  if (requiredRole === 'admin' && user.role === 'admin') {
    return next();
  }
  
  return res.status(403).json({ success: false, message: 'Insufficient permissions' });
};

const adminOnly = hasRole('admin');

// Apply auth and outfitter context to all guide routes
router.use(requireAuth, addOutfitterContext);

// Get all experiences assigned to a guide
router.get('/:guideId/experiences', asyncHandler(async (req: Request, res: Response) => {
  const guideId = req.params.guideId;
  
  // For now, return empty array since getGuideAssignmentsByGuideId method needs to be implemented
  // TODO: Implement storage.getGuideAssignmentsByGuideId method
  res.json([]);
}));

// Assign a guide to an experience (admin only)
router.post('/assign/:experienceId', adminOnly, asyncHandler(async (req: Request, res: Response) => {
  const experienceId = parseInt(req.params.experienceId);
  
  console.log(`[GUIDE ASSIGNMENT] Starting guide assignment for experience ID: ${experienceId}`);
  console.log(`[GUIDE ASSIGNMENT] Request body:`, JSON.stringify(req.body, null, 2));
  
  if (isNaN(experienceId)) {
    throwError('Invalid experience ID', 400);
  }
  
  // Check if experience exists
  const existingExperience = await storage.getExperience(experienceId);
  if (!existingExperience) {
    throwError('Experience not found', 404);
  }
  
  const validatedData = insertExperienceGuideSchema.parse({
    ...req.body,
    experienceId
  });
  
  const guideAssignment = await storage.assignGuideToExperience(validatedData);
  res.status(201).json(guideAssignment);
}));

// --- REMOVED: PUT /experience-guides/:id route (moved to server/routes/index.ts) ---

// Remove a guide from an experience (admin only)
router.delete('/assignments/:id', adminOnly, asyncHandler(async (req: Request, res: Response) => {
  console.log('[TENANT-SECURE] Starting guide assignment removal with tenant isolation');
  
  const id = parseInt(req.params.id);
  const user = (req as any).user;
  const outfitterId = user?.outfitterId;

  if (!outfitterId) {
    return res.status(401).json({ error: "Authentication required" });
  }

  if (isNaN(id)) {
    return res.status(400).json({ error: 'Invalid assignment ID' });
  }

  // 🔒 TENANT ISOLATION: Verify assignment belongs to user's outfitter BEFORE any operations
  const assignment = await storage.getExperienceGuideById(id);
  
  if (!assignment) {

    return res.status(404).json({ error: 'Guide assignment not found' });
  }

  // Get the experience to verify outfitter ownership
  const experience = await storage.getExperience(assignment.experienceId);
  
  if (!experience || experience.outfitterId !== outfitterId) {

    return res.status(404).json({ error: 'Guide assignment not found' });
  }

  console.log(`[TENANT-VERIFIED] Access granted - Outfitter ${outfitterId} removing assignment ${id}`);

  // ✅ SAFE OPERATION: Now proceed with assignment removal
  await storage.removeGuideFromExperience(id);

  console.log(`[TENANT-SUCCESS] Assignment ${id} successfully removed for outfitter ${outfitterId}`);
  return res.status(204).end();
}));

export default router;