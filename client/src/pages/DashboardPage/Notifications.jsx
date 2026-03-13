// client/src/pages/DashboardPage/Notifications.jsx
import { useEffect } from "react";
import { Bell, Trash2, CheckCircle, XCircle, X } from "lucide-react";
import DashboardLayout from "./DashboardLayout";
import { useNotifications } from "../../contexts/NotificationContext";
import "./Notifications.css";

const ICON_MAP = {
  payment_request:    { emoji: "💸", label: "Payment Request" },
  payment_confirmed:  { emoji: "✅", label: "Payment Confirmed" },
  payment_rejected:   { emoji: "❌", label: "Payment Rejected" },
  reminder:           { emoji: "🔔", label: "Reminder" },
  added_to_group:     { emoji: "👥", label: "Added to Group" },
  removed_from_group: { emoji: "🚫", label: "Removed from Group" },
  group_deleted:      { emoji: "🗑️", label: "Group Deleted" },
  expense_added:      { emoji: "💰", label: "Expense Added" },
};

const timeAgo = (dateStr) => {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60)    return "just now";
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

export default function Notifications() {
  const {
    notifications,
    unreadCount,
    loadingNotifs,
    markAllRead,
    deleteNotification,
    clearAll,
  } = useNotifications();

  // Mark all read when the page is opened
  useEffect(() => {
    if (unreadCount > 0) markAllRead();
  }, []);

  return (
    <DashboardLayout>
      <div className="dashboard-header">
        <div>
          <h1 className="page-title">Notifications</h1>
          <p className="page-subtitle">Your inbox — things that happened involving you</p>
        </div>
        {notifications.length > 0 && (
          <button className="btn-secondary" onClick={clearAll}>
            <X size={16} /> Clear All
          </button>
        )}
      </div>

      {loadingNotifs && (
        <div className="loading-state"><div className="spinner" /><p>Loading...</p></div>
      )}

      {!loadingNotifs && notifications.length === 0 && (
        <div className="empty-state" style={{ marginTop: 60 }}>
          <Bell size={48} />
          <p>You're all caught up! No notifications.</p>
        </div>
      )}

      {!loadingNotifs && notifications.length > 0 && (
        <div className="notif-page-list">
          {notifications.map((notif) => {
            const { emoji, label } = ICON_MAP[notif.type] || { emoji: "📌", label: "Notification" };

            return (
              <div
                key={notif._id}
                className={`notif-page-item ${!notif.isRead ? "notif-page-unread" : ""}`}
              >
                {/* Left: icon */}
                <div className="notif-page-icon">{emoji}</div>

                {/* Middle: content */}
                <div className="notif-page-body">
                  <div className="notif-page-top">
                    <span className="notif-page-type-label">{label}</span>
                    <span className="notif-page-time">{timeAgo(notif.createdAt)}</span>
                  </div>

                  <p className="notif-page-message">{notif.message}</p>
                  {notif.detail && <p className="notif-page-detail">{notif.detail}</p>}

                  {notif.sender && (
                    <p className="notif-page-sender">
                      From: <strong>{notif.sender?.name || "Someone"}</strong>
                      {notif.sender?.email && ` (${notif.sender.email})`}
                    </p>
                  )}

                  {notif.groupId && (
                    <span className="notif-page-group-badge">
                      {notif.groupId?.name || "Group"}
                    </span>
                  )}
                </div>

                {/* Right: dismiss */}
                <button
                  className="notif-page-delete"
                  onClick={() => deleteNotification(notif._id)}
                  title="Dismiss"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
}