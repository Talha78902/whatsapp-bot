import { Router, type IRouter } from "express";
import { eq, ilike, sql } from "drizzle-orm";
import { db, templatesTable } from "@workspace/db";
import {
  CreateTemplateBody,
  UpdateTemplateBody,
  GetTemplateParams,
  UpdateTemplateParams,
  DeleteTemplateParams,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/templates", requireAuth, async (req, res): Promise<void> => {
  const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10));
  const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? "20"), 10)));
  const offset = (page - 1) * limit;
  const category = req.query.category ? String(req.query.category) : null;
  const status = req.query.status ? String(req.query.status) : null;

  const conditions = [];
  if (category) conditions.push(eq(templatesTable.category, category));
  if (status) conditions.push(eq(templatesTable.status, status));

  const whereClause = conditions.length > 0 ? sql`${conditions.reduce((a, b) => sql`${a} AND ${b}`)}` : undefined;

  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(templatesTable).where(whereClause);

  const templates = await db
    .select()
    .from(templatesTable)
    .where(whereClause)
    .orderBy(templatesTable.createdAt)
    .limit(limit)
    .offset(offset);

  res.json({
    data: templates.map(serializeTemplate),
    total: count,
    page,
    limit,
  });
});

router.post("/templates", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateTemplateBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", message: parsed.error.message });
    return;
  }

  const [template] = await db.insert(templatesTable).values(parsed.data).returning();
  res.status(201).json(serializeTemplate(template));
});

router.get("/templates/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetTemplateParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid params", message: params.error.message });
    return;
  }

  const [template] = await db.select().from(templatesTable).where(eq(templatesTable.id, params.data.id));
  if (!template) {
    res.status(404).json({ error: "Not found", message: "Template not found" });
    return;
  }

  res.json(serializeTemplate(template));
});

router.put("/templates/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateTemplateParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid params", message: params.error.message });
    return;
  }

  const parsed = UpdateTemplateBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", message: parsed.error.message });
    return;
  }

  const [template] = await db
    .update(templatesTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(templatesTable.id, params.data.id))
    .returning();

  if (!template) {
    res.status(404).json({ error: "Not found", message: "Template not found" });
    return;
  }

  res.json(serializeTemplate(template));
});

router.delete("/templates/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteTemplateParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid params", message: params.error.message });
    return;
  }

  const [deleted] = await db.delete(templatesTable).where(eq(templatesTable.id, params.data.id)).returning();
  if (!deleted) {
    res.status(404).json({ error: "Not found", message: "Template not found" });
    return;
  }

  res.json({ success: true, message: "Template deleted" });
});

function serializeTemplate(t: typeof templatesTable.$inferSelect) {
  return {
    ...t,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  };
}

export default router;
