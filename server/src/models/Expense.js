import mongoose from "mongoose";

const expenseSchema = new mongoose.Schema(
  {
    description: {
      type: String,
      required: true,
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "groups",
      // required only when this is a group expense (not a personal/no-group expense)
      required: function () {
        return this.isPersonal !== true && !this._skipGroupRequired;
      },
    },
    // true for personal (no-group) expenses — set by expenseController
    isPersonal: {
      type: Boolean,
      default: false,
    },
    // Primary payer (for display / legacy)
    paidBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
    },
    // Multi-payer support: [{ memberId, amount }]
    paidByMultiple: [
      {
        memberId: { type: mongoose.Schema.Types.ObjectId, ref: "users" },
        amount: { type: Number, default: 0 },
      },
    ],
    splitBetween: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "users",
      },
    ],
    splitType: {
      type: String,
      enum: ["equally", "percentage", "exact"],
      default: "equally",
    },
    // Stores exact amount each debtor owes — used for accurate reversal on delete
    // { "userId": amount }
    debtorShares: {
      type: Map,
      of: Number,
      default: {},
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
    },
  },
  { timestamps: true }
);

export default mongoose.model("expenses", expenseSchema);