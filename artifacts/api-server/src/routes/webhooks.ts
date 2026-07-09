import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, settingsTable, customersTable, conversationsTable, conversationMessagesTable, activityLogsTable } from "@workspace/db";
import { logger } from "../lib/logger";

const router: IRouter = Router();

async function getVerifyToken(): Promise<string | null> {
  const [row] = await db.select().from(settingsTable).where(eq(settingsTable.key, "whatsapp"));
  if (!row) return null;
  try {
    const settings = JSON.parse(row.value);
    return settings.webhookVerifyToken ?? null;
  } catch {
    return null;
  }
}

router.get("/webhooks/whatsapp", async (req, res): Promise<void> => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode !== "subscribe") {
    res.status(403).json({ error: "Forbidden", message: "Invalid hub.mode" });
    return;
  }

  const verifyToken = await getVerifyToken();
  if (!verifyToken || token !== verifyToken) {
    res.status(403).json({ error: "Forbidden", message: "Verification token mismatch" });
    return;
  }

  res.status(200).send(String(challenge));
});

router.post("/webhooks/whatsapp", async (req, res): Promise<void> => {
  const payload = req.body;

  if (payload.object !== "whatsapp_business_account") {
    res.json({ success: true });
    return;
  }

  try {
    for (const entry of payload.entry ?? []) {
      for (const change of entry.changes ?? []) {
        if (change.field !== "messages") continue;

        const value = change.value;
        for (const message of value.messages ?? []) {
          const phone = message.from;
          const text = message.text?.body ?? message.type ?? "[media]";

          let [customer] = await db.select().from(customersTable).where(eq(customersTable.phone, phone));
          if (!customer) {
            const [newCustomer] = await db.insert(customersTable).values({ name: phone, phone, status: "active" }).returning();
            customer = newCustomer;

            await db.insert(activityLogsTable).values({
              type: "customer_added",
              title: "New customer from WhatsApp",
              description: `New contact ${phone} messaged your business`,
            });
          }

          let [conversation] = await db
            .select()
            .from(conversationsTable)
            .where(eq(conversationsTable.customerId, customer.id));

          if (!conversation) {
            const [newConv] = await db
              .insert(conversationsTable)
              .values({ customerId: customer.id, status: "open", isAiEnabled: true })
              .returning();
            conversation = newConv;

            await db.insert(activityLogsTable).values({
              type: "conversation_opened",
              title: "New conversation",
              description: `New conversation started with ${customer.name}`,
            });
          }

          await db.insert(conversationMessagesTable).values({
            conversationId: conversation.id,
            direction: "inbound",
            type: message.type ?? "text",
            content: text,
            status: "delivered",
            waMessageId: message.id,
          });

          await db
            .update(conversationsTable)
            .set({
              lastMessageAt: new Date(),
              lastMessagePreview: text.slice(0, 100),
              unreadCount: (conversation.unreadCount ?? 0) + 1,
              updatedAt: new Date(),
            })
            .where(eq(conversationsTable.id, conversation.id));

          await db
            .update(customersTable)
            .set({ lastContactedAt: new Date(), updatedAt: new Date() })
            .where(eq(customersTable.id, customer.id));
        }

        for (const status of value.statuses ?? []) {
          const waMessageId = status.id;
          const newStatus = status.status;

          await db
            .update(conversationMessagesTable)
            .set({ status: newStatus })
            .where(eq(conversationMessagesTable.waMessageId, waMessageId));
        }
      }
    }
  } catch (err) {
    logger.error({ err }, "Error processing WhatsApp webhook");
  }

  res.json({ success: true });
});

export default router;
