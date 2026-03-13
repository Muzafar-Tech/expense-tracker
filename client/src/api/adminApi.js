// client/src/api/adminApi.js
import axios from "./axiosConfig";

// ── Stats ──────────────────────────────────────────────────
export const getAdminStats = () =>
  axios.get("/admin/stats");

// ── Users ─────────────────────────────────────────────────
export const getAdminUsers = () =>
  axios.get("/admin/users");

export const getAdminUserDetail = (userId) =>
  axios.get(`/admin/users/${userId}`);

export const createAdminUser = (data) =>
  axios.post("/admin/users", data);

export const deleteAdminUser = (userId) =>
  axios.delete(`/admin/users/${userId}`);

// ── Groups ─────────────────────────────────────────────────
export const getAdminGroups = () =>
  axios.get("/admin/groups");

export const deleteAdminGroup = (groupId) =>
  axios.delete(`/admin/groups/${groupId}`);

// ── Expenses ───────────────────────────────────────────────
export const getAdminExpenses = (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.userId)  params.append("userId",  filters.userId);
  if (filters.groupId) params.append("groupId", filters.groupId);
  return axios.get(`/admin/expenses?${params.toString()}`);
};

export const deleteAdminExpense = (expenseId) =>
  axios.delete(`/admin/expenses/${expenseId}`);

// ── Balances ───────────────────────────────────────────────
export const getAdminBalances = () =>
  axios.get("/admin/balances");

export const overrideAdminBalance = (balanceId, amount) =>
  axios.patch(`/admin/balances/${balanceId}/override`, { amount });

export const clearAdminBalance = (balanceId) =>
  axios.delete(`/admin/balances/${balanceId}`);

export const forceConfirmSettlement = (balanceId, settlementId) =>
  axios.post(`/admin/balances/${balanceId}/force-confirm`, { settlementId });

// ── Activities ─────────────────────────────────────────────
export const getAdminActivities = (userId = "") =>
  axios.get(`/admin/activities${userId ? `?userId=${userId}` : ""}`);

export const deleteAdminActivity = (activityId) =>
  axios.delete(`/admin/activities/${activityId}`);

// ── Notifications ──────────────────────────────────────────
export const getAdminNotifications = (userId = "") =>
  axios.get(`/admin/notifications${userId ? `?userId=${userId}` : ""}`);

export const deleteAdminNotification = (notificationId) =>
  axios.delete(`/admin/notifications/${notificationId}`);

export const broadcastNotification = (data) =>
  axios.post("/admin/notifications/broadcast", data);