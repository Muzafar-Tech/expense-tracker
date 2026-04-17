// server/src/controllers/adminController.js
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import Group from "../models/Group.js";
import Expense from "../models/Expense.js";
import Balance from "../models/Balance.js";
import Activity from "../models/Activity.js";
import Notification from "../models/Notification.js";

/* ─────────────────────────────────────────────────────────────
   DASHBOARD STATS
   GET /api/admin/stats
────────────────────────────────────────────────────────────── */
export const getStats = async (req, res) => {
  try {
    const [
      totalUsers,
      totalGroups,
      totalExpenses,
      pendingSettlements,
      unreadNotifications,
    ] = await Promise.all([
      User.countDocuments({ role: { $ne: "admin" } }), // ✅ FIXED
      Group.countDocuments(),
      Expense.aggregate([
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      Balance.countDocuments({ "pendingSettlements.status": "pending" }),
      Notification.countDocuments({ isRead: false }),
    ]);

    res.json({
      totalUsers,
      totalGroups,
      totalExpenseVolume: totalExpenses[0]?.total || 0,
      pendingSettlements,
      unreadNotifications,
    });
  } catch (error) {
    console.error("getStats error:", error);
    res.status(500).json({ message: error.message });
  }
};

/* ─────────────────────────────────────────────────────────────
   USERS
────────────────────────────────────────────────────────────── */

// GET /api/admin/users — all users with balance summary
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({ role: { $ne: "admin" } })
      .select("-password -token")
      .lean(); // ✅ FIXED

    const usersWithStats = await Promise.all(
      users.map(async (user) => {
        const [groupCount, balances] = await Promise.all([
          Group.countDocuments({ "members.user": user._id }),
          Balance.find({
            $or: [{ user: user._id }, { person: user._id }],
            amount: { $gt: 0 },
          }),
        ]);

        let totalOwe = 0;
        let totalOwed = 0;

        balances.forEach((b) => {
          if (b.user.toString() === user._id.toString()) totalOwed += b.amount;
          if (b.person.toString() === user._id.toString()) totalOwe += b.amount;
        });

        return {
          ...user,
          groupCount,
          totalOwe: Math.round(totalOwe * 100) / 100,
          totalOwed: Math.round(totalOwed * 100) / 100,
          netBalance: Math.round((totalOwed - totalOwe) * 100) / 100,
        };
      }),
    );

    res.json(usersWithStats);
  } catch (error) {
    console.error("getAllUsers error:", error);
    res.status(500).json({ message: error.message });
  }
};

// GET /api/admin/users/:userId — single user full detail
export const getUserDetail = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).select("-password -token").lean();
    if (!user) return res.status(404).json({ message: "User not found" });

    const [groups, balances, activities, notifications] = await Promise.all([
      Group.find({ "members.user": userId }).lean(),
      Balance.find({
        $or: [{ user: userId }, { person: userId }],
        amount: { $gt: 0 },
      })
        .populate("user", "name email")
        .populate("person", "name email")
        .populate("groups", "name")
        .lean(),
      Activity.find({ user: userId })
        .sort({ createdAt: -1 })
        .limit(20)
        .populate("relatedUser", "name")
        .lean(),
      Notification.find({ recipient: userId })
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),
    ]);

    const formattedBalances = balances.map((b) => {
      const iAmCreditor = b.user._id.toString() === userId;
      return {
        balanceId: b._id,
        otherPerson: iAmCreditor ? b.person : b.user,
        amount: b.amount,
        type: iAmCreditor ? "owes" : "owe",
        groups: b.groups.map((g) => g.name),
        pendingSettlements:
          b.pendingSettlements?.filter((s) => s.status === "pending") || [],
      };
    });

    let totalOwe = 0;
    let totalOwed = 0;
    formattedBalances.forEach((b) => {
      if (b.type === "owe") totalOwe += b.amount;
      if (b.type === "owes") totalOwed += b.amount;
    });

    res.json({
      user,
      groups,
      balances: formattedBalances,
      activities,
      notifications,
      summary: {
        totalOwe: Math.round(totalOwe * 100) / 100,
        totalOwed: Math.round(totalOwed * 100) / 100,
        netBalance: Math.round((totalOwed - totalOwe) * 100) / 100,
        groupCount: groups.length,
      },
    });
  } catch (error) {
    console.error("getUserDetail error:", error);
    res.status(500).json({ message: error.message });
  }
};

// POST /api/admin/users — create a new user
export const createUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ message: "Name, email and password are required" });
    }

    const existing = await User.findOne({ email });
    if (existing)
      return res.status(400).json({ message: "Email already in use" });

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email,
      password: hashed,
      role: "user",
    });

    res.status(201).json({
      message: "User created",
      user: { _id: user._id, name: user.name, email: user.email },
    });
  } catch (error) {
    console.error("createUser error:", error);
    res.status(500).json({ message: error.message });
  }
};

// DELETE /api/admin/users/:userId — delete user + all their data
export const deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.role === "admin") {
      return res
        .status(403)
        .json({ message: "Cannot delete an admin account" });
    }

    await Promise.all([
      Balance.deleteMany({ $or: [{ user: userId }, { person: userId }] }),
      Activity.deleteMany({ user: userId }),
      Notification.deleteMany({
        $or: [{ recipient: userId }, { sender: userId }],
      }),
      Group.updateMany(
        { "members.user": userId },
        { $pull: { members: { user: userId } } },
      ),
      Expense.deleteMany({ paidBy: userId }),
      User.findByIdAndDelete(userId),
    ]);

    res.json({ message: "User and all associated data deleted" });
  } catch (error) {
    console.error("deleteUser error:", error);
    res.status(500).json({ message: error.message });
  }
};

/* ─────────────────────────────────────────────────────────────
   GROUPS
────────────────────────────────────────────────────────────── */

// GET /api/admin/groups
export const getAllGroups = async (req, res) => {
  try {
    const groups = await Group.find()
      .populate("members.user", "name email")
      .populate("createdBy", "name email")
      .lean();

    const groupsWithStats = await Promise.all(
      groups.map(async (g) => {
        const expenseTotal = await Expense.aggregate([
          { $match: { group: g._id } },
          { $group: { _id: null, total: { $sum: "$amount" } } },
        ]);
        return {
          ...g,
          totalExpenses: expenseTotal[0]?.total || 0,
        };
      }),
    );

    res.json(groupsWithStats);
  } catch (error) {
    console.error("getAllGroups error:", error);
    res.status(500).json({ message: error.message });
  }
};

// DELETE /api/admin/groups/:groupId
export const deleteGroup = async (req, res) => {
  try {
    const { groupId } = req.params;

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });

    await Promise.all([
      Expense.deleteMany({ group: groupId }),
      Activity.deleteMany({ group: groupId }),
      Group.findByIdAndDelete(groupId),
    ]);

    res.json({ message: "Group and its expenses/activities deleted" });
  } catch (error) {
    console.error("deleteGroup error:", error);
    res.status(500).json({ message: error.message });
  }
};

/* ─────────────────────────────────────────────────────────────
   EXPENSES
────────────────────────────────────────────────────────────── */

// GET /api/admin/expenses?userId=&groupId=
export const getAllExpenses = async (req, res) => {
  try {
    const { userId, groupId } = req.query;
    const filter = {};
    if (userId) filter.paidBy = userId;
    if (groupId) filter.group = groupId;

    const expenses = await Expense.find(filter)
      .populate("paidBy", "name email")
      .populate("group", "name")
      .populate("splitBetween", "name")
      .sort({ createdAt: -1 })
      .lean();

    res.json(expenses);
  } catch (error) {
    console.error("getAllExpenses error:", error);
    res.status(500).json({ message: error.message });
  }
};

// DELETE /api/admin/expenses/:expenseId
export const deleteExpense = async (req, res) => {
  try {
    const { expenseId } = req.params;
    const expense = await Expense.findByIdAndDelete(expenseId);
    if (!expense) return res.status(404).json({ message: "Expense not found" });
    res.json({ message: "Expense deleted" });
  } catch (error) {
    console.error("deleteExpense error:", error);
    res.status(500).json({ message: error.message });
  }
};

/* ─────────────────────────────────────────────────────────────
   BALANCES
────────────────────────────────────────────────────────────── */

// GET /api/admin/balances
export const getAllBalances = async (req, res) => {
  try {
    const balances = await Balance.find({ amount: { $gt: 0 } })
      .populate("user", "name email")
      .populate("person", "name email")
      .populate("groups", "name")
      .lean();

    res.json(balances);
  } catch (error) {
    console.error("getAllBalances error:", error);
    res.status(500).json({ message: error.message });
  }
};

// PATCH /api/admin/balances/:balanceId/override — manually set amount
export const overrideBalance = async (req, res) => {
  try {
    const { balanceId } = req.params;
    const parsed = parseFloat(req.body.amount);

    if (isNaN(parsed) || parsed < 0) {
      return res.status(400).json({ message: "Amount must be 0 or greater" });
    }

    if (parsed === 0) {
      await Balance.findByIdAndDelete(balanceId);
      return res.json({ message: "Balance cleared (deleted)" });
    }

    const balance = await Balance.findByIdAndUpdate(
      balanceId,
      { $set: { amount: Math.round(parsed * 100) / 100 } },
      { new: true },
    );
    if (!balance) return res.status(404).json({ message: "Balance not found" });

    res.json({ message: "Balance updated", balance });
  } catch (error) {
    console.error("overrideBalance error:", error);
    res.status(500).json({ message: error.message });
  }
};

// DELETE /api/admin/balances/:balanceId — force clear
export const clearBalance = async (req, res) => {
  try {
    const { balanceId } = req.params;
    const balance = await Balance.findByIdAndDelete(balanceId);
    if (!balance) return res.status(404).json({ message: "Balance not found" });
    res.json({ message: "Balance fully cleared" });
  } catch (error) {
    console.error("clearBalance error:", error);
    res.status(500).json({ message: error.message });
  }
};

// POST /api/admin/balances/:balanceId/force-confirm — force confirm a pending settlement
export const forceConfirmSettlement = async (req, res) => {
  try {
    const { balanceId } = req.params;
    const { settlementId } = req.body;

    const balance = await Balance.findById(balanceId);
    if (!balance) return res.status(404).json({ message: "Balance not found" });

    const settlement = balance.pendingSettlements.id(settlementId);
    if (!settlement)
      return res.status(404).json({ message: "Settlement not found" });

    settlement.status = "confirmed";
    settlement.resolvedAt = new Date();

    const remaining = Math.max(0, balance.amount - settlement.amount);
    if (remaining <= 0.001) {
      await balance.deleteOne();
    } else {
      balance.amount = Math.round(remaining * 100) / 100;
      await balance.save();
    }

    res.json({ message: "Settlement force-confirmed by admin", remaining });
  } catch (error) {
    console.error("forceConfirmSettlement error:", error);
    res.status(500).json({ message: error.message });
  }
};

/* ─────────────────────────────────────────────────────────────
   ACTIVITIES
────────────────────────────────────────────────────────────── */

// GET /api/admin/activities?userId=
export const getAllActivities = async (req, res) => {
  try {
    const filter = {};
    if (req.query.userId) filter.user = req.query.userId;

    const activities = await Activity.find(filter)
      .populate("user", "name email")
      .populate("relatedUser", "name")
      .populate("group", "name")
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

    res.json(activities);
  } catch (error) {
    console.error("getAllActivities error:", error);
    res.status(500).json({ message: error.message });
  }
};

// DELETE /api/admin/activities/:activityId
export const deleteActivity = async (req, res) => {
  try {
    const { activityId } = req.params;

    // 🔥 CASE 1: DELETE ALL
    if (activityId === "ALL") {
      await Activity.deleteMany({});
      return res.json({ message: "All activities deleted" });
    }

    // 🔥 CASE 2: DELETE USER ACTIVITIES
    if (activityId.startsWith("user:")) {
      const userId = activityId.split(":")[1];

      await Activity.deleteMany({ user: userId });
      return res.json({ message: "User activities deleted" });
    }

    // 🔥 CASE 3: SINGLE DELETE
    const activity = await Activity.findByIdAndDelete(activityId);

    if (!activity) {
      return res.status(404).json({ message: "Activity not found" });
    }

    res.json({ message: "Activity deleted" });
  } catch (error) {
    console.error("deleteActivity error:", error);
    res.status(500).json({ message: error.message });
  }
};

/* ─────────────────────────────────────────────────────────────
   NOTIFICATIONS
────────────────────────────────────────────────────────────── */

// GET /api/admin/notifications?userId=
export const getAllNotifications = async (req, res) => {
  try {
    const filter = {};
    if (req.query.userId) filter.recipient = req.query.userId;

    const notifications = await Notification.find(filter)
      .populate("recipient", "name email")
      .populate("sender", "name")
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

    res.json(notifications);
  } catch (error) {
    console.error("getAllNotifications error:", error);
    res.status(500).json({ message: error.message });
  }
};

// DELETE /api/admin/notifications/:notificationId
export const deleteNotification = async (req, res) => {
  try {
    const notif = await Notification.findByIdAndDelete(
      req.params.notificationId,
    );
    if (!notif)
      return res.status(404).json({ message: "Notification not found" });
    res.json({ message: "Notification deleted" });
  } catch (error) {
    console.error("deleteNotification error:", error);
    res.status(500).json({ message: error.message });
  }
};

// POST /api/admin/notifications/broadcast — send to one or all users
export const broadcastNotification = async (req, res) => {
  try {
    const { message, detail, userId } = req.body;
    if (!message)
      return res.status(400).json({ message: "Message is required" });

    const recipients = userId
      ? [{ _id: userId }]
      : await User.find({ role: { $ne: "admin" } })
          .select("_id")
          .lean(); // ✅ FIXED

    const notifications = recipients.map((u) => ({
      recipient: u._id,
      sender: req.user._id,
      type: "admin_broadcast",
      message,
      detail: detail || "",
    }));

    await Notification.insertMany(notifications);

    res.json({
      message: `Notification sent to ${notifications.length} user(s)`,
    });
  } catch (error) {
    console.error("broadcastNotification error:", error);
    res.status(500).json({ message: error.message });
  }
};
