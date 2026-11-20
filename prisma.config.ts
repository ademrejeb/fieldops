import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // SQLite now -> Postgres later (same env var, see DATABASE_SWITCH.md)
    url: env("DATABASE_URL"),
  },
  // Seed via `npm run db:seed` (tsx prisma/seed.ts)
});
