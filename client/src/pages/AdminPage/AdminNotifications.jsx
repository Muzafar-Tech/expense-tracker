// client/src/pages/AdminPage/AdminNotifications.jsx
import { useState, useEffect, useCallback } from "react";
import { Search, Trash2, Bell, Send, X, Loader } from "lucide-react";
import {
  getAdminNotifications,
  deleteAdminNotification,
  broadcastNotification,
  getAdminUsers,
} from "../../api/adminApi";
import "./Admin.css";

export default function AdminNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [users,         setUsers]         = useState([]);
  const [filterUser,    setFilterUser]    = useState("");
  const [search,        setSearch]        = useState("");
  const [deleteId,      setDeleteId]      = useState(null);
  const [submitting,    setSubmitting]    = useState(false);

  const [showBroadcast, setShowBroadcast] = useState(false);
  const [broadcastForm, setBroadcastForm] = useState({ message: "", detail: "", userId: "" });
  const [broadcastErr,  setBroadcastErr]  = useState("");
  const [broadcastOk,   setBroadcastOk]   = useState("");

  /* ── Fetch users ────────────────────────────────────────── */
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await getAdminUsers();
        setUsers(res.data);
      } catch (err) {
        console.error("fetchUsers error:", err);
      }
    };
    fetchUsers();
  }, []);

  /* ── Fetch notifications ────────────────────────────────── */
  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getAdminNotifications(filterUser || "");
      setNotifications(res.data);
    } catch (err) {
      console.error("fetchNotifications error:", err);
    } finally {
      setLoading(false);
    }
  }, [filterUser]);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  /* ── Search ─────────────────────────────────────────────── */
  const filtered = notifications.filter((n) =>
    n.message?.toLowerCase().includes(search.toLowerCase()) ||
    n.recipient?.name?.toLowerCase().includes(search.toLowerCase())
  );

  /* ── Delete ─────────────────────────────────────────────── */
  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      setSubmitting(true);
      await deleteAdminNotification(deleteId);
      setDeleteId(null);
      fetchNotifications();
    } catch (err) {
      console.error("deleteNotification error:", err);
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Broadcast ──────────────────────────────────────────── */
  const handleBroadcast = async () => {
    if (!broadcastForm.message.trim()) {
      setBroadcastErr("Message is required");
      return;
    }
    try {
      setSubmitting(true);
      setBroadcastErr("");
      setBroadcastOk("");
      const res = await broadcastNotification({
        message: broadcastForm.message,
        detail:  broadcastForm.detail,
        userId:  broadcastForm.userId || undefined,
      });
      setBroadcastOk(res.data.message);
      setBroadcastForm({ message: "", detail: "", userId: "" });
      fetchNotifications();
    } catch (err) {
      setBroadcastErr(err.response?.data?.message || "Failed to send");
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Type color ─────────────────────────────────────────── */
  const typeColor = (type) => {
    if (type === "payment_confirmed") return { bg: "var(--green-dim)",  color: "var(--green)"       };
    if (type === "payment_rejected")  return { bg: "var(--red-dim)",    color: "var(--red)"         };
    if (type === "payment_request")   return { bg: "var(--amber-dim)",  color: "var(--amber)"       };
    if (type === "admin_broadcast")   return { bg: "var(--accent-dim)", color: "var(--accent-soft)" };
    return { bg: "var(--glass-white-md)", color: "var(--text-secondary)" };
  };

  const unreadCount = filtered.filter((n) => !n.isRead).length;

  if (loading) {
    return (
      <div className="admin-loading">
        <div className="spinner" />
        <p>Loading notifications...</p>
      </div>
    );
  }

  return (
    <div>
      {/* ── Top bar ───────────────────────────────────── */}
      <div className="admin-topbar">
        <div className="admin-topbar-left">
          <h1 className="admin-page-title">Notifications</h1>
          <p className="admin-page-subtitle">
            {filtered.length} total — {unreadCount} unread
          </p>
        </div>
        <div className="admin-topbar-right">
          <button
            className="btn-primary"
            onClick={() => { setShowBroadcast(true); setBroadcastErr(""); setBroadcastOk(""); }}
          >
            <Send size={15} /> Send Notification
          </button>
        </div>
      </div>

      {/* ── Stats — 3 cards so use cols-3 ─────────────── */}
      <div className="admin-stats-grid cols-3" style={{ marginBottom: 24 }}>
        <div className="admin-stat-card blue">
          <div className="admin-stat-label">Total</div>
          <div className="admin-stat-value">{filtered.length}</div>
        </div>
        <div className="admin-stat-card amber">
          <div className="admin-stat-label">Unread</div>
          <div className="admin-stat-value">{unreadCount}</div>
        </div>
        <div className="admin-stat-card green">
          <div className="admin-stat-label">Read</div>
          <div className="admin-stat-value">{filtered.length - unreadCount}</div>
        </div>
      </div>

      {/* ── Table ─────────────────────────────────────── */}
      <div className="admin-table-container">
        <div className="admin-table-header">
          <span className="admin-table-title">All Notifications</span>
          <div className="admin-table-actions">

            <div className="search-container" style={{ marginBottom: 0, minWidth: 200 }}>
              <Search size={15} className="search-icon" />
              <input
                className="search-input"
                placeholder="Search notifications..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <select
              className="form-select"
              style={{ minWidth: 170 }}
              value={filterUser}
              onChange={(e) => setFilterUser(e.target.value)}
            >
              <option value="">All Users</option>
              {users.map((u) => (
                <option key={u._id} value={u._id}>{u.name}</option>
              ))}
            </select>

          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="admin-empty-state">
            <Bell size={32} />
            <p className="admin-empty-text">No notifications found</p>
          </div>
        ) : (
          <div className="admin-table-scroll">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Recipient</th>
                  <th>Type</th>
                  <th>Message</th>
                  <th>Detail</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((notif) => {
                  const { bg, color } = typeColor(notif.type);
                  return (
                    <tr key={notif._id}>

                      {/* Recipient */}
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                          <div className="avatar" style={{ width: 26, height: 26, fontSize: 10 }}>
                            {notif.recipient?.name?.[0]?.toUpperCase() ?? "?"}
                          </div>
                          <span className="font-semibold">
                            {notif.recipient?.name ?? "Unknown"}
                          </span>
                        </div>
                      </td>

                      {/* Type */}
                      <td>
                        <span style={{
                          padding: "3px 9px",
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 600,
                          background: bg,
                          color,
                          whiteSpace: "nowrap",
                          display: "inline-block",
                        }}>
                          {notif.type?.replace(/_/g, " ") ?? "unknown"}
                        </span>
                      </td>

                      {/* Message — wrap allowed */}
                      <td className="wrap-cell" style={{ fontSize: 13 }}>
                        {notif.message}
                      </td>

                      {/* Detail — wrap allowed */}
                      <td className="wrap-cell" style={{ color: "var(--text-muted)", fontSize: 12 }}>
                        {notif.detail || "—"}
                      </td>

                      {/* Read status */}
                      <td>
                        <span style={{
                          padding: "2px 8px",
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 600,
                          whiteSpace: "nowrap",
                          display: "inline-block",
                          background: notif.isRead ? "var(--green-dim)"  : "var(--amber-dim)",
                          color:      notif.isRead ? "var(--green)"       : "var(--amber)",
                        }}>
                          {notif.isRead ? "Read" : "Unread"}
                        </span>
                      </td>

                      {/* Date */}
                      <td>
                        {new Date(notif.createdAt).toLocaleDateString("en-PK", {
                          day: "numeric", month: "short", year: "numeric",
                        })}
                      </td>

                      {/* Actions */}
                      <td onClick={(e) => e.stopPropagation()}>
                        <button
                          className="admin-action-btn danger"
                          onClick={() => setDeleteId(notif._id)}
                        >
                          <Trash2 size={12} /> Delete
                        </button>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Broadcast modal ────────────────────────────── */}
      {showBroadcast && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title">Send Notification</h2>
              <button className="modal-close-btn" onClick={() => setShowBroadcast(false)}>
                <X size={16} />
              </button>
            </div>
            <p className="modal-subtitle">
              Send a notification to a specific user or broadcast to <strong>all users</strong> at once.
            </p>
            {broadcastErr && <div className="form-error">{broadcastErr}</div>}
            {broadcastOk && (
              <div style={{
                padding: "10px 14px",
                background: "var(--green-dim)",
                border: "1px solid rgba(52,211,153,0.25)",
                borderRadius: 8,
                color: "var(--green)",
                fontSize: 13,
                marginBottom: 16,
              }}>
                {broadcastOk}
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Send To</label>
              <select
                className="form-select"
                value={broadcastForm.userId}
                onChange={(e) => setBroadcastForm({ ...broadcastForm, userId: e.target.value })}
              >
                <option value="">All Users (Broadcast)</option>
                {users.map((u) => (
                  <option key={u._id} value={u._id}>{u.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Message</label>
              <input
                className="form-input"
                placeholder="e.g. System maintenance scheduled..."
                value={broadcastForm.message}
                onChange={(e) => setBroadcastForm({ ...broadcastForm, message: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Detail (optional)</label>
              <input
                className="form-input"
                placeholder="e.g. App will be down for 30 minutes"
                value={broadcastForm.detail}
                onChange={(e) => setBroadcastForm({ ...broadcastForm, detail: e.target.value })}
              />
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowBroadcast(false)} disabled={submitting}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleBroadcast} disabled={submitting}>
                {submitting ? <Loader size={15} /> : <Send size={15} />}
                {submitting ? "Sending..." : "Send"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete confirm modal ───────────────────────── */}
      {deleteId && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title">Delete Notification</h2>
              <button className="modal-close-btn" onClick={() => setDeleteId(null)}>
                <X size={16} />
              </button>
            </div>
            <p className="modal-subtitle">
              Are you sure you want to delete this notification? This cannot be undone.
            </p>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setDeleteId(null)} disabled={submitting}>
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={handleDelete}
                disabled={submitting}
                style={{
                  background: "linear-gradient(135deg, var(--red) 0%, #c0392b 100%)",
                  boxShadow:  "0 4px 20px var(--red-glow)",
                }}
              >
                {submitting ? <Loader size={15} /> : <Trash2 size={15} />}
                {submitting ? "Deleting..." : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}