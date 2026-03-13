// client/src/pages/DashboardPage/GroupDetail.jsx
import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import {
  Plus, Users, ArrowLeft, UserPlus, Trash2,
  ArrowRight, Crown, User, UserMinus,
} from "lucide-react";
import DashboardLayout from "./DashboardLayout";
import "./Dashboard.css";
import "./GroupDetail.css";

const API = "http://localhost:5000/api";

function GroupDetail() {
  const params  = useParams();
  const groupId = params.groupId || params.id;
  const token   = localStorage.getItem("token");

  // ── Decode current userId from JWT (no extra API call needed) ──────────
  const getCurrentUserId = () => {
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      return payload.id || payload._id || null;
    } catch { return null; }
  };
  const currentUserId = getCurrentUserId();

  const [group, setGroup]             = useState(null);
  const [settlements, setSettlements] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);

  // Expense modal
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
  const [expenseError, setExpenseError]               = useState("");
  const [submittingExp, setSubmittingExp]             = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    description:       "",
    payerMode:         "single",
    singlePayer:       "",
    singleAmount:      "",
    multiPayerAmounts: {},
    splitType:         "equally",
    splitAmong:        new Set(),
    percentages:       {},
    exactAmounts:      {},
  });

  // Add member modal
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [memberEmail, setMemberEmail]               = useState("");
  const [memberError, setMemberError]               = useState("");
  const [addingMember, setAddingMember]             = useState(false);

  const formatDate = (dateStr) => {
    if (!dateStr) return "Unknown date";
    const d = new Date(dateStr);
    return isNaN(d.getTime())
      ? dateStr
      : d.toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" });
  };

  /* ── Fetch group + settlements ─────────────────────────────── */
  const fetchGroup = useCallback(async () => {
    if (!groupId) return;
    try {
      setLoading(true);
      setError(null);

      const [groupRes, settleRes] = await Promise.all([
        fetch(`${API}/groups/${groupId}`,                    { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/expenses/settlements/${groupId}`,      { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (!groupRes.ok) throw new Error("Failed to fetch group");

      const data = await groupRes.json();
      const groupData = { ...data, members: data.members || [], expenses: data.expenses || [] };
      setGroup(groupData);

      // Init form state for all members
      const allIds    = new Set(groupData.members.map((m) => m._id));
      const initMulti = {};
      const initPct   = {};
      const initExact = {};
      groupData.members.forEach((m) => {
        initMulti[m._id] = "";
        initPct[m._id]   = "";
        initExact[m._id] = "";
      });

      setExpenseForm((prev) => ({
        ...prev,
        singlePayer:       groupData.members[0]?._id || "",
        splitAmong:        allIds,
        multiPayerAmounts: initMulti,
        percentages:       initPct,
        exactAmounts:      initExact,
      }));

      if (settleRes.ok) {
        const settleData = await settleRes.json();
        setSettlements(Array.isArray(settleData) ? settleData : []);
      }
    } catch (err) {
      console.error("fetchGroup error:", err);
      setError("Failed to load group. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [groupId, token]);

  useEffect(() => { fetchGroup(); }, [fetchGroup]);

  /* ── Role helpers ──────────────────────────────────────────── */
  // userRole is returned by the backend in getGroupDetail response
  const userRole = group?.userRole || "member";
  const isAdmin  = userRole === "admin";

  // Can the current user delete this specific expense?
  const canDeleteExpense = (expense) => {
    if (isAdmin) return true;
    return expense.createdBy?._id?.toString() === currentUserId ||
           expense.createdBy?.toString()       === currentUserId;
  };

  /* ── Expense modal helpers ─────────────────────────────────── */
  const multiPayerTotal = Object.values(expenseForm.multiPayerAmounts)
    .reduce((sum, v) => sum + (Number(v) || 0), 0);

  const expenseTotal = expenseForm.payerMode === "single"
    ? Number(expenseForm.singleAmount) || 0
    : multiPayerTotal;

  const toggleSplitMember = (memberId) => {
    setExpenseForm((prev) => {
      const next = new Set(prev.splitAmong);
      if (next.has(memberId)) {
        if (next.size === 1) return prev;
        next.delete(memberId);
      } else {
        next.add(memberId);
      }
      return { ...prev, splitAmong: next };
    });
  };

  const openExpenseModal = () => {
    if (!group) return;
    const allIds    = new Set(group.members.map((m) => m._id));
    const initMulti = {};
    const initPct   = {};
    const initExact = {};
    group.members.forEach((m) => {
      initMulti[m._id] = "";
      initPct[m._id]   = "";
      initExact[m._id] = "";
    });
    setExpenseForm({
      description:       "",
      payerMode:         "single",
      singlePayer:       group.members[0]?._id || "",
      singleAmount:      "",
      multiPayerAmounts: initMulti,
      splitType:         "equally",
      splitAmong:        allIds,
      percentages:       initPct,
      exactAmounts:      initExact,
    });
    setExpenseError("");
    setShowAddExpenseModal(true);
  };

  /* ── Add Expense ───────────────────────────────────────────── */
  const handleAddExpense = async () => {
    setExpenseError("");
    const {
      description, payerMode, singlePayer, singleAmount,
      multiPayerAmounts, splitType, splitAmong, percentages, exactAmounts,
    } = expenseForm;

    if (!description.trim())  { setExpenseError("Description is required"); return; }
    if (payerMode === "single") {
      if (!singlePayer)                             { setExpenseError("Select who paid"); return; }
      if (!singleAmount || Number(singleAmount) <= 0) { setExpenseError("Enter a valid amount"); return; }
    } else {
      if (multiPayerTotal <= 0) { setExpenseError("Enter amounts for at least one payer"); return; }
    }
    if (splitAmong.size === 0) { setExpenseError("Select at least one member to split among"); return; }

    if (splitType === "percentage") {
      const total = [...splitAmong].reduce((s, id) => s + (Number(percentages[id]) || 0), 0);
      if (Math.abs(total - 100) > 0.01) {
        setExpenseError(`Percentages must add up to 100 (currently ${total.toFixed(1)})`); return;
      }
    }
    if (splitType === "exact") {
      const total = [...splitAmong].reduce((s, id) => s + (Number(exactAmounts[id]) || 0), 0);
      if (Math.abs(total - expenseTotal) > 0.01) {
        setExpenseError(`Exact amounts (${total}) must equal total (${expenseTotal})`); return;
      }
    }

    try {
      setSubmittingExp(true);
      const body = {
        groupId,
        description: description.trim(),
        splitType,
        splitAmong: [...splitAmong],
      };
      if (payerMode === "single") {
        body.paidBy  = singlePayer;
        body.amount  = Number(singleAmount);
      } else {
        body.paidByMultiple = Object.entries(multiPayerAmounts)
          .filter(([, v]) => Number(v) > 0)
          .map(([memberId, amount]) => ({ memberId, amount: Number(amount) }));
      }
      if (splitType === "percentage") {
        body.percentages = Object.fromEntries(
          [...splitAmong].map((id) => [id, Number(percentages[id]) || 0])
        );
      }
      if (splitType === "exact") {
        body.exactAmounts = Object.fromEntries(
          [...splitAmong].map((id) => [id, Number(exactAmounts[id]) || 0])
        );
      }

      const res = await fetch(`${API}/expenses`, {
        method:  "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body:    JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        setExpenseError(err.message || "Failed to add expense");
        return;
      }
      setShowAddExpenseModal(false);
      fetchGroup();
    } catch {
      setExpenseError("Failed to add expense. Please try again.");
    } finally {
      setSubmittingExp(false);
    }
  };

  /* ── Delete Expense ────────────────────────────────────────── */
  const handleDeleteExpense = async (expense) => {
    if (!canDeleteExpense(expense)) {
      alert("You can only delete expenses you created. Only the group admin can delete any expense.");
      return;
    }
    if (!window.confirm("Delete this expense and reverse its balances?")) return;
    try {
      const res = await fetch(`${API}/expenses/${expense._id}`, {
        method:  "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) fetchGroup();
      else {
        const err = await res.json();
        alert(err.message || "Failed to delete expense.");
      }
    } catch {
      alert("Failed to delete expense.");
    }
  };

  /* ── Add Member (admin only) ───────────────────────────────── */
  const handleAddMember = async () => {
    if (!memberEmail.trim()) { setMemberError("Email is required"); return; }
    try {
      setAddingMember(true);
      setMemberError("");

      const res = await fetch(`${API}/groups/${groupId}/members`, {
        method:  "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ email: memberEmail.trim() }),
      });

      const data = await res.json();
      if (!res.ok) { setMemberError(data.message || "Failed to add member"); return; }

      setGroup((prev) => ({
        ...prev,
        members: [...(prev.members || []), { ...data, balance: 0 }],
      }));
      setShowAddMemberModal(false);
      setMemberEmail("");
    } catch {
      setMemberError("Failed to add member.");
    } finally {
      setAddingMember(false);
    }
  };

  /* ── Remove Member (admin only) ────────────────────────────── */
  const handleRemoveMember = async (member) => {
    if (!window.confirm(`Remove ${member.name} from this group?`)) return;
    try {
      const res = await fetch(`${API}/groups/${groupId}/members/${member._id}`, {
        method:  "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setGroup((prev) => ({
          ...prev,
          members: prev.members.filter((m) => m._id !== member._id),
        }));
      } else {
        const err = await res.json();
        alert(err.message || "Failed to remove member.");
      }
    } catch {
      alert("Failed to remove member.");
    }
  };

  const getMemberSettlements = (memberId) =>
    settlements.filter(
      (s) =>
        s.from._id.toString() === memberId.toString() ||
        s.to._id.toString()   === memberId.toString()
    );

  /* ── Loading / Error states ────────────────────────────────── */
  if (loading) return (
    <DashboardLayout>
      <div className="loading-state"><div className="spinner" /><p>Loading group...</p></div>
    </DashboardLayout>
  );

  if (error) return (
    <DashboardLayout>
      <div className="error-state">
        <p className="error-message">{error}</p>
        <button className="btn-primary" onClick={fetchGroup}>Retry</button>
      </div>
    </DashboardLayout>
  );

  if (!group) return null;

  const members  = group.members  || [];
  const expenses = group.expenses || [];

  return (
    <DashboardLayout>

      {/* Back link */}
      <div className="page-back">
        <Link to="/dashboard/groups" className="back-link">
          <ArrowLeft size={20} /> Back to Groups
        </Link>
      </div>

      {/* ── Group Header ─────────────────────────────────────── */}
      <div className="group-detail-header">
        <div className="group-detail-info">
          <div className="group-icon-large"><Users size={40} /></div>
          <div>
            <h1 className="page-title">{group.name || "Unnamed Group"}</h1>
            <p className="page-subtitle">
              {group.description || "No description"} • {members.length} members
            </p>
            {/* Role badge under title */}
            <span className={`group-detail-role-badge ${isAdmin ? "badge-admin" : "badge-member"}`}>
              {isAdmin ? <><Crown size={11} /> Admin</> : <><User size={11} /> Member</>}
            </span>
          </div>
        </div>

        <div className="group-detail-actions">
          {/* Add Member — admin only */}
          {isAdmin && (
            <button className="btn-secondary" onClick={() => setShowAddMemberModal(true)}>
              <UserPlus size={18} /> Add Member
            </button>
          )}
          {/* Add Expense — all members */}
          <button className="btn-primary" onClick={openExpenseModal}>
            <Plus size={20} /> Add Expense
          </button>
        </div>
      </div>

      {/* ── Stats ────────────────────────────────────────────── */}
      <div className="group-stats-cards">
        <div className="stat-card">
          <p className="stat-card-label">Total Expenses</p>
          <p className="stat-card-value">Rs {(group.totalExpenses || 0).toLocaleString()}</p>
        </div>
        <div className="stat-card">
          <p className="stat-card-label">Number of Expenses</p>
          <p className="stat-card-value">{expenses.length}</p>
        </div>
        <div className="stat-card">
          <p className="stat-card-label">Your Balance</p>
          <p className={`stat-card-value ${(group.yourBalance || 0) >= 0 ? "positive" : "negative"}`}>
            {(group.yourBalance || 0) >= 0 ? "+" : ""}Rs {Math.abs(group.yourBalance || 0).toLocaleString()}
          </p>
        </div>
      </div>

      <div className="group-detail-grid">

        {/* ── MEMBERS ──────────────────────────────────────────── */}
        <div className="dashboard-section">
          <div className="section-header">
            <h2 className="section-title">Members</h2>
          </div>
          <div className="members-list">
            {members.length === 0 ? (
              <p className="empty-text">No members yet.</p>
            ) : (
              members.map((member) => {
                const balance           = member.balance || 0;
                const memberSettlements = getMemberSettlements(member._id);
                const isSelf            = member._id.toString() === currentUserId;
                const isMemberAdmin     = member.role === "admin";

                return (
                  <div key={member._id} className="member-item">
                    <div className="member-item-top">
                      <div className="member-info">
                        <div className="avatar">{member.name?.charAt(0)?.toUpperCase() || "?"}</div>
                        <div>
                          <div className="member-name-row">
                            <p className="member-name">{member.name || "Unknown"}</p>
                            {/* Role pill next to name */}
                            {isMemberAdmin ? (
                              <span className="member-role-pill pill-admin"><Crown size={9} /> Admin</span>
                            ) : (
                              <span className="member-role-pill pill-member"><User size={9} /> Member</span>
                            )}
                            {isSelf && <span className="member-role-pill pill-you">You</span>}
                          </div>
                          <p className="member-email">{member.email || ""}</p>
                        </div>
                      </div>

                      <div className="member-right">
                        <div className={`member-balance ${balance >= 0 ? "positive" : "negative"}`}>
                          {balance >= 0 ? "+" : ""}Rs {Math.abs(balance).toLocaleString()}
                        </div>
                        {/* Remove member — admin only, cannot remove self */}
                        {isAdmin && !isSelf && !isMemberAdmin && (
                          <button
                            className="btn-remove-member"
                            onClick={() => handleRemoveMember(member)}
                            title={`Remove ${member.name}`}
                          >
                            <UserMinus size={14} />
                          </button>
                        )}
                      </div>
                    </div>

                    {memberSettlements.length > 0 && (
                      <div className="member-settlements">
                        {memberSettlements.map((s, idx) => {
                          const isDebtor = s.from._id.toString() === member._id.toString();
                          return (
                            <div key={idx} className="settlement-row">
                              <ArrowRight size={12} className={isDebtor ? "arrow-owe" : "arrow-owed"} />
                              <span className={isDebtor ? "settlement-owe" : "settlement-owed"}>
                                {isDebtor
                                  ? `Owes ${s.to.name} Rs ${s.amount.toFixed(2)}`
                                  : `${s.from.name} owes Rs ${s.amount.toFixed(2)}`}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ── TRANSACTION HISTORY ──────────────────────────────── */}
        <div className="dashboard-section">
          <div className="section-header">
            <h2 className="section-title">Transaction History</h2>
          </div>
          <div className="expenses-list">
            {expenses.length === 0 ? (
              <p className="empty-text">No expenses yet.</p>
            ) : (
              expenses.map((expense) => {
                const canDelete  = canDeleteExpense(expense);
                const addedByMe  = expense.createdBy?._id?.toString() === currentUserId ||
                                   expense.createdBy?.toString() === currentUserId;

                return (
                  <div key={expense._id} className="expense-item">
                    <div className="expense-details">
                      <h4 className="expense-description">{expense.description || "Unnamed Expense"}</h4>
                      <p className="expense-meta">
                        Paid by {expense.paidBy?.name || expense.paidBy || "Unknown"} •{" "}
                        {formatDate(expense.createdAt || expense.date)}
                        {addedByMe && <span className="expense-added-by-you"> • Added by you</span>}
                      </p>
                    </div>
                    <div className="expense-item-actions">
                      <div className="expense-amount">Rs {(expense.amount || 0).toLocaleString()}</div>
                      {/* Delete button — shown only if user has permission */}
                      {canDelete && (
                        <button
                          className="btn-delete"
                          onClick={() => handleDeleteExpense(expense)}
                          aria-label="Delete expense"
                          title={isAdmin ? "Delete expense (admin)" : "Delete your expense"}
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* ── ADD EXPENSE MODAL ────────────────────────────────────── */}
      {showAddExpenseModal && (
        <div className="modal-overlay" onClick={() => !submittingExp && setShowAddExpenseModal(false)}>
          <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Add Expense</h2>
              <button className="modal-close-btn" onClick={() => setShowAddExpenseModal(false)} disabled={submittingExp}>✕</button>
            </div>

            <div className="modal-body">
              {expenseError && <p className="form-error">{expenseError}</p>}

              {/* Description */}
              <div className="form-group">
                <label className="form-label">Description *</label>
                <input
                  className="form-input"
                  placeholder="e.g. Dinner, Groceries, Rent"
                  value={expenseForm.description}
                  onChange={(e) => setExpenseForm((p) => ({ ...p, description: e.target.value }))}
                />
              </div>

              {/* Payer mode */}
              <div className="form-group">
                <label className="form-label">Payment Mode</label>
                <div className="toggle-group">
                  {["single", "multi"].map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      className={`toggle-btn ${expenseForm.payerMode === mode ? "active" : ""}`}
                      onClick={() => setExpenseForm((p) => ({ ...p, payerMode: mode }))}
                    >
                      {mode === "single" ? "Single Payer" : "Multiple Payers"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Single payer */}
              {expenseForm.payerMode === "single" && (
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Paid By *</label>
                    <select
                      className="form-input"
                      value={expenseForm.singlePayer}
                      onChange={(e) => setExpenseForm((p) => ({ ...p, singlePayer: e.target.value }))}
                    >
                      {members.map((m) => (
                        <option key={m._id} value={m._id}>{m.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Total Amount (Rs) *</label>
                    <input
                      className="form-input"
                      type="number" min="0" placeholder="0"
                      value={expenseForm.singleAmount}
                      onChange={(e) => setExpenseForm((p) => ({ ...p, singleAmount: e.target.value }))}
                    />
                  </div>
                </div>
              )}

              {/* Multi payer */}
              {expenseForm.payerMode === "multi" && (
                <div className="form-group">
                  <label className="form-label">How much did each person pay?</label>
                  <div className="multi-payer-grid">
                    {members.map((m) => (
                      <div key={m._id} className="multi-payer-row">
                        <div className="avatar-small">{m.name[0].toUpperCase()}</div>
                        <span className="multi-payer-name">{m.name}</span>
                        <span className="multi-payer-currency">Rs</span>
                        <input
                          className="form-input input-small"
                          type="number" min="0" placeholder="0"
                          value={expenseForm.multiPayerAmounts[m._id] || ""}
                          onChange={(e) =>
                            setExpenseForm((p) => ({
                              ...p,
                              multiPayerAmounts: { ...p.multiPayerAmounts, [m._id]: e.target.value },
                            }))
                          }
                        />
                      </div>
                    ))}
                  </div>
                  {multiPayerTotal > 0 && (
                    <p className="total-hint">Total: Rs {multiPayerTotal.toLocaleString()}</p>
                  )}
                </div>
              )}

              {/* Split type */}
              <div className="form-group">
                <label className="form-label">Split Type</label>
                <div className="split-type-group">
                  {[
                    { value: "equally",    label: "Equal Split"     },
                    { value: "percentage", label: "By Percentage"   },
                    { value: "exact",      label: "Exact Amounts"   },
                  ].map((opt) => (
                    <label key={opt.value} className="radio-option">
                      <input
                        type="radio" name="splitType" value={opt.value}
                        checked={expenseForm.splitType === opt.value}
                        onChange={() => setExpenseForm((p) => ({ ...p, splitType: opt.value }))}
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </div>

              {/* Split among */}
              <div className="form-group">
                <label className="form-label">
                  Split Among ({expenseForm.splitAmong.size} of {members.length} selected)
                </label>
                <div className="split-among-grid">
                  {members.map((m) => {
                    const isSelected = expenseForm.splitAmong.has(m._id);
                    return (
                      <div key={m._id} className={`split-member-row ${isSelected ? "selected" : ""}`}>
                        <label className="split-member-label">
                          <input type="checkbox" checked={isSelected} onChange={() => toggleSplitMember(m._id)} />
                          <div className="avatar-small">{m.name[0].toUpperCase()}</div>
                          <span>{m.name}</span>
                        </label>

                        {isSelected && expenseForm.splitType === "percentage" && (
                          <div className="split-input-wrapper">
                            <input
                              className="form-input input-small"
                              type="number" min="0" max="100" placeholder="0"
                              value={expenseForm.percentages[m._id] || ""}
                              onChange={(e) =>
                                setExpenseForm((p) => ({
                                  ...p,
                                  percentages: { ...p.percentages, [m._id]: e.target.value },
                                }))
                              }
                            />
                            <span className="input-suffix">%</span>
                            {expenseTotal > 0 && expenseForm.percentages[m._id] && (
                              <span className="calc-hint">
                                = Rs {(expenseTotal * Number(expenseForm.percentages[m._id]) / 100).toFixed(2)}
                              </span>
                            )}
                          </div>
                        )}

                        {isSelected && expenseForm.splitType === "exact" && (
                          <div className="split-input-wrapper">
                            <span className="input-prefix">Rs</span>
                            <input
                              className="form-input input-small"
                              type="number" min="0" placeholder="0"
                              value={expenseForm.exactAmounts[m._id] || ""}
                              onChange={(e) =>
                                setExpenseForm((p) => ({
                                  ...p,
                                  exactAmounts: { ...p.exactAmounts, [m._id]: e.target.value },
                                }))
                              }
                            />
                          </div>
                        )}

                        {isSelected && expenseForm.splitType === "equally" && expenseTotal > 0 && (
                          <span className="split-equal-hint">
                            Rs {(expenseTotal / expenseForm.splitAmong.size).toFixed(2)}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {expenseForm.splitType === "percentage" && (
                  <p className="running-total">
                    Total:{" "}
                    {[...expenseForm.splitAmong]
                      .reduce((s, id) => s + (Number(expenseForm.percentages[id]) || 0), 0)
                      .toFixed(1)}% / 100%
                  </p>
                )}
                {expenseForm.splitType === "exact" && expenseTotal > 0 && (
                  <p className="running-total">
                    Total: Rs{" "}
                    {[...expenseForm.splitAmong]
                      .reduce((s, id) => s + (Number(expenseForm.exactAmounts[id]) || 0), 0)
                      .toFixed(2)}{" "}
                    / Rs {expenseTotal.toFixed(2)}
                  </p>
                )}
              </div>
            </div>

            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowAddExpenseModal(false)} disabled={submittingExp}>Cancel</button>
              <button className="btn-primary"   onClick={handleAddExpense}                    disabled={submittingExp}>
                {submittingExp ? "Adding..." : "Add Expense"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── ADD MEMBER MODAL (admin only) ───────────────────────── */}
      {showAddMemberModal && (
        <div className="modal-overlay" onClick={() => setShowAddMemberModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Add Member</h2>
              <button className="modal-close-btn" onClick={() => setShowAddMemberModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              {memberError && <p className="form-error">{memberError}</p>}
              <div className="form-group">
                <label className="form-label">Email Address *</label>
                <input
                  className="form-input"
                  type="email"
                  placeholder="friend@example.com"
                  value={memberEmail}
                  onChange={(e) => setMemberEmail(e.target.value)}
                />
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowAddMemberModal(false)}>Cancel</button>
              <button className="btn-primary"   onClick={handleAddMember} disabled={addingMember}>
                {addingMember ? "Adding..." : "Add Member"}
              </button>
            </div>
          </div>
        </div>
      )}

    </DashboardLayout>
  );
}

export default GroupDetail;