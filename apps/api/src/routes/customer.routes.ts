
import { Router } from "express";
import { pool } from "../config/database";

const router = Router();

router.post("/", async (req, res) => {
  try {
    const { full_name, email } = req.body;

    if (!full_name || !email) {
      return res.status(400).json({
        message: "Full name and email are required"
      });
    }

    const result = await pool.query(
      `INSERT INTO customers (full_name, email)
       VALUES ($1, $2)
       RETURNING id, full_name, email, status, created_at`,
      [full_name.trim(), email.trim().toLowerCase()]
    );

    return res.status(201).json({
      message: "Customer created successfully",
      customer: result.rows[0]
    });
  } catch (error: any) {
    if (error.code === "23505") {
      return res.status(409).json({
        message: "Email already exists"
      });
    }

    console.error(error);
    return res.status(500).json({
      message: "Internal server error"
    });
  }
});

router.get("/", async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, full_name, email, status, created_at
       FROM customers ORDER BY created_at DESC`
    );

    return res.json({ customers: result.rows });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Could not fetch customers"
    });
  }
});

export default router;
