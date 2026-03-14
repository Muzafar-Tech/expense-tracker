// client/src/contexts/NotificationContext.js
import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useAuth } from "./AuthContext";

const NotificationContext = createContext(null);

const API = process.env.REACT_APP_API_URL;

export const NotificationProvider = ({ children }) => {
  const { token } = useAuth();
  const [unreadCount,    setUnreadCount]    = useState(0);
  const [notifications,  setNotifications]  = useState([]);
  const [loadingNotifs,  setLoadingNotifs]  = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!token) return;
    try {
      setLoadingNotifs(true);
      const res = await fetch(`${API}/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (err) {
      console.error("NotificationContext fetch error:", err);
    } finally {
      setLoadingNotifs(false);
    }
  }, [token]);

  useEffect(() => {
    if (!token) return;
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [token, fetchNotifications]);

  const markAllRead = async () => {
    if (!token || unreadCount === 0) return;
    try {
      await fetch(`${API}/notifications/read-all`, {
        method:  "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err) {
      console.error("markAllRead error:", err);
    }
  };

  const deleteNotification = async (id) => {
    if (!token) return;
    try {
      await fetch(`${API}/notifications/${id}`, {
        method:  "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications((prev) => prev.filter((n) => n._id !== id));
      setUnreadCount((prev) =>
        Math.max(0, prev - (notifications.find((n) => n._id === id && !n.isRead) ? 1 : 0))
      );
    } catch (err) {
      console.error("deleteNotification error:", err);
    }
  };

  const clearAll = async () => {
    if (!token) return;
    try {
      await fetch(`${API}/notifications/clear-all`, {
        method:  "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications([]);
      setUnreadCount(0);
    } catch (err) {
      console.error("clearAll error:", err);
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loadingNotifs,
        fetchNotifications,
        markAllRead,
        deleteNotification,
        clearAll,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationContext);

export default NotificationContext;