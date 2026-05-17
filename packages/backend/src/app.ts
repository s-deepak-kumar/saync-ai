import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { HTTPException } from 'hono/http-exception';
import health from './routes/health.js';
import runsRouter from './routes/runs.js';
import violationsRouter from './routes/violations.js';
import projectsRouter from './routes/projects.js';
import issuesRouter from './routes/issues.js';

/**
 * Create and configure the Hono application
 */
export function createApp() {
  const app = new Hono();

  // Middleware
  app.use('*', logger());
  app.use('*', cors({
    origin: process.env.SAYNC_CORS_ORIGIN || 'http://localhost:3000',
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'X-Saync-Api-Key'],
    credentials: true,
  }));

  // Routes
  app.route('/health', health);
  app.route('/api/runs', runsRouter);
  app.route('/api/violations', violationsRouter);
  app.route('/api/projects', projectsRouter);
  app.route('/api/issues', issuesRouter);

  // 404 handler
  app.notFound((c) => {
    return c.json({ error: 'Not found' }, 404);
  });

  // Error handler
  app.onError((err, c) => {
    // Handle HTTPException (thrown by Hono for validation errors, etc.)
    if (err instanceof HTTPException) {
      return err.getResponse();
    }

    // Generate correlation ID for tracking
    const correlationId = crypto.randomUUID();
    
    // Log error with correlation ID
    console.error(`[${correlationId}] Unhandled error:`, err);
    
    // Return 500 with correlation ID
    return c.json(
      { 
        error: 'Internal server error',
        correlationId,
      },
      500
    );
  });

  return app;
}

// Made with Bob
