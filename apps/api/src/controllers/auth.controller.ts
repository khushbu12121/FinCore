import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { pool } from "../config/database";

export const register = async (req: Request, res: Response) => {
  try {
    const { full_name, email, password } = req.body;

    if (!full_name || !email || !password || password.length < 8) {
      return res.status(400).json({
        message: "Name, email and password (minimum 8 characters) required"
      });
    }

    const password_hash = await bcrypt.hash(password, 12);

    const result = await pool.query(
      `INSERT INTO customers (full_name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, full_name, email`,
      [full_name, email.toLowerCase(), password_hash]
    );

    return res.status(201).json({
      message: "Customer registered",
      customer: result.rows[0]
    });
  } catch (error) {
    console.error(error);
    return res.status(400).json({ message: "Registration failed. Email may already exist." });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const result = await pool.query(
      `SELECT id, email, password_hash FROM customers WHERE email = $1`,
      [String(email || "").toLowerCase()]
    );

    if (!result.rows.length || !result.rows[0].password_hash) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const valid = await bcrypt.compare(password || "", result.rows[0].password_hash);

    if (!valid) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error("JWT_SECRET missing");

    const token = jwt.sign(
      { id: result.rows[0].id, role: "CUSTOMER" },
      secret,
      { expiresIn: "1h" }
    );

    return res.json({ message: "Login successful", token });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Login failed" });
  }
};