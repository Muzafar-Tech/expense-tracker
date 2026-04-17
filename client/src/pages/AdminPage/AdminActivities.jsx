// client/src/pages/AdminPage/AdminActivities.jsx
import { useState, useEffect, useCallback } from "react";
import { Search, Trash2, Activity, X, Loader } from "lucide-react";
import {
  getAdminActivities,
  deleteAdminActivity,
  getAdminUsers,
} from "../../api/adminApi";
import "./Admin.css";

export default function AdminActivities() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [filterUser, setFilterUser] = useState("");
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState(null);
  const [deleteDesc, setDeleteDesc] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const getUserCount = (userId) => {
    return activities.filter((a) => a.user?._id === userId).length;
  };
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

  /* ── Fetch activities ───────────────────────────────────── */
  const fetchActivities = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getAdminActivities(filterUser || "");
      setActivities(res.data);
    } catch (err) {
      console.error("fetchActivities error:", err);
    } finally {
      setLoading(false);
    }
  }, [filterUser]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  /* ── Search filter ──────────────────────────────────────── */
  const filtered = activities.filter(
    (a) =>
      a.description?.toLowerCase().includes(search.toLowerCase()) ||
      a.user?.name?.toLowerCase().includes(search.toLowerCase()) ||
      a.detail?.toLowerCase().includes(search.toLowerCase()),
  );

  /* ── Delete ─────────────────────────────────────────────── */
  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      setSubmitting(true);
      await deleteAdminActivity(deleteId);
      setDeleteId(null);
      setDeleteDesc("");
      fetchActivities();
    } catch (err) {
      console.error("deleteActivity error:", err);
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Activity type color ────────────────────────────────── */
  const typeColor = (type) => {
    if (type?.includes("confirmed"))
      return { bg: "var(--green-dim)", color: "var(--green)" };
    if (type?.includes("rejected"))
      return { bg: "var(--red-dim)", color: "var(--red)" };
    if (type?.includes("requested"))
      return { bg: "var(--amber-dim)", color: "var(--amber)" };
    if (type?.includes("expense"))
      return { bg: "var(--accent-dim)", color: "var(--accent-soft)" };
    return { bg: "var(--glass-white-md)", color: "var(--text-secondary)" };
  };

  /* ── Activity emoji ─────────────────────────────────────── */
  const typeEmoji = (type) => {
    if (type?.includes("confirmed")) return "✅";
    if (type?.includes("rejected")) return "❌";
    if (type?.includes("requested")) return "📤";
    if (type?.includes("expense")) return "💸";
    if (type?.includes("group")) return "👥";
    return "📋";
  };

  if (loading) {
    return (
      <div className="admin-loading">
        <div className="spinner" />
        <p>Loading activities...</p>
      </div>
    );
  }

  const handleDeleteAll = async () => {
    if (!window.confirm("Delete activities?")) return;

    try {
      setSubmitting(true);

      // 🔥 CASE 1: ALL USERS
      if (!filterUser) {
        await deleteAdminActivity("ALL"); // backend handle karega

        setActivities([]); // instant UI
      }

      // 🔥 CASE 2: SINGLE USER
      else {
        await deleteAdminActivity(`user:${filterUser}`);

        setActivities((prev) => prev.filter((a) => a.user?._id !== filterUser));
      }
    } catch (err) {
      console.error("delete all error:", err);
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <div>
      {/* ── Top bar ───────────────────────────────────── */}
      <div className="admin-topbar">
        <div className="admin-topbar-left">
          <h1 className="admin-page-title">Activities</h1>
          <p className="admin-page-subtitle">
            {filtered.length} activit{filtered.length !== 1 ? "ies" : "y"}
            {filterUser
              ? ` for ${users.find((u) => u._id === filterUser)?.name ?? "user"}`
              : " across all users"}
          </p>
        </div>
      </div>

      {/* ── Table ─────────────────────────────────────── */}
      <div className="admin-table-container">
        <div className="admin-table-header">
          <span className="admin-table-title">Activity Log</span>
          <div className="admin-table-actions">
            <div
              className="search-container"
              style={{ marginBottom: 0, minWidth: 200 }}
            >
              <Search size={15} className="search-icon" />
              <input
                className="search-input"
                placeholder="Search activities..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              className="form-select"
              value={filterUser}
              onChange={(e) => setFilterUser(e.target.value)}
            >
              <option value="">All Users ({activities.length})</option>

              {users.map((u) => (
                <option key={u._id} value={u._id}>
                  {u.name} ({getUserCount(u._id)})
                </option>
              ))}

              {users.map((u) => (
                <option key={u._id} value={u._id}>
                  {u.name} ({getUserCount(u._id)})
                </option>
              ))}
            </select>
            <button
              className="admin-action-btn danger"
              onClick={handleDeleteAll}
            >
              <Trash2 size={14} />
              {filterUser ? "Delete User Activities" : "Delete All"}
            </button>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="admin-empty-state">
            <Activity size={32} />
            <p className="admin-empty-text">No activities found</p>
          </div>
        ) : (
          <div className="admin-table-scroll">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>User</th>
                  <th>Description</th>
                  <th>Detail</th>
                  <th>Related User</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((activity) => {
                  const { bg, color } = typeColor(activity.type);
                  return (
                    <tr key={activity._id}>
                      {/* Type badge */}
                      <td>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                            padding: "3px 9px",
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 600,
                            background: bg,
                            color,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {typeEmoji(activity.type)}{" "}
                          {activity.type?.replace(/_/g, " ") ?? "unknown"}
                        </span>
                      </td>

                      {/* User */}
                      <td>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 7,
                          }}
                        >
                          <div
                            className="avatar"
                            style={{ width: 26, height: 26, fontSize: 10 }}
                          >
                            {activity.user?.name?.[0]?.toUpperCase() ?? "?"}
                          </div>
                          <span className="font-semibold">
                            {activity.user?.name ?? "Unknown"}
                          </span>
                        </div>
                      </td>

                      {/* Description — allowed to wrap, capped width */}
                      <td className="wrap-cell">{activity.description}</td>

                      {/* Detail — allowed to wrap, capped width */}
                      <td
                        className="wrap-cell"
                        style={{ color: "var(--text-muted)", fontSize: 12 }}
                      >
                        {activity.detail || "—"}
                      </td>

                      {/* Related user */}
                      <td
                        style={{ fontSize: 12, color: "var(--text-secondary)" }}
                      >
                        {activity.relatedUser?.name ?? "—"}
                      </td>

                      {/* Date */}
                      <td>
                        {new Date(activity.createdAt).toLocaleDateString(
                          "en-PK",
                          {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          },
                        )}
                      </td>

                      {/* Actions */}
                      <td onClick={(e) => e.stopPropagation()}>
                        <button
                          className="admin-action-btn danger"
                          onClick={() => {
                            setDeleteId(activity._id);
                            setDeleteDesc(activity.description);
                          }}
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

      {/* ── Delete confirm modal ───────────────────────── */}
      {deleteId && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title">Delete Activity</h2>
              <button
                className="modal-close-btn"
                onClick={() => setDeleteId(null)}
              >
                <X size={16} />
              </button>
            </div>
            <p className="modal-subtitle">
              Are you sure you want to delete this activity?
              <br />
              <strong>{deleteDesc}</strong>
            </p>
            <div className="modal-actions">
              <button
                className="btn-secondary"
                onClick={() => setDeleteId(null)}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={handleDelete}
                disabled={submitting}
                style={{
                  background:
                    "linear-gradient(135deg, var(--red) 0%, #c0392b 100%)",
                  boxShadow: "0 4px 20px var(--red-glow)",
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
