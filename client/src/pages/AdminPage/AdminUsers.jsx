// client/src/pages/AdminPage/AdminUsers.jsx
import { useState, useEffect } from "react";
import { useNavigate }         from "react-router-dom";
import {
  Search, UserPlus, Trash2, Eye,
  Users, X, Loader,
} from "lucide-react";
import {
  getAdminUsers,
  createAdminUser,
  deleteAdminUser,
} from "../../api/adminApi";
import "./Admin.css";

export default function AdminUsers() {
  const [users,       setUsers]       = useState([]);
  const [filtered,    setFiltered]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState("");
  const [showModal,   setShowModal]   = useState(false);
  const [deleteId,    setDeleteId]    = useState(null);
  const [deleteName,  setDeleteName]  = useState("");
  const [submitting,  setSubmitting]  = useState(false);
  const [error,       setError]       = useState("");
  const [form,        setForm]        = useState({
    name: "", email: "", password: "",
  });
  const navigate = useNavigate();

  /* ── Fetch ──────────────────────────────────────────────── */
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await getAdminUsers();
      setUsers(res.data);
      setFiltered(res.data);
    } catch (err) {
      console.error("fetchUsers error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  /* ── Search filter ──────────────────────────────────────── */
  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(
      users.filter(
        (u) =>
          u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q)
      )
    );
  }, [search, users]);

  /* ── Create user ────────────────────────────────────────── */
  const handleCreate = async () => {
    if (!form.name || !form.email || !form.password) {
      setError("All fields are required");
      return;
    }
    try {
      setSubmitting(true);
      setError("");
      await createAdminUser(form);
      setShowModal(false);
      setForm({ name: "", email: "", password: "" });
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create user");
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Delete user ────────────────────────────────────────── */
  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      setSubmitting(true);
      await deleteAdminUser(deleteId);
      setDeleteId(null);
      setDeleteName("");
      fetchUsers();
    } catch (err) {
      console.error("deleteUser error:", err);
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Avatar initials ────────────────────────────────────── */
  const initials = (name) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  if (loading) {
    return (
      <div className="admin-loading">
        <div className="spinner" />
        <p>Loading users...</p>
      </div>
    );
  }

  return (
    <div>
      {/* ── Top bar ───────────────────────────────────── */}
      <div className="admin-topbar">
        <div className="admin-topbar-left">
          <h1 className="admin-page-title">Users</h1>
          <p className="admin-page-subtitle">
            {users.length} total user{users.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="admin-topbar-right">
          <button
            className="btn-primary"
            onClick={() => { setShowModal(true); setError(""); }}
          >
            <UserPlus size={15} />
            Add User
          </button>
        </div>
      </div>

      {/* ── Table ─────────────────────────────────────── */}
      <div className="admin-table-container">
        <div className="admin-table-header">
          <span className="admin-table-title">All Users</span>
          <div className="admin-table-actions">
            {/* Search */}
            <div className="search-container" style={{ marginBottom: 0, minWidth: 220 }}>
              <Search size={15} className="search-icon" />
              <input
                className="search-input"
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="admin-empty-state">
            <Users size={32} />
            <p className="admin-empty-text">No users found</p>
          </div>
        ) : (
          <div className="admin-table-scroll">
          <table className="admin-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Groups</th>
                <th>Owes</th>
                <th>Owed</th>
                <th>Net</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((user) => (
                <tr key={user._id}>
                  {/* User */}
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div className="avatar" style={{ width: 32, height: 32, fontSize: 12 }}>
                        {initials(user.name)}
                      </div>
                      <span className="font-semibold">{user.name}</span>
                    </div>
                  </td>

                  {/* Email */}
                  <td>{user.email}</td>

                  {/* Groups */}
                  <td>{user.groupCount ?? 0}</td>

                  {/* Owes */}
                  <td style={{ color: "var(--red)", fontWeight: 600 }}>
                    Rs {user.totalOwe?.toLocaleString() ?? 0}
                  </td>

                  {/* Owed */}
                  <td style={{ color: "var(--green)", fontWeight: 600 }}>
                    Rs {user.totalOwed?.toLocaleString() ?? 0}
                  </td>

                  {/* Net */}
                  <td>
                    <span
                      style={{
                        fontFamily: "Syne, sans-serif",
                        fontWeight: 700,
                        color:
                          user.netBalance > 0
                            ? "var(--green)"
                            : user.netBalance < 0
                            ? "var(--red)"
                            : "var(--text-muted)",
                      }}
                    >
                      Rs {user.netBalance?.toLocaleString() ?? 0}
                    </span>
                  </td>

                  {/* Joined */}
                  <td>
                    {new Date(user.createdAt).toLocaleDateString("en-PK", {
                      day: "numeric", month: "short", year: "numeric",
                    })}
                  </td>

                  {/* Actions */}
                  <td onClick={(e) => e.stopPropagation()}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        className="admin-action-btn primary"
                        onClick={() => navigate(`/admin/users/${user._id}`)}
                      >
                        <Eye size={13} /> View
                      </button>
                      <button
                        className="admin-action-btn danger"
                        onClick={() => {
                          setDeleteId(user._id);
                          setDeleteName(user.name);
                        }}
                      >
                        <Trash2 size={13} /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {/* ── Add User Modal ─────────────────────────────── */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title">Add New User</h2>
              <button
                className="modal-close-btn"
                onClick={() => { setShowModal(false); setError(""); }}
              >
                <X size={16} />
              </button>
            </div>

            {error && <div className="form-error">{error}</div>}

            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input
                className="form-input"
                placeholder="e.g. Ali Hassan"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                className="form-input"
                type="email"
                placeholder="e.g. ali@gmail.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                className="form-input"
                type="password"
                placeholder="Min 6 characters"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>

            <div className="modal-actions">
              <button
                className="btn-secondary"
                onClick={() => { setShowModal(false); setError(""); }}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={handleCreate}
                disabled={submitting}
              >
                {submitting ? <Loader size={15} className="spinning" /> : <UserPlus size={15} />}
                {submitting ? "Creating..." : "Create User"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm Modal ───────────────────────── */}
      {deleteId && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title">Delete User</h2>
              <button
                className="modal-close-btn"
                onClick={() => setDeleteId(null)}
              >
                <X size={16} />
              </button>
            </div>

            <p className="modal-subtitle">
              Are you sure you want to delete <strong>{deleteName}</strong>?
              This will permanently remove their account, balances, activities
              and notifications. This cannot be undone.
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