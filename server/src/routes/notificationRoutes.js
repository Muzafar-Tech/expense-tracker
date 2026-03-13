// server/src/routes/notificationRoutes.js
import express from "express";
import {
  getNotifications,
  markAllRead,
  markOneRead,
  deleteNotification,
  clearAllNotifications,
} from "../controllers/notificationController.js";
import { protect as authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

// GET  /api/notifications          → get all + unread count
router.get("/", authMiddleware, getNotifications);

// PATCH /api/notifications/read-all → mark all as read
router.patch("/read-all", authMiddleware, markAllRead);

// PATCH /api/notifications/:id/read → mark one as read
router.patch("/:id/read", authMiddleware, markOneRead);

// DELETE /api/notifications/clear-all → delete all
router.delete("/clear-all", authMiddleware, clearAllNotifications);

// DELETE /api/notifications/:id → delete one
router.delete("/:id", authMiddleware, deleteNotification);

export default router;