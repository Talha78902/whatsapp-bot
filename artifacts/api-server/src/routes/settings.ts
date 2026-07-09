import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, settingsTable } from "@workspace/db";
import {
  UpdateWhatsappSettingsBody,
  UpdateAiSettingsBody,
  UpdateBusinessSettingsBody,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

async function getSetting(key: string): Promise<string | null> {
  const [row] = await db.select().from(settingsTable).where(eq(settingsTable.key, key));
  return row?.value ?? null;
}

async function setSetting(key: string, value: string): Promise<void> {
  const existing = await getSetting(key);
  if (existing !== null) {
    await db.update(settingsTable).set({ value }).where(eq(settingsTable.key, key));
  } else {
    await db.insert(settingsTable).values({ key, value });
  }
}

async function buildSettingsResponse() {
  const whatsappRaw = await getSetting("whatsapp");
  const aiRaw = await getSetting("ai");
  const businessRaw = await getSetting("business");

  const whatsapp = whatsappRaw
    ? JSON.parse(whatsappRaw)
    : { phoneNumberId: "", businessAccountId: "", accessToken: "", webhookVerifyToken: "", isConfigured: false };

  const ai = aiRaw
    ? JSON.parse(aiRaw)
    : { isEnabled: false, model: "gpt-4o-mini", systemPrompt: "", autoHandoff: true, handoffKeywords: [], knowledgeBase: "" };

  const business = businessRaw
    ? JSON.parse(businessRaw)
    : { businessName: "", businessEmail: "", businessPhone: "", businessAddress: "", timezone: "UTC", language: "en" };

  return { whatsapp, ai, business };
}

router.get("/settings", requireAuth, async (req, res): Promise<void> => {
  const settings = await buildSettingsResponse();
  res.json(settings);
});

router.put("/settings/whatsapp", requireAuth, async (req, res): Promise<void> => {
  const parsed = UpdateWhatsappSettingsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", message: parsed.error.message });
    return;
  }

  const current = await getSetting("whatsapp");
  const currentObj = current ? JSON.parse(current) : {};
  const updated = { ...currentObj, ...parsed.data, isConfigured: !!(parsed.data.phoneNumberId && parsed.data.accessToken) };
  await setSetting("whatsapp", JSON.stringify(updated));

  const settings = await buildSettingsResponse();
  res.json(settings);
});

router.put("/settings/ai", requireAuth, async (req, res): Promise<void> => {
  const parsed = UpdateAiSettingsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", message: parsed.error.message });
    return;
  }

  const current = await getSetting("ai");
  const currentObj = current ? JSON.parse(current) : {};
  const updated = { ...currentObj, ...parsed.data };
  await setSetting("ai", JSON.stringify(updated));

  const settings = await buildSettingsResponse();
  res.json(settings);
});

router.put("/settings/business", requireAuth, async (req, res): Promise<void> => {
  const parsed = UpdateBusinessSettingsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", message: parsed.error.message });
    return;
  }

  const current = await getSetting("business");
  const currentObj = current ? JSON.parse(current) : {};
  const updated = { ...currentObj, ...parsed.data };
  await setSetting("business", JSON.stringify(updated));

  const settings = await buildSettingsResponse();
  res.json(settings);
});

export default router;
