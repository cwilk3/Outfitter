// Async error handler utility for cleaner route error handling
import { Request, Response, NextFunction } from 'express';
import { AppError } from '../middleware/errorHandler';

export const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// Helper function to throw standardized errors
export const throwError = (message: string, statusCode: number = 500): never => {
  throw new AppError(message, statusCode);
};