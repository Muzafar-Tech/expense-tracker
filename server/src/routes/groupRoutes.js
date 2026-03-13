// server/src/routes/groupRoutes.js
import express from "express";
import {
  createGroup,
  getGroups,
  getGroupDetail,
  addMember,
  removeMember,
  deleteGroup,
} from "../controllers/groupController.js";
import { protect as authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

// POST   /api/groups              → create group (any logged-in user)
router.post("/", authMiddleware, createGroup);

// GET    /api/groups              → get all groups for logged-in user
router.get("/", authMiddleware, getGroups);

// GET    /api/groups/:id          → get group detail
router.get("/:id", authMiddleware, getGroupDetail);

// POST   /api/groups/:id/members  → add member (admin only — checked in controller)
router.post("/:id/members", authMiddleware, addMember);

// DELETE /api/groups/:id/members/:memberId → remove member (admin only)
router.delete("/:id/members/:memberId", authMiddleware, removeMember);

// DELETE /api/groups/:id          → delete group (admin only — checked in controller)
router.delete("/:id", authMiddleware, deleteGroup);

export default router;