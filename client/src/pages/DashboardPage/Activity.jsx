// client/src/pages/DashboardPage/Activity.jsx
import { useState, useEffect } from "react";
import { Calendar, Trash2 } from "lucide-react";
import DashboardLayout from "./DashboardLayout";
import "./Dashboard.css";

const ICON_MAP = {
  expense_added:      "💰",
  expense_deleted:    "🗑️",
  payment_made:       "💸",  // legacy type — kept for old DB records
  payment_requested:  "📤",
  payment_confirmed:  "✅",
  payment_rejected:   "❌",
  group_created:      "👥",
  group_deleted:      "🚫",
  member_added:       "➕",
  member_removed:     "➖",
  group_left:         "🚪",
};

// "Payments" filter covers both legacy (payment_made) and new (payment_confirmed)
// by sending no type filter and letting the UI show all payment-related items,
// OR we keep two entries. Here we use a comma-separated multi-type param
// that the backend can handle, with graceful fallback.
const FILTERS = [
  { label: "All",       value: "all"              },
  { label: "Expenses",  value: "expense_added"    },
  { label: "Payments",  value: "payment_confirmed,payment_made" }, // covers old + new records
  { label: "Requests",  value: "payment_requested" },
  { label: "Groups",    value: "group_created"    },
];

// Payment-type values — used to suppress "(group deleted)" badge
const PAYMENT_TYPES = new Set([
  "payment_made",
  "payment_confirmed",
  "payment_requested",
  "payment_rejected",
]);

function Activity() {
  const [filterType, setFilterType] = useState("all");
  const [activities, setActivities] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);

  const token = localStorage.getItem("token");

  useEffect(() => { fetchActivities(filterType); }, [filterType]);

  const fetchActivities = async (type = "all") => {
    try {
      setLoading(true);
      setError(null);
      const url = type === "all"
        ? "http://localhost:5000/api/activity"
        : `http://localhost:5000/api/activity?type=${type}`;
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

  const handleDeleteActivity = async (id) => {
    if (!window.confirm("Delete this activity from your history?")) return;
    try {
      const res = await fetch(`http://localhost:5000/api/activity/${id}`, {
        method:  "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to delete");
      setActivities((prev) => prev.filter((a) => a._id !== id));
    } catch (err) {
      console.error("Delete activity error:", err);
      alert("Failed to delete activity. Please try again.");
    }
  };

  // Bug 1 fix: falls back to activity.time (string) if createdAt is absent
  const formatTime = (createdAt, fallbackTime) => {
    const source = createdAt || fallbackTime;
    if (!source) return "";
    const d    = new Date(source);
    if (isNaN(d.getTime())) return String(source); // raw string fallback
    const diff = Math.floor((Date.now() - d) / 1000);
    if (diff < 60)    return "just now";
    if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return d.toLocaleDateString("en-PK", { day: "numeric", month: "short" });
  };

  return (
    <DashboardLayout>
      <div className="dashboard-header">
        <div>
          <h1 className="page-title">Activity</h1>
          <p className="page-subtitle">Your complete history</p>
        </div>
      </div>

      {/* Filter Buttons */}
      <div className="filter-container">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            className={`filter-btn ${filterType === f.value ? "active" : ""}`}
            onClick={() => setFilterType(f.value)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="loading-state"><div className="spinner" /><p>Loading activities...</p></div>
      )}

      {error && !loading && (
        <div className="error-state">
          <p className="error-message">{error}</p>
          <button className="btn-primary" onClick={() => fetchActivities(filterType)}>Retry</button>
        </div>
      )}

      {!loading && !error && (
        activities.length > 0 ? (
          <div className="activity-timeline">
            {activities.map((activity) => (
              <div
                key={activity._id}
                className={`activity-item ${!activity.isRead ? "activity-unread" : ""}`}
              >
                <div className="activity-icon-container">
                  <span className="activity-emoji">
                    {ICON_MAP[activity.type] || "📌"}
                  </span>
                </div>

                <div className="activity-content">
                  <div className="activity-header">
                    <h3 className="activity-description">{activity.description}</h3>
                    <div className="activity-header-right">
                      {/* Bug 1 fix: pass both createdAt and legacy time field */}
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

                  {/* Related user pill — shows the OTHER person involved */}
                  {activity.relatedUser && (
                    <span className="activity-related-user">
                      👤 {activity.relatedUser?.name || "Someone"}
                    </span>
                  )}

                  {/* Group badge — graceful when group is deleted */}
                  {activity.group ? (
                    <span className="activity-group-badge">
                      {activity.group?.name || activity.group}
                    </span>
                  ) : !PAYMENT_TYPES.has(activity.type) && activity.type !== "group_deleted" ? (
                    <span className="activity-group-badge deleted">(group deleted)</span>
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
        )
      )}
    </DashboardLayout>
  );
}

export default Activity;