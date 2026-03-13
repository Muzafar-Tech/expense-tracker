// client/src/pages/AdminPage/AdminLayout.jsx
import { useState }  from "react";
import { Outlet }    from "react-router-dom";
import { Menu }      from "lucide-react";
import AdminSidebar  from "../../components/AdminSidebar/AdminSidebar";
import { useAuth }   from "../../contexts/AuthContext";
import "./AdminLayout.css";

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { currentUser } = useAuth();

  return (
    <div className="admin-container">

      <AdminSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <main className="admin-main">
        {/* Mobile top bar */}
        <div className="admin-mobile-header">
          <button
            className="menu-btn"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={20} />
          </button>
          <span className="admin-mobile-title">
            {currentUser?.name ?? "Admin"}
          </span>
        </div>

        {/* All admin pages render here */}
        <Outlet />
      </main>

    </div>
  );
}