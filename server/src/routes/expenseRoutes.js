import express from "express";
import {
  createExpense,
  getExpenses,
  deleteExpense,
  getGroupSettlements,
} from "../controllers/expenseController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// IMPORTANT: specific routes must come BEFORE parameterized routes
// GET /api/expenses/settlements/:groupId — must be before /:id
router.get("/settlements/:groupId", protect, getGroupSettlements);

router.get("/", protect, getExpenses);
router.post("/", protect, createExpense);
router.delete("/:id", protect, deleteExpense);

export default router;