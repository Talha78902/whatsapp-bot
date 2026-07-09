/**
 * Local JSON file-based store — no database required.
 * All data is persisted to ./data/*.json files on disk.
 * Data is loaded into memory at startup and written back after every mutation.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// On Vercel the working directory is read-only; /tmp is always writable.
// Locally it writes to <repo-root>/data/
const DATA_DIR =
  process.env.DATA_DIR ??
  (process.env.VERCEL ? "/tmp" : path.resolve(__dirname, "../../data"));

// ─── Types ────────────────────────────────────────────────────────────────────

export interface User {
  id: number;
  email: string;
  password: string;
  name: string;
  role: "admin" | "agent";
  avatar?: string | null;
  refreshToken?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Customer {
  id: number;
  name: string;
  phone: string;
  email?: string | null;
  tags: string[];
  status: "active" | "inactive" | "blocked";
  assignedTo?: number | null;
  waId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerNote {
  id: number;
  customerId: number;
  content: string;
  createdBy?: number | null;
  createdAt: string;
}

export interface Template {
  id: number;
  name: string;
  category: string;
  status: "approved" | "pending" | "rejected";
  body: string;
  variables: string[];
  language: string;
  createdAt: string;
  updatedAt: string;
}

export interface Campaign {
  id: number;
  name: string;
  templateId?: number | null;
  targetAudience: string[];
  status: "draft" | "scheduled" | "running" | "completed" | "paused" | "cancelled";
  scheduledAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  sentCount: number;
  deliveredCount: number;
  readCount: number;
  failedCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Conversation {
  id: number;
  customerId: number;
  status: "open" | "closed" | "pending";
  assignedTo?: number | null;
  lastMessageAt?: string | null;
  lastMessagePreview?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationMessage {
  id: number;
  conversationId: number;
  direction: "inbound" | "outbound";
  type: string;
  content: string;
  status: string;
  waMessageId?: string | null;
  isAiGenerated: boolean;
  createdAt: string;
}

export interface Setting {
  id: number;
  key: string;
  value: string;
  updatedAt: string;
}

export interface ActivityLog {
  id: number;
  userId?: number | null;
  action: string;
  entity: string;
  entityId?: number | null;
  metadata?: string | null;
  createdAt: string;
}

interface StoreData {
  users: User[];
  customers: Customer[];
  customerNotes: CustomerNote[];
  templates: Template[];
  campaigns: Campaign[];
  conversations: Conversation[];
  conversationMessages: ConversationMessage[];
  settings: Setting[];
  activityLogs: ActivityLog[];
  _sequences: Record<string, number>;
}

// ─── Persistence ──────────────────────────────────────────────────────────────

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

const STORE_FILE = path.join(DATA_DIR, "store.json");

function loadStore(): StoreData {
  ensureDataDir();
  if (fs.existsSync(STORE_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(STORE_FILE, "utf-8")) as StoreData;
    } catch {
      // corrupt file — start fresh
    }
  }
  return {
    users: [],
    customers: [],
    customerNotes: [],
    templates: [],
    campaigns: [],
    conversations: [],
    conversationMessages: [],
    settings: [],
    activityLogs: [],
    _sequences: {},
  };
}

let _store: StoreData = loadStore();

function save() {
  ensureDataDir();
  fs.writeFileSync(STORE_FILE, JSON.stringify(_store, null, 2), "utf-8");
}

// ─── Sequence / Auto-increment ────────────────────────────────────────────────

function nextId(collection: keyof Omit<StoreData, "_sequences">): number {
  const current = _store._sequences[collection] ?? 0;
  const next = current + 1;
  _store._sequences[collection] = next;
  return next;
}

// ─── Generic helpers ──────────────────────────────────────────────────────────

function now() {
  return new Date().toISOString();
}

// ─── Users ────────────────────────────────────────────────────────────────────

export const users = {
  findAll(): User[] {
    return _store.users;
  },
  findById(id: number): User | undefined {
    return _store.users.find((u) => u.id === id);
  },
  findByEmail(email: string): User | undefined {
    return _store.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  },
  insert(data: Omit<User, "id" | "createdAt" | "updatedAt">): User {
    const record: User = { ...data, id: nextId("users"), createdAt: now(), updatedAt: now() };
    _store.users.push(record);
    save();
    return record;
  },
  update(id: number, data: Partial<Omit<User, "id" | "createdAt">>): User | undefined {
    const idx = _store.users.findIndex((u) => u.id === id);
    if (idx === -1) return undefined;
    _store.users[idx] = { ..._store.users[idx], ...data, updatedAt: now() };
    save();
    return _store.users[idx];
  },
};

// ─── Customers ────────────────────────────────────────────────────────────────

export const customers = {
  findAll(opts?: { search?: string; status?: string; tags?: string[]; page?: number; limit?: number }) {
    let list = [..._store.customers];
    if (opts?.search) {
      const q = opts.search.toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.phone.includes(q) ||
          (c.email ?? "").toLowerCase().includes(q)
      );
    }
    if (opts?.status) list = list.filter((c) => c.status === opts.status);
    if (opts?.tags?.length) list = list.filter((c) => opts.tags!.every((t) => c.tags.includes(t)));
    const total = list.length;
    const page = opts?.page ?? 1;
    const limit = opts?.limit ?? 20;
    const data = list.slice((page - 1) * limit, page * limit);
    return { data, total, page, limit };
  },
  findById(id: number): Customer | undefined {
    return _store.customers.find((c) => c.id === id);
  },
  findByPhone(phone: string): Customer | undefined {
    return _store.customers.find((c) => c.phone === phone);
  },
  insert(data: Omit<Customer, "id" | "createdAt" | "updatedAt">): Customer {
    const record: Customer = { ...data, id: nextId("customers"), createdAt: now(), updatedAt: now() };
    _store.customers.push(record);
    save();
    return record;
  },
  update(id: number, data: Partial<Omit<Customer, "id" | "createdAt">>): Customer | undefined {
    const idx = _store.customers.findIndex((c) => c.id === id);
    if (idx === -1) return undefined;
    _store.customers[idx] = { ..._store.customers[idx], ...data, updatedAt: now() };
    save();
    return _store.customers[idx];
  },
  delete(id: number): Customer | undefined {
    const idx = _store.customers.findIndex((c) => c.id === id);
    if (idx === -1) return undefined;
    const [removed] = _store.customers.splice(idx, 1);
    save();
    return removed;
  },
  stats() {
    const all = _store.customers;
    const total = all.length;
    const active = all.filter((c) => c.status === "active").length;
    const inactive = all.filter((c) => c.status === "inactive").length;
    const blocked = all.filter((c) => c.status === "blocked").length;
    // monthly growth — count by month for last 6 months
    const now = new Date();
    const monthly: { month: string; count: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toISOString().slice(0, 7);
      const count = all.filter((c) => c.createdAt.startsWith(label)).length;
      monthly.push({ month: label, count });
    }
    return { total, active, inactive, blocked, monthly };
  },
};

// ─── Customer Notes ───────────────────────────────────────────────────────────

export const customerNotes = {
  findByCustomer(customerId: number): CustomerNote[] {
    return _store.customerNotes.filter((n) => n.customerId === customerId);
  },
  insert(data: Omit<CustomerNote, "id" | "createdAt">): CustomerNote {
    const record: CustomerNote = { ...data, id: nextId("customerNotes"), createdAt: now() };
    _store.customerNotes.push(record);
    save();
    return record;
  },
  delete(id: number): CustomerNote | undefined {
    const idx = _store.customerNotes.findIndex((n) => n.id === id);
    if (idx === -1) return undefined;
    const [removed] = _store.customerNotes.splice(idx, 1);
    save();
    return removed;
  },
};

// ─── Templates ────────────────────────────────────────────────────────────────

export const templates = {
  findAll(opts?: { search?: string; category?: string; status?: string }) {
    let list = [..._store.templates];
    if (opts?.search) {
      const q = opts.search.toLowerCase();
      list = list.filter((t) => t.name.toLowerCase().includes(q) || t.body.toLowerCase().includes(q));
    }
    if (opts?.category) list = list.filter((t) => t.category === opts.category);
    if (opts?.status) list = list.filter((t) => t.status === opts.status);
    return list;
  },
  findById(id: number): Template | undefined {
    return _store.templates.find((t) => t.id === id);
  },
  insert(data: Omit<Template, "id" | "createdAt" | "updatedAt">): Template {
    const record: Template = { ...data, id: nextId("templates"), createdAt: now(), updatedAt: now() };
    _store.templates.push(record);
    save();
    return record;
  },
  update(id: number, data: Partial<Omit<Template, "id" | "createdAt">>): Template | undefined {
    const idx = _store.templates.findIndex((t) => t.id === id);
    if (idx === -1) return undefined;
    _store.templates[idx] = { ..._store.templates[idx], ...data, updatedAt: now() };
    save();
    return _store.templates[idx];
  },
  delete(id: number): Template | undefined {
    const idx = _store.templates.findIndex((t) => t.id === id);
    if (idx === -1) return undefined;
    const [removed] = _store.templates.splice(idx, 1);
    save();
    return removed;
  },
};

// ─── Campaigns ────────────────────────────────────────────────────────────────

export const campaigns = {
  findAll(opts?: { status?: string; search?: string; page?: number; limit?: number }) {
    let list = [..._store.campaigns];
    if (opts?.search) {
      const q = opts.search.toLowerCase();
      list = list.filter((c) => c.name.toLowerCase().includes(q));
    }
    if (opts?.status) list = list.filter((c) => c.status === opts.status);
    const total = list.length;
    const page = opts?.page ?? 1;
    const limit = opts?.limit ?? 20;
    const data = list.slice((page - 1) * limit, page * limit);
    return { data, total, page, limit };
  },
  findById(id: number): Campaign | undefined {
    return _store.campaigns.find((c) => c.id === id);
  },
  insert(data: Omit<Campaign, "id" | "createdAt" | "updatedAt">): Campaign {
    const record: Campaign = { ...data, id: nextId("campaigns"), createdAt: now(), updatedAt: now() };
    _store.campaigns.push(record);
    save();
    return record;
  },
  update(id: number, data: Partial<Omit<Campaign, "id" | "createdAt">>): Campaign | undefined {
    const idx = _store.campaigns.findIndex((c) => c.id === id);
    if (idx === -1) return undefined;
    _store.campaigns[idx] = { ..._store.campaigns[idx], ...data, updatedAt: now() };
    save();
    return _store.campaigns[idx];
  },
  delete(id: number): Campaign | undefined {
    const idx = _store.campaigns.findIndex((c) => c.id === id);
    if (idx === -1) return undefined;
    const [removed] = _store.campaigns.splice(idx, 1);
    save();
    return removed;
  },
};

// ─── Conversations ────────────────────────────────────────────────────────────

export const conversations = {
  findAll(opts?: { status?: string; search?: string; page?: number; limit?: number }) {
    let list = [..._store.conversations];
    if (opts?.status) list = list.filter((c) => c.status === opts.status);
    // join customer data for search
    if (opts?.search) {
      const q = opts.search.toLowerCase();
      list = list.filter((conv) => {
        const cust = _store.customers.find((c) => c.id === conv.customerId);
        return (
          cust?.name.toLowerCase().includes(q) ||
          cust?.phone.includes(q)
        );
      });
    }
    // sort by lastMessageAt desc
    list.sort((a, b) => {
      const ta = a.lastMessageAt ?? a.createdAt;
      const tb = b.lastMessageAt ?? b.createdAt;
      return tb.localeCompare(ta);
    });
    const total = list.length;
    const page = opts?.page ?? 1;
    const limit = opts?.limit ?? 20;
    const paged = list.slice((page - 1) * limit, page * limit);
    // join customer name/phone
    const data = paged.map((conv) => {
      const cust = _store.customers.find((c) => c.id === conv.customerId);
      return { ...conv, customerName: cust?.name ?? null, customerPhone: cust?.phone ?? null };
    });
    return { data, total, page, limit };
  },
  findById(id: number): (Conversation & { customerName?: string; customerPhone?: string }) | undefined {
    const conv = _store.conversations.find((c) => c.id === id);
    if (!conv) return undefined;
    const cust = _store.customers.find((c) => c.id === conv.customerId);
    return { ...conv, customerName: cust?.name, customerPhone: cust?.phone };
  },
  findByCustomerId(customerId: number): Conversation | undefined {
    return _store.conversations.find((c) => c.customerId === customerId && c.status === "open");
  },
  insert(data: Omit<Conversation, "id" | "createdAt" | "updatedAt">): Conversation {
    const record: Conversation = { ...data, id: nextId("conversations"), createdAt: now(), updatedAt: now() };
    _store.conversations.push(record);
    save();
    return record;
  },
  update(id: number, data: Partial<Omit<Conversation, "id" | "createdAt">>): Conversation | undefined {
    const idx = _store.conversations.findIndex((c) => c.id === id);
    if (idx === -1) return undefined;
    _store.conversations[idx] = { ..._store.conversations[idx], ...data, updatedAt: now() };
    save();
    return _store.conversations[idx];
  },
};

// ─── Conversation Messages ────────────────────────────────────────────────────

export const conversationMessages = {
  findByConversation(conversationId: number): ConversationMessage[] {
    return _store.conversationMessages
      .filter((m) => m.conversationId === conversationId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  },
  insert(data: Omit<ConversationMessage, "id" | "createdAt">): ConversationMessage {
    const record: ConversationMessage = { ...data, id: nextId("conversationMessages"), createdAt: now() };
    _store.conversationMessages.push(record);
    save();
    return record;
  },
  stats() {
    const msgs = _store.conversationMessages;
    const total = msgs.length;
    const inbound = msgs.filter((m) => m.direction === "inbound").length;
    const outbound = msgs.filter((m) => m.direction === "outbound").length;
    // last 7 days timeline
    const timeline: { date: string; inbound: number; outbound: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const date = d.toISOString().slice(0, 10);
      timeline.push({
        date,
        inbound: msgs.filter((m) => m.direction === "inbound" && m.createdAt.startsWith(date)).length,
        outbound: msgs.filter((m) => m.direction === "outbound" && m.createdAt.startsWith(date)).length,
      });
    }
    return { total, inbound, outbound, timeline };
  },
};

// ─── Settings ─────────────────────────────────────────────────────────────────

export const settings = {
  get(key: string): string | null {
    return _store.settings.find((s) => s.key === key)?.value ?? null;
  },
  getJson<T>(key: string): T | null {
    const val = this.get(key);
    if (!val) return null;
    try { return JSON.parse(val) as T; } catch { return null; }
  },
  set(key: string, value: string): Setting {
    const idx = _store.settings.findIndex((s) => s.key === key);
    if (idx !== -1) {
      _store.settings[idx] = { ..._store.settings[idx], value, updatedAt: now() };
      save();
      return _store.settings[idx];
    }
    const record: Setting = { id: nextId("settings"), key, value, updatedAt: now() };
    _store.settings.push(record);
    save();
    return record;
  },
  setJson(key: string, value: unknown): Setting {
    return this.set(key, JSON.stringify(value));
  },
};

// ─── Activity Logs ────────────────────────────────────────────────────────────

export const activityLogs = {
  findRecent(limit = 20): ActivityLog[] {
    return [..._store.activityLogs]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit);
  },
  insert(data: Omit<ActivityLog, "id" | "createdAt">): ActivityLog {
    const record: ActivityLog = { ...data, id: nextId("activityLogs"), createdAt: now() };
    _store.activityLogs.push(record);
    // keep only last 500 logs to avoid unbounded growth
    if (_store.activityLogs.length > 500) _store.activityLogs.splice(0, _store.activityLogs.length - 500);
    save();
    return record;
  },
};

// ─── Dashboard helpers ────────────────────────────────────────────────────────

export const dashboard = {
  kpis() {
    const totalCustomers = _store.customers.length;
    const activeConversations = _store.conversations.filter((c) => c.status === "open").length;
    const totalMessages = _store.conversationMessages.length;
    const activeCampaigns = _store.campaigns.filter((c) => ["running", "scheduled"].includes(c.status)).length;
    const allSent = _store.campaigns.reduce((s, c) => s + c.sentCount, 0);
    const allDelivered = _store.campaigns.reduce((s, c) => s + c.deliveredCount, 0);
    const deliveryRate = allSent > 0 ? Math.round((allDelivered / allSent) * 100) : 0;
    return { totalCustomers, activeConversations, totalMessages, activeCampaigns, deliveryRate };
  },
  campaignStatusBreakdown() {
    const all = _store.campaigns;
    return {
      draft: all.filter((c) => c.status === "draft").length,
      scheduled: all.filter((c) => c.status === "scheduled").length,
      running: all.filter((c) => c.status === "running").length,
      completed: all.filter((c) => c.status === "completed").length,
      paused: all.filter((c) => c.status === "paused").length,
      cancelled: all.filter((c) => c.status === "cancelled").length,
    };
  },
};
