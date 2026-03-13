import express from "express";
import { getActivities, deleteActivity } from "../controllers/activityController.js";
import { protect as authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

// GET /api/activity         → all activities for current user
// GET /api/activity?type=X  → filtered by type
router.get("/", authMiddleware, getActivities);

// DELETE /api/activity/:id  → user manually deletes an activity
router.delete("/:id", authMiddleware, deleteActivity);

export default router;