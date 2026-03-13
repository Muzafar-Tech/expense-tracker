// client/src/components/NotificationBell/NotificationBell.jsx
import { useState, useRef, useEffect } from "react";
import { Bell, X, CheckCircle, XCircle } from "lucide-react";
import { useNotifications } from "../../contexts/NotificationContext";
import "./NotificationBell.css";

/* ── Icon helper — emoji per notification type ─────────────── */
const getIcon = (type) => {
  const map = {
    payment_request:    { emoji: "💸", cls: "amber"  },
    payment_confirmed:  { emoji: "✅", cls: "green"  },
    payment_rejected:   { emoji: "❌", cls: "red"    },
    reminder:           { emoji: "🔔", cls: "amber"  },
    added_to_group:     { emoji: "👥", cls: "purple" },
    removed_from_group: { emoji: "🚫", cls: "red"    },
    group_deleted:      { emoji: "🗑️", cls: "red"    },
    expense_added:      { emoji: "💰", cls: "purple" },
  };
  return map[type] || { emoji: "📌", cls: "purple" };
};

/* ── Time formatter ────────────────────────────────────────── */
const timeAgo = (dateStr) => {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60)       return "just now";
  if (diff < 3600)     return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400)    return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

export default function NotificationBell({ token, onSettleAction }) {
  const {
    notifications,
    unreadCount,
    loadingNotifs,
    markAllRead,
    deleteNotification,
    clearAll,
    fetchNotifications,
  } = useNotifications();

  const [open, setOpen]             = useState(false);
  const [actionLoading, setAction]  = useState(null); // settlementId being actioned
  const dropdownRef                 = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleOpen = () => {
    setOpen((prev) => !prev);
    if (!open && unreadCount > 0) markAllRead();
  };

  // Inline Confirm from the bell dropdown
  const handleConfirm = async (notif) => {
    if (!notif.balanceId || !notif.settlementId) return;
    setAction(notif.settlementId);
    try {
      const res = await fetch("http://localhost:5000/api/balances/confirm", {
        method:  "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization:  `Bearer ${token}`,
        },
        body: JSON.stringify({
          balanceId:    notif.balanceId,
          amount:       notif.settlementAmount,
          settlementId: notif.settlementId,
        }),
      });
      if (res.ok) {
        await deleteNotification(notif._id);
        await fetchNotifications();
        // Tell Balances.jsx to re-fetch
        if (onSettleAction) onSettleAction();
        window.dispatchEvent(new CustomEvent("balanceUpdated"));
      } else {
        const err = await res.json();
        alert(err.message || "Failed to confirm payment");
      }
    } catch (err) {
      console.error("inline confirm error:", err);
    } finally {
      setAction(null);
    }
  };

  // Inline Reject from the bell dropdown
  const handleReject = async (notif) => {
    if (!notif.balanceId || !notif.settlementId) return;
    setAction(notif.settlementId);
    try {
      const res = await fetch("http://localhost:5000/api/balances/reject", {
        method:  "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization:  `Bearer ${token}`,
        },
        body: JSON.stringify({
          balanceId:    notif.balanceId,
          settlementId: notif.settlementId,
        }),
      });
      if (res.ok) {
        await deleteNotification(notif._id);
        await fetchNotifications();
        if (onSettleAction) onSettleAction();
        window.dispatchEvent(new CustomEvent("balanceUpdated"));
      } else {
        const err = await res.json();
        alert(err.message || "Failed to reject payment");
      }
    } catch (err) {
      console.error("inline reject error:", err);
    } finally {
      setAction(null);
    }
  };

  return (
    <div className="notif-bell-wrapper" ref={dropdownRef}>

      {/* Bell button */}
      <button className="notif-bell-btn" onClick={handleOpen} title="Notifications">
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="notif-badge">{unreadCount > 99 ? "99+" : unreadCount}</span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="notif-dropdown">

          <div className="notif-dropdown-header">
            <h4>Notifications {unreadCount > 0 && `(${unreadCount} new)`}</h4>
            {notifications.length > 0 && (
              <button className="notif-clear-btn" onClick={clearAll}>
                Clear all
              </button>
            )}
          </div>

          {loadingNotifs ? (
            <div className="notif-loading">Loading...</div>
          ) : notifications.length === 0 ? (
            <div className="notif-empty">
              <span style={{ fontSize: 28 }}>🔔</span>
              <span>No notifications yet</span>
            </div>
          ) : (
            <div className="notif-list">
              {notifications.map((notif) => {
                const { emoji, cls } = getIcon(notif.type);
                const isPending = notif.type === "payment_request" && notif.settlementId;
                const isActioning = actionLoading === notif.settlementId;

                return (
                  <div
                    key={notif._id}
                    className={`notif-item ${!notif.isRead ? "unread" : ""}`}
                  >
                    <div className={`notif-icon ${cls}`}>{emoji}</div>

                    <div className="notif-body">
                      <p className="notif-message">{notif.message}</p>
                      {notif.detail && (
                        <p className="notif-detail">{notif.detail}</p>
                      )}
                      <span className="notif-time">{timeAgo(notif.createdAt)}</span>

                      {/* Inline confirm/reject for payment requests */}
                      {isPending && (
                        <div className="notif-actions">
                          <button
                            className="notif-action-confirm"
                            disabled={isActioning}
                            onClick={() => handleConfirm(notif)}
                          >
                            <CheckCircle size={11} style={{ marginRight: 3 }} />
                            {isActioning ? "..." : "Confirm"}
                          </button>
                          <button
                            className="notif-action-reject"
                            disabled={isActioning}
                            onClick={() => handleReject(notif)}
                          >
                            <XCircle size={11} style={{ marginRight: 3 }} />
                            {isActioning ? "..." : "Reject"}
                          </button>
                        </div>
                      )}
                    </div>

                    <button
                      className="notif-delete-btn"
                      onClick={(e) => { e.stopPropagation(); deleteNotification(notif._id); }}
                      title="Dismiss"
                    >
                      <X size={13} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}