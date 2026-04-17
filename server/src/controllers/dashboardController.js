import Group from "../models/Group.js";
import Expense from "../models/Expense.js";
import Balance from "../models/Balance.js";

/* ─────────────────────────────────────────────────────────────
   GET DASHBOARD DATA
────────────────────────────────────────────────────────────── */
export const getDashboardData = async (req, res) => {
  try {
    const userId = req.user._id;

    /* ── GROUPS ────────────────────────────────────────────── */
    const groups = await Group.find({ "members.user": userId }).populate(
      "members.user",
      "name email"
    );

    const formattedGroups = await Promise.all(
      groups.map(async (group) => {
        const owedToUser = await Balance.find({
          user: userId,
          groups: group._id,
        });
        const totalOwed = owedToUser.reduce(
          (sum, b) => sum + (b.amount || 0),
          0
        );

        const userOwes = await Balance.find({
          person: userId,
          groups: group._id,
        });
        const totalOwes = userOwes.reduce(
          (sum, b) => sum + (b.amount || 0),
          0
        );

        const formattedMembers = (group.members || [])
          .filter((m) => m.user != null)
          .map((m) => ({
            _id: m.user._id,
            name: m.user.name,
            email: m.user.email,
            role: m.role,
          }));

        return {
          _id: group._id,
          name: group.name,
          description: group.description,
          members: formattedMembers,
          totalExpenses: group.totalExpenses || 0,
          balance: Math.round((totalOwed - totalOwes) * 100) / 100,
        };
      })
    );

    /* ── RECENT EXPENSES ───────────────────────────────────── */
    const groupIds = groups.map((g) => g._id);

    const recentExpenses = await Expense.find({ group: { $in: groupIds } })
      .populate("group", "name")
      .populate("paidBy", "name email")
      .sort({ date: -1 })
      .limit(5);                        // ← top 5 most recent only

    const formattedExpenses = recentExpenses.map((expense) => ({
      _id: expense._id,
      description: expense.description || "Unnamed Expense",
      amount: expense.amount || 0,
      group: expense.group
        ? { name: expense.group.name }
        : { name: "No Group" },
      date: expense.date,
      paidBy: expense.paidBy
        ? { name: expense.paidBy.name }
        : { name: "Unknown" },
    }));

    /* ── BALANCES ──────────────────────────────────────────── */
    const balances = await Balance.find({
      $or: [{ user: userId }, { person: userId }],
      amount: { $gt: 0 },
    })
      .populate("user", "name")
      .populate("person", "name");

    const formattedBalances = balances
      .filter((b) => b.user != null && b.person != null)
      .map((balance) => {
        const iAmPayer =
          balance.user._id.toString() === userId.toString();
        const otherPerson = iAmPayer ? balance.person : balance.user;

        return {
          personId: otherPerson._id,
          person: otherPerson.name || "Unknown",
          amount: balance.amount,
          type: iAmPayer ? "owes" : "owe",
        };
      });

    res.json({
      groups: formattedGroups,
      recentExpenses: formattedExpenses,
      balances: formattedBalances,
    });
  } catch (error) {
    console.error("getDashboardData error:", error);
    res.status(500).json({ message: error.message });
  }
};