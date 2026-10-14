import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./drizzle/schema.ts",
  out: "./drizzle/migrations",
  dbCredentials: {
    // Prefer the provider-neutral name; legacy name remains for existing local setups.
    url: process.env.CORTAI_DB_MIGRATION_URL ?? process.env.LOVABLE_DB_MIGRATION_URL ?? "",
  },
});
