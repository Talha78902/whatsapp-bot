import { Router } from "express";
import { campaigns, conversationMessages, customers } from "../lib/store.js";
import { requireAuth } from "../middlewares/auth.js";

export const router = Router();

// GET /api/analytics/overview
router.get("/analytics/overview", requireAuth, (_req, res): void => {
  const allCampaigns = campaigns.findAll({ limit: 9999 }).data;
  const totalSent = allCampaigns.reduce((s, c) => s + c.sentCount, 0);
  const totalDelivered = allCampaigns.reduce((s, c) => s + c.deliveredCount, 0);
  const totalRead = allCampaigns.reduce((s, c) => s + c.readCount, 0);
  const totalFailed = allCampaigns.reduce((s, c) => s + c.failedCount, 0);
  const deliveryRate = totalSent > 0 ? Math.round((totalDelivered / totalSent) * 100) : 0;
  const readRate = totalDelivered > 0 ? Math.round((totalRead / totalDelivered) * 100) : 0;
  const totalCustomers = customers.stats().total;
  const msgStats = conversationMessages.stats();
  res.json({ totalSent, totalDelivered, totalRead, totalFailed, deliveryRate, readRate, totalCustomers, totalMessages: msgStats.total });
});

// GET /api/analytics/message-timeline
router.get("/analytics/message-timeline", requireAuth, (_req, res): void => {
  const { timeline } = conversationMessages.stats();
  res.json(timeline);
});

// GET /api/analytics/top-campaigns
router.get("/analytics/top-campaigns", requireAuth, (req, res): void => {
  const { limit } = req.query as Record<string, string>;
  const n = limit ? parseInt(limit, 10) : 5;
  const all = campaigns.findAll({ limit: 9999 }).data;
  const top = [...all]
    .sort((a, b) => b.sentCount - a.sentCount)
    .slice(0, n)
    .map((c) => ({
      id: c.id,
      name: c.name,
      status: c.status,
      sentCount: c.sentCount,
      deliveredCount: c.deliveredCount,
      readCount: c.readCount,
      deliveryRate: c.sentCount > 0 ? Math.round((c.deliveredCount / c.sentCount) * 100) : 0,
    }));
  res.json(top);
});
