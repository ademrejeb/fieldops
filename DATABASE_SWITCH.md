# SQLite → PostgreSQL switch (zero code change)

This project uses **Prisma ORM v7** with portable types only
(`String cuid()`, `Int`, `Float`, `Boolean`, `DateTime`, `Json`).
No native column types, no raw SQL. Driver adapters are already wired
(`PrismaBetterSqlite3` dev / `PrismaPg` prod in `src/lib/db.ts`).

## 1. Change provider (1 line)

In `prisma/schema.prisma`:

```prisma
datasource db {
-  provider = "sqlite"
+  provider = "postgresql"
}
```

## 2. Change env

```bash
DATABASE_URL="postgresql://fsm:fsm_secret@db:5432/fsm?schema=public"
```

`src/lib/db.ts` auto-picks the pg adapter when the URL starts with `postgres`.

## 3. Migrate + seed

```bash
npx prisma migrate dev --name init_pg
npm run db:seed
```

## Notes

- `Json` → TEXT on SQLite, JSONB on Postgres. Same API.
- `cuid()` works on both. No autoincrement used.
- SQLite `file:./prisma/dev.db` is for local dev only.
- For geo routing at scale on Postgres, enable PostGIS + pgvector:
  `CREATE EXTENSION postgis; CREATE EXTENSION vector;`
- Docker Compose ships with a `db` (postgres:16) service — just set DATABASE_URL.

Verified matrix: dev = SQLite, staging/prod = Postgres 16.
