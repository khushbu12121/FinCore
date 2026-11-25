
import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import { pool } from "./config/database";
import customerRoutes from "./routes/customer.routes";
import walletRoutes from "./routes/wallet.routes";
import transferRoutes from "./routes/transfer.routes";
import beneficiaryRoutes from "./routes/beneficiary.routes";
import refundRoutes from "./routes/refund.routes";
import disputeRoutes from "./routes/dispute.routes";
import paymentRoutes from "./routes/payment.routes";
import statementRoutes from "./routes/statement.routes";
import authRoutes from "./routes/auth.routes";
import {
  authenticateToken,
  authorizeRoles
} from "./middleware/auth.middleware";
dotenv.config();

const app = express();

app.use(helmet());
app.use(cors({
  origin: [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:3002"
  ],
  credentials: true
}));
app.use(express.json());
app.use("/api/customers", customerRoutes);
app.use("/api/wallets", walletRoutes);
app.use("/api/transfers", transferRoutes);
app.use("/api/beneficiaries", beneficiaryRoutes);
app.use("/api/refunds", refundRoutes);
app.use("/api/disputes", disputeRoutes);
app.use("/api/payment-intents", paymentRoutes);
app.use("/api/statements", statementRoutes);
app.use("/api/auth", authRoutes);
app.get("/", (_req, res) => {
  res.json({ message: "FinCore API is running" });
});
app.get("/api/auth/me", authenticateToken, (req, res) => {
  res.json({ message: "Authenticated successfully", user: (req as any).user });
});
app.get(
  "/api/auth/admin",
  authenticateToken,
  authorizeRoles("ADMIN"),
  (req, res) => {
    res.json({ message: "Admin access granted" });
  }
);

app.get("/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({
      status: "healthy",
      database: "connected",
      service: "FinCore API"
    });
  } catch (error) {
    console.error("Database health check failed:", error);
    res.status(503).json({
      status: "unhealthy",
      database: "disconnected"
    });
  }
});

const PORT = Number(process.env.PORT) || 5000;

app.listen(PORT, () => {
  console.log(`FinCore API running on http://localhost:${PORT}`);
});
