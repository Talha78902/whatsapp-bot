import { Router } from "express";
import { conversations, conversationMessages, settings, customers } from "../lib/store.js";
import { requireAuth } from "../middlewares/auth.js";
import { getWhatsAppConfig, sendTextMessage } from "../lib/whatsapp.js";

export const router = Router();

function parseId(raw: string | string[]): number | null {
  const str = Array.isArray(raw) ? raw[0] : raw;
  const id = parseInt(str, 10);
  return Number.isFinite(id) && id > 0 ? id : null;
}

// GET /api/conversations
router.get("/conversations", requireAuth, (req, res): void => {
  const { status, search, page, limit } = req.query as Record<string, string>;
  res.json(conversations.findAll({ status, search, page: page ? parseInt(page, 10) : 1, limit: limit ? parseInt(limit, 10) : 20 }));
});

// GET /api/conversations/:id
router.get("/conversations/:id", requireAuth, (req, res): void => {
  const id = parseId(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid params", message: "id must be a positive integer" }); return; }
  const conv = conversations.findById(id);
  if (!conv) { res.status(404).json({ error: "Not found", message: "Conversation not found" }); return; }
  const messages = conversationMessages.findByConversation(id);
  res.json({ ...conv, messages });
});

// POST /api/conversations
router.post("/conversations", requireAuth, (req, res): void => {
  const { customerId } = req.body as { customerId?: number };
  if (!customerId) { res.status(400).json({ error: "Invalid input", message: "customerId is required" }); return; }
  const conv = conversations.insert({ customerId, status: "open", assignedTo: req.auth!.userId, lastMessageAt: null, lastMessagePreview: null });
  res.status(201).json(conv);
});

// GET /api/conversations/:id/messages
router.get("/conversations/:id/messages", requireAuth, (req, res): void => {
  const id = parseId(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid params", message: "id must be a positive integer" }); return; }
  res.json(conversationMessages.findByConversation(id));
});

// POST /api/conversations/:id/messages
router.post("/conversations/:id/messages", requireAuth, async (req, res): Promise<void> => {
  const id = parseId(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid params", message: "id must be a positive integer" }); return; }
  const conv = conversations.findById(id);
  if (!conv) { res.status(404).json({ error: "Not found", message: "Conversation not found" }); return; }
  const { type, content } = req.body as { type?: string; content?: string };
  if (!content) { res.status(400).json({ error: "Invalid input", message: "content is required" }); return; }

  const waConfig = getWhatsAppConfig(settings);
  const cust = customers.findById(conv.customerId);

  let waMessageId: string | null = null;
  if (waConfig && cust?.phone) {
    const result = await sendTextMessage({ to: cust.phone, text: content, config: waConfig });
    if ("waMessageId" in result) {
      waMessageId = result.waMessageId;
    }
  }

  const message = conversationMessages.insert({
    conversationId: id,
    direction: "outbound",
    type: type ?? "text",
    content,
    status: waMessageId ? "sent" : "failed",
    waMessageId,
    isAiGenerated: false,
  });
  conversations.update(id, { lastMessageAt: new Date().toISOString(), lastMessagePreview: content.slice(0, 100) });
  res.status(201).json(message);
});

// POST /api/conversations/:id/handoff
router.post("/conversations/:id/handoff", requireAuth, (req, res): void => {
  const id = parseId(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid params", message: "id must be a positive integer" }); return; }
  const { assignedTo } = req.body as { assignedTo?: number };
  const updated = conversations.update(id, { assignedTo: assignedTo ?? req.auth!.userId });
  if (!updated) { res.status(404).json({ error: "Not found", message: "Conversation not found" }); return; }
  res.json(updated);
});

// POST /api/conversations/:id/close
router.post("/conversations/:id/close", requireAuth, (req, res): void => {
  const id = parseId(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid params", message: "id must be a positive integer" }); return; }
  const updated = conversations.update(id, { status: "closed" });
  if (!updated) { res.status(404).json({ error: "Not found", message: "Conversation not found" }); return; }
  res.json(updated);
});
