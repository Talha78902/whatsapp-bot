import { Router } from "express";
import { customers, customerNotes, activityLogs } from "../lib/store.js";
import { requireAuth } from "../middlewares/auth.js";

export const router = Router();

function parseId(raw: string | string[]): number | null {
  const str = Array.isArray(raw) ? raw[0] : raw;
  const id = parseInt(str, 10);
  return Number.isFinite(id) && id > 0 ? id : null;
}

// GET /api/customers
router.get("/customers", requireAuth, (req, res): void => {
  const { search, status, tags, page, limit } = req.query as Record<string, string>;
  const tagList = tags ? tags.split(",").map((t) => t.trim()).filter(Boolean) : undefined;
  const result = customers.findAll({
    search,
    status,
    tags: tagList,
    page: page ? parseInt(page, 10) : 1,
    limit: limit ? parseInt(limit, 10) : 20,
  });
  res.json(result);
});

// GET /api/customers/stats
router.get("/customers/stats", requireAuth, (_req, res): void => {
  res.json(customers.stats());
});

// GET /api/customers/:id
router.get("/customers/:id", requireAuth, (req, res): void => {
  const id = parseId(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid params", message: "id must be a positive integer" }); return; }
  const customer = customers.findById(id);
  if (!customer) { res.status(404).json({ error: "Not found", message: "Customer not found" }); return; }
  res.json(customer);
});

// POST /api/customers
router.post("/customers", requireAuth, (req, res): void => {
  const { name, phone, email, tags, status } = req.body as Record<string, unknown>;
  if (!name || !phone) {
    res.status(400).json({ error: "Invalid input", message: "name and phone are required" });
    return;
  }
  const customer = customers.insert({
    name: String(name),
    phone: String(phone),
    email: email ? String(email) : null,
    tags: Array.isArray(tags) ? tags.map(String) : [],
    status: (status as "active" | "inactive" | "blocked") ?? "active",
    assignedTo: null,
    waId: null,
  });
  activityLogs.insert({ userId: req.auth!.userId, action: "created", entity: "customer", entityId: customer.id, metadata: null });
  res.status(201).json(customer);
});

// PUT /api/customers/:id
router.put("/customers/:id", requireAuth, (req, res): void => {
  const id = parseId(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid params", message: "id must be a positive integer" }); return; }
  const { name, phone, email, tags, status, assignedTo } = req.body as Record<string, unknown>;
  const updated = customers.update(id, {
    ...(name !== undefined && { name: String(name) }),
    ...(phone !== undefined && { phone: String(phone) }),
    ...(email !== undefined && { email: email ? String(email) : null }),
    ...(tags !== undefined && { tags: Array.isArray(tags) ? tags.map(String) : [] }),
    ...(status !== undefined && { status: status as "active" | "inactive" | "blocked" }),
    ...(assignedTo !== undefined && { assignedTo: assignedTo ? Number(assignedTo) : null }),
  });
  if (!updated) { res.status(404).json({ error: "Not found", message: "Customer not found" }); return; }
  activityLogs.insert({ userId: req.auth!.userId, action: "updated", entity: "customer", entityId: id, metadata: null });
  res.json(updated);
});

// DELETE /api/customers/:id
router.delete("/customers/:id", requireAuth, (req, res): void => {
  const id = parseId(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid params", message: "id must be a positive integer" }); return; }
  const deleted = customers.delete(id);
  if (!deleted) { res.status(404).json({ error: "Not found", message: "Customer not found" }); return; }
  activityLogs.insert({ userId: req.auth!.userId, action: "deleted", entity: "customer", entityId: id, metadata: null });
  res.json({ message: "Customer deleted" });
});

// POST /api/customers/import
router.post("/customers/import", requireAuth, (req, res): void => {
  const rows = req.body as Array<{ name: string; phone: string; email?: string; tags?: string[] }>;
  if (!Array.isArray(rows)) {
    res.status(400).json({ error: "Invalid input", message: "Body must be an array of customer objects" });
    return;
  }
  let imported = 0;
  let skipped = 0;
  for (const row of rows) {
    if (!row.name || !row.phone) { skipped++; continue; }
    const existing = customers.findByPhone(row.phone);
    if (existing) { skipped++; continue; }
    customers.insert({ name: row.name, phone: row.phone, email: row.email ?? null, tags: row.tags ?? [], status: "active", assignedTo: null, waId: null });
    imported++;
  }
  res.json({ imported, skipped });
});

// GET /api/customers/:id/notes
router.get("/customers/:id/notes", requireAuth, (req, res): void => {
  const id = parseId(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid params", message: "id must be a positive integer" }); return; }
  res.json(customerNotes.findByCustomer(id));
});

// POST /api/customers/:id/notes
router.post("/customers/:id/notes", requireAuth, (req, res): void => {
  const id = parseId(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid params", message: "id must be a positive integer" }); return; }
  if (!customers.findById(id)) { res.status(404).json({ error: "Not found", message: "Customer not found" }); return; }
  const { content } = req.body as { content?: string };
  if (!content) { res.status(400).json({ error: "Invalid input", message: "content is required" }); return; }
  const note = customerNotes.insert({ customerId: id, content, createdBy: req.auth!.userId });
  res.status(201).json(note);
});

// DELETE /api/customers/:customerId/notes/:noteId
router.delete("/customers/:customerId/notes/:noteId", requireAuth, (req, res): void => {
  const noteId = parseId(req.params.noteId);
  if (!noteId) { res.status(400).json({ error: "Invalid params", message: "noteId must be a positive integer" }); return; }
  const deleted = customerNotes.delete(noteId);
  if (!deleted) { res.status(404).json({ error: "Not found", message: "Note not found" }); return; }
  res.json({ message: "Note deleted" });
});
