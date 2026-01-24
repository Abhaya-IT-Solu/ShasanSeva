import path from "path";
import dotenv from "dotenv";
import { defineConfig } from "drizzle-kit";
// Explicitly load root .env
dotenv.config({
    path: path.resolve(__dirname, "../../.env"),
});
if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not defined. Check .env loading.");
}
export default defineConfig({
    schema: "./src/schema/index.ts",
    out: "./drizzle",
    dialect: "postgresql",
    dbCredentials: {
        url: process.env.DATABASE_URL,
    },
    verbose: true,
    strict: true,
});
