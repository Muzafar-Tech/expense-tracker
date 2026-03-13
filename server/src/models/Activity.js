// server/src/models/Activity.js
import mongoose from "mongoose";

const activitySchema = new mongoose.Schema(
  {
    // ── Activity type ─────────────────────────────────────────────────────
    type: {
      type: String,
      enum: [
        // Expense events
        "expense_added",
        "expense_deleted",

        // Payment / settlement events
        "payment_made",           // creditor confirmed a payment (balance cleared)
        "payment_requested",      // debtor sent a settle-up request
        "payment_confirmed",      // creditor confirmed debtor's request
        "payment_rejected",       // creditor rejected debtor's request

        // Group events
        "group_created",
        "group_deleted",

        // Member events
        "member_added",
        "member_removed",
        "group_left",             // a member voluntarily left
      ],
      required: true,
    },

    // Short human-readable title e.g. "You settled up with Sufi"
    description: {
      type: String,
      required: true,
    },

    // Longer detail e.g. "Rs 5,000 paid for: Roommates"
    detail: {
      type: String,
      default: "",
    },

    // The group this activity relates to (nullable — survives group deletion)
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "groups",
      default: null,
    },

    // The user who PERFORMED this action (activity owner)
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },

    // ── NEW: The OTHER user involved in this activity ─────────────────────
    // e.g. if Sufi requested payment from Muzaffar:
    //   user       = Sufi   (who did the action)
    //   relatedUser = Muzaffar (who is involved)
    // Used to show "You sent a payment request to Muzaffar" in Sufi's feed
    // and "Sufi sent you a payment request" in Muzaffar's feed
    relatedUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      default: null,
    },

    // ── NEW: Read status ──────────────────────────────────────────────────
    // false = unread (shows notification dot)
    // true  = user has seen this activity
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true, // createdAt used for sorting/display
  }
);

// ── Indexes ───────────────────────────────────────────────────────────────────
// Fast lookup: all activities for a user, newest first
activitySchema.index({ user: 1, createdAt: -1 });

// Fast lookup: unread count for notification badge
activitySchema.index({ user: 1, isRead: 1 });

export default mongoose.model("activities", activitySchema);