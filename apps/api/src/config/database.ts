import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config({ path: "../../.env" });

export const pool = new Pool(
  process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
      }
    : {
        host: "localhost",
        port: 5434,
        user: process.env.POSTGRES_USER,
        password: process.env.POSTGRES_PASSWORD,
        database: process.env.POSTGRES_DB,
      }
);

pool.on("error", (error) => {
  console.error("Unexpected PostgreSQL error:", error);
});