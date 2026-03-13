// client/src/pages/AdminPage/AdminSettlements.jsx
import { useState, useEffect } from "react";
import {
  ArrowLeftRight, Search, X, Loader,
  CheckCircle, XCircle,
} from "lucide-react";
import {
  getAdminBalances,
  forceConfirmSettlement,
  getAdminUsers,
} from "../../api/adminApi";
import "./Admin.css";

export default function AdminSettlements() {
  const [settlements,  setSettlements]  = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [users,        setUsers]        = useState([]);
  const [filterUser,   setFilterUser]   = useState("");
  const [search,       setSearch]       = useState("");
  const [confirmData,  setConfirmData]  = useState(null);
  const [submitting,   setSubmitting]   = useState(false);

  /* ── Fetch and extract pending settlements ──────────────── */
  const fetchSettlements = async () => {
    try {
      setLoading(true);
      const [bRes, uRes] = await Promise.all([
        getAdminBalances(),
        getAdminUsers(),
      ]);
      setUsers(uRes.data);

      // Flatten all pending settlements from all balances
      const pending = [];
      bRes.data.forEach((balance) => {
        const pendingList = balance.pendingSettlements?.filter(
          (s) => s.status === "pending"
        ) ?? [];
        pendingList.forEach((s) => {
          pending.push({
            settlementId: s._id,
            balanceId:    balance._id,
            amount:       s.amount,
            note:         s.note,
            requestedAt:  s.createdAt,
            creditor:     balance.user,
            debtor:       balance.person,
            totalBalance: balance.amount,
            groups:       balance.groups,
          });
        });
      });

      setSettlements(pending);
    } catch (err) {
      console.error("fetchSettlements error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSettlements(); }, []);

  /* ── Filter ─────────────────────────────────────────────── */
  const filtered = settlements.filter((s) => {
    const matchesUser =
      !filterUser ||
      s.creditor?._id === filterUser ||
      s.debtor?._id   === filterUser;

    const matchesSearch =
      !search ||
      s.creditor?.name?.toLowerCase().includes(search.toLowerCase()) ||
      s.debtor?.name?.toLowerCase().includes(search.toLowerCase()) ||
      s.note?.toLowerCase().includes(search.toLowerCase());

    return matchesUser && matchesSearch;
  });

  /* ── Force confirm ──────────────────────────────────────── */
  const handleForceConfirm = async () => {
    if (!confirmData) return;
    try {
      setSubmitting(true);
      await forceConfirmSettlement(
        confirmData.balanceId,
        confirmData.settlementId
      );
      setConfirmData(null);
      fetchSettlements();
    } catch (err) {
      console.error("forceConfirm error:", err);
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Total pending volume ───────────────────────────────── */
  const totalVolume = filtered.reduce((sum, s) => sum + (s.amount ?? 0), 0);

  if (loading) {
    return (
      <div className="admin-loading">
        <div className="spinner" />
        <p>Loading settlements...</p>
      </div>
    );
  }

  return (
    <div>
      {/* ── Top bar ───────────────────────────────────── */}
      <div className="admin-topbar">
        <div className="admin-topbar-left">
          <h1 className="admin-page-title">Settlements</h1>
          <p className="admin-page-subtitle">
            {filtered.length} pending settlement
            {filtered.length !== 1 ? "s" : ""} —
            Rs {totalVolume.toLocaleString()} total
          </p>
        </div>
      </div>

      {/* ── Stats ─────────────────────────────────────── */}
      <div className="admin-stats-grid" style={{ marginBottom: 24 }}>
        <div className="admin-stat-card amber">
          <div className="admin-stat-label">Pending Requests</div>
          <div className="admin-stat-value">{filtered.length}</div>
        </div>
        <div className="admin-stat-card blue">
          <div className="admin-stat-label">Total Volume</div>
          <div className="admin-stat-value">Rs {totalVolume.toLocaleString()}</div>
        </div>
      </div>

      {/* ── Table ─────────────────────────────────────── */}
      <div className="admin-table-container">
        <div className="admin-table-header">
          <span className="admin-table-title">Pending Settlement Requests</span>
          <div className="admin-table-actions">

            {/* Search */}
            <div className="search-container" style={{ marginBottom: 0, minWidth: 200 }}>
              <Search size={15} className="search-icon" />
              <input
                className="search-input"
                placeholder="Search by name or note..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Filter by user */}
            <select
              className="form-select"
              style={{ minWidth: 170 }}
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
            <CheckCircle size={32} style={{ color: "var(--green)" }} />
            <p className="admin-empty-text">
              No pending settlements — all clear!
            </p>
          </div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Debtor (Paying)</th>
                <th>Creditor (Receiving)</th>
                <th>Requested</th>
                <th>Total Balance</th>
                <th>Note</th>
                <th>Groups</th>
                <th>Requested At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.settlementId}>

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
                        {s.debtor?.name?.[0]?.toUpperCase() ?? "?"}
                      </div>
                      <div>
                        <div className="font-semibold">{s.debtor?.name ?? "Unknown"}</div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                          {s.debtor?.email}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Creditor */}
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div
                        className="avatar"
                        style={{ width: 28, height: 28, fontSize: 11 }}
                      >
                        {s.creditor?.name?.[0]?.toUpperCase() ?? "?"}
                      </div>
                      <div>
                        <div className="font-semibold">{s.creditor?.name ?? "Unknown"}</div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                          {s.creditor?.email}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Requested amount */}
                  <td style={{
                    fontFamily: "Syne, sans-serif",
                    fontWeight: 700,
                    color: "var(--amber)",
                    fontSize: 16,
                  }}>
                    Rs {s.amount?.toLocaleString()}
                  </td>

                  {/* Total balance */}
                  <td style={{
                    fontFamily: "Syne, sans-serif",
                    fontWeight: 700,
                    color: "var(--accent-soft)",
                  }}>
                    Rs {s.totalBalance?.toLocaleString()}
                  </td>

                  {/* Note */}
                  <td style={{ color: "var(--text-muted)", fontSize: 12, maxWidth: 160 }}>
                    {s.note || "—"}
                  </td>

                  {/* Groups */}
                  <td>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                      {s.groups?.map((g) => (
                        <span className="group-badge" key={g._id}>{g.name}</span>
                      ))}
                      {(!s.groups || s.groups.length === 0) && (
                        <span style={{ color: "var(--text-muted)", fontSize: 12 }}>—</span>
                      )}
                    </div>
                  </td>

                  {/* Requested at */}
                  <td style={{ whiteSpace: "nowrap" }}>
                    {new Date(s.requestedAt).toLocaleDateString("en-PK", {
                      day: "numeric", month: "short", year: "numeric",
                    })}
                  </td>

                  {/* Actions */}
                  <td onClick={(e) => e.stopPropagation()}>
                    <button
                      className="admin-action-btn success"
                      onClick={() => setConfirmData(s)}
                    >
                      <CheckCircle size={12} /> Force Confirm
                    </button>
                  </td>

                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

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
              You are about to force-confirm a payment of{" "}
              <strong>Rs {confirmData.amount?.toLocaleString()}</strong> from{" "}
              <strong>{confirmData.debtor?.name}</strong> to{" "}
              <strong>{confirmData.creditor?.name}</strong>.
              <br /><br />
              This will reduce the balance immediately regardless of
              what the users have done. This cannot be undone.
            </p>

            {/* Settlement summary */}
            <div style={{
              padding: "14px 16px",
              background: "var(--glass-white)",
              border: "1px solid var(--glass-border)",
              borderRadius: 10,
              marginBottom: 16,
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  Payment amount
                </span>
                <span style={{
                  fontFamily: "Syne, sans-serif",
                  fontWeight: 700,
                  color: "var(--amber)",
                }}>
                  Rs {confirmData.amount?.toLocaleString()}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  Remaining after confirm
                </span>
                <span style={{
                  fontFamily: "Syne, sans-serif",
                  fontWeight: 700,
                  color: Math.max(0, confirmData.totalBalance - confirmData.amount) <= 0
                    ? "var(--green)"
                    : "var(--accent-soft)",
                }}>
                  Rs {Math.max(0, confirmData.totalBalance - confirmData.amount).toLocaleString()}
                  {Math.max(0, confirmData.totalBalance - confirmData.amount) <= 0
                    ? " (Fully cleared)"
                    : ""}
                </span>
              </div>
              {confirmData.note && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Note</span>
                  <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                    {confirmData.note}
                  </span>
                </div>
              )}
            </div>

            <div className="modal-actions">
              <button
                className="btn-secondary"
                onClick={() => setConfirmData(null)}
                disabled={submitting}
              >
                <XCircle size={15} /> Cancel
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
                {submitting ? <Loader size={15} /> : <CheckCircle size={15} />}
                {submitting ? "Confirming..." : "Yes, Force Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}