import { Router } from "express";
import { dashboard, activityLogs, conversationMessages, campaigns } from "../lib/store.js";
import { requireAuth } from "../middlewares/auth.js";

export const router = Router();

// GET /api/dashboard/kpis
router.get("/dashboard/kpis", requireAuth, (_req, res): void => {
  res.json(dashboard.kpis());
});

// GET /api/dashboard/activity
router.get("/dashboard/activity", requireAuth, (req, res): void => {
  const { limit } = req.query as Record<string, string>;
  res.json(activityLogs.findRecent(limit ? parseInt(limit, 10) : 20));
});

// GET /api/dashboard/message-stats
router.get("/dashboard/message-stats", requireAuth, (_req, res): void => {
  res.json(conversationMessages.stats());
});

// GET /api/dashboard/campaign-status
router.get("/dashboard/campaign-status", requireAuth, (_req, res): void => {
  res.json(dashboard.campaignStatusBreakdown());
});

// GET /api/dashboard/recent-campaigns
router.get("/dashboard/recent-campaigns", requireAuth, (req, res): void => {
  const { limit } = req.query as Record<string, string>;
  const n = limit ? parseInt(limit, 10) : 5;
  const result = campaigns.findAll({ limit: n });
  res.json(result.data);
});
