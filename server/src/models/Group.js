// server/src/models/Group.js
import mongoose from "mongoose";

// ── Member Sub-schema ─────────────────────────────────────────────────────────
// Each member has a userId and a role
// admin  → the group creator. Can do everything.
// member → added user. Can see, add own expenses, settle up, confirm payments.
//          Cannot delete others' expenses, cannot delete group, cannot manage members.
const memberSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },

    // "admin"  → group creator (full control)
    // "member" → added user (limited control)
    role: {
      type: String,
      enum: ["admin", "member"],
      default: "member",
    },

    // When this person joined the group
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    _id: false, // no separate _id for sub-documents — cleaner queries
  }
);

// ── Group Schema ──────────────────────────────────────────────────────────────
const groupSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      default: "",
      trim: true,
    },

    // The user who created this group — always has "admin" role
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },

    // Members array — each entry has { user, role, joinedAt }
    // The creator is automatically added as admin when group is created
    members: [memberSchema],

    // Expense IDs belonging to this group
    expenses: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "expenses",
      },
    ],

    // Running total of all expense amounts in this group
    totalExpenses: {
      type: Number,
      default: 0,
    },

    // Net balance for display on group card
    // Positive = group owes you, Negative = you owe the group
    balance: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// ── Indexes ───────────────────────────────────────────────────────────────────
// Fast lookup: "find all groups where this user is a member"
groupSchema.index({ "members.user": 1 });

// Fast lookup: "find all groups created by this user"
groupSchema.index({ createdBy: 1 });

export default mongoose.model("groups", groupSchema);