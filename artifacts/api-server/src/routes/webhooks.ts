import { Router } from "express";
import { settings, customers, conversations, conversationMessages } from "../lib/store.js";

export const router = Router();

// GET /api/webhooks/whatsapp — Meta webhook verification
router.get("/webhooks/whatsapp", (req, res): void => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  const waSettings = settings.getJson<{ webhookVerifyToken?: string }>("whatsapp");
  const verifyToken = waSettings?.webhookVerifyToken ?? process.env.WA_VERIFY_TOKEN ?? "";
  if (mode === "subscribe" && token === verifyToken) {
    res.status(200).send(challenge);
  } else {
    res.status(403).json({ error: "Forbidden", message: "Invalid verify token" });
  }
});

// POST /api/webhooks/whatsapp — inbound messages from Meta
router.post("/webhooks/whatsapp", (req, res): void => {
  // Acknowledge immediately — Meta requires a 200 within a few seconds
  res.sendStatus(200);

  try {
    const body = req.body as Record<string, unknown>;
    const entries = (body.entry as Array<Record<string, unknown>>) ?? [];
    for (const entry of entries) {
      const changes = (entry.changes as Array<Record<string, unknown>>) ?? [];
      for (const change of changes) {
        const value = change.value as Record<string, unknown>;
        const messages = (value.messages as Array<Record<string, unknown>>) ?? [];
        for (const msg of messages) {
          const from = String(msg.from ?? "");
          const waMessageId = String(msg.id ?? "");
          const type = String(msg.type ?? "text");
          const text = (msg.text as Record<string, string>)?.body ?? "";

          if (!from) continue;

          // Find or create customer by phone
          let customer = customers.findByPhone(from);
          if (!customer) {
            const contacts = (value.contacts as Array<Record<string, unknown>>) ?? [];
            const name = (contacts[0]?.profile as Record<string, string>)?.name ?? from;
            customer = customers.insert({ name, phone: from, email: null, tags: [], status: "active", assignedTo: null, waId: from });
          }

          // Find or create open conversation
          let conv = conversations.findByCustomerId(customer.id);
          if (!conv) {
            conv = conversations.insert({ customerId: customer.id, status: "open", assignedTo: null, lastMessageAt: new Date().toISOString(), lastMessagePreview: text.slice(0, 100) });
          } else {
            conversations.update(conv.id, { lastMessageAt: new Date().toISOString(), lastMessagePreview: text.slice(0, 100) });
          }

          // Store the message
          conversationMessages.insert({
            conversationId: conv.id,
            direction: "inbound",
            type,
            content: text,
            status: "received",
            waMessageId,
            isAiGenerated: false,
          });
        }
      }
    }
  } catch {
    // swallow — we already sent 200
  }
});
