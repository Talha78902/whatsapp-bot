import { Router, type IRouter } from "express";
import { sql } from "drizzle-orm";
import { db, campaignsTable, conversationMessagesTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/analytics/overview", requireAuth, async (req, res): Promise<void> => {
  const [totalSent] = await db.select({ sum: sql<number>`coalesce(sum(sent_count), 0)::int` }).from(campaignsTable);
  const [totalDelivered] = await db.select({ sum: sql<number>`coalesce(sum(delivered_count), 0)::int` }).from(campaignsTable);
  const [totalRead] = await db.select({ sum: sql<number>`coalesce(sum(read_count), 0)::int` }).from(campaignsTable);
  const [totalFailed] = await db.select({ sum: sql<number>`coalesce(sum(failed_count), 0)::int` }).from(campaignsTable);
  const [totalCampaigns] = await db.select({ count: sql<number>`count(*)::int` }).from(campaignsTable);

  const avgDeliveryRate = totalSent.sum > 0 ? Math.round((totalDelivered.sum / totalSent.sum) * 1000) / 10 : 0;
  const avgReadRate = totalDelivered.sum > 0 ? Math.round((totalRead.sum / totalDelivered.sum) * 1000) / 10 : 0;

  res.json({
    totalMessagesSent: totalSent.sum,
    totalMessagesDelivered: totalDelivered.sum,
    totalMessagesRead: totalRead.sum,
    totalMessagesFailed: totalFailed.sum,
    totalCampaigns: totalCampaigns.count,
    avgDeliveryRate,
    avgReadRate,
  });
});

router.get("/analytics/messages", requireAuth, async (req, res): Promise<void> => {
  const from = req.query.from ? new Date(String(req.query.from)) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const to = req.query.to ? new Date(String(req.query.to)) : new Date();

  const days = Math.min(90, Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)));
  const timeline = [];

  for (let i = 0; i <= days; i++) {
    const date = new Date(from);
    date.setDate(date.getDate() + i);
    date.setHours(0, 0, 0, 0);
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 1);
    const dateStr = date.toISOString().split("T")[0];

    const [sentRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(conversationMessagesTable)
      .where(sql`${conversationMessagesTable.createdAt} >= ${date} AND ${conversationMessagesTable.createdAt} < ${nextDate} AND ${conversationMessagesTable.direction} = 'outbound'`);

    const [deliveredRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(conversationMessagesTable)
      .where(sql`${conversationMessagesTable.createdAt} >= ${date} AND ${conversationMessagesTable.createdAt} < ${nextDate} AND ${conversationMessagesTable.status} = 'delivered'`);

    const [readRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(conversationMessagesTable)
      .where(sql`${conversationMessagesTable.createdAt} >= ${date} AND ${conversationMessagesTable.createdAt} < ${nextDate} AND ${conversationMessagesTable.status} = 'read'`);

    const [failedRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(conversationMessagesTable)
      .where(sql`${conversationMessagesTable.createdAt} >= ${date} AND ${conversationMessagesTable.createdAt} < ${nextDate} AND ${conversationMessagesTable.status} = 'failed'`);

    timeline.push({
      date: dateStr,
      sent: sentRow.count,
      delivered: deliveredRow.count,
      read: readRow.count,
      failed: failedRow.count,
    });
  }

  const [totalSent] = await db.select({ sum: sql<number>`coalesce(sum(sent_count), 0)::int` }).from(campaignsTable);
  const [totalDelivered] = await db.select({ sum: sql<number>`coalesce(sum(delivered_count), 0)::int` }).from(campaignsTable);
  const [totalRead] = await db.select({ sum: sql<number>`coalesce(sum(read_count), 0)::int` }).from(campaignsTable);
  const [totalFailed] = await db.select({ sum: sql<number>`coalesce(sum(failed_count), 0)::int` }).from(campaignsTable);

  res.json({
    timeline,
    deliveryBreakdown: {
      sent: totalSent.sum,
      delivered: totalDelivered.sum,
      read: totalRead.sum,
      failed: totalFailed.sum,
    },
  });
});

router.get("/analytics/campaigns", requireAuth, async (req, res): Promise<void> => {
  const campaigns = await db.select().from(campaignsTable).orderBy(sql`${campaignsTable.sentCount} DESC`).limit(20);

  const serialized = campaigns.map((c) => ({
    id: c.id,
    name: c.name,
    sent: c.sentCount,
    delivered: c.deliveredCount,
    read: c.readCount,
    deliveryRate: c.sentCount > 0 ? Math.round((c.deliveredCount / c.sentCount) * 1000) / 10 : 0,
    readRate: c.deliveredCount > 0 ? Math.round((c.readCount / c.deliveredCount) * 1000) / 10 : 0,
  }));

  const topPerforming = [...serialized].sort((a, b) => b.readRate - a.readRate).slice(0, 5);

  res.json({ campaigns: serialized, topPerforming });
});

export default router;
