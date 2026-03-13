// server/src/models/Balance.js
import mongoose from "mongoose";

// ── Pending Settlement Sub-schema ─────────────────────────────────────────────
// Created when a DEBTOR clicks "Settle Up" (sends payment request)
// Cleared (confirmed/rejected) when CREDITOR responds
const pendingSettlementSchema = new mongoose.Schema(
  {
    // How much the debtor claims to have paid
    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    // The debtor (person who owes money and sent this request)
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },

    // "pending"   → waiting for creditor to respond
    // "confirmed" → creditor accepted, balance was reduced
    // "rejected"  → creditor rejected, balance unchanged
    status: {
      type: String,
      enum: ["pending", "confirmed", "rejected"],
      default: "pending",
    },

    // Optional note from the debtor e.g. "Sent via Easypaisa"
    note: {
      type: String,
      default: "",
    },

    // When creditor responded (confirmed or rejected)
    resolvedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true, // createdAt = when request was sent
  }
);

// ── Balance Schema ────────────────────────────────────────────────────────────
// Convention (IMPORTANT — used everywhere in controllers):
//   user   = the CREDITOR (person who is owed money / paid originally)
//   person = the DEBTOR   (person who owes money)
//   amount = always positive in DB
//
// So: "person owes user an amount"
//
// On the DEBTOR's   dashboard → shows in "You Owe"   section
// On the CREDITOR's dashboard → shows in "Owes You"  section
const balanceSchema = new mongoose.Schema(
  {
    // CREDITOR — the person who paid and is owed money
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },

    // DEBTOR — the person who owes money
    person: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },

    // Outstanding amount (always >= 0 in DB)
    amount: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Which groups this balance is linked to
    groups: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "groups",
      },
    ],

    // ── Pending settlement requests ───────────────────────────────────────
    // Debtor sends a request → pushed here with status "pending"
    // Creditor confirms/rejects → status updated, balance adjusted if confirmed
    // We keep rejected/confirmed entries for history (do not delete them)
    pendingSettlements: [pendingSettlementSchema],
  },
  {
    timestamps: true,
  }
);

// ── Indexes ───────────────────────────────────────────────────────────────────
// Fast lookup for "find balance between user A and user B"
balanceSchema.index({ user: 1, person: 1 });

// Fast lookup for "find all balances involving a user"
balanceSchema.index({ person: 1 });

export default mongoose.model("balances", balanceSchema);