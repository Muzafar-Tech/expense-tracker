// server/src/models/Notification.js
import mongoose from "mongoose";

// ── Notification Schema ───────────────────────────────────────────────────────
// Every action that involves another user creates a Notification
// for that other user. This is separate from Activity (which is your
// personal log). Notifications are the INBOX — things others did TO you.
//
// Examples:
//   Sufi sends payment request → Muzaffar gets a notification
//   Ali adds Sufi to a group   → Sufi gets a notification
//   Muzaffar confirms payment  → Sufi gets a notification
const notificationSchema = new mongoose.Schema(
  {
    // Who receives this notification
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },

    // Who triggered this notification
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },

    // Notification category
    type: {
      type: String,
      enum: [
        "payment_request",    // Sufi says he paid you → you need to confirm
        "payment_confirmed",  // You sent a request, Muzaffar confirmed it
        "payment_rejected",   // You sent a request, Muzaffar rejected it
        "reminder",           // Creditor sent you a reminder to pay
        "added_to_group",     // You were added to a group
        "removed_from_group", // You were removed from a group
        "group_deleted",      // A group you were in was deleted
        "expense_added",      // New expense added in your group
      ],
      required: true,
    },

    // Human-readable message shown in the notification dropdown
    // e.g. "Sufi claims to have paid you Rs 5,000"
    message: {
      type: String,
      required: true,
    },

    // Optional extra detail shown below the message
    detail: {
      type: String,
      default: "",
    },

    // ── References (all optional) ─────────────────────────────────────────
    // Link to the balance record this notification is about
    balanceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "balances",
      default: null,
    },

    // Link to the specific pending settlement inside the balance
    settlementId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },

    // Link to the group this notification is about
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "groups",
      default: null,
    },

    // ── Read status ───────────────────────────────────────────────────────
    // false = new / unread (shows red badge on bell icon)
    // true  = user opened notifications and saw this
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true, // createdAt used for sorting (newest first)
  }
);

// ── Indexes ───────────────────────────────────────────────────────────────────
// Fast lookup: all notifications for a user, newest first
notificationSchema.index({ recipient: 1, createdAt: -1 });

// Fast lookup: unread count for bell badge
notificationSchema.index({ recipient: 1, isRead: 1 });

export default mongoose.model("notifications", notificationSchema);