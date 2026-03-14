// client/src/pages/DashboardPage/Dashboard.jsx
import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { Users, Plus, X, Bell } from "lucide-react";
import DashboardLayout from "./DashboardLayout";
import "./Dashboard.css";

// Safe optional import — works even if NotificationContext isn't wired yet
let useNotifications;
try {
  useNotifications = require("../../contexts/NotificationContext").useNotifications;
} catch {
  useNotifications = () => ({ unreadCount: 0 });
}

const API = process.env.REACT_APP_API_URL;

function Dashboard() {
  const [groups, setGroups]                 = useState([]);
  const [recentExpenses, setRecentExpenses] = useState([]);
  const [balances, setBalances]             = useState([]);
  const [loading, setLoading]               = useState(true);
  const [error, setError]                   = useState(null);
  const [currentUser, setCurrentUser]       = useState(null);
  const [receivedAmount, setReceivedAmount] = useState(0);

  // ── Add Expense Modal ──────────────────────────────────────
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
  const [expenseError, setExpenseError]               = useState("");
  const [submittingExp, setSubmittingExp]             = useState(false);

  // Selected group + its fetched members
  const [selectedGroupId, setSelectedGroupId]     = useState("");
  const [selectedGroupMembers, setSelectedGroupMembers] = useState([]);
  const [membersLoading, setMembersLoading]         = useState(false);

  // Full expense form — same shape as GroupDetail
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

  // New Group Modal
  const [showNewGroupModal, setShowNewGroupModal] = useState(false);
  const [groupName, setGroupName]                 = useState("");
  const [groupDescription, setGroupDescription]   = useState("");

  const token = localStorage.getItem("token");
  const { unreadCount = 0 } = useNotifications?.() ?? {};

  /* ── Fetch received amount ──────────────────────────────── */
  const fetchReceivedAmount = async () => {
    try {
      const res = await fetch(`${API}/balances/received`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setReceivedAmount(data.totalReceived ?? 0);
      }
    } catch (err) {
      console.error("fetchReceivedAmount error:", err);
    }
  };

  /* ── Load dashboard data ────────────────────────────────── */
  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${API}/dashboard`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch dashboard");
      const data = await res.json();
      setGroups(data.groups || []);
      setRecentExpenses(data.recentExpenses || []);
      setBalances(data.balances || []);
      // Pre-select first group
      if (data.groups?.length) setSelectedGroupId(data.groups[0]._id);
    } catch (err) {
      console.error("Dashboard fetch error:", err);
      setError("Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  /* ── Fetch current user ─────────────────────────────────── */
  const fetchCurrentUser = async () => {
    try {
      const res = await fetch(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setCurrentUser(await res.json());
    } catch (err) {
      console.error("fetchCurrentUser error:", err);
    }
  };

  /* ── Fetch members for a group ──────────────────────────── */
  const fetchGroupMembers = useCallback(async (groupId) => {
    if (!groupId) return;
    try {
      setMembersLoading(true);
      const res = await fetch(`${API}/groups/${groupId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      const members = data.members || [];
      setSelectedGroupMembers(members);

      // Re-init form state for these members
      const allIds    = new Set(members.map((m) => m._id));
      const initMulti = {};
      const initPct   = {};
      const initExact = {};
      members.forEach((m) => {
        initMulti[m._id] = "";
        initPct[m._id]   = "";
        initExact[m._id] = "";
      });
      setExpenseForm((prev) => ({
        ...prev,
        singlePayer:       members[0]?._id || "",
        splitAmong:        allIds,
        multiPayerAmounts: initMulti,
        percentages:       initPct,
        exactAmounts:      initExact,
      }));
    } catch (err) {
      console.error("fetchGroupMembers error:", err);
    } finally {
      setMembersLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadDashboard();
    fetchCurrentUser();
    fetchReceivedAmount();

    const onReceived = (e) => setReceivedAmount(e.detail?.total ?? 0);
    const onBalance  = () => { loadDashboard(); fetchReceivedAmount(); };

    window.addEventListener("receivedAmountUpdated", onReceived);
    window.addEventListener("balanceUpdated",        onBalance);
    return () => {
      window.removeEventListener("receivedAmountUpdated", onReceived);
      window.removeEventListener("balanceUpdated",        onBalance);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── When group dropdown changes, fetch that group's members */
  const handleGroupChange = (groupId) => {
    setSelectedGroupId(groupId);
    fetchGroupMembers(groupId);
  };

  /* ── Open expense modal ─────────────────────────────────── */
  const openExpenseModal = async () => {
    setExpenseError("");
    setExpenseForm({
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
    setShowAddExpenseModal(true);
    if (selectedGroupId) await fetchGroupMembers(selectedGroupId);
  };

  /* ── Toggle split member ────────────────────────────────── */
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

  /* ── Derived totals for modal ───────────────────────────── */
  const multiPayerTotal = Object.values(expenseForm.multiPayerAmounts)
    .reduce((sum, v) => sum + (Number(v) || 0), 0);

  const expenseTotal = expenseForm.payerMode === "single"
    ? Number(expenseForm.singleAmount) || 0
    : multiPayerTotal;

  /* ── Submit Add Expense ─────────────────────────────────── */
  const handleAddExpense = async () => {
    setExpenseError("");
    const {
      description, payerMode, singlePayer, singleAmount,
      multiPayerAmounts, splitType, splitAmong, percentages, exactAmounts,
    } = expenseForm;

    if (!selectedGroupId)       { setExpenseError("Select a group"); return; }
    if (!description.trim())    { setExpenseError("Description is required"); return; }

    if (payerMode === "single") {
      if (!singlePayer)                               { setExpenseError("Select who paid"); return; }
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
        groupId:   selectedGroupId,
        description: description.trim(),
        splitType,
        splitAmong: [...splitAmong],
      };
      if (payerMode === "single") {
        body.paidBy = singlePayer;
        body.amount = Number(singleAmount);
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
      loadDashboard();
    } catch {
      setExpenseError("Failed to add expense. Please try again.");
    } finally {
      setSubmittingExp(false);
    }
  };

  /* ── New Group ──────────────────────────────────────────── */
  const handleNewGroup = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API}/groups`, {
        method:  "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: groupName, description: groupDescription }),
      });
      if (!res.ok) throw new Error("Failed to create group");
      const newGroup = await res.json();
      setGroups((prev) => [newGroup, ...prev]);
      if (!selectedGroupId) setSelectedGroupId(newGroup._id);
      setGroupName(""); setGroupDescription("");
      setShowNewGroupModal(false);
    } catch (err) {
      console.error("Create group error:", err);
      alert("Failed to create group. Please try again.");
    }
  };

  /* ── Helpers ────────────────────────────────────────────── */
  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return isNaN(d.getTime())
      ? dateStr
      : d.toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" });
  };

  /* ── Early returns ──────────────────────────────────────── */
  if (loading) return (
    <DashboardLayout>
      <div className="loading-state"><div className="spinner" /><p>Loading dashboard...</p></div>
    </DashboardLayout>
  );

  if (error) return (
    <DashboardLayout>
      <div className="error-state">
        <p className="error-message">{error}</p>
        <button className="btn-primary" onClick={loadDashboard}>Retry</button>
      </div>
    </DashboardLayout>
  );

  /* ── Derived totals ─────────────────────────────────────── */
  const totalYouOwe    = balances.filter((b) => b.type === "owe").reduce((s, b) => s + Math.abs(b.amount || 0), 0);
  const totalOwedToYou = balances.filter((b) => b.type === "owes").reduce((s, b) => s + Math.abs(b.amount || 0), 0);
  const netBalance     = totalOwedToYou - totalYouOwe;

  const members = selectedGroupMembers;

  return (
    <DashboardLayout>

      {/* Page Header */}
      <div className="dashboard-header">
        <div>
          <h1 className="page-title">
            {currentUser?.name ? `Welcome, ${currentUser.name} 👋` : "Dashboard"}
          </h1>
          <p className="page-subtitle">Here's your expense overview</p>
        </div>
        <div className="dashboard-header-actions">
          <Link
            to="/dashboard/notifications"
            className={`notif-bell-btn ${unreadCount > 0 ? "notif-bell-active" : ""}`}
          >
            <Bell size={20} />
            {unreadCount > 0 && <span className="notif-bell-count">{unreadCount}</span>}
          </Link>
          {receivedAmount > 0 && (
            <div className="received-amount-badge">
              <span className="received-amount-label">Received</span>
              <span className="received-amount-value">Rs {receivedAmount.toLocaleString()}</span>
            </div>
          )}
          <button className="btn-primary" onClick={openExpenseModal}>
            <Plus size={20} /> Add Expense
          </button>
        </div>
      </div>

      {/* Balance Cards */}
      <div className="balance-summary">
        <div className="balance-card balance-owe">
          <p className="balance-label">You Owe</p>
          <p className="balance-amount">Rs {totalYouOwe.toLocaleString()}</p>
        </div>
        <div className="balance-card balance-owed">
          <p className="balance-label">Owed to You</p>
          <p className="balance-amount">Rs {totalOwedToYou.toLocaleString()}</p>
        </div>
        <div className="balance-card balance-received">
          <p className="balance-label">Received Amount</p>
          <p className="balance-amount">Rs {receivedAmount.toLocaleString()}</p>
        </div>
        <div className={`balance-card ${netBalance >= 0 ? "balance-net-positive" : "balance-net-negative"}`}>
          <p className="balance-label">Net Balance</p>
          <p className="balance-amount">
            {netBalance >= 0 ? "+" : "-"}Rs {Math.abs(netBalance).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Main Grid */}
      <div className="dashboard-grid">

        {/* Groups */}
        <div className="dashboard-section">
          <div className="section-header">
            <h2 className="section-title">Your Groups</h2>
            <button className="btn-secondary" onClick={() => setShowNewGroupModal(true)}>
              <Plus size={18} /> New Group
            </button>
          </div>
          <div className="groups-list">
            {groups.length === 0 ? (
              <p className="empty-text">No groups yet.</p>
            ) : (
              groups.map((group) => (
                <div key={group._id} className="group-card">
                  <div className="group-icon"><Users size={24} /></div>
                  <div className="group-info">
                    <h3 className="group-name">{group.name || "Unnamed Group"}</h3>
                    <p className="group-members">{group.members?.length || 0} members</p>
                  </div>
                  <div className={`group-balance ${(group.balance || 0) >= 0 ? "positive" : "negative"}`}>
                    <p className="balance-text">
                      {(group.balance || 0) >= 0 ? "+" : "-"}Rs {Math.abs(group.balance || 0).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Expenses */}
        <div className="dashboard-section">
          <div className="section-header">
            <h2 className="section-title">Recent Expenses</h2>
            <Link to="/dashboard/expenses" className="link-view-all">View All</Link>
          </div>
          <div className="expenses-list">
            {recentExpenses.length === 0 ? (
              <p className="empty-text">No recent expenses.</p>
            ) : (
              recentExpenses.map((expense) => (
                <div key={expense._id} className="expense-item">
                  <div className="expense-details">
                    <h4 className="expense-description">{expense.description || "Unnamed Expense"}</h4>
                    <p className="expense-meta">
                      {expense.group?.name || "No Group"} • {formatDate(expense.date)} • Paid by{" "}
                      {expense.paidBy?.name || expense.paidBy || "Unknown"}
                    </p>
                  </div>
                  <div className="expense-amount">Rs {(expense.amount || 0).toLocaleString()}</div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Balances */}
        <div className="dashboard-section">
          <div className="section-header">
            <h2 className="section-title">Your Balances</h2>
            <Link to="/dashboard/balances" className="link-view-all">Settle Up</Link>
          </div>
          <div className="balances-list">
            {balances.length === 0 ? (
              <p className="empty-text">All settled up!</p>
            ) : (
              balances.map((balance, i) => (
                <div key={balance.personId || i} className="balance-item">
                  <div className="balance-person">
                    <div className="avatar">{balance.person?.charAt(0) || "?"}</div>
                    <span className="person-name">{balance.person || "Unknown"}</span>
                  </div>
                  <div className={`balance-amount-text ${balance.type === "owe" ? "owe" : "owes"}`}>
                    {balance.type === "owe" ? "You owe" : "Owes you"} Rs{" "}
                    {Math.abs(balance.amount || 0).toLocaleString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* ── ADD EXPENSE MODAL (full GroupDetail style) ──────────── */}
      {showAddExpenseModal && (
        <div className="modal-overlay" onClick={() => !submittingExp && setShowAddExpenseModal(false)}>
          <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Add Expense</h2>
              <button className="modal-close-btn" onClick={() => setShowAddExpenseModal(false)} disabled={submittingExp}>✕</button>
            </div>

            <div className="modal-body">
              {expenseError && <p className="form-error">{expenseError}</p>}

              {/* Group selector */}
              <div className="form-group">
                <label className="form-label">Group *</label>
                <select
                  className="form-input"
                  value={selectedGroupId}
                  onChange={(e) => handleGroupChange(e.target.value)}
                >
                  {groups.length === 0
                    ? <option value="">No groups available</option>
                    : groups.map((g) => <option key={g._id} value={g._id}>{g.name}</option>)
                  }
                </select>
              </div>

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

              {membersLoading ? (
                <p className="empty-text">Loading members...</p>
              ) : members.length === 0 ? (
                <p className="empty-text">No members found in this group.</p>
              ) : (
                <>
                  {/* Payment mode toggle */}
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
                        { value: "equally",    label: "Equal Split"   },
                        { value: "percentage", label: "By Percentage" },
                        { value: "exact",      label: "Exact Amounts" },
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
                </>
              )}
            </div>

            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowAddExpenseModal(false)} disabled={submittingExp}>Cancel</button>
              <button className="btn-primary"   onClick={handleAddExpense}                    disabled={submittingExp || membersLoading}>
                {submittingExp ? "Adding..." : "Add Expense"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── NEW GROUP MODAL ──────────────────────────────────────── */}
      {showNewGroupModal && (
        <div className="modal-overlay" onClick={() => setShowNewGroupModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Create New Group</h2>
              <button className="modal-close-btn" onClick={() => setShowNewGroupModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleNewGroup}>
              <div className="form-group">
                <label className="form-label">Group Name</label>
                <input className="form-input" type="text" placeholder="e.g. Roommates, Trip to Murree..."
                  value={groupName} onChange={(e) => setGroupName(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Description (optional)</label>
                <input className="form-input" type="text" placeholder="What is this group for?"
                  value={groupDescription} onChange={(e) => setGroupDescription(e.target.value)} />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowNewGroupModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Create Group</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </DashboardLayout>
  );
}

export default Dashboard;
