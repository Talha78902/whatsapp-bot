import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { db, customersTable, campaignsTable, conversationsTable, conversationMessagesTable, activityLogsTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/dashboard/kpis", requireAuth, async (req, res): Promise<void> => {
  const [totalCustomers] = await db.select({ count: sql<number>`count(*)::int` }).from(customersTable);
  const [totalCampaigns] = await db.select({ count: sql<number>`count(*)::int` }).from(campaignsTable);
  const [activeConversations] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(conversationsTable)
    .where(sql`${conversationsTable.status} IN ('open', 'ai_handled', 'human_handled')`);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [messagesSentToday] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(conversationMessagesTable)
    .where(sql`${conversationMessagesTable.createdAt} >= ${today} AND ${conversationMessagesTable.direction} = 'outbound'`);

  const [totalSent] = await db.select({ sum: sql<number>`coalesce(sum(sent_count), 0)::int` }).from(campaignsTable);
  const [totalDelivered] = await db.select({ sum: sql<number>`coalesce(sum(delivered_count), 0)::int` }).from(campaignsTable);
  const [totalRead] = await db.select({ sum: sql<number>`coalesce(sum(read_count), 0)::int` }).from(campaignsTable);

  const deliveryRate = totalSent.sum > 0 ? Math.round((totalDelivered.sum / totalSent.sum) * 1000) / 10 : 0;
  const readRate = totalDelivered.sum > 0 ? Math.round((totalRead.sum / totalDelivered.sum) * 1000) / 10 : 0;

  const [campaignsThisMonth] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(campaignsTable)
    .where(sql`${campaignsTable.createdAt} >= date_trunc('month', now())`);

  const [newCustomersThisMonth] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(customersTable)
    .where(sql`${customersTable.createdAt} >= date_trunc('month', now())`);

  res.json({
    totalCustomers: totalCustomers.count,
    totalCampaigns: totalCampaigns.count,
    messagesSentToday: messagesSentToday.count,
    activeConversations: activeConversations.count,
    deliveryRate,
    readRate,
    campaignsThisMonth: campaignsThisMonth.count,
    newCustomersThisMonth: newCustomersThisMonth.count,
  });
});

router.get("/dashboard/activity", requireAuth, async (req, res): Promise<void> => {
  const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit ?? "10"), 10)));

  const activities = await db
    .select()
    .from(activityLogsTable)
    .orderBy(sql`${activityLogsTable.createdAt} DESC`)
    .limit(limit);

  res.json(activities.map((a) => ({ ...a, createdAt: a.createdAt.toISOString() })));
});

router.get("/dashboard/message-stats", requireAuth, async (req, res): Promise<void> => {
  const stats = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
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

    stats.push({
      date: dateStr,
      sent: sentRow.count,
      delivered: deliveredRow.count,
      read: readRow.count,
      failed: failedRow.count,
    });
  }

  res.json(stats);
});

router.get("/dashboard/campaign-status", requireAuth, async (req, res): Promise<void> => {
  const rows = await db
    .select({
      status: campaignsTable.status,
      count: sql<number>`count(*)::int`,
    })
    .from(campaignsTable)
    .groupBy(campaignsTable.status);

  res.json(rows);
});

void eq; // suppress unused import

export default router;
