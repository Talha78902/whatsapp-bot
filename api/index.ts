/**
 * Vercel serverless entry point.
 * Vercel picks up any file inside /api and serves it as a serverless function.
 * We export the Express app — Vercel's @vercel/node runtime wraps it for us.
 */
import app from "../artifacts/api-server/src/app.js";
export default app;
