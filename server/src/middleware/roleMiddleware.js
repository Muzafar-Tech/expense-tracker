// server/src/middleware/roleMiddleware.js
import Group from "../models/Group.js";

/* ─────────────────────────────────────────────────────────────
   requireGroupAdmin
   Blocks the request unless the logged-in user is the admin
   (createdBy) of the group identified by req.params.id or
   req.params.groupId.

   Usage:
     router.delete("/:id", authMiddleware, requireGroupAdmin, deleteGroup);
────────────────────────────────────────────────────────────── */
export const requireGroupAdmin = async (req, res, next) => {
  try {
    const groupId = req.params.id || req.params.groupId;
    const userId  = req.user._id;

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });

    // Check if user is admin in the members array
    const memberEntry = group.members.find(
      (m) => m.user.toString() === userId.toString()
    );

    const isAdmin =
      group.createdBy.toString() === userId.toString() ||
      memberEntry?.role === "admin";

    if (!isAdmin) {
      return res.status(403).json({
        message: "Only the group admin can perform this action",
      });
    }

    // Attach group to request so controller doesn't have to re-fetch
    req.group = group;
    next();
  } catch (error) {
    console.error("requireGroupAdmin error:", error);
    res.status(500).json({ message: error.message });
  }
};

/* ─────────────────────────────────────────────────────────────
   requireGroupMember
   Blocks the request unless the logged-in user is ANY member
   (admin or member) of the group.

   Usage:
     router.post("/:id/expenses", authMiddleware, requireGroupMember, createExpense);
────────────────────────────────────────────────────────────── */
export const requireGroupMember = async (req, res, next) => {
  try {
    const groupId = req.params.id || req.params.groupId;
    const userId  = req.user._id;

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });

    const isMember = group.members.some(
      (m) => m.user.toString() === userId.toString()
    );

    if (!isMember) {
      return res.status(403).json({
        message: "You are not a member of this group",
      });
    }

    req.group = group;
    next();
  } catch (error) {
    console.error("requireGroupMember error:", error);
    res.status(500).json({ message: error.message });
  }
};