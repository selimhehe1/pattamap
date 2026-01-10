/**
 * Vercel Serverless Function Entry Point
 *
 * This file wraps the Express app for Vercel's serverless functions.
 * All requests are routed here via rewrites in vercel.json.
 */

// Import the Express app from the source
// Vercel will bundle all dependencies
import app from '../src/server';

// Export for Vercel serverless
export default app;
