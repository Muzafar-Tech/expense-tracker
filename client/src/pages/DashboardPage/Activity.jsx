import { useState, useEffect } from "react";
import { Calendar, Trash2 } from "lucide-react";
import DashboardLayout from "./DashboardLayout";
import "./Dashboard.css";

const API = process.env.REACT_APP_API_URL;

const ICON_MAP = {
  expense_added: "💰",
  expense_deleted: "🗑️",
  payment_made: "💸",
  payment_requested: "📤",
  payment_confirmed: "✅",
  payment_rejected: "❌",
  group_created: "👥",
  group_deleted: "🚫",
  member_added: "➕",
  member_removed: "➖",
  group_left: "🚪",
};

const FILTERS = [
  { label: "All", value: "all" },
  { label: "Expenses", value: "expense_added" },
  { label: "Payments", value: "payment_confirmed,payment_made" },
  { label: "Requests", value: "payment_requested" },
  { label: "Groups", value: "group_created" },
];

const PAYMENT_TYPES = new Set([
  "payment_made",
  "payment_confirmed",
  "payment_requested",
  "payment_rejected",
]);

function Activity() {
  const [filterType, setFilterType] = useState("all");
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const token = localStorage.getItem("token");
  const getCountByType = (type) => {
    if (type === "all") return activities.length;

    const types = type.split(",");

    return activities.filter((a) => types.includes(a.type)).length;
  };
  useEffect(() => {
    fetchActivities(filterType);
  }, [filterType]);

  const fetchActivities = async (type = "all") => {
    try {
      setLoading(true);
      setError(null);

      const url =
        type === "all" ? `${API}/activity` : `${API}/activity?type=${type}`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Failed to fetch activities");

      const data = await res.json();
      setActivities(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Activity fetch error:", err);
      setError("Failed to load activities");
      setActivities([]);
    } finally {
      setLoading(false);
    }
  };

  // ✅ DELETE SINGLE
  const handleDeleteActivity = async (id) => {
    if (!window.confirm("Delete this activity from your history?")) return;

    try {
      const res = await fetch(`${API}/activity/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Failed to delete");

      setActivities((prev) => prev.filter((a) => a._id !== id));
    } catch (err) {
      console.error("Delete activity error:", err);
      alert("Failed to delete activity.");
    }
  };

  // ✅ DELETE ALL (FILTER BASED)
  const handleDeleteAll = async () => {
    const message =
      filterType === "all"
        ? "Delete ALL activities? This cannot be undone."
        : "Delete filtered activities only?";

    if (!window.confirm(message)) return;

    try {
      const url =
        filterType === "all"
          ? `${API}/activity`
          : `${API}/activity?type=${filterType}`;

      const res = await fetch(url, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Failed to delete");

      // UI update
      if (filterType === "all") {
        setActivities([]);
      } else {
        setActivities((prev) =>
          prev.filter((a) => !filterType.includes(a.type)),
        );
      }
    } catch (err) {
      console.error("Delete all error:", err);
      alert("Failed to delete activities.");
    }
  };

  const formatTime = (createdAt, fallbackTime) => {
    const source = createdAt || fallbackTime;
    if (!source) return "";

    const d = new Date(source);
    if (isNaN(d.getTime())) return String(source);

    const diff = Math.floor((Date.now() - d) / 1000);

    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;

    return d.toLocaleDateString("en-PK", {
      day: "numeric",
      month: "short",
    });
  };

  return (
    <DashboardLayout>
      <div className="dashboard-header">
        <div>
          <h1 className="page-title">Activity</h1>
          <p className="page-subtitle">Your complete history</p>
        </div>
      </div>

      {/* ✅ FILTER + DELETE ALL */}
      <div className="filter-container">
        <div className="filter-left">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              className={`filter-btn ${filterType === f.value ? "active" : ""}`}
              onClick={() => setFilterType(f.value)}
            >
              {f.label}

              {/* 🔥 COUNT BADGE */}
              <span className="filter-count">{getCountByType(f.value)}</span>
            </button>
          ))}
        </div>

        {/* ✅ NEW BUTTON */}
        <button className="filter-btn" onClick={handleDeleteAll}>
          Delete All
        </button>
      </div>

      {loading && (
        <div className="loading-state">
          <div className="spinner" />
          <p>Loading activities...</p>
        </div>
      )}

      {error && !loading && (
        <div className="error-state">
          <p className="error-message">{error}</p>
          <button
            className="btn-primary"
            onClick={() => fetchActivities(filterType)}
          >
            Retry
          </button>
        </div>
      )}

      {!loading &&
        !error &&
        (activities.length > 0 ? (
          <div className="activity-timeline">
            {activities.map((activity) => (
              <div
                key={activity._id}
                className={`activity-item ${
                  !activity.isRead ? "activity-unread" : ""
                }`}
              >
                <div className="activity-icon-container">
                  <span className="activity-emoji">
                    {ICON_MAP[activity.type] || "📌"}
                  </span>
                </div>

                <div className="activity-content">
                  <div className="activity-header">
                    <h3 className="activity-description">
                      {activity.description}
                    </h3>

                    <div className="activity-header-right">
                      <span className="activity-time">
                        {formatTime(activity.createdAt, activity.time)}
                      </span>

                      <button
                        className="activity-delete-btn"
                        onClick={() => handleDeleteActivity(activity._id)}
                        title="Delete this activity"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {activity.detail && (
                    <p className="activity-detail">{activity.detail}</p>
                  )}

                  {activity.relatedUser && (
                    <span className="activity-related-user">
                      👤 {activity.relatedUser?.name || "Someone"}
                    </span>
                  )}

                  {activity.group ? (
                    <span className="activity-group-badge">
                      {activity.group?.name || activity.group}
                    </span>
                  ) : !PAYMENT_TYPES.has(activity.type) &&
                    activity.type !== "group_deleted" ? (
                    <span className="activity-group-badge deleted">
                      (group deleted)
                    </span>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <Calendar size={48} />
            <p>No activities found</p>
          </div>
        ))}
    </DashboardLayout>
  );
}

export default Activity;
