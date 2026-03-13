// server/src/controllers/groupController.js
import Group        from "../models/Group.js";
import User         from "../models/User.js";
import Balance      from "../models/Balance.js";
import Expense      from "../models/Expense.js";
import Activity     from "../models/Activity.js";
import Notification from "../models/Notification.js";

/* ─────────────────────────────────────────────────────────────
   HELPER — net balance for one user inside one group
   Positive = owed money | Negative = owes money
────────────────────────────────────────────────────────────── */
const getUserBalanceInGroup = async (userId, groupId) => {
  const owedToUser = await Balance.find({ user: userId, groups: groupId });
  const totalOwed  = owedToUser.reduce((sum, b) => sum + (b.amount || 0), 0);

  const userOwes  = await Balance.find({ person: userId, groups: groupId });
  const totalOwes = userOwes.reduce((sum, b) => sum + (b.amount || 0), 0);

  return Math.round((totalOwed - totalOwes) * 100) / 100;
};

/* ─────────────────────────────────────────────────────────────
   CREATE GROUP
   Creator is automatically added as admin member.
────────────────────────────────────────────────────────────── */
export const createGroup = async (req, res) => {
  try {
    const { name, description } = req.body;
    const userId = req.user._id;

    if (!name) return res.status(400).json({ message: "Group name is required" });

    const group = await Group.create({
      name,
      description: description || "",
      createdBy: userId,
      members: [{ user: userId, role: "admin", joinedAt: new Date() }],
    });

    await Activity.create({
      type:        "group_created",
      description: `You created group "${group.name}"`,
      detail:      `Group "${group.name}" created`,
      group:       group._id,
      user:        userId,
    });

    res.status(201).json(group);
  } catch (error) {
    console.error("createGroup error:", error);
    res.status(500).json({ message: error.message });
  }
};

/* ─────────────────────────────────────────────────────────────
   GET ALL GROUPS — with live balance per group + user's role
────────────────────────────────────────────────────────────── */
export const getGroups = async (req, res) => {
  try {
    const userId = req.user._id;

    const groups = await Group.find({ "members.user": userId }).populate(
      "members.user",
      "name email"
    );

    const groupsWithBalance = await Promise.all(
      groups.map(async (group) => {
        // Guard: skip members whose user doc was deleted from DB
        const validMembers = group.members.filter((m) => m.user != null);

        const memberEntry = validMembers.find(
          (m) => m.user._id.toString() === userId.toString()
        );
        const userRole = memberEntry?.role || "member";

        return {
          _id:           group._id,
          name:          group.name,
          description:   group.description,
          createdBy:     group.createdBy,
          members:       validMembers.map((m) => ({
            _id:      m.user._id,
            name:     m.user.name,
            email:    m.user.email,
            role:     m.role,
            joinedAt: m.joinedAt,
          })),
          totalExpenses: group.totalExpenses || 0,
          balance:       await getUserBalanceInGroup(userId, group._id),
          userRole,
        };
      })
    );

    res.json(groupsWithBalance);
  } catch (error) {
    console.error("getGroups error:", error);
    res.status(500).json({ message: error.message });
  }
};

/* ─────────────────────────────────────────────────────────────
   GET GROUP DETAIL — per-member balances + user's role
────────────────────────────────────────────────────────────── */
export const getGroupDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const group = await Group.findById(id)
      .populate("members.user", "name email")
      .populate({
        path: "expenses",
        populate: [
          { path: "paidBy",    select: "name email" },
          { path: "createdBy", select: "name email" },
        ],
      });

    if (!group) return res.status(404).json({ message: "Group not found" });

    // Guard: filter out members whose user doc no longer exists in DB
    // This is the root cause of "Cannot read properties of undefined (reading '_id')"
    const validMembers = group.members.filter((m) => m.user != null);

    // Security: only members can see group detail
    const memberEntry = validMembers.find(
      (m) => m.user._id.toString() === userId.toString()
    );
    if (!memberEntry) {
      return res.status(403).json({ message: "You are not a member of this group" });
    }

    const userRole = memberEntry.role;

    const membersWithBalance = await Promise.all(
      validMembers.map(async (m) => ({
        _id:     m.user._id,
        name:    m.user.name,
        email:   m.user.email,
        role:    m.role,
        balance: await getUserBalanceInGroup(m.user._id, id),
      }))
    );

    const yourBalance = await getUserBalanceInGroup(userId, id);

    res.json({
      _id:           group._id,
      name:          group.name,
      description:   group.description,
      createdBy:     group.createdBy,
      totalExpenses: group.totalExpenses || 0,
      yourBalance,
      userRole,
      members:       membersWithBalance,
      expenses:      group.expenses,
    });
  } catch (error) {
    console.error("getGroupDetail error:", error);
    res.status(500).json({ message: error.message });
  }
};

/* ─────────────────────────────────────────────────────────────
   ADD MEMBER — admin only
   Sends notification to the added user.
────────────────────────────────────────────────────────────── */
export const addMember = async (req, res) => {
  try {
    const { id }    = req.params;
    const { email } = req.body;
    const adminId   = req.user._id;

    if (!email) return res.status(400).json({ message: "Email is required" });

    const group = await Group.findById(id);
    if (!group) return res.status(404).json({ message: "Group not found" });

    // Permission: only admin can add members
    const requester = group.members.find(
      (m) => m.user.toString() === adminId.toString()
    );
    if (!requester || requester.role !== "admin") {
      return res.status(403).json({ message: "Only the group admin can add members" });
    }

    const userToAdd = await User.findOne({ email });
    if (!userToAdd) {
      return res.status(404).json({ message: "No user found with that email" });
    }

    // Check if already a member
    const alreadyMember = group.members.some(
      (m) => m.user.toString() === userToAdd._id.toString()
    );
    if (alreadyMember) {
      return res.status(400).json({ message: "User is already in this group" });
    }

    group.members.push({ user: userToAdd._id, role: "member", joinedAt: new Date() });
    await group.save();

    const admin = await User.findById(adminId);

    await Activity.create({
      type:        "member_added",
      description: `You added ${userToAdd.name} to "${group.name}"`,
      detail:      `${userToAdd.email} joined the group`,
      group:       group._id,
      user:        adminId,
      relatedUser: userToAdd._id,
    });

    await Activity.create({
      type:        "member_added",
      description: `${admin.name} added you to "${group.name}"`,
      detail:      `You are now a member of "${group.name}"`,
      group:       group._id,
      user:        userToAdd._id,
      relatedUser: adminId,
    });

    await Notification.create({
      recipient: userToAdd._id,
      sender:    adminId,
      type:      "added_to_group",
      message:   `${admin.name} added you to "${group.name}"`,
      detail:    `You can now view expenses and balances in this group`,
      groupId:   group._id,
    });

    res.json({
      _id:     userToAdd._id,
      name:    userToAdd.name,
      email:   userToAdd.email,
      role:    "member",
      balance: 0,
    });
  } catch (error) {
    console.error("addMember error:", error);
    res.status(500).json({ message: error.message });
  }
};

/* ─────────────────────────────────────────────────────────────
   REMOVE MEMBER — admin only
   Cannot remove themselves (must delete group instead).
   Sends notification to the removed user.
────────────────────────────────────────────────────────────── */
export const removeMember = async (req, res) => {
  try {
    const { id, memberId } = req.params;
    const adminId          = req.user._id;

    const group = await Group.findById(id);
    if (!group) return res.status(404).json({ message: "Group not found" });

    const requester = group.members.find(
      (m) => m.user.toString() === adminId.toString()
    );
    if (!requester || requester.role !== "admin") {
      return res.status(403).json({ message: "Only the group admin can remove members" });
    }

    if (memberId.toString() === adminId.toString()) {
      return res.status(400).json({ message: "Admin cannot remove themselves. Delete the group instead." });
    }

    const memberToRemove = group.members.find(
      (m) => m.user.toString() === memberId.toString()
    );
    if (!memberToRemove) {
      return res.status(404).json({ message: "Member not found in this group" });
    }

    group.members = group.members.filter(
      (m) => m.user.toString() !== memberId.toString()
    );
    await group.save();

    const removedUser = await User.findById(memberId);
    const admin       = await User.findById(adminId);

    await Activity.create({
      type:        "member_removed",
      description: `You removed ${removedUser?.name || "a member"} from "${group.name}"`,
      group:       group._id,
      user:        adminId,
      relatedUser: memberId,
    });

    await Activity.create({
      type:        "member_removed",
      description: `${admin?.name || "Admin"} removed you from "${group.name}"`,
      group:       group._id,
      user:        memberId,
      relatedUser: adminId,
    });

    await Notification.create({
      recipient: memberId,
      sender:    adminId,
      type:      "removed_from_group",
      message:   `${admin?.name || "Admin"} removed you from "${group.name}"`,
      groupId:   group._id,
    });

    res.json({ message: "Member removed successfully" });
  } catch (error) {
    console.error("removeMember error:", error);
    res.status(500).json({ message: error.message });
  }
};

/* ─────────────────────────────────────────────────────────────
   DELETE GROUP — admin only
   Cleans: all expenses + balance records for this group.
   Keeps:  ALL activity logs permanently.
   Notifies: all members.
────────────────────────────────────────────────────────────── */
export const deleteGroup = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const group = await Group.findById(id);
    if (!group) return res.status(404).json({ message: "Group not found" });

    const requester = group.members.find(
      (m) => m.user.toString() === userId.toString()
    );
    if (!requester || requester.role !== "admin") {
      return res.status(403).json({ message: "Only the group admin can delete this group" });
    }

    const groupName    = group.name;
    const expenseCount = group.expenses.length;
    const memberCount  = group.members.length;

    await Expense.deleteMany({ group: id });

    const balances = await Balance.find({ groups: id });
    for (const balance of balances) {
      balance.groups = balance.groups.filter((g) => g.toString() !== id.toString());
      if (balance.groups.length === 0) {
        await balance.deleteOne();
      } else {
        balance.amount = 0;
        await balance.save();
      }
    }

    const otherMembers = group.members.filter(
      (m) => m.user.toString() !== userId.toString()
    );
    const admin = await User.findById(userId);

    await Promise.all(
      otherMembers.map((m) =>
        Notification.create({
          recipient: m.user,
          sender:    userId,
          type:      "group_deleted",
          message:   `${admin?.name || "Admin"} deleted the group "${groupName}"`,
          detail:    `This group no longer exists`,
        })
      )
    );

    await Activity.create({
      type:        "group_deleted",
      description: `You deleted group "${groupName}"`,
      detail:      `Had ${memberCount} members and ${expenseCount} expenses`,
      group:       null,
      user:        userId,
    });

    await group.deleteOne();

    res.json({ message: "Group deleted successfully" });
  } catch (error) {
    console.error("deleteGroup error:", error);
    res.status(500).json({ message: error.message });
  }
};