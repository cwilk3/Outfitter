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
  
  // Check if experience exists
  const existingExperience = await storage.getExperience(experienceId);
  if (!existingExperience) {
    return res.status(404).json({ error: 'Experience not found' });
  }
  
  const validatedData = insertExperienceGuideSchema.parse({
    ...req.body,
    experienceId
  });
  
  const guideAssignment = await storage.assignGuideToExperience(validatedData);
  res.status(201).json(guideAssignment);
}));

// Update a guide assignment (admin only)
router.put('/assignments/:id', adminOnly, asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  
  // Prepare data for validation
  const updateData = {
    isPrimary: req.body.isPrimary === true
  };
  
  // Update guide assignment
  const updatedGuide = await storage.updateGuideAssignment(id, updateData);
  
  if (!updatedGuide) {
    return res.status(404).json({ error: 'Guide assignment not found' });
  }
  
  res.json(updatedGuide);
}));

// Remove a guide from an experience (admin only)
router.delete('/assignments/:id', adminOnly, asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  
  const assignment = await storage.getExperienceGuideById(id);
  if (!assignment) {
    return res.status(404).json({ error: 'Guide assignment not found' });
  }
  
  await storage.removeGuideFromExperience(id);
  res.status(204).end();
}));

export default router;