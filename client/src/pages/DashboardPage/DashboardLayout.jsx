// client/src/pages/DashboardPage/DashboardLayout.jsx
import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  LogOut,
  Users,
  Home as HomeIcon,
  TrendingUp,
  Menu,
  X,
  DollarSign,
  LayoutList,
} from "lucide-react";
import NotificationBell from "../../components/NotificationBell/NotificationBell";
import "./Dashboard.css";

function DashboardLayout({ children }) {
  const navigate  = useNavigate();
  const location  = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const token = localStorage.getItem("token");

  const handleLogout = () => {
    localStorage.removeItem("token");   // fixed: was "authToken"
    localStorage.removeItem("user");
    if (window.google) window.google.accounts.id.disableAutoSelect();
    navigate("/");
  };

  const isActive = (path) => location.pathname === path;

  const navItems = [
    { to: "/dashboard",          icon: <HomeIcon  size={20} />, label: "Dashboard"  },
    { to: "/dashboard/groups",   icon: <Users     size={20} />, label: "Groups"     },
    { to: "/dashboard/balances", icon: <DollarSign size={20} />, label: "Balances"  },
    { to: "/dashboard/expenses", icon: <LayoutList size={20} />, label: "Expenses"  },
    { to: "/dashboard/activity", icon: <TrendingUp size={20} />, label: "Activity"  },
  ];

  return (
    <div className="dashboard-container">

      {/* ── Sidebar ──────────────────────────────────────────── */}
      <aside className={`sidebar ${isSidebarOpen ? "sidebar-open" : ""}`}>
        <div className="sidebar-header">
          <h2 className="sidebar-logo">ExpenseTracker</h2>
          <button className="sidebar-close" onClick={() => setIsSidebarOpen(false)}>
            <X size={20} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {navItems.map(({ to, icon, label }) => (
            <Link
              key={to}
              to={to}
              className={`nav-item ${isActive(to) ? "active" : ""}`}
              onClick={() => setIsSidebarOpen(false)}
            >
              {icon}
              <span>{label}</span>
            </Link>
          ))}
        </nav>

        <button className="logout-btn" onClick={handleLogout}>
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </aside>

      {/* ── Main Content ──────────────────────────────────────── */}
      <main className="main-content">

        {/* Mobile / Top Header */}
        <div className="mobile-header">
          <button className="menu-btn" onClick={() => setIsSidebarOpen(true)}>
            <Menu size={24} />
          </button>
          <h1 className="mobile-title">ExpenseTracker</h1>

          {/* Notification Bell — top-right of header */}
          <div className="header-right-actions">
            <NotificationBell token={token} />
          </div>
        </div>

        {/* Page Content */}
        {children}
      </main>

      {/* Sidebar overlay on mobile */}
      {isSidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
}

export default DashboardLayout;