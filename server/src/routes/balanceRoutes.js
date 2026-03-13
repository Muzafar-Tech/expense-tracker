// server/src/routes/balanceRoutes.js
import express from "express";
import {
  getBalances,
  requestSettle,
  confirmSettle,
  rejectSettle,
  getReceived,
  addReceived,
  setReceived,
} from "../controllers/balanceController.js";
import { protect as authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

// ── Read ──────────────────────────────────────────────────────────────────────
router.get("/", authMiddleware, getBalances);

// ── Settlement flow ───────────────────────────────────────────────────────────
// DEBTOR sends a payment request → creditor gets notified
router.post("/settle-request", authMiddleware, requestSettle);

// CREDITOR confirms payment (with or without a prior request)
router.post("/confirm", authMiddleware, confirmSettle);

// CREDITOR rejects a pending request
router.post("/reject", authMiddleware, rejectSettle);

// ── Received Amount ───────────────────────────────────────────────────────────
// IMPORTANT: these MUST come BEFORE any /:id routes
router.get("/received",        authMiddleware, getReceived);
router.patch("/received/add",  authMiddleware, addReceived);
router.patch("/received/set",  authMiddleware, setReceived);

export default router;