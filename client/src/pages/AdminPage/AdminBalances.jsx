// client/src/pages/AdminPage/AdminBalances.jsx
import { useState, useEffect } from "react";
import {
  Scale, Trash2, X, Loader,
  Search, ArrowLeftRight,
} from "lucide-react";
import {
  getAdminBalances,
  clearAdminBalance,
  overrideAdminBalance,
  forceConfirmSettlement,
  getAdminUsers,
} from "../../api/adminApi";
import "./Admin.css";

export default function AdminBalances() {
  const [balances,    setBalances]    = useState([]);
  const [filtered,    setFiltered]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [users,       setUsers]       = useState([]);
  const [search,      setSearch]      = useState("");
  const [filterUser,  setFilterUser]  = useState("");

  // Override modal
  const [overrideId,  setOverrideId]  = useState(null);
  const [overrideAmt, setOverrideAmt] = useState("");
  const [overrideErr, setOverrideErr] = useState("");

  // Force confirm modal
  const [confirmData, setConfirmData] = useState(null);

  const [submitting,  setSubmitting]  = useState(false);

  /* ── Fetch ──────────────────────────────────────────────── */
  const fetchAll = async () => {
    try {
      setLoading(true);
      const [bRes, uRes] = await Promise.all([
        getAdminBalances(),
        getAdminUsers(),
      ]);
      setBalances(bRes.data);
      setFiltered(bRes.data);
      setUsers(uRes.data);
    } catch (err) {
      console.error("fetchAll error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  /* ── Filter ─────────────────────────────────────────────── */
  useEffect(() => {
    let list = balances;

    if (filterUser) {
      list = list.filter(
        (b) =>
          b.user?._id === filterUser ||
          b.person?._id === filterUser
      );
    }

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (b) =>
          b.user?.name?.toLowerCase().includes(q) ||
          b.person?.name?.toLowerCase().includes(q)
      );
    }

    setFiltered(list);
  }, [search, filterUser, balances]);

  /* ── Clear balance ──────────────────────────────────────── */
  const handleClear = async (balanceId) => {
    if (!window.confirm("Clear this balance completely?")) return;
    try {
      await clearAdminBalance(balanceId);
      fetchAll();
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
      fetchAll();
    } catch (err) {
      setOverrideErr(err.response?.data?.message || "Failed to update");
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Force confirm settlement ───────────────────────────── */
  const handleForceConfirm = async () => {
    if (!confirmData) return;
    try {
      setSubmitting(true);
      await forceConfirmSettlement(
        confirmData.balanceId,
        confirmData.settlementId
      );
      setConfirmData(null);
      fetchAll();
    } catch (err) {
      console.error("forceConfirm error:", err);
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Totals ─────────────────────────────────────────────── */
  const totalVolume = filtered.reduce((sum, b) => sum + (b.amount ?? 0), 0);
  const pendingCount = filtered.reduce(
    (sum, b) =>
      sum + (b.pendingSettlements?.filter((s) => s.status === "pending").length ?? 0),
    0
  );

  if (loading) {
    return (
      <div className="admin-loading">
        <div className="spinner" />
        <p>Loading balances...</p>
      </div>
    );
  }

  return (
    <div>
      {/* ── Top bar ───────────────────────────────────── */}
      <div className="admin-topbar">
        <div className="admin-topbar-left">
          <h1 className="admin-page-title">Balances</h1>
          <p className="admin-page-subtitle">
            {filtered.length} active balance{filtered.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* ── Summary ───────────────────────────────────── */}
      <div className="admin-stats-grid" style={{ marginBottom: 24 }}>
        <div className="admin-stat-card blue">
          <div className="admin-stat-label">Active Balances</div>
          <div className="admin-stat-value">{filtered.length}</div>
        </div>
        <div className="admin-stat-card amber">
          <div className="admin-stat-label">Total Volume</div>
          <div className="admin-stat-value">
            Rs {totalVolume.toLocaleString()}
          </div>
        </div>
        <div className="admin-stat-card red">
          <div className="admin-stat-label">Pending Requests</div>
          <div className="admin-stat-value">{pendingCount}</div>
        </div>
      </div>

      {/* ── Table ─────────────────────────────────────── */}
      <div className="admin-table-container">
        <div className="admin-table-header">
          <span className="admin-table-title">All Balances</span>
          <div className="admin-table-actions">

            {/* Search */}
            <div className="search-container" style={{ marginBottom: 0, minWidth: 180 }}>
              <Search size={15} className="search-icon" />
              <input
                className="search-input"
                placeholder="Search by name..."
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

          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="admin-empty-state">
            <Scale size={32} />
            <p className="admin-empty-text">No balances found</p>
          </div>
        ) : (
          <div className="admin-table-scroll">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Creditor (Owed)</th>
                <th>Debtor (Owes)</th>
                <th>Amount</th>
                <th>Groups</th>
                <th>Pending Requests</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((balance) => {
                const pending = balance.pendingSettlements?.filter(
                  (s) => s.status === "pending"
                ) ?? [];

                return (
                  <tr key={balance._id}>
                    {/* Creditor */}
                    <td>
                      <div style={{
                        display: "flex", alignItems: "center", gap: 8,
                      }}>
                        <div
                          className="avatar"
                          style={{ width: 28, height: 28, fontSize: 11 }}
                        >
                          {balance.user?.name?.[0]?.toUpperCase() ?? "?"}
                        </div>
                        <div>
                          <div className="font-semibold">
                            {balance.user?.name ?? "Unknown"}
                          </div>
                          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                            {balance.user?.email}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Debtor */}
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div
                          className="avatar"
                          style={{
                            width: 28, height: 28, fontSize: 11,
                            background: "linear-gradient(135deg, var(--red) 0%, #c0392b 100%)",
                          }}
                        >
                          {balance.person?.name?.[0]?.toUpperCase() ?? "?"}
                        </div>
                        <div>
                          <div className="font-semibold">
                            {balance.person?.name ?? "Unknown"}
                          </div>
                          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                            {balance.person?.email}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Amount */}
                    <td style={{
                      fontFamily: "Syne, sans-serif",
                      fontWeight: 700,
                      color: "var(--accent-soft)",
                      fontSize: 16,
                    }}>
                      Rs {balance.amount?.toLocaleString()}
                    </td>

                    {/* Groups */}
                    <td>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                        {balance.groups?.map((g) => (
                          <span className="group-badge" key={g._id}>{g.name}</span>
                        ))}
                        {(!balance.groups || balance.groups.length === 0) && (
                          <span style={{ color: "var(--text-muted)", fontSize: 12 }}>—</span>
                        )}
                      </div>
                    </td>

                    {/* Pending requests */}
                    <td>
                      {pending.length === 0 ? (
                        <span style={{ color: "var(--text-muted)", fontSize: 12 }}>
                          None
                        </span>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          {pending.map((s) => (
                            <div
                              key={s._id}
                              style={{
                                padding: "6px 10px",
                                background: "var(--amber-dim)",
                                border: "1px solid rgba(251,191,36,0.2)",
                                borderRadius: 8,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: 8,
                              }}
                            >
                              <span style={{
                                color: "var(--amber)",
                                fontSize: 12, fontWeight: 600,
                              }}>
                                Rs {s.amount?.toLocaleString()}
                              </span>
                              <button
                                className="admin-action-btn success"
                                style={{ padding: "3px 8px", fontSize: 11 }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setConfirmData({
                                    balanceId:    balance._id,
                                    settlementId: s._id,
                                    amount:       s.amount,
                                  });
                                }}
                              >
                                <ArrowLeftRight size={11} /> Force
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </td>

                    {/* Actions */}
                    <td onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          className="admin-action-btn primary"
                          onClick={() => {
                            setOverrideId(balance._id);
                            setOverrideAmt(balance.amount?.toString() ?? "0");
                            setOverrideErr("");
                          }}
                        >
                          Edit
                        </button>
                        <button
                          className="admin-action-btn danger"
                          onClick={() => handleClear(balance._id)}
                        >
                          <Trash2 size={12} /> Clear
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {/* ── Override modal ─────────────────────────────── */}
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
              Set a new amount for this balance. Enter{" "}
              <strong>0</strong> to clear it completely.
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

      {/* ── Force confirm modal ────────────────────────── */}
      {confirmData && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title">Force Confirm Settlement</h2>
              <button
                className="modal-close-btn"
                onClick={() => setConfirmData(null)}
              >
                <X size={16} />
              </button>
            </div>
            <p className="modal-subtitle">
              Force-confirm this pending payment of{" "}
              <strong>Rs {confirmData.amount?.toLocaleString()}</strong>?
              This will reduce the balance immediately regardless of
              what the users have done.
            </p>
            <div className="modal-actions">
              <button
                className="btn-secondary"
                onClick={() => setConfirmData(null)}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={handleForceConfirm}
                disabled={submitting}
                style={{
                  background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
                  boxShadow:  "0 4px 16px var(--green-glow)",
                }}
              >
                {submitting ? <Loader size={15} /> : <ArrowLeftRight size={15} />}
                {submitting ? "Confirming..." : "Yes, Force Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}