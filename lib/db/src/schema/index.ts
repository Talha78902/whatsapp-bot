import { pgTable, serial, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";

// ─── Users ──────────────────────────────────────────────────────────────────

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("agent"), // 'admin' | 'agent'
  avatar: text("avatar"),
  refreshToken: text("refresh_token"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type User = typeof usersTable.$inferSelect;
export type InsertUser = typeof usersTable.$inferInsert;

// ─── Customers ──────────────────────────────────────────────────────────────

export const customersTable = pgTable("customers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").notNull().unique(),
  email: text("email"),
  status: text("status").notNull().default("active"), // 'active' | 'inactive' | 'blocked'
  tags: text("tags").array().notNull().default([]),
  notes: text("notes"),
  lastContactedAt: timestamp("last_contacted_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type Customer = typeof customersTable.$inferSelect;
export type InsertCustomer = typeof customersTable.$inferInsert;

// ─── Customer Notes ──────────────────────────────────────────────────────────

export const customerNotesTable = pgTable("customer_notes", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id")
    .notNull()
    .references(() => customersTable.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type CustomerNote = typeof customerNotesTable.$inferSelect;
export type InsertCustomerNote = typeof customerNotesTable.$inferInsert;

// ─── Templates ──────────────────────────────────────────────────────────────

export const templatesTable = pgTable("templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  status: text("status").notNull().default("pending"), // 'pending' | 'approved' | 'rejected'
  body: text("body").notNull(),
  variables: text("variables").array().notNull().default([]),
  language: text("language").notNull().default("en"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type Template = typeof templatesTable.$inferSelect;
export type InsertTemplate = typeof templatesTable.$inferInsert;

// ─── Campaigns ──────────────────────────────────────────────────────────────

export const campaignsTable = pgTable("campaigns", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  status: text("status").notNull().default("draft"), // 'draft' | 'scheduled' | 'running' | 'paused' | 'cancelled' | 'completed'
  templateId: integer("template_id").references(() => templatesTable.id),
  message: text("message"),
  targetAudience: text("target_audience"),
  sentCount: integer("sent_count").notNull().default(0),
  deliveredCount: integer("delivered_count").notNull().default(0),
  readCount: integer("read_count").notNull().default(0),
  failedCount: integer("failed_count").notNull().default(0),
  scheduledAt: timestamp("scheduled_at"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type Campaign = typeof campaignsTable.$inferSelect;
export type InsertCampaign = typeof campaignsTable.$inferInsert;

// ─── Conversations ───────────────────────────────────────────────────────────

export const conversationsTable = pgTable("conversations", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id")
    .notNull()
    .references(() => customersTable.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("open"), // 'open' | 'ai_handled' | 'human_handled' | 'closed'
  isAiEnabled: boolean("is_ai_enabled").notNull().default(true),
  assignedAgentId: integer("assigned_agent_id"),
  lastMessageAt: timestamp("last_message_at"),
  lastMessagePreview: text("last_message_preview"),
  unreadCount: integer("unread_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type Conversation = typeof conversationsTable.$inferSelect;
export type InsertConversation = typeof conversationsTable.$inferInsert;

// ─── Conversation Messages ───────────────────────────────────────────────────

export const conversationMessagesTable = pgTable("conversation_messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id")
    .notNull()
    .references(() => conversationsTable.id, { onDelete: "cascade" }),
  direction: text("direction").notNull(), // 'inbound' | 'outbound'
  type: text("type").notNull().default("text"), // 'text' | 'image' | 'audio' | 'video' | 'document'
  content: text("content").notNull(),
  status: text("status").notNull().default("sent"), // 'sent' | 'delivered' | 'read' | 'failed'
  waMessageId: text("wa_message_id"),
  isAiGenerated: boolean("is_ai_generated").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type ConversationMessage = typeof conversationMessagesTable.$inferSelect;
export type InsertConversationMessage = typeof conversationMessagesTable.$inferInsert;

// ─── Settings ────────────────────────────────────────────────────────────────

export const settingsTable = pgTable("settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
});

export type Setting = typeof settingsTable.$inferSelect;
export type InsertSetting = typeof settingsTable.$inferInsert;

// ─── Activity Logs ───────────────────────────────────────────────────────────

export const activityLogsTable = pgTable("activity_logs", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), // 'customer_added' | 'campaign_scheduled' | 'conversation_opened' | etc.
  title: text("title").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type ActivityLog = typeof activityLogsTable.$inferSelect;
export type InsertActivityLog = typeof activityLogsTable.$inferInsert;
