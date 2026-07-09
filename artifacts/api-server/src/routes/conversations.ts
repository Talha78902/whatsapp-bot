import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { db, conversationsTable, conversationMessagesTable, customersTable, activityLogsTable } from "@workspace/db";
import {
  GetConversationParams,
  ListConversationMessagesParams,
  SendConversationMessageBody,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/conversations", requireAuth, async (req, res): Promise<void> => {
  const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10));
  const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? "20"), 10)));
  const offset = (page - 1) * limit;
  const status = req.query.status ? String(req.query.status) : null;

  const conditions = [];
  if (status) conditions.push(eq(conversationsTable.status, status));

  const whereClause = conditions.length > 0 ? sql`${conditions.reduce((a, b) => sql`${a} AND ${b}`)}` : undefined;

  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(conversationsTable).where(whereClause);

  const rows = await db
    .select({
      id: conversationsTable.id,
      customerId: conversationsTable.customerId,
      status: conversationsTable.status,
      isAiEnabled: conversationsTable.isAiEnabled,
      assignedAgentId: conversationsTable.assignedAgentId,
      lastMessageAt: conversationsTable.lastMessageAt,
      lastMessagePreview: conversationsTable.lastMessagePreview,
      unreadCount: conversationsTable.unreadCount,
      createdAt: conversationsTable.createdAt,
      updatedAt: conversationsTable.updatedAt,
      customerName: customersTable.name,
      customerPhone: customersTable.phone,
    })
    .from(conversationsTable)
    .leftJoin(customersTable, eq(conversationsTable.customerId, customersTable.id))
    .where(whereClause)
    .orderBy(conversationsTable.lastMessageAt)
    .limit(limit)
    .offset(offset);

  res.json({
    data: rows.map((r) => ({
      ...r,
      customerName: r.customerName ?? "",
      customerPhone: r.customerPhone ?? "",
      lastMessageAt: r.lastMessageAt?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    })),
    total: count,
    page,
    limit,
  });
});

router.get("/conversations/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetConversationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid params", message: params.error.message });
    return;
  }

  const [row] = await db
    .select({
      id: conversationsTable.id,
      customerId: conversationsTable.customerId,
      status: conversationsTable.status,
      isAiEnabled: conversationsTable.isAiEnabled,
      assignedAgentId: conversationsTable.assignedAgentId,
      lastMessageAt: conversationsTable.lastMessageAt,
      lastMessagePreview: conversationsTable.lastMessagePreview,
      unreadCount: conversationsTable.unreadCount,
      createdAt: conversationsTable.createdAt,
      updatedAt: conversationsTable.updatedAt,
      customerName: customersTable.name,
      customerPhone: customersTable.phone,
    })
    .from(conversationsTable)
    .leftJoin(customersTable, eq(conversationsTable.customerId, customersTable.id))
    .where(eq(conversationsTable.id, params.data.id));

  if (!row) {
    res.status(404).json({ error: "Not found", message: "Conversation not found" });
    return;
  }

  res.json({
    ...row,
    customerName: row.customerName ?? "",
    customerPhone: row.customerPhone ?? "",
    lastMessageAt: row.lastMessageAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  });
});

router.get("/conversations/:id/messages", requireAuth, async (req, res): Promise<void> => {
  const params = ListConversationMessagesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid params", message: params.error.message });
    return;
  }

  const messages = await db
    .select()
    .from(conversationMessagesTable)
    .where(eq(conversationMessagesTable.conversationId, params.data.id))
    .orderBy(conversationMessagesTable.createdAt);

  res.json(messages.map((m) => ({ ...m, createdAt: m.createdAt.toISOString() })));
});

function parseIdParam(raw: string | string[]): number | null {
  const str = Array.isArray(raw) ? raw[0] : raw;
  const id = parseInt(str, 10);
  return Number.isFinite(id) && id > 0 ? id : null;
}

router.post("/conversations/:id/messages", requireAuth, async (req, res): Promise<void> => {
  const id = parseIdParam(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid params", message: "id must be a positive integer" }); return; }

  // Verify conversation exists before inserting (avoids FK error as an uncontrolled 500)
  const [conv] = await db.select({ id: conversationsTable.id }).from(conversationsTable).where(eq(conversationsTable.id, id));
  if (!conv) {
    res.status(404).json({ error: "Not found", message: "Conversation not found" });
    return;
  }

  const parsed = SendConversationMessageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", message: parsed.error.message });
    return;
  }

  const [message] = await db
    .insert(conversationMessagesTable)
    .values({
      conversationId: id,
      direction: "outbound",
      type: parsed.data.type,
      content: parsed.data.content,
      status: "sent",
      isAiGenerated: false,
    })
    .returning();

  await db
    .update(conversationsTable)
    .set({ lastMessageAt: new Date(), lastMessagePreview: parsed.data.content.slice(0, 100), updatedAt: new Date() })
    .where(eq(conversationsTable.id, id));

  res.status(201).json({ ...message, createdAt: message.createdAt.toISOString() });
});

router.post("/conversations/:id/handoff", requireAuth, async (req, res): Promise<void> => {
  const id = parseIdParam(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid params", message: "id must be a positive integer" }); return; }

  const [conversation] = await db
    .update(conversationsTable)
    .set({ status: "human_handled", isAiEnabled: false, assignedAgentId: req.user!.userId, updatedAt: new Date() })
    .where(eq(conversationsTable.id, id))
    .returning();

  if (!conversation) {
    res.status(404).json({ error: "Not found", message: "Conversation not found" });
    return;
  }

  await db.insert(activityLogsTable).values({
    type: "conversation_opened",
    title: "Conversation handed off to human",
    description: `Conversation #${id} was taken over by an agent`,
  });

  const [row] = await db
    .select({
      id: conversationsTable.id,
      customerId: conversationsTable.customerId,
      status: conversationsTable.status,
      isAiEnabled: conversationsTable.isAiEnabled,
      assignedAgentId: conversationsTable.assignedAgentId,
      lastMessageAt: conversationsTable.lastMessageAt,
      lastMessagePreview: conversationsTable.lastMessagePreview,
      unreadCount: conversationsTable.unreadCount,
      createdAt: conversationsTable.createdAt,
      updatedAt: conversationsTable.updatedAt,
      customerName: customersTable.name,
      customerPhone: customersTable.phone,
    })
    .from(conversationsTable)
    .leftJoin(customersTable, eq(conversationsTable.customerId, customersTable.id))
    .where(eq(conversationsTable.id, id));

  res.json({
    ...row!,
    customerName: row!.customerName ?? "",
    customerPhone: row!.customerPhone ?? "",
    lastMessageAt: row!.lastMessageAt?.toISOString() ?? null,
    createdAt: row!.createdAt.toISOString(),
    updatedAt: row!.updatedAt.toISOString(),
  });
});

router.post("/conversations/:id/close", requireAuth, async (req, res): Promise<void> => {
  const id = parseIdParam(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid params", message: "id must be a positive integer" }); return; }

  const [conversation] = await db
    .update(conversationsTable)
    .set({ status: "closed", updatedAt: new Date() })
    .where(eq(conversationsTable.id, id))
    .returning();

  if (!conversation) {
    res.status(404).json({ error: "Not found", message: "Conversation not found" });
    return;
  }

  const [row] = await db
    .select({
      id: conversationsTable.id,
      customerId: conversationsTable.customerId,
      status: conversationsTable.status,
      isAiEnabled: conversationsTable.isAiEnabled,
      assignedAgentId: conversationsTable.assignedAgentId,
      lastMessageAt: conversationsTable.lastMessageAt,
      lastMessagePreview: conversationsTable.lastMessagePreview,
      unreadCount: conversationsTable.unreadCount,
      createdAt: conversationsTable.createdAt,
      updatedAt: conversationsTable.updatedAt,
      customerName: customersTable.name,
      customerPhone: customersTable.phone,
    })
    .from(conversationsTable)
    .leftJoin(customersTable, eq(conversationsTable.customerId, customersTable.id))
    .where(eq(conversationsTable.id, id));

  res.json({
    ...row!,
    customerName: row!.customerName ?? "",
    customerPhone: row!.customerPhone ?? "",
    lastMessageAt: row!.lastMessageAt?.toISOString() ?? null,
    createdAt: row!.createdAt.toISOString(),
    updatedAt: row!.updatedAt.toISOString(),
  });
});

export default router;
