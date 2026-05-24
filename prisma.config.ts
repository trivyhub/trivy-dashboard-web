import "dotenv/config";
import { defineConfig } from "prisma/config";

const url = process.env["DATABASE_URL"] ?? "file:./dev.db";
const isPostgres = url.startsWith("postgres");

export default defineConfig({
  schema: isPostgres ? "prisma/schema.postgresql.prisma" : "prisma/schema.sqlite.prisma",
  migrations: {
    path: isPostgres ? "prisma/migrations/postgresql" : "prisma/migrations/sqlite",
  },
  datasource: {
    url,
  },
});
