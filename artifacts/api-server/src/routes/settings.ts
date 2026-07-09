import { Router } from "express";
import { settings } from "../lib/store.js";
import { requireAuth } from "../middlewares/auth.js";

export const router = Router();

// GET /api/settings/whatsapp
router.get("/settings/whatsapp", requireAuth, (_req, res): void => {
  const data = settings.getJson("whatsapp") ?? {
    phoneNumberId: "",
    accessToken: "",
    webhookVerifyToken: "",
    businessAccountId: "",
  };
  res.json(data);
});

// PUT /api/settings/whatsapp
router.put("/settings/whatsapp", requireAuth, (req, res): void => {
  settings.setJson("whatsapp", req.body);
  res.json(settings.getJson("whatsapp"));
});

// GET /api/settings/ai
router.get("/settings/ai", requireAuth, (_req, res): void => {
  const data = settings.getJson("ai") ?? {
    provider: "openai",
    model: "gpt-4",
    apiKey: "",
    systemPrompt: "",
    enabled: false,
  };
  res.json(data);
});

// PUT /api/settings/ai
router.put("/settings/ai", requireAuth, (req, res): void => {
  settings.setJson("ai", req.body);
  res.json(settings.getJson("ai"));
});

// GET /api/settings/business
router.get("/settings/business", requireAuth, (_req, res): void => {
  const data = settings.getJson("business") ?? {
    name: "",
    email: "",
    phone: "",
    address: "",
    website: "",
    logo: "",
  };
  res.json(data);
});

// PUT /api/settings/business
router.put("/settings/business", requireAuth, (req, res): void => {
  settings.setJson("business", req.body);
  res.json(settings.getJson("business"));
});
