// Extend Express Session
declare namespace Express {
  interface Request {
    session?: {
      userId?: number | null;
      lastActivity?: number;
      destroy: (callback: (err: any) => void) => void;
    }
    // Add custom user property for use with loadUser middleware
    user?: {
      id: number;
      username: string;
      email: string;
      createdAt: Date;
      role?: string;
    }
  }
}

// Extend express-session
declare module 'express-session' {
  interface SessionData {
    userId?: number | null;
    lastActivity?: number;
  }
}