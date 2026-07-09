import { Router, type IRouter } from "express";
import { eq, ilike, or, sql } from "drizzle-orm";
import { db, customersTable, customerNotesTable, activityLogsTable } from "@workspace/db";
import {
  CreateCustomerBody,
  UpdateCustomerBody,
  GetCustomerParams,
  UpdateCustomerParams,
  DeleteCustomerParams,
  GetCustomerNotesParams,
  AddCustomerNoteParams,
  AddCustomerNoteBody,
  ImportCustomersBody,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/customers", requireAuth, async (req, res): Promise<void> => {
  const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10));
  const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? "20"), 10)));
  const offset = (page - 1) * limit;
  const search = req.query.search ? String(req.query.search) : null;
  const tag = req.query.tag ? String(req.query.tag) : null;
  const status = req.query.status ? String(req.query.status) : null;

  const conditions = [];
  if (search) {
    conditions.push(or(ilike(customersTable.name, `%${search}%`), ilike(customersTable.phone, `%${search}%`)));
  }
  if (status) {
    conditions.push(eq(customersTable.status, status));
  }
  if (tag) {
    conditions.push(sql`${customersTable.tags} @> ARRAY[${tag}]::text[]`);
  }

  const whereClause = conditions.length > 0 ? sql`${conditions.reduce((a, b) => sql`${a} AND ${b}`)}` : undefined;

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(customersTable)
    .where(whereClause);

  const customers = await db
    .select()
    .from(customersTable)
    .where(whereClause)
    .orderBy(customersTable.createdAt)
    .limit(limit)
    .offset(offset);

  res.json({
    data: customers.map((c) => ({
      ...c,
      lastContactedAt: c.lastContactedAt?.toISOString() ?? null,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    })),
    total: count,
    page,
    limit,
  });
});

router.post("/customers", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateCustomerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", message: parsed.error.message });
    return;
  }

  const [customer] = await db.insert(customersTable).values(parsed.data).returning();

  await db.insert(activityLogsTable).values({
    type: "customer_added",
    title: "New customer added",
    description: `${customer.name} (${customer.phone}) was added to the system`,
  });

  res.status(201).json({
    ...customer,
    lastContactedAt: customer.lastContactedAt?.toISOString() ?? null,
    createdAt: customer.createdAt.toISOString(),
    updatedAt: customer.updatedAt.toISOString(),
  });
});

router.get("/customers/stats", requireAuth, async (req, res): Promise<void> => {
  const [total] = await db.select({ count: sql<number>`count(*)::int` }).from(customersTable);
  const [active] = await db.select({ count: sql<number>`count(*)::int` }).from(customersTable).where(eq(customersTable.status, "active"));
  const [inactive] = await db.select({ count: sql<number>`count(*)::int` }).from(customersTable).where(eq(customersTable.status, "inactive"));
  const [blocked] = await db.select({ count: sql<number>`count(*)::int` }).from(customersTable).where(eq(customersTable.status, "blocked"));
  const [newThisMonth] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(customersTable)
    .where(sql`${customersTable.createdAt} >= date_trunc('month', now())`);

  res.json({
    total: total.count,
    active: active.count,
    inactive: inactive.count,
    blocked: blocked.count,
    newThisMonth: newThisMonth.count,
  });
});

router.post("/customers/import", requireAuth, async (req, res): Promise<void> => {
  const parsed = ImportCustomersBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", message: parsed.error.message });
    return;
  }

  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const customer of parsed.data.customers) {
    try {
      const [existing] = await db.select().from(customersTable).where(eq(customersTable.phone, customer.phone));
      if (existing) {
        skipped++;
        continue;
      }
      await db.insert(customersTable).values(customer);
      imported++;
    } catch (err) {
      errors.push(`Failed to import ${customer.phone}: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  }

  res.json({ imported, skipped, errors });
});

router.get("/customers/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetCustomerParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid params", message: params.error.message });
    return;
  }

  const [customer] = await db.select().from(customersTable).where(eq(customersTable.id, params.data.id));
  if (!customer) {
    res.status(404).json({ error: "Not found", message: "Customer not found" });
    return;
  }

  res.json({
    ...customer,
    lastContactedAt: customer.lastContactedAt?.toISOString() ?? null,
    createdAt: customer.createdAt.toISOString(),
    updatedAt: customer.updatedAt.toISOString(),
  });
});

router.put("/customers/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateCustomerParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid params", message: params.error.message });
    return;
  }

  const parsed = UpdateCustomerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", message: parsed.error.message });
    return;
  }

  const [customer] = await db
    .update(customersTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(customersTable.id, params.data.id))
    .returning();

  if (!customer) {
    res.status(404).json({ error: "Not found", message: "Customer not found" });
    return;
  }

  res.json({
    ...customer,
    lastContactedAt: customer.lastContactedAt?.toISOString() ?? null,
    createdAt: customer.createdAt.toISOString(),
    updatedAt: customer.updatedAt.toISOString(),
  });
});

router.delete("/customers/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteCustomerParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid params", message: params.error.message });
    return;
  }

  const [deleted] = await db.delete(customersTable).where(eq(customersTable.id, params.data.id)).returning();
  if (!deleted) {
    res.status(404).json({ error: "Not found", message: "Customer not found" });
    return;
  }

  res.json({ success: true, message: "Customer deleted" });
});

router.get("/customers/:id/notes", requireAuth, async (req, res): Promise<void> => {
  const params = GetCustomerNotesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid params", message: params.error.message });
    return;
  }

  const notes = await db
    .select()
    .from(customerNotesTable)
    .where(eq(customerNotesTable.customerId, params.data.id))
    .orderBy(customerNotesTable.createdAt);

  res.json(notes.map((n) => ({ ...n, createdAt: n.createdAt.toISOString() })));
});

router.post("/customers/:id/notes", requireAuth, async (req, res): Promise<void> => {
  const params = AddCustomerNoteParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid params", message: params.error.message });
    return;
  }

  const parsed = AddCustomerNoteBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", message: parsed.error.message });
    return;
  }

  const [note] = await db
    .insert(customerNotesTable)
    .values({ customerId: params.data.id, content: parsed.data.content })
    .returning();

  res.status(201).json({ ...note, createdAt: note.createdAt.toISOString() });
});

export default router;
