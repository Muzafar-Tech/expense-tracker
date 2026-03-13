// client/src/api/notificationApi.js
import axios from "./axiosConfig";

/* GET /api/notifications — returns { notifications, unreadCount } */
export const getNotifications = async () => {
  const res = await axios.get("/notifications");
  return res.data;
};

/* PATCH /api/notifications/read-all */
export const markAllRead = async () => {
  const res = await axios.patch("/notifications/read-all");
  return res.data;
};

/* PATCH /api/notifications/:id/read */
export const markOneRead = async (id) => {
  const res = await axios.patch(`/notifications/${id}/read`);
  return res.data;
};

/* DELETE /api/notifications/:id */
export const deleteNotification = async (id) => {
  const res = await axios.delete(`/notifications/${id}`);
  return res.data;
};

/* DELETE /api/notifications/clear-all */
export const clearAllNotifications = async () => {
  const res = await axios.delete("/notifications/clear-all");
  return res.data;
};