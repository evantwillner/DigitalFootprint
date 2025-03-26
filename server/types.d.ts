// Extend Express Session
declare namespace Express {
  interface Request {
    session?: {
      userId?: number | null;
      destroy: (callback: (err: any) => void) => void;
    }
  }
}

// Extend express-session
declare module 'express-session' {
  interface SessionData {
    userId?: number | null;
  }
}