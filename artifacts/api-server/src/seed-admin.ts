import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";

async function seedAdmin() {
  const email = "admin@talha.com";
  const [existing] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (existing) {
    console.log("Admin user already exists:", existing.email);
    process.exit(0);
  }

  const passwordHash = await bcrypt.hash("Admin@1234", 12);
  const [user] = await db
    .insert(usersTable)
    .values({
      name: "Talha Admin",
      email,
      passwordHash,
      role: "admin",
    })
    .returning();

  console.log("Admin user created:", user.email, "with role:", user.role);
  process.exit(0);
}

seedAdmin().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
