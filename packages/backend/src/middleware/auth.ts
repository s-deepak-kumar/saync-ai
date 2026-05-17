import { Context, Next } from 'hono';

/**
 * API Key validation middleware
 * For MVP: accepts any value, just validates presence
 * Future: implement actual key validation against a store
 */
export async function validateApiKey(c: Context, next: Next) {
  const apiKey = c.req.header('X-Saync-Api-Key');
  
  if (!apiKey) {
    return c.json(
      { error: 'Missing X-Saync-Api-Key header' },
      401
    );
  }
  
  // MVP: Accept any value
  // TODO: Implement actual key validation in post-MVP
  
  await next();
}

// Made with Bob
