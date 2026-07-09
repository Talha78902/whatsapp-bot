import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import {
  LoginBody,
  RegisterBody,
  RefreshTokenBody,
  ChangePasswordBody,
} from "@workspace/api-zod";
import { requireAuth, signAccessToken, signRefreshToken, type AuthPayload } from "../middlewares/auth";
import jwt from "jsonwebtoken";
import { logger } from "../lib/logger";

const JWT_SECRET = process.env.JWT_SECRET ?? process.env.SESSION_SECRET;
if (!JWT_SECRET) throw new Error("JWT_SECRET or SESSION_SECRET must be set");

const router: IRouter = Router();

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", message: parsed.error.message });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, parsed.data.email));
  if (!user) {
    res.status(401).json({ error: "Invalid credentials", message: "Email or password is incorrect" });
    return;
  }

  const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid credentials", message: "Email or password is incorrect" });
    return;
  }

  const accessToken = signAccessToken(user.id, user.email, user.role);
  const refreshToken = signRefreshToken(user.id, user.email, user.role);

  await db.update(usersTable).set({ refreshToken }).where(eq(usersTable.id, user.id));

  res.json({
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar ?? null,
      createdAt: user.createdAt.toISOString(),
    },
  });
});

router.post("/auth/register", async (req, res): Promise<void> => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", message: parsed.error.message });
    return;
  }

  const [existing] = await db.select().from(usersTable).where(eq(usersTable.email, parsed.data.email));
  if (existing) {
    res.status(409).json({ error: "Conflict", message: "Email already registered" });
    return;
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  // Always assign "agent" role on self-registration — admin role must be granted manually
  const [user] = await db
    .insert(usersTable)
    .values({
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash,
      role: "agent",
    })
    .returning();

  if (!user) {
    res.status(500).json({ error: "Server error", message: "Failed to create user" });
    return;
  }

  const accessToken = signAccessToken(user.id, user.email, user.role);
  const refreshToken = signRefreshToken(user.id, user.email, user.role);

  await db.update(usersTable).set({ refreshToken }).where(eq(usersTable.id, user.id));

  res.status(201).json({
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar ?? null,
      createdAt: user.createdAt.toISOString(),
    },
  });
});

router.post("/auth/refresh", async (req, res): Promise<void> => {
  const parsed = RefreshTokenBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", message: parsed.error.message });
    return;
  }

  let decoded: AuthPayload;
  try {
    decoded = jwt.verify(parsed.data.refreshToken, JWT_SECRET!) as AuthPayload;
  } catch {
    res.status(401).json({ error: "Unauthorized", message: "Invalid or expired refresh token" });
    return;
  }

  if (decoded.type !== "refresh") {
    res.status(401).json({ error: "Unauthorized", message: "Invalid token type" });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, decoded.userId));

  if (!user || user.refreshToken !== parsed.data.refreshToken) {
    res.status(401).json({ error: "Unauthorized", message: "Refresh token revoked" });
    return;
  }

  const accessToken = signAccessToken(user.id, user.email, user.role);
  const refreshToken = signRefreshToken(user.id, user.email, user.role);

  await db.update(usersTable).set({ refreshToken }).where(eq(usersTable.id, user.id));

  res.json({
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar ?? null,
      createdAt: user.createdAt.toISOString(),
    },
  });
});

router.get("/auth/me", requireAuth, async (req, res): Promise<void> => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.userId));
  if (!user) {
    res.status(404).json({ error: "Not found", message: "User not found" });
    return;
  }
  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    avatar: user.avatar ?? null,
    createdAt: user.createdAt.toISOString(),
  });
});

router.put("/auth/me/password", requireAuth, async (req, res): Promise<void> => {
  const parsed = ChangePasswordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", message: parsed.error.message });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.userId));
  if (!user) {
    res.status(404).json({ error: "Not found", message: "User not found" });
    return;
  }

  const valid = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
  if (!valid) {
    res.status(400).json({ error: "Invalid password", message: "Current password is incorrect" });
    return;
  }

  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);
  await db.update(usersTable).set({ passwordHash }).where(eq(usersTable.id, user.id));

  res.json({ success: true, message: "Password changed successfully" });
});

void logger; // suppress unused import warning

export default router;
