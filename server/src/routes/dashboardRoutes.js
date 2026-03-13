import express from "express";
import { getDashboardData } from "../controllers/dashboardController.js";
import { protect as authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

/* -------- GET DASHBOARD DATA -------- */
router.get("/", authMiddleware, getDashboardData);

export default router;