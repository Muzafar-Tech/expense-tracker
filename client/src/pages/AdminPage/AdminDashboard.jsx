// client/src/pages/AdminPage/AdminDashboard.jsx
import { useState, useEffect } from "react";
import { useNavigate }         from "react-router-dom";
import {
  Users, FolderKanban, Receipt,
  ArrowLeftRight, Bell, TrendingUp,
} from "lucide-react";
import { getAdminStats, getAdminUsers } from "../../api/adminApi";
import { useAuth }                      from "../../contexts/AuthContext";
import "./Admin.css";

export default function AdminDashboard() {
  const [stats,       setStats]       = useState(null);
  const [recentUsers, setRecentUsers] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const navigate                      = useNavigate();
  const { currentUser }               = useAuth();

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [statsRes, usersRes] = await Promise.all([
          getAdminStats(),
          getAdminUsers(),
        ]);
        setStats(statsRes.data);
        setRecentUsers(usersRes.data.slice(0, 5));
      } catch (err) {
        console.error("AdminDashboard fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  if (loading) {
    return (
      <div className="admin-loading">
        <div className="spinner" />
        <p>Loading dashboard...</p>
      </div>
    );
  }

  const statCards = [
    {
      label: "Total Users",
      value: stats?.totalUsers ?? 0,
      color: "blue",
    },
    {
      label: "Total Groups",
      value: stats?.totalGroups ?? 0,
      color: "green",
    },
    {
      label: "Expense Volume",
      value: `Rs ${(stats?.totalExpenseVolume ?? 0).toLocaleString()}`,
      color: "amber",
    },
    {
      label: "Pending Settlements",
      value: stats?.pendingSettlements ?? 0,
      color: "red",
    },
    {
      label: "Unread Notifications",
      value: stats?.unreadNotifications ?? 0,
      color: "blue",
    },
  ];

  return (
    <div>
      {/* ── Top bar ───────────────────────────────────── */}
      <div className="admin-topbar">
        <div className="admin-topbar-left">
          <h1 className="admin-page-title">
            Welcome, {currentUser?.name ?? "Admin"} 👋
          </h1>
          <p className="admin-page-subtitle">
            Here's everything at a glance
          </p>
        </div>
        <div className="admin-topbar-right">
          <span className="admin-badge">
            <TrendingUp size={13} />
            Admin Panel
          </span>
        </div>
      </div>

      {/* ── Stats grid ────────────────────────────────── */}
      <div className="admin-stats-grid">
        {statCards.map((card) => (
          <div className={`admin-stat-card ${card.color}`} key={card.label}>
            <div className="admin-stat-label">{card.label}</div>
            <div className="admin-stat-value">{card.value}</div>
          </div>
        ))}
      </div>

      {/* ── Recent users table ────────────────────────── */}
      <div className="admin-table-container">
        <div className="admin-table-header">
          <span className="admin-table-title">Recent Users</span>
          <button
            className="btn-secondary"
            onClick={() => navigate("/admin/users")}
          >
            View All
          </button>
        </div>

        {recentUsers.length === 0 ? (
          <div className="admin-empty-state">
            <Users size={32} />
            <p className="admin-empty-text">No users found</p>
          </div>
        ) : (
          <div className="admin-table-scroll">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Groups</th>
                  <th>Net Balance</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {recentUsers.map((user) => (
                  <tr
                    key={user._id}
                    onClick={() => navigate(`/admin/users/${user._id}`)}
                  >
                    <td className="font-semibold">{user.name}</td>
                    <td>{user.email}</td>
                    <td>{user.groupCount ?? 0}</td>
                    <td>
                      <span
                        style={{
                          color:
                            user.netBalance > 0
                              ? "var(--green)"
                              : user.netBalance < 0
                              ? "var(--red)"
                              : "var(--text-muted)",
                          fontFamily: "Syne, sans-serif",
                          fontWeight: 700,
                        }}
                      >
                        Rs {user.netBalance?.toLocaleString() ?? 0}
                      </span>
                    </td>
                    <td>
                      {new Date(user.createdAt).toLocaleDateString("en-PK", {
                        day:   "numeric",
                        month: "short",
                        year:  "numeric",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}