// server/src/controllers/expenseController.js
import Expense      from "../models/Expense.js";
import Group        from "../models/Group.js";
import Balance      from "../models/Balance.js";
import Activity     from "../models/Activity.js";
import Notification from "../models/Notification.js";

/* ─────────────────────────────────────────────────────────────
   HELPER — upsert balance scoped to ONE specific group
────────────────────────────────────────────────────────────── */
const updateBalance = async (payerId, debtorId, share, groupId) => {
  if (payerId.toString() === debtorId.toString()) return;
  if (share <= 0) return;

  const balance = await Balance.findOne({
    user:   payerId,
    person: debtorId,
    groups: groupId,
  });

  if (!balance) {
    await Balance.create({
      user:   payerId,
      person: debtorId,
      amount: Math.round(share * 100) / 100,
      groups: [groupId],
    });
  } else {
    balance.amount = Math.round((balance.amount + share) * 100) / 100;
    await balance.save();
  }
};

/* ─────────────────────────────────────────────────────────────
   HELPER — reverse balance scoped to ONE specific group
────────────────────────────────────────────────────────────── */
const reverseBalance = async (payerId, debtorId, share, groupId) => {
  if (payerId.toString() === debtorId.toString()) return;

  const balance = await Balance.findOne({
    user:   payerId,
    person: debtorId,
    groups: groupId,
  });

  if (balance) {
    balance.amount = Math.max(
      0,
      Math.round((balance.amount - share) * 100) / 100
    );
    if (balance.amount === 0) {
      await balance.deleteOne();
    } else {
      await balance.save();
    }
  }
};

/* ─────────────────────────────────────────────────────────────
   CREATE EXPENSE
   Any group member (admin or member) can add expenses.
   Notifies all OTHER group members.
────────────────────────────────────────────────────────────── */
export const createExpense = async (req, res) => {
  try {
    const {
      groupId,
      description,
      splitType = "equally",
      paidByMultiple,
      paidBy,
      amount,
      splitAmong,
      percentages,
      exactAmounts,
    } = req.body;

    const userId = req.user._id;

    if (!groupId || !description) {
      return res.status(400).json({ message: "groupId and description are required" });
    }

    const group = await Group.findById(groupId).populate("members.user", "name email");
    if (!group) return res.status(404).json({ message: "Group not found" });

    // Security: user must be a group member
    const isMember = group.members.some(
      (m) => m.user._id.toString() === userId.toString()
    );
    if (!isMember) {
      return res.status(403).json({ message: "You are not a member of this group" });
    }

    /* ── Normalize payers ─────────────────────────────────── */
    let payers = [];
    if (paidByMultiple && Array.isArray(paidByMultiple) && paidByMultiple.length > 0) {
      payers = paidByMultiple.filter((p) => Number(p.amount) > 0);
    } else if (paidBy && amount) {
      payers = [{ memberId: paidBy, amount: Number(amount) }];
    }

    if (payers.length === 0) {
      return res.status(400).json({ message: "At least one payer with amount > 0 is required" });
    }

    const totalAmount = Math.round(
      payers.reduce((sum, p) => sum + Number(p.amount), 0) * 100
    ) / 100;

    if (totalAmount <= 0) {
      return res.status(400).json({ message: "Total amount must be greater than 0" });
    }

    /* ── Normalize debtors ────────────────────────────────── */
    const groupMemberIds = group.members.map((m) => m.user._id.toString());
    let debtorIds = [];

    if (splitAmong && Array.isArray(splitAmong) && splitAmong.length > 0) {
      debtorIds = splitAmong.filter((id) => groupMemberIds.includes(id.toString()));
    }
    if (debtorIds.length === 0) debtorIds = groupMemberIds;

    /* ── Calculate shares ─────────────────────────────────── */
    const debtorShares = {};

    if (splitType === "equally") {
      const share = Math.round((totalAmount / debtorIds.length) * 100) / 100;
      debtorIds.forEach((id) => { debtorShares[id] = share; });

    } else if (splitType === "percentage") {
      if (!percentages) {
        return res.status(400).json({ message: "percentages object is required" });
      }
      let totalPct = 0;
      debtorIds.forEach((id) => {
        const pct = Number(percentages[id] || 0);
        debtorShares[id] = Math.round((totalAmount * pct / 100) * 100) / 100;
        totalPct += pct;
      });
      if (Math.abs(totalPct - 100) > 0.01) {
        return res.status(400).json({ message: "Percentages must add up to 100" });
      }

    } else if (splitType === "exact") {
      if (!exactAmounts) {
        return res.status(400).json({ message: "exactAmounts object is required" });
      }
      let totalExact = 0;
      debtorIds.forEach((id) => {
        const amt = Number(exactAmounts[id] || 0);
        debtorShares[id] = amt;
        totalExact += amt;
      });
      if (Math.abs(totalExact - totalAmount) > 0.01) {
        return res.status(400).json({
          message: `Exact amounts (${totalExact}) must equal total (${totalAmount})`,
        });
      }
    }

    /* ── Save expense ─────────────────────────────────────── */
    const primaryPayer = payers.length === 1
      ? payers[0].memberId
      : payers.reduce((a, b) => (Number(a.amount) >= Number(b.amount) ? a : b)).memberId;

    const expense = await Expense.create({
      description,
      amount: totalAmount,
      group:  groupId,
      paidBy: primaryPayer,
      splitBetween:   debtorIds,
      splitType,
      createdBy:      userId,
      paidByMultiple: payers,
      debtorShares,
    });

    group.expenses.push(expense._id);
    group.totalExpenses = Math.round(
      ((group.totalExpenses || 0) + totalAmount) * 100
    ) / 100;
    await group.save();

    /* ── Update balances ──────────────────────────────────── */
    for (const debtor of debtorIds) {
      const totalOwed = debtorShares[debtor] || 0;
      if (totalOwed <= 0) continue;

      for (const payer of payers) {
        if (debtor.toString() === payer.memberId.toString()) continue;
        const payerFraction = Number(payer.amount) / totalAmount;
        const owedToPayer   = Math.round(totalOwed * payerFraction * 100) / 100;
        if (owedToPayer > 0) {
          await updateBalance(payer.memberId, debtor, owedToPayer, groupId);
        }
      }
    }

    /* ── Activity log ─────────────────────────────────────── */
    const payerNames = payers.map((p) => {
      const member = group.members.find(
        (m) => m.user._id.toString() === p.memberId.toString()
      );
      return member
        ? `${member.user.name} (Rs ${p.amount})`
        : `Rs ${p.amount}`;
    }).join(", ");

    const creator = await import("../models/User.js").then((m) =>
      m.default.findById(userId).select("name")
    );

    await Activity.create({
      type:        "expense_added",
      description: `You added "${description}" in "${group.name}"`,
      detail:      `Rs ${totalAmount} — Paid by: ${payerNames} — Split among ${debtorIds.length} members`,
      group:       groupId,
      user:        userId,
    });

    /* ── Notify all other members ─────────────────────────── */
    const otherMembers = group.members.filter(
      (m) => m.user._id.toString() !== userId.toString()
    );

    const notificationPromises = otherMembers.map((m) =>
      Notification.create({
        recipient: m.user._id,
        sender:    userId,
        type:      "expense_added",
        message:   `${creator?.name || "Someone"} added "${description}" in "${group.name}"`,
        detail:    `Rs ${totalAmount} — Split among ${debtorIds.length} members`,
        groupId:   groupId,
      })
    );
    await Promise.all(notificationPromises);

    const populated = await Expense.findById(expense._id)
      .populate("paidBy",       "name email")
      .populate("group",        "name")
      .populate("splitBetween", "name email");

    res.status(201).json(populated);
  } catch (error) {
    console.error("createExpense error:", error);
    res.status(500).json({ message: error.message });
  }
};

/* ─────────────────────────────────────────────────────────────
   GET ALL EXPENSES
   Returns expenses for all groups the logged-in user belongs to.
   Uses new role-based member query.
────────────────────────────────────────────────────────────── */
export const getExpenses = async (req, res) => {
  try {
    const userId = req.user._id;

    // New query for role-based members array
    const userGroups = await Group.find({ "members.user": userId }).select("_id");
    const groupIds   = userGroups.map((g) => g._id);

    const expenses = await Expense.find({ group: { $in: groupIds } })
      .populate("group",        "name")
      .populate("paidBy",       "name email")
      .populate("createdBy",    "name email")
      .populate("splitBetween", "name email")
      .sort({ createdAt: -1 });

    res.json(expenses);
  } catch (error) {
    console.error("getExpenses error:", error);
    res.status(500).json({ message: error.message });
  }
};

/* ─────────────────────────────────────────────────────────────
   DELETE EXPENSE
   Permission rules:
   • Group admin → can delete ANY expense
   • Member      → can only delete expenses THEY created (createdBy)
────────────────────────────────────────────────────────────── */
export const deleteExpense = async (req, res) => {
  try {
    const { id }  = req.params;
    const userId  = req.user._id;

    const expense = await Expense.findById(id).populate("group", "name");
    if (!expense) return res.status(404).json({ message: "Expense not found" });

    const groupId   = expense.group?._id || expense.group;
    const groupName = expense.group?.name || "a group";

    // Fetch group to check role
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });

    const memberEntry = group.members.find(
      (m) => m.user.toString() === userId.toString()
    );

    const isAdmin   = memberEntry?.role === "admin" ||
                      group.createdBy.toString() === userId.toString();
    const isCreator = expense.createdBy?.toString() === userId.toString();

    // Permission check
    if (!isAdmin && !isCreator) {
      return res.status(403).json({
        message: "You can only delete expenses you created. Group admins can delete any expense.",
      });
    }

    const totalAmount = expense.amount;

    /* ── Reverse balances ─────────────────────────────────── */
    const storedDebtorShares = expense.debtorShares || {};
    const storedPayers = expense.paidByMultiple?.length
      ? expense.paidByMultiple
      : [{ memberId: expense.paidBy, amount: totalAmount }];

    for (const debtor of expense.splitBetween) {
      const totalOwed = storedDebtorShares[debtor.toString()]
        || Math.round((totalAmount / expense.splitBetween.length) * 100) / 100;

      for (const payer of storedPayers) {
        if (debtor.toString() === payer.memberId.toString()) continue;
        const payerFraction = Number(payer.amount) / totalAmount;
        const owedToPayer   = Math.round(totalOwed * payerFraction * 100) / 100;
        if (owedToPayer > 0) {
          await reverseBalance(payer.memberId, debtor, owedToPayer, groupId);
        }
      }
    }

    group.expenses     = group.expenses.filter((e) => e.toString() !== id);
    group.totalExpenses = Math.max(
      0,
      Math.round(((group.totalExpenses || 0) - totalAmount) * 100) / 100
    );
    await group.save();

    const desc = expense.description;
    await expense.deleteOne();

    await Activity.create({
      type:        "expense_deleted",
      description: `You deleted "${desc}" from "${groupName}"`,
      detail:      `Rs ${totalAmount} — balances reversed`,
      group:       group._id,
      user:        userId,
    });

    res.json({ message: "Expense deleted successfully" });
  } catch (error) {
    console.error("deleteExpense error:", error);
    res.status(500).json({ message: error.message });
  }
};

/* ─────────────────────────────────────────────────────────────
   GET GROUP SETTLEMENTS
────────────────────────────────────────────────────────────── */
export const getGroupSettlements = async (req, res) => {
  try {
    const { groupId } = req.params;

    if (!groupId || groupId === "undefined" || groupId.length !== 24) {
      return res.status(400).json({ message: "Invalid group ID" });
    }

    const group = await Group.findById(groupId).populate("members.user", "name email");
    if (!group) return res.status(404).json({ message: "Group not found" });

    const balances = await Balance.find({ groups: groupId })
      .populate("user",   "name email")
      .populate("person", "name email");

    const settlements = balances
      .filter((b) => b.amount > 0)
      .map((b) => ({
        from: { _id: b.person._id, name: b.person.name, email: b.person.email },
        to:   { _id: b.user._id,   name: b.user.name,   email: b.user.email   },
        amount: b.amount,
      }));

    res.json(settlements);
  } catch (error) {
    console.error("getGroupSettlements error:", error);
    res.status(500).json({ message: error.message });
  }
};