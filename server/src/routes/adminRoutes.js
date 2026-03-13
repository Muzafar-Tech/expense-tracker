// server/src/routes/adminRoutes.js
import express         from "express";
import adminMiddleware from "../middleware/adminMiddleware.js";
import {
  getStats,
  getAllUsers, getUserDetail, createUser, deleteUser,
  getAllGroups, deleteGroup,
  getAllExpenses, deleteExpense,
  getAllBalances, overrideBalance, clearBalance, forceConfirmSettlement,
  getAllActivities, deleteActivity,
  getAllNotifications, deleteNotification, broadcastNotification,
} from "../controllers/adminController.js";

const router = express.Router();

// All routes protected by adminMiddleware
router.use(adminMiddleware);

// Stats
router.get("/stats", getStats);

// Users
router.get   ("/users",        getAllUsers);
router.post  ("/users",        createUser);
router.get   ("/users/:userId",deleteUser.length > 0 ? getUserDetail : getUserDetail);
router.get   ("/users/:userId",getUserDetail);
router.delete("/users/:userId",deleteUser);

// Groups
router.get   ("/groups",           getAllGroups);
router.delete("/groups/:groupId",  deleteGroup);

// Expenses
router.get   ("/expenses",              getAllExpenses);
router.delete("/expenses/:expenseId",   deleteExpense);

// Balances
router.get   ("/balances",                              getAllBalances);
router.patch ("/balances/:balanceId/override",          overrideBalance);
router.delete("/balances/:balanceId",                   clearBalance);
router.post  ("/balances/:balanceId/force-confirm",     forceConfirmSettlement);

// Activities
router.get   ("/activities",                getAllActivities);
router.delete("/activities/:activityId",    deleteActivity);

// Notifications
router.get   ("/notifications",                     getAllNotifications);
router.delete("/notifications/:notificationId",     deleteNotification);
router.post  ("/notifications/broadcast",           broadcastNotification);

export default router;