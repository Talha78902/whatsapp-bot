import { Router } from "express";
import bcrypt from "bcryptjs";
import { users } from "../lib/store.js";
import { requireAuth, signAccessToken, signRefreshToken } from "../middlewares/auth.js";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET ?? process.env.SESSION_SECRET ?? "";

export const router = Router();

function safeUser(u: ReturnType<typeof users.findById>) {
  if (!u) return null;
  const { password: _, refreshToken: __, ...rest } = u;
  return rest;
}

// POST /api/auth/register
router.post("/auth/register", async (req, res): Promise<void> => {
  const { email, password, name, role } = req.body as Record<string, string>;
  if (!email || !password || !name) {
    res.status(400).json({ error: "Invalid input", message: "email, password and name are required" });
    return;
  }
  if (users.findByEmail(email)) {
    res.status(409).json({ error: "Conflict", message: "Email already registered" });
    return;
  }
  const hashed = await bcrypt.hash(password, 12);
  const user = users.insert({ email, password: hashed, name, role: role === "agent" ? "agent" : "admin", avatar: null, refreshToken: null });
  const accessToken = signAccessToken({ userId: user.id, email: user.email, role: user.role });
  const refreshToken = signRefreshToken({ userId: user.id });
  users.update(user.id, { refreshToken });
  res.status(201).json({ accessToken, refreshToken, user: safeUser(user) });
});

// POST /api/auth/login
router.post("/auth/login", async (req, res): Promise<void> => {
  const { email, password } = req.body as Record<string, string>;
  if (!email || !password) {
    res.status(400).json({ error: "Invalid input", message: "email and password are required" });
    return;
  }
  const user = users.findByEmail(email);
  if (!user) {
    res.status(401).json({ error: "Unauthorized", message: "Invalid credentials" });
    return;
  }
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    res.status(401).json({ error: "Unauthorized", message: "Invalid credentials" });
    return;
  }
  const accessToken = signAccessToken({ userId: user.id, email: user.email, role: user.role });
  const refreshToken = signRefreshToken({ userId: user.id });
  users.update(user.id, { refreshToken });
  res.json({ accessToken, refreshToken, user: safeUser(user) });
});

// POST /api/auth/refresh
router.post("/auth/refresh", (req, res): void => {
  const { refreshToken } = req.body as { refreshToken?: string };
  if (!refreshToken) {
    res.status(400).json({ error: "Invalid input", message: "refreshToken is required" });
    return;
  }
  try {
    const payload = jwt.verify(refreshToken, JWT_SECRET) as { userId: number };
    const user = users.findById(payload.userId);
    if (!user || user.refreshToken !== refreshToken) {
      res.status(401).json({ error: "Unauthorized", message: "Invalid refresh token" });
      return;
    }
    const newAccess = signAccessToken({ userId: user.id, email: user.email, role: user.role });
    const newRefresh = signRefreshToken({ userId: user.id });
    users.update(user.id, { refreshToken: newRefresh });
    res.json({ accessToken: newAccess, refreshToken: newRefresh });
  } catch {
    res.status(401).json({ error: "Unauthorized", message: "Invalid or expired refresh token" });
  }
});

// GET /api/auth/me
router.get("/auth/me", requireAuth, (req, res): void => {
  const user = users.findById(req.auth!.userId);
  if (!user) { res.status(404).json({ error: "Not found", message: "User not found" }); return; }
  res.json(safeUser(user));
});

// POST /api/auth/change-password
router.post("/auth/change-password", requireAuth, async (req, res): Promise<void> => {
  const { currentPassword, newPassword } = req.body as Record<string, string>;
  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: "Invalid input", message: "currentPassword and newPassword are required" });
    return;
  }
  const user = users.findById(req.auth!.userId);
  if (!user) { res.status(404).json({ error: "Not found", message: "User not found" }); return; }
  const valid = await bcrypt.compare(currentPassword, user.password);
  if (!valid) {
    res.status(401).json({ error: "Unauthorized", message: "Current password is incorrect" });
    return;
  }
  const hashed = await bcrypt.hash(newPassword, 12);
  users.update(user.id, { password: hashed, refreshToken: null });
  res.json({ message: "Password changed successfully" });
});

// POST /api/auth/logout
router.post("/auth/logout", requireAuth, (req, res): void => {
  users.update(req.auth!.userId, { refreshToken: null });
  res.json({ message: "Logged out successfully" });
});
