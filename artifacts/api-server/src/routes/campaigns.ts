import { Router, type IRouter } from "express";
import { eq, ilike, sql } from "drizzle-orm";
import { db, campaignsTable, activityLogsTable } from "@workspace/db";
import {
  CreateCampaignBody,
  UpdateCampaignBody,
  GetCampaignParams,
  UpdateCampaignParams,
  DeleteCampaignParams,
  ScheduleCampaignParams,
  ScheduleCampaignBody,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/campaigns", requireAuth, async (req, res): Promise<void> => {
  const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10));
  const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? "20"), 10)));
  const offset = (page - 1) * limit;
  const search = req.query.search ? String(req.query.search) : null;
  const status = req.query.status ? String(req.query.status) : null;

  const conditions = [];
  if (search) conditions.push(ilike(campaignsTable.name, `%${search}%`));
  if (status) conditions.push(eq(campaignsTable.status, status));

  const whereClause = conditions.length > 0 ? sql`${conditions.reduce((a, b) => sql`${a} AND ${b}`)}` : undefined;

  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(campaignsTable).where(whereClause);

  const campaigns = await db
    .select()
    .from(campaignsTable)
    .where(whereClause)
    .orderBy(campaignsTable.createdAt)
    .limit(limit)
    .offset(offset);

  res.json({
    data: campaigns.map(serializeCampaign),
    total: count,
    page,
    limit,
  });
});

router.post("/campaigns", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateCampaignBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", message: parsed.error.message });
    return;
  }

  const [campaign] = await db.insert(campaignsTable).values(parsed.data).returning();
  res.status(201).json(serializeCampaign(campaign));
});

router.get("/campaigns/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetCampaignParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid params", message: params.error.message });
    return;
  }

  const [campaign] = await db.select().from(campaignsTable).where(eq(campaignsTable.id, params.data.id));
  if (!campaign) {
    res.status(404).json({ error: "Not found", message: "Campaign not found" });
    return;
  }

  res.json(serializeCampaign(campaign));
});

router.put("/campaigns/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateCampaignParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid params", message: params.error.message });
    return;
  }

  const parsed = UpdateCampaignBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", message: parsed.error.message });
    return;
  }

  const [campaign] = await db
    .update(campaignsTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(campaignsTable.id, params.data.id))
    .returning();

  if (!campaign) {
    res.status(404).json({ error: "Not found", message: "Campaign not found" });
    return;
  }

  res.json(serializeCampaign(campaign));
});

router.delete("/campaigns/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteCampaignParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid params", message: params.error.message });
    return;
  }

  const [deleted] = await db.delete(campaignsTable).where(eq(campaignsTable.id, params.data.id)).returning();
  if (!deleted) {
    res.status(404).json({ error: "Not found", message: "Campaign not found" });
    return;
  }

  res.json({ success: true, message: "Campaign deleted" });
});

router.post("/campaigns/:id/schedule", requireAuth, async (req, res): Promise<void> => {
  const params = ScheduleCampaignParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid params", message: params.error.message });
    return;
  }

  const parsed = ScheduleCampaignBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", message: parsed.error.message });
    return;
  }

  const status = parsed.data.sendNow ? "running" : "scheduled";
  const scheduledAt = new Date(parsed.data.scheduledAt);
  if (isNaN(scheduledAt.getTime())) {
    res.status(400).json({ error: "Invalid input", message: "scheduledAt must be a valid ISO date string" });
    return;
  }

  const [campaign] = await db
    .update(campaignsTable)
    .set({ status, scheduledAt, startedAt: parsed.data.sendNow ? new Date() : null, updatedAt: new Date() })
    .where(eq(campaignsTable.id, params.data.id))
    .returning();

  if (!campaign) {
    res.status(404).json({ error: "Not found", message: "Campaign not found" });
    return;
  }

  await db.insert(activityLogsTable).values({
    type: "campaign_scheduled",
    title: "Campaign scheduled",
    description: `Campaign "${campaign.name}" was ${status === "running" ? "launched" : "scheduled"}`,
  });

  res.json(serializeCampaign(campaign));
});

function parseIdParam(raw: string | string[]): number | null {
  const str = Array.isArray(raw) ? raw[0] : raw;
  const id = parseInt(str, 10);
  return Number.isFinite(id) && id > 0 ? id : null;
}

router.post("/campaigns/:id/pause", requireAuth, async (req, res): Promise<void> => {
  const id = parseIdParam(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid params", message: "id must be a positive integer" }); return; }

  const [campaign] = await db.update(campaignsTable).set({ status: "paused", updatedAt: new Date() }).where(eq(campaignsTable.id, id)).returning();
  if (!campaign) {
    res.status(404).json({ error: "Not found", message: "Campaign not found" });
    return;
  }
  res.json(serializeCampaign(campaign));
});

router.post("/campaigns/:id/resume", requireAuth, async (req, res): Promise<void> => {
  const id = parseIdParam(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid params", message: "id must be a positive integer" }); return; }

  const [campaign] = await db.update(campaignsTable).set({ status: "running", updatedAt: new Date() }).where(eq(campaignsTable.id, id)).returning();
  if (!campaign) {
    res.status(404).json({ error: "Not found", message: "Campaign not found" });
    return;
  }
  res.json(serializeCampaign(campaign));
});

router.post("/campaigns/:id/cancel", requireAuth, async (req, res): Promise<void> => {
  const id = parseIdParam(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid params", message: "id must be a positive integer" }); return; }

  const [campaign] = await db.update(campaignsTable).set({ status: "cancelled", updatedAt: new Date() }).where(eq(campaignsTable.id, id)).returning();
  if (!campaign) {
    res.status(404).json({ error: "Not found", message: "Campaign not found" });
    return;
  }
  res.json(serializeCampaign(campaign));
});

router.post("/campaigns/:id/duplicate", requireAuth, async (req, res): Promise<void> => {
  const id = parseIdParam(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid params", message: "id must be a positive integer" }); return; }

  const [original] = await db.select().from(campaignsTable).where(eq(campaignsTable.id, id));
  if (!original) {
    res.status(404).json({ error: "Not found", message: "Campaign not found" });
    return;
  }

  const { id: _id, createdAt: _ca, updatedAt: _ua, scheduledAt: _sa, startedAt: _st, completedAt: _co, ...rest } = original;
  const [duplicate] = await db
    .insert(campaignsTable)
    .values({ ...rest, name: `${original.name} (copy)`, status: "draft", sentCount: 0, deliveredCount: 0, readCount: 0, failedCount: 0 })
    .returning();

  res.status(201).json(serializeCampaign(duplicate));
});

router.get("/campaigns/:id/analytics", requireAuth, async (req, res): Promise<void> => {
  const id = parseIdParam(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid params", message: "id must be a positive integer" }); return; }

  const [campaign] = await db.select().from(campaignsTable).where(eq(campaignsTable.id, id!));
  if (!campaign) {
    res.status(404).json({ error: "Not found", message: "Campaign not found" });
    return;
  }

  const deliveryRate = campaign.sentCount > 0 ? (campaign.deliveredCount / campaign.sentCount) * 100 : 0;
  const readRate = campaign.deliveredCount > 0 ? (campaign.readCount / campaign.deliveredCount) * 100 : 0;

  const timeline = Array.from({ length: 6 }, (_, i) => {
    const hour = i * 2;
    const progress = Math.min(1, i / 5);
    return {
      time: `${String(hour).padStart(2, "0")}:00`,
      sent: Math.round(campaign.sentCount * progress),
      delivered: Math.round(campaign.deliveredCount * progress),
      read: Math.round(campaign.readCount * progress),
    };
  });

  res.json({
    campaignId: id,
    sent: campaign.sentCount,
    delivered: campaign.deliveredCount,
    read: campaign.readCount,
    failed: campaign.failedCount,
    deliveryRate: Math.round(deliveryRate * 10) / 10,
    readRate: Math.round(readRate * 10) / 10,
    timeline,
  });
});

function serializeCampaign(c: typeof campaignsTable.$inferSelect) {
  return {
    ...c,
    scheduledAt: c.scheduledAt?.toISOString() ?? null,
    startedAt: c.startedAt?.toISOString() ?? null,
    completedAt: c.completedAt?.toISOString() ?? null,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  };
}

export default router;
