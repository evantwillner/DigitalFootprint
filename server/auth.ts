import { Request, Response, NextFunction } from 'express';
import { scrypt, randomBytes, timingSafeEqual } from 'crypto';
import { promisify } from 'util';
import { storage } from './storage';
import { User } from '@shared/schema';

// For typings in the express session
declare global {
  namespace Express {
    // Extended Express User for the middleware
    interface User {
      id: number;
      username: string;
      email: string;
      createdAt: Date;
    }
  }
}

const scryptAsync = promisify(scrypt);

/**
 * Hash a password using scrypt
 * @param password Plain text password
 * @returns Hashed password with salt
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString('hex')}.${salt}`;
}

/**
 * Compare a supplied password with a stored hashed password
 * @param supplied Plain text password to check
 * @param stored Stored hashed password with salt
 * @returns Boolean indicating if passwords match
 */
export async function comparePasswords(supplied: string, stored: string): Promise<boolean> {
  const [hashed, salt] = stored.split('.');
  const hashedBuf = Buffer.from(hashed, 'hex');
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

/**
 * Authenticate a user based on username and password
 * @param username Username to authenticate
 * @param password Password to authenticate
 * @returns User object if authenticated, null otherwise
 */
export async function authenticateUser(username: string, password: string): Promise<User | null> {
  // Check if user exists in storage
  let user = await storage.getUserByUsername(username);
  
  // For development mode - create user on the fly if valid credentials
  if (!user && username.length >= 3 && password.length >= 6) {
    // Auto-create user for valid credentials in development
    const hashedPassword = await hashPassword(password);
    user = await storage.createUser({
      username,
      email: `${username}@example.com`,
      password: hashedPassword,
    });
    console.log(`Development mode: Auto-created user ${username}`);
    return user;
  }
  
  // If user exists, check password
  if (user) {
    const passwordsMatch = await comparePasswords(password, user.password);
    return passwordsMatch ? user : null;
  }
  
  return null;
}

/**
 * Login middleware to handle user authentication
 * @param req Express Request object
 * @param res Express Response object
 * @param next Express NextFunction
 */
export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ 
        message: 'Invalid request',
        error: 'Username and password are required' 
      });
    }
    
    const user = await authenticateUser(username, password);
    if (!user) {
      return res.status(401).json({ 
        message: 'Authentication failed',
        error: 'Invalid username or password' 
      });
    }
    
    // Exclude sensitive information
    const { password: _, ...safeUser } = user;
    
    // Set session
    req.session!.userId = user.id;
    req.session!.lastActivity = Date.now();
    
    return res.status(200).json(safeUser);
  } catch (error) {
    next(error);
  }
}

/**
 * Logout middleware to clear user session
 * @param req Express Request object
 * @param res Express Response object
 * @param next Express NextFunction
 */
export function logout(req: Request, res: Response, next: NextFunction) {
  req.session?.destroy((err) => {
    if (err) return next(err);
    return res.status(200).json({ message: 'Logged out successfully' });
  });
}

/**
 * Register middleware to create a new user
 * @param req Express Request object
 * @param res Express Response object
 * @param next Express NextFunction
 */
export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const { username, email, password } = req.body;
    
    if (!username || !email || !password) {
      return res.status(400).json({ 
        message: 'Invalid request',
        error: 'Username, email, and password are required' 
      });
    }
    
    // Check if user exists
    const existingUser = await storage.getUserByUsername(username);
    if (existingUser) {
      return res.status(409).json({ 
        message: 'Registration failed',
        error: 'Username already exists' 
      });
    }
    
    // Hash password
    const hashedPassword = await hashPassword(password);
    
    // Create user
    const user = await storage.createUser({
      username,
      email,
      password: hashedPassword,
    });
    
    // Exclude sensitive information
    const { password: _, ...safeUser } = user;
    
    // Set session
    req.session!.userId = user.id;
    req.session!.lastActivity = Date.now();
    
    return res.status(201).json(safeUser);
  } catch (error) {
    next(error);
  }
}

/**
 * GetCurrentUser middleware to get current authenticated user
 * @param req Express Request object
 * @param res Express Response object
 * @param next Express NextFunction
 */
export async function getCurrentUser(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({
        message: 'Authentication required',
        error: 'You must be logged in to access this resource' 
      });
    }
    
    const user = await storage.getUser(userId);
    if (!user) {
      // Clear invalid session
      req.session?.destroy((err) => {
        if (err) console.error('Error destroying session:', err);
      });
      
      return res.status(401).json({ 
        message: 'Authentication required',
        error: 'Invalid session' 
      });
    }
    
    // Exclude sensitive information
    const { password: _, ...safeUser } = user;
    
    return res.status(200).json(safeUser);
  } catch (error) {
    next(error);
  }
}