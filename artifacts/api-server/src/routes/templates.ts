import { Router } from "express";
import { templates } from "../lib/store.js";
import { requireAuth } from "../middlewares/auth.js";

export const router = Router();

function parseId(raw: string | string[]): number | null {
  const str = Array.isArray(raw) ? raw[0] : raw;
  const id = parseInt(str, 10);
  return Number.isFinite(id) && id > 0 ? id : null;
}

// GET /api/templates
router.get("/templates", requireAuth, (req, res): void => {
  const { search, category, status } = req.query as Record<string, string>;
  res.json(templates.findAll({ search, category, status }));
});

// GET /api/templates/:id
router.get("/templates/:id", requireAuth, (req, res): void => {
  const id = parseId(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid params", message: "id must be a positive integer" }); return; }
  const template = templates.findById(id);
  if (!template) { res.status(404).json({ error: "Not found", message: "Template not found" }); return; }
  res.json(template);
});

// POST /api/templates
router.post("/templates", requireAuth, (req, res): void => {
  const { name, category, body, variables, language, status } = req.body as Record<string, unknown>;
  if (!name || !body) { res.status(400).json({ error: "Invalid input", message: "name and body are required" }); return; }
  const template = templates.insert({
    name: String(name),
    category: category ? String(category) : "marketing",
    body: String(body),
    variables: Array.isArray(variables) ? variables.map(String) : [],
    language: language ? String(language) : "en",
    status: (status as "approved" | "pending" | "rejected") ?? "pending",
  });
  res.status(201).json(template);
});

// PUT /api/templates/:id
router.put("/templates/:id", requireAuth, (req, res): void => {
  const id = parseId(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid params", message: "id must be a positive integer" }); return; }
  const { name, category, body, variables, language, status } = req.body as Record<string, unknown>;
  const updated = templates.update(id, {
    ...(name !== undefined && { name: String(name) }),
    ...(category !== undefined && { category: String(category) }),
    ...(body !== undefined && { body: String(body) }),
    ...(variables !== undefined && { variables: Array.isArray(variables) ? variables.map(String) : [] }),
    ...(language !== undefined && { language: String(language) }),
    ...(status !== undefined && { status: status as "approved" | "pending" | "rejected" }),
  });
  if (!updated) { res.status(404).json({ error: "Not found", message: "Template not found" }); return; }
  res.json(updated);
});

// DELETE /api/templates/:id
router.delete("/templates/:id", requireAuth, (req, res): void => {
  const id = parseId(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid params", message: "id must be a positive integer" }); return; }
  const deleted = templates.delete(id);
  if (!deleted) { res.status(404).json({ error: "Not found", message: "Template not found" }); return; }
  res.json({ message: "Template deleted" });
});
