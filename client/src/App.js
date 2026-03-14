// client/src/App.js
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
  Navigate,
} from "react-router-dom";

import Navbar        from "./components/Navbar/Navbar";
import Home          from "./pages/Home/Home";
import AuthPage      from "./pages/AuthPage/AuthPage";
import Dashboard     from "./pages/DashboardPage/Dashboard";
import Groups        from "./pages/DashboardPage/Groups";
import GroupDetail   from "./pages/DashboardPage/GroupDetail";
import Activity      from "./pages/DashboardPage/Activity";
import AllExpenses   from "./pages/DashboardPage/AllExpenses";
import Balances      from "./pages/DashboardPage/Balances";
import Notifications from "./pages/DashboardPage/Notifications";

import AdminLayout        from "./pages/AdminPage/AdminLayout";
import AdminDashboard     from "./pages/AdminPage/AdminDashboard";
import AdminUsers         from "./pages/AdminPage/AdminUsers";
import AdminUserDetail    from "./pages/AdminPage/AdminUserDetail";
import AdminGroups        from "./pages/AdminPage/AdminGroups";
import AdminExpenses      from "./pages/AdminPage/AdminExpenses";
import AdminBalances      from "./pages/AdminPage/AdminBalances";
import AdminActivities    from "./pages/AdminPage/AdminActivities";
import AdminNotifications from "./pages/AdminPage/AdminNotifications";
import AdminSettlements   from "./pages/AdminPage/AdminSettlements";

import { AuthProvider, useAuth }    from "./contexts/AuthContext";
import { NotificationProvider }     from "./contexts/NotificationContext";

import "./App.css";

/* ── Only admins can enter /admin/* ───────────────────────── */
function AdminRoute({ children }) {
  const { currentUser, loadingUser } = useAuth();
  if (loadingUser) return null;
  if (!currentUser)                    return <Navigate to="/auth"      replace />;
  if (currentUser.role !== "admin")    return <Navigate to="/dashboard" replace />;
  return children;
}

/* ── Redirect admin away from /dashboard ─────────────────── */
function UserRoute({ children }) {
  const { currentUser, loadingUser } = useAuth();
  if (loadingUser) return null;
  if (currentUser?.role === "admin")   return <Navigate to="/admin"     replace />;
  return children;
}

function AppContent() {
  const location         = useLocation();
  const showNavbar       = location.pathname === "/" || location.pathname === "/auth";
  const isDashboardRoute = location.pathname.startsWith("/dashboard");
  const isAdminRoute     = location.pathname.startsWith("/admin");

  return (
    <div className="bg-slate-50 text-slate-900">
      {showNavbar && <Navbar />}

      {isAdminRoute ? (
        <AdminRoute>
          <Routes>
            <Route path="/admin" element={<AdminLayout />}>
              <Route index                  element={<AdminDashboard />}     />
              <Route path="users"           element={<AdminUsers />}         />
              <Route path="users/:userId"   element={<AdminUserDetail />}    />
              <Route path="groups"          element={<AdminGroups />}        />
              <Route path="expenses"        element={<AdminExpenses />}      />
              <Route path="balances"        element={<AdminBalances />}      />
              <Route path="activities"      element={<AdminActivities />}    />
              <Route path="notifications"   element={<AdminNotifications />} />
              <Route path="settlements"     element={<AdminSettlements />}   />
            </Route>
          </Routes>
        </AdminRoute>

      ) : isDashboardRoute ? (
        <UserRoute>
          <Routes>
            <Route path="/dashboard"                 element={<Dashboard />}     />
            <Route path="/dashboard/groups"          element={<Groups />}        />
            <Route path="/dashboard/groups/:groupId" element={<GroupDetail />}   />
            <Route path="/dashboard/activity"        element={<Activity />}      />
            <Route path="/dashboard/expenses"        element={<AllExpenses />}   />
            <Route path="/dashboard/balances"        element={<Balances />}      />
            <Route path="/dashboard/notifications"   element={<Notifications />} />
          </Routes>
        </UserRoute>

      ) : (
        <main >
          <Routes>
            <Route path="/"     element={<Home />}     />
            <Route path="/auth" element={<AuthPage />} />
          </Routes>
        </main>
      )}
    </div>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <NotificationProvider>
          <AppContent />
        </NotificationProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;