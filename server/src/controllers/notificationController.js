// server/src/controllers/notificationController.js
import Notification from "../models/Notification.js";

/* ─────────────────────────────────────────────────────────────
   GET /api/notifications
   Returns all notifications for the logged-in user, newest first.
   Also returns unread count for the bell badge.
────────────────────────────────────────────────────────────── */
export const getNotifications = async (req, res) => {
  try {
    const userId = req.user._id;

    const notifications = await Notification.find({ recipient: userId })
      .populate("sender", "name email")
      .populate("groupId",  "name")
      .sort({ createdAt: -1 })
      .limit(50); // cap at 50 for performance

    const unreadCount = await Notification.countDocuments({
      recipient: userId,
      isRead: false,
    });

    res.json({ notifications, unreadCount });
  } catch (error) {
    console.error("getNotifications error:", error);
    res.status(500).json({ message: error.message });
  }
};

/* ─────────────────────────────────────────────────────────────
   PATCH /api/notifications/read-all
   Marks ALL notifications as read for the logged-in user.
   Called when user opens the notification dropdown.
────────────────────────────────────────────────────────────── */
export const markAllRead = async (req, res) => {
  try {
    const userId = req.user._id;

    await Notification.updateMany(
      { recipient: userId, isRead: false },
      { $set: { isRead: true } }
    );

    res.json({ message: "All notifications marked as read" });
  } catch (error) {
    console.error("markAllRead error:", error);
    res.status(500).json({ message: error.message });
  }
};

/* ─────────────────────────────────────────────────────────────
   PATCH /api/notifications/:id/read
   Marks a single notification as read.
────────────────────────────────────────────────────────────── */
export const markOneRead = async (req, res) => {
  try {
    const { id }  = req.params;
    const userId  = req.user._id;

    const notification = await Notification.findOneAndUpdate(
      { _id: id, recipient: userId },
      { $set: { isRead: true } },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    res.json(notification);
  } catch (error) {
    console.error("markOneRead error:", error);
    res.status(500).json({ message: error.message });
  }
};

/* ─────────────────────────────────────────────────────────────
   DELETE /api/notifications/:id
   Deletes a single notification (user dismisses it).
────────────────────────────────────────────────────────────── */
export const deleteNotification = async (req, res) => {
  try {
    const { id }  = req.params;
    const userId  = req.user._id;

    const notification = await Notification.findOneAndDelete({
      _id: id,
      recipient: userId,
    });

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    res.json({ message: "Notification deleted" });
  } catch (error) {
    console.error("deleteNotification error:", error);
    res.status(500).json({ message: error.message });
  }
};

/* ─────────────────────────────────────────────────────────────
   DELETE /api/notifications/clear-all
   Deletes ALL notifications for the logged-in user.
────────────────────────────────────────────────────────────── */
export const clearAllNotifications = async (req, res) => {
  try {
    const userId = req.user._id;
    await Notification.deleteMany({ recipient: userId });
    res.json({ message: "All notifications cleared" });
  } catch (error) {
    console.error("clearAllNotifications error:", error);
    res.status(500).json({ message: error.message });
  }
};