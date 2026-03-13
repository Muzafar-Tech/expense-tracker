// client/src/pages/AdminPage/AdminUserDetail.jsx
import { useState, useEffect }  from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, User, Scale, FolderKanban,
  Activity, Bell, Trash2, X, Loader,
} from "lucide-react";
import {
  getAdminUserDetail,
  clearAdminBalance,
  overrideAdminBalance,
  deleteAdminActivity,
} from "../../api/adminApi";
import "./Admin.css";

export default function AdminUserDetail() {
  const { userId }                        = useParams();
  const navigate                          = useNavigate();
  const [data,          setData]          = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [activeTab,     setActiveTab]     = useState("balances");
  const [overrideId,    setOverrideId]    = useState(null);
  const [overrideAmt,   setOverrideAmt]   = useState("");
  const [overrideErr,   setOverrideErr]   = useState("");
  const [submitting,    setSubmitting]    = useState(false);

  /* ── Fetch ──────────────────────────────────────────────── */
  const fetchDetail = async () => {
    try {
      setLoading(true);
      const res = await getAdminUserDetail(userId);
      setData(res.data);
    } catch (err) {
      console.error("fetchDetail error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDetail(); }, [userId]);

  /* ── Clear balance ──────────────────────────────────────── */
  const handleClearBalance = async (balanceId) => {
    if (!window.confirm("Clear this balance completely?")) return;
    try {
      await clearAdminBalance(balanceId);
      fetchDetail();
    } catch (err) {
      console.error("clearBalance error:", err);
    }
  };

  /* ── Override balance ───────────────────────────────────── */
  const handleOverride = async () => {
    const parsed = parseFloat(overrideAmt);
    if (isNaN(parsed) || parsed < 0) {
      setOverrideErr("Enter a valid amount (0 or more)");
      return;
    }
    try {
      setSubmitting(true);
      setOverrideErr("");
      await overrideAdminBalance(overrideId, parsed);
      setOverrideId(null);
      setOverrideAmt("");
      fetchDetail();
    } catch (err) {
      setOverrideErr(err.response?.data?.message || "Failed to update");
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Delete activity ────────────────────────────────────── */
  const handleDeleteActivity = async (activityId) => {
    if (!window.confirm("Delete this activity?")) return;
    try {
      await deleteAdminActivity(activityId);
      fetchDetail();
    } catch (err) {
      console.error("deleteActivity error:", err);
    }
  };

  /* ── Initials ───────────────────────────────────────────── */
  const initials = (name) =>
    name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) ?? "?";

  if (loading) {
    return (
      <div className="admin-loading">
        <div className="spinner" />
        <p>Loading user details...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="admin-empty-state">
        <User size={32} />
        <p className="admin-empty-text">User not found</p>
      </div>
    );
  }

  const { user, groups, balances, activities, notifications, summary } = data;

  const tabs = [
    { key: "balances",      label: "Balances",      icon: Scale,        count: balances.length      },
    { key: "groups",        label: "Groups",        icon: FolderKanban, count: groups.length        },
    { key: "activities",    label: "Activities",    icon: Activity,     count: activities.length    },
    { key: "notifications", label: "Notifications", icon: Bell,         count: notifications.length },
  ];

  return (
    <div>
      {/* ── Back ──────────────────────────────────────── */}
      <div className="page-back">
        <button
          className="back-link"
          onClick={() => navigate("/admin/users")}
          style={{ background: "none", border: "none", cursor: "pointer" }}
        >
          <ArrowLeft size={16} /> Back to Users
        </button>
      </div>

      {/* ── User profile card ─────────────────────────── */}
      <div className="dashboard-section" style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
          {/* Avatar */}
          <div
            className="avatar-large"
            style={{ width: 64, height: 64, fontSize: 24, flexShrink: 0 }}
          >
            {initials(user.name)}
          </div>

          {/* Info */}
          <div style={{ flex: 1 }}>
            <h2 style={{
              fontFamily: "Syne, sans-serif",
              fontSize: 22, fontWeight: 700,
              color: "var(--text-primary)", marginBottom: 4,
            }}>
              {user.name}
            </h2>
            <p style={{ fontSize: 13, color: "var(--text-muted)" }}>{user.email}</p>
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
              Joined {new Date(user.createdAt).toLocaleDateString("en-PK", {
                day: "numeric", month: "long", year: "numeric",
              })}
            </p>
          </div>

          {/* Summary badges */}
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <div className="admin-stat-card red" style={{ padding: "12px 18px", minWidth: 120 }}>
              <div className="admin-stat-label">Owes</div>
              <div className="admin-stat-value" style={{ fontSize: 20 }}>
                Rs {summary.totalOwe.toLocaleString()}
              </div>
            </div>
            <div className="admin-stat-card green" style={{ padding: "12px 18px", minWidth: 120 }}>
              <div className="admin-stat-label">Owed</div>
              <div className="admin-stat-value" style={{ fontSize: 20 }}>
                Rs {summary.totalOwed.toLocaleString()}
              </div>
            </div>
            <div
              className={`admin-stat-card ${summary.netBalance >= 0 ? "green" : "red"}`}
              style={{ padding: "12px 18px", minWidth: 120 }}
            >
              <div className="admin-stat-label">Net Balance</div>
              <div className="admin-stat-value" style={{ fontSize: 20 }}>
                Rs {summary.netBalance.toLocaleString()}
              </div>
            </div>
            <div className="admin-stat-card blue" style={{ padding: "12px 18px", minWidth: 120 }}>
              <div className="admin-stat-label">Groups</div>
              <div className="admin-stat-value" style={{ fontSize: 20 }}>
                {summary.groupCount}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Tabs ──────────────────────────────────────── */}
      <div className="filter-container" style={{ marginBottom: 20 }}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={`filter-btn ${activeTab === tab.key ? "active" : ""}`}
            onClick={() => setActiveTab(tab.key)}
          >
            <tab.icon size={13} style={{ display: "inline", marginRight: 5 }} />
            {tab.label}
            <span className="admin-nav-badge" style={{ marginLeft: 6 }}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* ── Tab content ───────────────────────────────── */}

      {/* BALANCES */}
      {activeTab === "balances" && (
        <div className="admin-table-container">
          <div className="admin-table-header">
            <span className="admin-table-title">Balances</span>
          </div>
          {balances.length === 0 ? (
            <div className="admin-empty-state">
              <Scale size={28} />
              <p className="admin-empty-text">No balances</p>
            </div>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Other Person</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Groups</th>
                  <th>Pending</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {balances.map((b) => (
                  <tr key={b.balanceId}>
                    <td className="font-semibold">
                      {b.otherPerson?.name ?? "Unknown"}
                    </td>
                    <td>
                      <span
                        style={{
                          padding: "2px 8px",
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 600,
                          background: b.type === "owe"
                            ? "var(--red-dim)"
                            : "var(--green-dim)",
                          color: b.type === "owe"
                            ? "var(--red)"
                            : "var(--green)",
                        }}
                      >
                        {b.type === "owe" ? "Owes" : "Owed"}
                      </span>
                    </td>
                    <td style={{
                      fontFamily: "Syne, sans-serif",
                      fontWeight: 700,
                      color: b.type === "owe" ? "var(--red)" : "var(--green)",
                    }}>
                      Rs {b.amount.toLocaleString()}
                    </td>
                    <td style={{ color: "var(--text-muted)", fontSize: 12 }}>
                      {b.groups.join(", ") || "—"}
                    </td>
                    <td>
                      {b.pendingSettlements.length > 0 ? (
                        <span style={{
                          padding: "2px 8px", borderRadius: 6,
                          fontSize: 11, fontWeight: 600,
                          background: "var(--amber-dim)",
                          color: "var(--amber)",
                        }}>
                          {b.pendingSettlements.length} pending
                        </span>
                      ) : (
                        <span style={{ color: "var(--text-muted)", fontSize: 12 }}>—</span>
                      )}
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          className="admin-action-btn primary"
                          onClick={() => {
                            setOverrideId(b.balanceId);
                            setOverrideAmt(b.amount.toString());
                            setOverrideErr("");
                          }}
                        >
                          Edit
                        </button>
                        <button
                          className="admin-action-btn danger"
                          onClick={() => handleClearBalance(b.balanceId)}
                        >
                          <Trash2 size={12} /> Clear
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* GROUPS */}
      {activeTab === "groups" && (
        <div className="admin-table-container">
          <div className="admin-table-header">
            <span className="admin-table-title">Groups</span>
          </div>
          {groups.length === 0 ? (
            <div className="admin-empty-state">
              <FolderKanban size={28} />
              <p className="admin-empty-text">Not in any groups</p>
            </div>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Group Name</th>
                  <th>Members</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {groups.map((g) => (
                  <tr key={g._id}>
                    <td className="font-semibold">{g.name}</td>
                    <td>{g.members?.length ?? 0}</td>
                    <td>
                      {new Date(g.createdAt).toLocaleDateString("en-PK", {
                        day: "numeric", month: "short", year: "numeric",
                      })}
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <button
                        className="admin-action-btn primary"
                        onClick={() => navigate(`/admin/groups`)}
                      >
                        <FolderKanban size={12} /> View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ACTIVITIES */}
      {activeTab === "activities" && (
        <div className="admin-table-container">
          <div className="admin-table-header">
            <span className="admin-table-title">Recent Activities</span>
          </div>
          {activities.length === 0 ? (
            <div className="admin-empty-state">
              <Activity size={28} />
              <p className="admin-empty-text">No activities</p>
            </div>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Detail</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {activities.map((a) => (
                  <tr key={a._id}>
                    <td className="font-semibold">{a.description}</td>
                    <td style={{ color: "var(--text-muted)", fontSize: 12 }}>
                      {a.detail || "—"}
                    </td>
                    <td>
                      {new Date(a.createdAt).toLocaleDateString("en-PK", {
                        day: "numeric", month: "short", year: "numeric",
                      })}
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <button
                        className="admin-action-btn danger"
                        onClick={() => handleDeleteActivity(a._id)}
                      >
                        <Trash2 size={12} /> Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* NOTIFICATIONS */}
      {activeTab === "notifications" && (
        <div className="admin-table-container">
          <div className="admin-table-header">
            <span className="admin-table-title">Notifications</span>
          </div>
          {notifications.length === 0 ? (
            <div className="admin-empty-state">
              <Bell size={28} />
              <p className="admin-empty-text">No notifications</p>
            </div>
          ) : (
            <div className="admin-table-scroll">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Message</th>
                  <th>Type</th>
                  <th>Read</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {notifications.map((n) => (
                  <tr key={n._id}>
                    <td className="font-semibold">{n.message}</td>
                    <td>
                      <span className="group-badge">{n.type}</span>
                    </td>
                    <td>
                      <span style={{
                        color: n.isRead ? "var(--green)" : "var(--amber)",
                        fontWeight: 600, fontSize: 12,
                      }}>
                        {n.isRead ? "Read" : "Unread"}
                      </span>
                    </td>
                    <td>
                      {new Date(n.createdAt).toLocaleDateString("en-PK", {
                        day: "numeric", month: "short", year: "numeric",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </div>
      )}

      {/* ── Override balance modal ─────────────────────── */}
      {overrideId && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title">Override Balance</h2>
              <button
                className="modal-close-btn"
                onClick={() => { setOverrideId(null); setOverrideErr(""); }}
              >
                <X size={16} />
              </button>
            </div>

            <p className="modal-subtitle">
              Set a new amount for this balance. Enter <strong>0</strong> to
              clear it completely.
            </p>

            {overrideErr && <div className="form-error">{overrideErr}</div>}

            <div className="form-group">
              <label className="form-label">New Amount (Rs)</label>
              <input
                className="form-input"
                type="number"
                min="0"
                value={overrideAmt}
                onChange={(e) => setOverrideAmt(e.target.value)}
              />
            </div>

            <div className="modal-actions">
              <button
                className="btn-secondary"
                onClick={() => { setOverrideId(null); setOverrideErr(""); }}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={handleOverride}
                disabled={submitting}
              >
                {submitting ? <Loader size={15} /> : null}
                {submitting ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}