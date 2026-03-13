// server/src/controllers/balanceController.js
import Balance      from "../models/Balance.js";
import User         from "../models/User.js";
import Activity     from "../models/Activity.js";
import Notification from "../models/Notification.js";

/* ─────────────────────────────────────────────────────────────
   GET /api/balances
   Returns all balances for the logged-in user.
   Includes any pending settlement requests on each balance.

   Convention (critical — used everywhere):
     balance.user   = CREDITOR (paid originally, is owed money)
     balance.person = DEBTOR   (owes money)
     balance.amount = always positive

   On the DEBTOR's   dashboard → "You Owe" section
   On the CREDITOR's dashboard → "Owes You" section
────────────────────────────────────────────────────────────── */
export const getBalances = async (req, res) => {
  try {
    const userId = req.user._id;

    const balances = await Balance.find({
      $or: [{ user: userId }, { person: userId }],
      amount: { $gt: 0 },
    })
      .populate("user",   "name email")
      .populate("person", "name email")
      .populate("groups", "name");

    const formatted = balances.map((balance) => {
      const iAmCreditor  = balance.user._id.toString() === userId.toString();
      const otherPerson  = iAmCreditor ? balance.person : balance.user;

      // Only show PENDING settlement requests relevant to this user
      const pendingRequests = balance.pendingSettlements
        .filter((s) => s.status === "pending")
        .map((s) => ({
          settlementId:  s._id,
          amount:        s.amount,
          requestedBy:   s.requestedBy,
          note:          s.note,
          requestedAt:   s.createdAt,
        }));

      return {
        balanceId:       balance._id,
        personId:        otherPerson._id,
        person:          otherPerson.name  || "Unknown",
        email:           otherPerson.email || "",
        amount:          balance.amount,
        // "owes" → they owe me (I am creditor)
        // "owe"  → I owe them (I am debtor)
        type:            iAmCreditor ? "owes" : "owe",
        groups:          balance.groups.map((g) => g.name),
        pendingRequests, // creditor sees these to confirm/reject
      };
    });

    res.json(formatted);
  } catch (error) {
    console.error("getBalances error:", error);
    res.status(500).json({ message: error.message });
  }
};

/* ─────────────────────────────────────────────────────────────
   POST /api/balances/settle-request
   DEBTOR sends a payment request to the CREDITOR.
   Does NOT change the balance amount — just creates a pending record.
   Notifies the creditor.

   Body: { balanceId, amount, note? }
────────────────────────────────────────────────────────────── */
export const requestSettle = async (req, res) => {
  try {
    const userId = req.user._id;
    const { balanceId, amount, note } = req.body;

    if (!balanceId) return res.status(400).json({ message: "balanceId is required" });

    const parsedAmount = parseFloat(amount);
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ message: "A valid positive amount is required" });
    }

    const balance = await Balance.findById(balanceId).populate("groups", "name");
    if (!balance) return res.status(404).json({ message: "Balance not found" });

    // Only the DEBTOR can send a request
    if (balance.person.toString() !== userId.toString()) {
      return res.status(403).json({
        message: "Only the person who owes money can send a payment request",
      });
    }

    if (parsedAmount > balance.amount + 0.001) {
      return res.status(400).json({
        message: `Amount cannot exceed Rs ${balance.amount.toLocaleString()}`,
      });
    }

    // Check if there's already a pending request for this balance
    const existingPending = balance.pendingSettlements.find(
      (s) => s.status === "pending"
    );
    if (existingPending) {
      return res.status(400).json({
        message: "You already have a pending payment request. Wait for the other person to respond.",
      });
    }

    // Push a new pending settlement
    balance.pendingSettlements.push({
      amount:      parsedAmount,
      requestedBy: userId,
      status:      "pending",
      note:        note || "",
    });
    await balance.save();

    const groupNames = balance.groups.map((g) => g.name).join(", ") || "a group";
    const debtor     = await User.findById(userId);
    const creditorId = balance.user;

    // Activity for debtor
    await Activity.create({
      type:        "payment_requested",
      description: `You sent a payment request`,
      detail:      `Rs ${parsedAmount} for: ${groupNames}`,
      group:       null,
      user:        userId,
      relatedUser: creditorId,
    });

    // Activity for creditor
    await Activity.create({
      type:        "payment_requested",
      description: `${debtor.name} sent you a payment request`,
      detail:      `Rs ${parsedAmount} — ${note || "No note provided"}`,
      group:       null,
      user:        creditorId,
      relatedUser: userId,
      isRead:      false,
    });

    // Notification for creditor
    await Notification.create({
      recipient:    creditorId,
      sender:       userId,
      type:         "payment_request",
      message:      `${debtor.name} claims to have paid you Rs ${parsedAmount.toLocaleString()}`,
      detail:       note || "",
      balanceId:    balance._id,
      settlementId: balance.pendingSettlements[balance.pendingSettlements.length - 1]._id,
    });

    res.json({
      message: "Payment request sent. Waiting for confirmation.",
      settlementId: balance.pendingSettlements[balance.pendingSettlements.length - 1]._id,
    });
  } catch (error) {
    console.error("requestSettle error:", error);
    res.status(500).json({ message: error.message });
  }
};

/* ─────────────────────────────────────────────────────────────
   POST /api/balances/confirm
   CREDITOR confirms a payment — either:
   A) After receiving a request from the debtor  (settlementId provided)
   B) Directly (cash payment, no prior request)  (no settlementId)

   Body: { balanceId, amount, settlementId? }
────────────────────────────────────────────────────────────── */
export const confirmSettle = async (req, res) => {
  try {
    const userId = req.user._id;
    const { balanceId, amount, settlementId } = req.body;

    if (!balanceId) return res.status(400).json({ message: "balanceId is required" });

    const parsedAmount = parseFloat(amount);
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ message: "A valid positive amount is required" });
    }

    const balance = await Balance.findById(balanceId).populate("groups", "name");
    if (!balance) return res.status(404).json({ message: "Balance not found" });

    // Only the CREDITOR can confirm
    if (balance.user.toString() !== userId.toString()) {
      return res.status(403).json({
        message: "Only the person who is owed money can confirm a payment",
      });
    }

    if (parsedAmount > balance.amount + 0.001) {
      return res.status(400).json({
        message: `Amount cannot exceed Rs ${balance.amount.toLocaleString()}`,
      });
    }

    const EPSILON      = 0.001;
    const remaining    = Math.max(0, balance.amount - parsedAmount);
    const isFullyPaid  = remaining <= EPSILON;
    const groupNames   = balance.groups.map((g) => g.name).join(", ") || "a group";
    const debtorId     = balance.person;
    const debtor       = await User.findById(debtorId);
    const creditor     = await User.findById(userId);

    // If confirming a specific pending request — mark it confirmed
    if (settlementId) {
      const settlement = balance.pendingSettlements.id(settlementId);
      if (settlement) {
        settlement.status     = "confirmed";
        settlement.resolvedAt = new Date();
      }
    }

    // Update balance
    if (isFullyPaid) {
      await balance.deleteOne();
    } else {
      balance.amount = Math.round(remaining * 100) / 100;
      await balance.save();
    }

    // Add to creditor's receivedAmount
    await User.findByIdAndUpdate(userId, {
      $inc: { receivedAmount: parsedAmount },
    });

    // Activity for creditor
    await Activity.create({
      type:        "payment_confirmed",
      description: `You confirmed receiving Rs ${parsedAmount.toLocaleString()} from ${debtor?.name || "someone"}`,
      detail:      `For: ${groupNames}${isFullyPaid ? " — fully settled" : ` — Rs ${remaining.toLocaleString()} remaining`}`,
      group:       null,
      user:        userId,
      relatedUser: debtorId,
    });

    // Activity for debtor (so they see their request was confirmed)
    await Activity.create({
      type:        "payment_confirmed",
      description: `${creditor?.name || "They"} confirmed your payment of Rs ${parsedAmount.toLocaleString()}`,
      detail:      `For: ${groupNames}`,
      group:       null,
      user:        debtorId,
      relatedUser: userId,
      isRead:      false,
    });

    // Notification for debtor
    await Notification.create({
      recipient: debtorId,
      sender:    userId,
      type:      "payment_confirmed",
      message:   `${creditor?.name || "They"} confirmed your payment of Rs ${parsedAmount.toLocaleString()}`,
      detail:    isFullyPaid ? "Balance fully cleared!" : `Rs ${remaining.toLocaleString()} still outstanding`,
      balanceId: isFullyPaid ? null : balance._id,
    });

    // Updated received total to send back to frontend
    const updatedUser = await User.findById(userId).select("receivedAmount");

    res.json({
      message:       isFullyPaid ? "Balance fully settled" : "Partial payment confirmed",
      remaining:     isFullyPaid ? 0 : remaining,
      settled:       parsedAmount,
      totalReceived: updatedUser.receivedAmount,
    });
  } catch (error) {
    console.error("confirmSettle error:", error);
    res.status(500).json({ message: error.message });
  }
};

/* ─────────────────────────────────────────────────────────────
   POST /api/balances/reject
   CREDITOR rejects a pending payment request.
   Balance remains unchanged. Debtor is notified.

   Body: { balanceId, settlementId }
────────────────────────────────────────────────────────────── */
export const rejectSettle = async (req, res) => {
  try {
    const userId = req.user._id;
    const { balanceId, settlementId } = req.body;

    if (!balanceId || !settlementId) {
      return res.status(400).json({ message: "balanceId and settlementId are required" });
    }

    const balance = await Balance.findById(balanceId);
    if (!balance) return res.status(404).json({ message: "Balance not found" });

    // Only the CREDITOR can reject
    if (balance.user.toString() !== userId.toString()) {
      return res.status(403).json({
        message: "Only the person who is owed money can reject a payment request",
      });
    }

    const settlement = balance.pendingSettlements.id(settlementId);
    if (!settlement) {
      return res.status(404).json({ message: "Settlement request not found" });
    }
    if (settlement.status !== "pending") {
      return res.status(400).json({ message: "This request has already been resolved" });
    }

    settlement.status     = "rejected";
    settlement.resolvedAt = new Date();
    await balance.save();

    const debtorId  = balance.person;
    const creditor  = await User.findById(userId);
    const debtor    = await User.findById(debtorId);

    // Activity for creditor
    await Activity.create({
      type:        "payment_rejected",
      description: `You rejected a payment request from ${debtor?.name || "someone"}`,
      detail:      `Rs ${settlement.amount.toLocaleString()} — balance unchanged`,
      group:       null,
      user:        userId,
      relatedUser: debtorId,
    });

    // Activity for debtor
    await Activity.create({
      type:        "payment_rejected",
      description: `${creditor?.name || "They"} rejected your payment request`,
      detail:      `Rs ${settlement.amount.toLocaleString()} — please follow up`,
      group:       null,
      user:        debtorId,
      relatedUser: userId,
      isRead:      false,
    });

    // Notification for debtor
    await Notification.create({
      recipient:    debtorId,
      sender:       userId,
      type:         "payment_rejected",
      message:      `${creditor?.name || "They"} rejected your payment request of Rs ${settlement.amount.toLocaleString()}`,
      detail:       "Your balance remains unchanged. Please follow up.",
      balanceId:    balance._id,
      settlementId: settlementId,
    });

    res.json({ message: "Payment request rejected. Balance unchanged." });
  } catch (error) {
    console.error("rejectSettle error:", error);
    res.status(500).json({ message: error.message });
  }
};

/* ─────────────────────────────────────────────────────────────
   GET /api/balances/received
────────────────────────────────────────────────────────────── */
export const getReceived = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("receivedAmount");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ totalReceived: user.receivedAmount || 0 });
  } catch (error) {
    console.error("getReceived error:", error);
    res.status(500).json({ message: error.message });
  }
};

/* ─────────────────────────────────────────────────────────────
   PATCH /api/balances/received/add
────────────────────────────────────────────────────────────── */
export const addReceived = async (req, res) => {
  try {
    const parsed = parseFloat(req.body.amount);
    if (isNaN(parsed) || parsed <= 0) {
      return res.status(400).json({ message: "A valid positive amount is required" });
    }
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $inc: { receivedAmount: parsed } },
      { new: true, select: "receivedAmount" }
    );
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ totalReceived: user.receivedAmount });
  } catch (error) {
    console.error("addReceived error:", error);
    res.status(500).json({ message: error.message });
  }
};

/* ─────────────────────────────────────────────────────────────
   PATCH /api/balances/received/set
────────────────────────────────────────────────────────────── */
export const setReceived = async (req, res) => {
  try {
    const parsed = parseFloat(req.body.amount);
    if (isNaN(parsed) || parsed < 0) {
      return res.status(400).json({ message: "Amount must be 0 or greater" });
    }
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: { receivedAmount: parsed } },
      { new: true, select: "receivedAmount" }
    );
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ totalReceived: user.receivedAmount });
  } catch (error) {
    console.error("setReceived error:", error);
    res.status(500).json({ message: error.message });
  }
};