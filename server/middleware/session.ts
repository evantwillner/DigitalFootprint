import express, { Request, Response, NextFunction } from 'express';
import session from 'express-session';
import { storage } from '../storage';

/**
 * Configure and set up session middleware
 * @param app Express application instance
 */
export function setupSession(app: express.Express) {
  // Session configuration
  const sessionConfig = {
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      httpOnly: true,
    }
  };

  // Production settings
  if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1); // Trust first proxy
  }

  // Apply session middleware
  app.use(session(sessionConfig));

  // Add session error handling
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.session) {
      next();
    } else {
      console.error('Session initialization failed');
      next(new Error('Session initialization failed'));
    }
  });
}

/**
 * Middleware to update last activity time
 * Use this on routes where you want to track user activity
 */
export function trackActivity(req: Request, res: Response, next: NextFunction) {
  if (req.session?.userId) {
    req.session.lastActivity = Date.now();
  }
  next();
}