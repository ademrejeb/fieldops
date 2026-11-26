/**
 * Demo accounts only: one tenant and the five role accounts, no business data.
 *
 * Use this for a public demo where tickets, customers, assets and stock must
 * start empty. Accounts match `prisma/seed.ts` so logins are unchanged.
 */
import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

function createClient() {
  const url = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
  if (url.startsWith("postgres")) {
    return new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
  }
  return new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: url.replace(/^file:/, "") }) });
}

const db = createClient();
const PASSWORD = process.env.DEMO_PASSWORD ?? "FieldOps123!";

const USERS = [
  { email: "dispatch@fieldops.ma", name: "Salma Dispatch", role: "DISPATCHER" as const },
  { email: "manager@fieldops.ma", name: "Omar Manager", role: "MANAGER" as const },
  { email: "tech@fieldops.ma", name: "Yassine El Amrani", role: "TECHNICIAN" as const },
  { email: "mehdi@fieldops.ma", name: "Mehdi Bennani", role: "TECHNICIAN" as const },
  { email: "khadija@fieldops.ma", name: "Khadija Tazi", role: "TECHNICIAN" as const },
  { email: "client@anfa.ma", name: "M. Berrada (Client)", role: "CLIENT" as const },
  { email: "admin@fieldops.ma", name: "Admin Sys", role: "ADMIN" as const },
];

async function main() {
  const tenant = await db.tenant.upsert({
    where: { slug: "demo-casablanca" },
    update: {},
    create: {
      name: "Casablanca FieldOps",
      slug: "demo-casablanca",
      industry: "ELEVATOR_HVAC",
      locale: "fr-MA",
      settings: { currency: "MAD", timezone: "Africa/Casablanca" },
    },
  });

  const passwordH = await bcrypt.hash(PASSWORD, 10);
  for (const user of USERS) {
    await db.user.upsert({
      where: { tenantId_email: { tenantId: tenant.id, email: user.email } },
      update: { passwordH, role: user.role, active: true },
      create: { tenantId: tenant.id, email: user.email, name: user.name, role: user.role, passwordH },
    });
  }

  const counts = {
    users: await db.user.count({ where: { tenantId: tenant.id } }),
    tickets: await db.ticket.count({ where: { tenantId: tenant.id } }),
    customers: await db.customer.count({ where: { tenantId: tenant.id } }),
    assets: await db.asset.count({ where: { tenantId: tenant.id } }),
    workOrders: await db.workOrder.count({ where: { tenantId: tenant.id } }),
  };
  console.log("Accounts seed OK:", tenant.slug, counts);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
