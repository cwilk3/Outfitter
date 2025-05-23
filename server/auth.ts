import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import type { Express, RequestHandler } from "express";
import { storage } from "./storage";

if (!process.env.JWT_SECRET) {
  throw new Error("Environment variable JWT_SECRET not provided");
}

// JWT token generation and validation
export function generateToken(userId: string): string {
  return jwt.sign(
    { userId, type: 'auth' },
    process.env.JWT_SECRET!,
    { expiresIn: '7d' }
  );
}

export function verifyToken(token: string): { userId: string } | null {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    return { userId: decoded.userId };
  } catch {
    return null;
  }
}

// Password hashing utilities
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// JWT authentication middleware
export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ message: "Invalid token" });
  }

  try {
    const user = await storage.getUser(decoded.userId);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }
    
    (req as any).user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Unauthorized" });
  }
};