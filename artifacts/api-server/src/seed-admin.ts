/**
 * Seeds the default admin user into the local JSON store.
 * Run once after first deploy: node --enable-source-maps ./dist/seed-admin.mjs
 */
import bcrypt from "bcryptjs";
import { users } from "./lib/store.js";

async function seed() {
  const email = "admin@talha.com";
  const existing = users.findByEmail(email);
  if (existing) {
    console.log(`Admin user already exists (id=${existing.id}). Skipping.`);
    process.exit(0);
  }
  const password = await bcrypt.hash("Admin@1234", 12);
  const user = users.insert({ email, password, name: "Admin", role: "admin", avatar: null, refreshToken: null });
  console.log(`✅ Admin user created: id=${user.id}, email=${user.email}`);
  process.exit(0);
}

seed().catch((err) => { console.error(err); process.exit(1); });
