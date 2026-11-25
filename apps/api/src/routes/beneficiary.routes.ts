
import { Router } from "express";
import { pool } from "../config/database";

const router = Router();

// Add beneficiary
router.post("/", async (req, res) => {
  const {
    customer_id,
    beneficiary_name,
    account_reference,
    bank_name
  } = req.body;

  if (!customer_id || !beneficiary_name?.trim() || !account_reference?.trim()) {
    return res.status(400).json({
      message: "Required fields are missing"
    });
  }

  try {
    const result = await pool.query(
      `INSERT INTO beneficiaries
       (customer_id, beneficiary_name, account_reference, bank_name)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [customer_id, beneficiary_name.trim(),
       account_reference.trim(), bank_name || null]
    );

    return res.status(201).json({
      message: "Beneficiary added successfully",
      beneficiary: result.rows[0]
    });
  } catch (error: any) {
    if (error.code === "23505") {
      return res.status(409).json({ message: "Beneficiary already exists" });
    }
    if (error.code === "23503") {
      return res.status(404).json({ message: "Customer not found" });
    }
    console.error(error);
    return res.status(500).json({ message: "Could not add beneficiary" });
  }
});

// Get customer beneficiaries
router.get("/:customerId", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM beneficiaries
       WHERE customer_id = $1 ORDER BY created_at DESC`,
      [req.params.customerId]
    );

    return res.json({ beneficiaries: result.rows });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Could not fetch beneficiaries" });
  }
});

export default router;
