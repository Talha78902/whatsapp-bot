import { Router } from "express";
import { campaigns, activityLogs } from "../lib/store.js";
import { requireAuth } from "../middlewares/auth.js";

export const router = Router();

function parseId(raw: string | string[]): number | null {
  const str = Array.isArray(raw) ? raw[0] : raw;
  const id = parseInt(str, 10);
  return Number.isFinite(id) && id > 0 ? id : null;
}

// GET /api/campaigns
router.get("/campaigns", requireAuth, (req, res): void => {
  const { status, search, page, limit } = req.query as Record<string, string>;
  res.json(campaigns.findAll({ status, search, page: page ? parseInt(page, 10) : 1, limit: limit ? parseInt(limit, 10) : 20 }));
});

// GET /api/campaigns/:id
router.get("/campaigns/:id", requireAuth, (req, res): void => {
  const id = parseId(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid params", message: "id must be a positive integer" }); return; }
  const campaign = campaigns.findById(id);
  if (!campaign) { res.status(404).json({ error: "Not found", message: "Campaign not found" }); return; }
  res.json(campaign);
});

// POST /api/campaigns
router.post("/campaigns", requireAuth, (req, res): void => {
  const { name, templateId, targetAudience, scheduledAt } = req.body as Record<string, unknown>;
  if (!name) { res.status(400).json({ error: "Invalid input", message: "name is required" }); return; }
  const campaign = campaigns.insert({
    name: String(name),
    templateId: templateId ? Number(templateId) : null,
    targetAudience: Array.isArray(targetAudience) ? targetAudience.map(String) : [],
    status: "draft",
    scheduledAt: scheduledAt ? String(scheduledAt) : null,
    startedAt: null,
    completedAt: null,
    sentCount: 0,
    deliveredCount: 0,
    readCount: 0,
    failedCount: 0,
  });
  activityLogs.insert({ userId: req.auth!.userId, action: "created", entity: "campaign", entityId: campaign.id, metadata: null });
  res.status(201).json(campaign);
});

// PUT /api/campaigns/:id
router.put("/campaigns/:id", requireAuth, (req, res): void => {
  const id = parseId(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid params", message: "id must be a positive integer" }); return; }
  const { name, templateId, targetAudience, scheduledAt } = req.body as Record<string, unknown>;
  const updated = campaigns.update(id, {
    ...(name !== undefined && { name: String(name) }),
    ...(templateId !== undefined && { templateId: templateId ? Number(templateId) : null }),
    ...(targetAudience !== undefined && { targetAudience: Array.isArray(targetAudience) ? targetAudience.map(String) : [] }),
    ...(scheduledAt !== undefined && { scheduledAt: scheduledAt ? String(scheduledAt) : null }),
  });
  if (!updated) { res.status(404).json({ error: "Not found", message: "Campaign not found" }); return; }
  res.json(updated);
});

// DELETE /api/campaigns/:id
router.delete("/campaigns/:id", requireAuth, (req, res): void => {
  const id = parseId(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid params", message: "id must be a positive integer" }); return; }
  const deleted = campaigns.delete(id);
  if (!deleted) { res.status(404).json({ error: "Not found", message: "Campaign not found" }); return; }
  res.json({ message: "Campaign deleted" });
});

// POST /api/campaigns/:id/schedule
router.post("/campaigns/:id/schedule", requireAuth, (req, res): void => {
  const id = parseId(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid params", message: "id must be a positive integer" }); return; }
  const { scheduledAt } = req.body as { scheduledAt?: string };
  if (!scheduledAt) { res.status(400).json({ error: "Invalid input", message: "scheduledAt is required" }); return; }
  const date = new Date(scheduledAt);
  if (isNaN(date.getTime())) { res.status(400).json({ error: "Invalid input", message: "scheduledAt must be a valid ISO date string" }); return; }
  const updated = campaigns.update(id, { status: "scheduled", scheduledAt: date.toISOString() });
  if (!updated) { res.status(404).json({ error: "Not found", message: "Campaign not found" }); return; }
  res.json(updated);
});

// POST /api/campaigns/:id/pause
router.post("/campaigns/:id/pause", requireAuth, (req, res): void => {
  const id = parseId(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid params", message: "id must be a positive integer" }); return; }
  const updated = campaigns.update(id, { status: "paused" });
  if (!updated) { res.status(404).json({ error: "Not found", message: "Campaign not found" }); return; }
  res.json(updated);
});

// POST /api/campaigns/:id/resume
router.post("/campaigns/:id/resume", requireAuth, (req, res): void => {
  const id = parseId(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid params", message: "id must be a positive integer" }); return; }
  const updated = campaigns.update(id, { status: "running" });
  if (!updated) { res.status(404).json({ error: "Not found", message: "Campaign not found" }); return; }
  res.json(updated);
});

// POST /api/campaigns/:id/cancel
router.post("/campaigns/:id/cancel", requireAuth, (req, res): void => {
  const id = parseId(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid params", message: "id must be a positive integer" }); return; }
  const updated = campaigns.update(id, { status: "cancelled" });
  if (!updated) { res.status(404).json({ error: "Not found", message: "Campaign not found" }); return; }
  res.json(updated);
});

// POST /api/campaigns/:id/duplicate
router.post("/campaigns/:id/duplicate", requireAuth, (req, res): void => {
  const id = parseId(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid params", message: "id must be a positive integer" }); return; }
  const original = campaigns.findById(id);
  if (!original) { res.status(404).json({ error: "Not found", message: "Campaign not found" }); return; }
  const { id: _id, createdAt: _ca, updatedAt: _ua, ...rest } = original;
  const duplicate = campaigns.insert({ ...rest, name: `${original.name} (copy)`, status: "draft", sentCount: 0, deliveredCount: 0, readCount: 0, failedCount: 0, startedAt: null, completedAt: null });
  res.status(201).json(duplicate);
});

// GET /api/campaigns/:id/analytics
router.get("/campaigns/:id/analytics", requireAuth, (req, res): void => {
  const id = parseId(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid params", message: "id must be a positive integer" }); return; }
  const campaign = campaigns.findById(id);
  if (!campaign) { res.status(404).json({ error: "Not found", message: "Campaign not found" }); return; }
  const { sentCount, deliveredCount, readCount, failedCount } = campaign;
  const deliveryRate = sentCount > 0 ? Math.round((deliveredCount / sentCount) * 100) : 0;
  const readRate = deliveredCount > 0 ? Math.round((readCount / deliveredCount) * 100) : 0;
  const failureRate = sentCount > 0 ? Math.round((failedCount / sentCount) * 100) : 0;
  // Simulated hourly timeline over 24 hours
  const timeline = Array.from({ length: 24 }, (_, h) => ({
    hour: h,
    sent: Math.round((sentCount / 24) * (h + 1)),
    delivered: Math.round((deliveredCount / 24) * (h + 1)),
    read: Math.round((readCount / 24) * (h + 1)),
  }));
  res.json({ campaign, analytics: { sentCount, deliveredCount, readCount, failedCount, deliveryRate, readRate, failureRate, timeline } });
});
