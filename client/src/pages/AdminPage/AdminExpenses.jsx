// client/src/pages/AdminPage/AdminExpenses.jsx
import { useState, useEffect, useCallback } from "react";
import { useLocation }                       from "react-router-dom";
import { Search, Trash2, Receipt, X, Loader } from "lucide-react";
import {
  getAdminExpenses,
  deleteAdminExpense,
  getAdminUsers,
  getAdminGroups,
} from "../../api/adminApi";
import "./Admin.css";

export default function AdminExpenses() {
  const location                          = useLocation();
  const [expenses,    setExpenses]        = useState([]);
  const [loading,     setLoading]         = useState(true);
  const [users,       setUsers]           = useState([]);
  const [groups,      setGroups]          = useState([]);
  const [filterUser,  setFilterUser]      = useState("");
  const [filterGroup, setFilterGroup]     = useState("");
  const [search,      setSearch]          = useState("");
  const [deleteId,    setDeleteId]        = useState(null);
  const [deleteDesc,  setDeleteDesc]      = useState("");
  const [submitting,  setSubmitting]      = useState(false);

  /* ── Read groupId from URL query param ─────────────────── */
  useEffect(() => {
    const params   = new URLSearchParams(location.search);
    const groupId  = params.get("groupId");
    if (groupId) setFilterGroup(groupId);
  }, [location.search]);

  /* ── Fetch filters ──────────────────────────────────────── */
  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const [uRes, gRes] = await Promise.all([
          getAdminUsers(),
          getAdminGroups(),
        ]);
        setUsers(uRes.data);
        setGroups(gRes.data);
      } catch (err) {
        console.error("fetchFilters error:", err);
      }
    };
    fetchFilters();
  }, []);

  /* ── Fetch expenses ─────────────────────────────────────── */
  const fetchExpenses = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getAdminExpenses({
        userId:  filterUser  || undefined,
        groupId: filterGroup || undefined,
      });
      setExpenses(res.data);
    } catch (err) {
      console.error("fetchExpenses error:", err);
    } finally {
      setLoading(false);
    }
  }, [filterUser, filterGroup]);

  useEffect(() => { fetchExpenses(); }, [fetchExpenses]);

  /* ── Search ─────────────────────────────────────────────── */
  const filtered = expenses.filter((e) =>
    e.description?.toLowerCase().includes(search.toLowerCase()) ||
    e.paidBy?.name?.toLowerCase().includes(search.toLowerCase())
  );

  /* ── Total ──────────────────────────────────────────────── */
  const total = filtered.reduce((sum, e) => sum + (e.amount ?? 0), 0);

  /* ── Delete ─────────────────────────────────────────────── */
  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      setSubmitting(true);
      await deleteAdminExpense(deleteId);
      setDeleteId(null);
      setDeleteDesc("");
      fetchExpenses();
    } catch (err) {
      console.error("deleteExpense error:", err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-loading">
        <div className="spinner" />
        <p>Loading expenses...</p>
      </div>
    );
  }

  return (
    <div>
      {/* ── Top bar ───────────────────────────────────── */}
      <div className="admin-topbar">
        <div className="admin-topbar-left">
          <h1 className="admin-page-title">Expenses</h1>
          <p className="admin-page-subtitle">
            {filtered.length} expense{filtered.length !== 1 ? "s" : ""} —
            Total: Rs {total.toLocaleString()}
          </p>
        </div>
      </div>

      {/* ── Summary card ──────────────────────────────── */}
      <div className="summary-card" style={{ marginBottom: 20 }}>
        <div className="summary-item">
          <span className="summary-label">Total Volume</span>
          <span className="summary-value">Rs {total.toLocaleString()}</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Total Expenses</span>
          <span className="summary-value">{filtered.length}</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Avg per Expense</span>
          <span className="summary-value">
            Rs {filtered.length > 0
              ? Math.round(total / filtered.length).toLocaleString()
              : 0}
          </span>
        </div>
      </div>

      {/* ── Filters ───────────────────────────────────── */}
      <div className="admin-table-container">
        <div className="admin-table-header">
          <span className="admin-table-title">All Expenses</span>
          <div className="admin-table-actions">

            {/* Search */}
            <div className="search-container" style={{ marginBottom: 0, minWidth: 180 }}>
              <Search size={15} className="search-icon" />
              <input
                className="search-input"
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Filter by user */}
            <select
              className="form-select"
              style={{ minWidth: 160 }}
              value={filterUser}
              onChange={(e) => setFilterUser(e.target.value)}
            >
              <option value="">All Users</option>
              {users.map((u) => (
                <option key={u._id} value={u._id}>{u.name}</option>
              ))}
            </select>

            {/* Filter by group */}
            <select
              className="form-select"
              style={{ minWidth: 160 }}
              value={filterGroup}
              onChange={(e) => setFilterGroup(e.target.value)}
            >
              <option value="">All Groups</option>
              {groups.map((g) => (
                <option key={g._id} value={g._id}>{g.name}</option>
              ))}
            </select>

          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="admin-empty-state">
            <Receipt size={32} />
            <p className="admin-empty-text">No expenses found</p>
          </div>
        ) : (
          <div className="expenses-table-container" style={{ border: "none", borderRadius: 0 }}>
            <div className="admin-table-scroll">
            <table className="expenses-table admin-table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Paid By</th>
                  <th>Group</th>
                  <th>Split Among</th>
                  <th>Amount</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((expense) => (
                  <tr key={expense._id}>
                    <td className="expense-description-cell">
                      {expense.description}
                    </td>
                    <td>
                      <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                        {expense.paidBy?.name ?? "Multiple / Unknown"}
                      </span>
                    </td>
                    <td>
                      {expense.group ? (
                        <span className="group-badge">{expense.group.name}</span>
                      ) : (
                        <span style={{ color: "var(--text-muted)" }}>—</span>
                      )}
                    </td>
                    <td className="split-members" style={{ fontSize: 12 }}>
                      {expense.splitBetween?.map((u) => u?.name).join(", ") || "—"}
                    </td>
                    <td className="expense-amount-cell">
                      Rs {expense.amount?.toLocaleString()}
                    </td>
                    <td>
                      {new Date(expense.createdAt).toLocaleDateString("en-PK", {
                        day: "numeric", month: "short", year: "numeric",
                      })}
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <button
                        className="admin-action-btn danger"
                        onClick={() => {
                          setDeleteId(expense._id);
                          setDeleteDesc(expense.description);
                        }}
                      >
                        <Trash2 size={12} /> Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        )}
      </div>

      {/* ── Delete confirm modal ───────────────────────── */}
      {deleteId && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title">Delete Expense</h2>
              <button
                className="modal-close-btn"
                onClick={() => setDeleteId(null)}
              >
                <X size={16} />
              </button>
            </div>
            <p className="modal-subtitle">
              Are you sure you want to delete{" "}
              <strong>{deleteDesc}</strong>? This cannot be undone.
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