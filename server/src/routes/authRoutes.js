// server/src/routes/authRoutes.js
import express from "express";
import { registerUser, loginUser, getMe, lookupUser } from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

/* ── Auth routes ─────────────────────────────── */
router.post("/signup", registerUser);
router.post("/login",  loginUser);

/* ── Get logged-in user profile ──────────────── */
router.get("/me", protect, getMe);

/* ── Lookup user by email (for personal expense) ── */
router.get("/lookup", protect, lookupUser);

/* ── Test route ──────────────────────────────── */
router.get("/test", (req, res) => {
  res.json({ message: "Auth routes working" });
});

export default router;