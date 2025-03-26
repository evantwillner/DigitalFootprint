import { Request, Response, NextFunction } from 'express';
import { storage } from '../storage';

/**
 * Middleware to check if the user is authenticated
 * Use this middleware to protect routes that require authentication
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.userId) {
    return res.status(401).json({
      message: 'Authentication required',
      error: 'You must be logged in to access this resource'
    });
  }
  
  next();
}

/**
 * Middleware to load user data from storage
 * This can be used to attach the user object to the request for easy access
 */
export async function loadUser(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.session?.userId;
    if (userId) {
      const user = await storage.getUser(userId);
      if (user) {
        // Exclude sensitive information
        const { password: _, ...safeUser } = user;
        req.user = safeUser as any;
      }
    }
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Middleware to check ownership of resources
 * Use this to ensure users can only access their own resources
 */
export function requireOwnership(
  getUserId: (req: Request) => number | null | undefined
) {
  return (req: Request, res: Response, next: NextFunction) => {
    const resourceUserId = getUserId(req);
    const sessionUserId = req.session?.userId;
    
    if (!resourceUserId || !sessionUserId || resourceUserId !== sessionUserId) {
      return res.status(403).json({
        message: 'Access denied',
        error: 'You do not have permission to access this resource'
      });
    }
    
    next();
  };
}