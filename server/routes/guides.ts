import { Router, Request, Response } from 'express';
import { storage } from '../storage';
import { requireAuth } from '../emailAuth';
import { addOutfitterContext } from '../outfitterContext';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

// Helper function to check roles
const hasRole = (requiredRole: 'admin' | 'guide') => async (req: Request, res: Response, next: Function) => {
  const user = (req as any).user;
  if (!user || user.role !== requiredRole) {
    return res.status(403).json({ error: `Access denied. ${requiredRole} role required.` });
  }
  next();
};

const adminOnly = hasRole('admin');
const guideOnly = hasRole('guide');

// Apply auth and outfitter context to all guide routes
router.use(requireAuth, addOutfitterContext);

// Get all experiences assigned to a guide
router.get('/:guideId/experiences', asyncHandler(async (req: Request, res: Response) => {
  const guideId = req.params.guideId;
  const user = (req as any).user;
  const outfitterId = user?.outfitterId;

  // Security check: guides can only view their own assignments, admins can view any
  if (user.role === 'guide' && user.id !== guideId) {
    return res.status(403).json({ error: 'Access denied. You can only view your own assignments.' });
  }

  // Get all guide assignments for this guide with experience details
  const guideAssignments = await storage.getGuideAssignmentsByGuideId(guideId);
  
  if (!guideAssignments || guideAssignments.length === 0) {
    return res.json([]);
  }

  // Get full experience details for each assigned experience
  const experiencesWithDetails = await Promise.all(
    guideAssignments.map(async (assignment) => {
      const experience = await storage.getExperience(assignment.experienceId);
      if (!experience || experience.outfitterId !== outfitterId) {
        return null; // Filter out experiences not belonging to this outfitter
      }
      
      return {
        ...experience,
        isPrimary: assignment.isPrimary,
        assignmentId: assignment.id
      };
    })
  );

  // Filter out null results and return
  const filteredExperiences = experiencesWithDetails.filter(exp => exp !== null);
  res.json(filteredExperiences);
}));

// Get all bookings assigned to a guide
router.get('/:guideId/bookings', asyncHandler(async (req: Request, res: Response) => {
  const guideId = req.params.guideId;
  const user = (req as any).user;
  const outfitterId = user?.outfitterId;

  // Security check: guides can only view their own bookings, admins can view any
  if (user.role === 'guide' && user.id !== guideId) {
    return res.status(403).json({ error: 'Access denied. You can only view your own bookings.' });
  }

  // Get all bookings where this guide is assigned
  const guideBookings = await storage.getBookingsForGuide(guideId, outfitterId);
  
  res.json(guideBookings || []);
}));

// Get guide dashboard stats
router.get('/:guideId/stats', asyncHandler(async (req: Request, res: Response) => {
  const guideId = req.params.guideId;
  const user = (req as any).user;
  const outfitterId = user?.outfitterId;

  // Security check: guides can only view their own stats, admins can view any
  if (user.role === 'guide' && user.id !== guideId) {
    return res.status(403).json({ error: 'Access denied. You can only view your own stats.' });
  }

  const stats = await storage.getGuideStats(guideId, outfitterId);
  
  res.json(stats);
}));

// Assign a guide to an experience (admin only)
router.post('/assign/:experienceId', adminOnly, asyncHandler(async (req: Request, res: Response) => {
  const experienceId = parseInt(req.params.experienceId);
  const user = (req as any).user;
  const outfitterId = user?.outfitterId;

  console.log(`[GUIDE ASSIGNMENT] Starting guide assignment for experience ID: ${experienceId}`);
  console.log(`[GUIDE ASSIGNMENT] Request body:`, JSON.stringify(req.body, null, 2));
  
  if (isNaN(experienceId)) {
    return res.status(400).json({ error: 'Invalid experience ID' });
  }
  
  // Check if experience exists and belongs to this outfitter
  const existingExperience = await storage.getExperience(experienceId);
  if (!existingExperience || existingExperience.outfitterId !== outfitterId) {
    return res.status(404).json({ error: 'Experience not found' });
  }
  
  const guideAssignment = await storage.assignGuideToExperience({
    experienceId,
    guideId: req.body.guideId,
    isPrimary: req.body.isPrimary || false
  });
  
  res.status(201).json(guideAssignment);
}));

// Update a guide assignment (admin only)
router.put('/assignments/:id', adminOnly, asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const user = (req as any).user;
  const outfitterId = user?.outfitterId;
  
  // Prepare data for validation
  const updateData = {
    isPrimary: req.body.isPrimary === true
  };
  
  // Update guide assignment with tenant isolation
  const updatedGuide = await storage.updateGuideAssignment(id, updateData, outfitterId);
  
  if (!updatedGuide) {
    return res.status(404).json({ error: 'Guide assignment not found' });
  }
  
  res.json(updatedGuide);
}));

// Remove a guide from an experience (admin only)
router.delete('/assignments/:id', adminOnly, asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const user = (req as any).user;
  const outfitterId = user?.outfitterId;
  
  // Remove guide assignment with tenant isolation
  await storage.removeGuideFromExperienceWithTenant(id, outfitterId);
  
  res.status(204).end();
}));

export default router;