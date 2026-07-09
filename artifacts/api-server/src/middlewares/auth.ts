import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET ?? process.env.SESSION_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET or SESSION_SECRET environment variable must be set");
}

export interface AuthPayload {
  userId: number;
  email: string;
  role: string;
  type: "access" | "refresh";
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized", message: "Missing or invalid Authorization header" });
    return;
  }

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET!) as AuthPayload;
    if (payload.type !== "access") {
      res.status(401).json({ error: "Unauthorized", message: "Invalid token type" });
      return;
    }
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: "Unauthorized", message: "Invalid or expired token" });
  }
}

export function signAccessToken(userId: number, email: string, role: string): string {
  const payload: AuthPayload = { userId, email, role, type: "access" };
  return jwt.sign(payload, JWT_SECRET!, { expiresIn: "15m" });
}

export function signRefreshToken(userId: number, email: string, role: string): string {
  const payload: AuthPayload = { userId, email, role, type: "refresh" };
  return jwt.sign(payload, JWT_SECRET!, { expiresIn: "7d" });
}
