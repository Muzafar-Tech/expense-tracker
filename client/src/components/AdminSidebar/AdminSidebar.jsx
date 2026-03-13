// client/src/components/AdminSidebar/AdminSidebar.jsx
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Users, FolderKanban, Receipt,
  Scale, Activity, Bell, ArrowLeftRight, LogOut, X,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import "./AdminSidebar.css";

const navItems = [
  {
    section: "Overview",
    items: [
      { label: "Dashboard",      path: "/admin",               icon: LayoutDashboard },
    ],
  },
  {
    section: "Manage",
    items: [
      { label: "Users",          path: "/admin/users",          icon: Users           },
      { label: "Groups",         path: "/admin/groups",         icon: FolderKanban    },
      { label: "Expenses",       path: "/admin/expenses",       icon: Receipt         },
      { label: "Balances",       path: "/admin/balances",       icon: Scale           },
    ],
  },
  {
    section: "Logs",
    items: [
      { label: "Activities",     path: "/admin/activities",     icon: Activity        },
      { label: "Notifications",  path: "/admin/notifications",  icon: Bell            },
      { label: "Settlements",    path: "/admin/settlements",    icon: ArrowLeftRight  },
    ],
  },
];

export default function AdminSidebar({ isOpen, onClose }) {
  const { logout, currentUser } = useAuth();
  const navigate                = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/auth");
  };

  return (
    <>
      {isOpen && (
        <div className="admin-sidebar-overlay" onClick={onClose} />
      )}

      <aside className={`admin-sidebar ${isOpen ? "admin-sidebar-open" : ""}`}>

        <div className="admin-sidebar-header">
          <div className="admin-sidebar-logo">
            <span className="admin-logo-title">ExpenseTracker</span>
            <span className="admin-logo-badge">Admin Panel</span>
          </div>
          <button className="admin-sidebar-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <nav className="admin-sidebar-nav">
          {navItems.map((section) => (
            <div className="admin-nav-section" key={section.section}>
              <span className="admin-nav-section-label">{section.section}</span>
              {section.items.map(({ label, path, icon: Icon }) => (
                <NavLink
                  key={path}
                  to={path}
                  end={path === "/admin"}
                  className={({ isActive }) =>
                    `admin-nav-item ${isActive ? "active" : ""}`
                  }
                  onClick={onClose}
                >
                  <Icon size={16} />
                  {label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <button className="admin-logout-btn" onClick={handleLogout}>
          <LogOut size={16} />
          Logout
        </button>

      </aside>
    </>
  );
}