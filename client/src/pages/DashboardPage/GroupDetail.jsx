// client/src/pages/DashboardPage/GroupDetail.jsx
import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import {
  Plus,
  Users,
  ArrowLeft,
  UserPlus,
  Trash2,
  ArrowRight,
  Crown,
  User,
  UserMinus,
  Pencil,
} from "lucide-react";
import DashboardLayout from "./DashboardLayout";
import "./Dashboard.css";
import ExpenseModal from "../../components/ExpenseModal";
// import "./GroupDetail.css";

const API = process.env.REACT_APP_API_URL;

function GroupDetail() {
  const params = useParams();
  const groupId = params.groupId || params.id;
  const token = localStorage.getItem("token");

  // ── Decode current userId from JWT (no extra API call needed) ──────────
  const getCurrentUserId = () => {
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      return payload.id || payload._id || null;
    } catch {
      return null;
    }
  };
  const currentUserId = getCurrentUserId();

  const [group, setGroup] = useState(null);
  const [settlements, setSettlements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Expense modal
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [expenseError, setExpenseError] = useState("");
  const [submittingExp, setSubmittingExp] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    description: "",
    date: new Date().toISOString().split("T")[0],
    payerMode: "single",
    singlePayer: "",
    singleAmount: "",
    multiPayerAmounts: {},
    splitType: "equally",
    splitAmong: new Set(),
    percentages: {},
    exactAmounts: {},
  });

  // Add member modal
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [memberEmail, setMemberEmail] = useState("");
  const [memberError, setMemberError] = useState("");
  const [addingMember, setAddingMember] = useState(false);

  const formatDate = (dateStr) => {
    if (!dateStr) return "Unknown date";
    // Strip time part if present, then parse manually to avoid UTC shift
    const datePart = dateStr.split("T")[0];
    if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
      const [year, month, day] = datePart.split("-").map(Number);
      return new Date(year, month - 1, day).toLocaleDateString("en-PK", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    }
    const d = new Date(dateStr);
    return isNaN(d.getTime())
      ? dateStr
      : d.toLocaleDateString("en-PK", {
          day: "numeric",
          month: "short",
          year: "numeric",
        });
  };
  /* ── Fetch group + settlements ─────────────────────────────── */
  const fetchGroup = useCallback(async () => {
    if (!groupId) return;
    try {
      setLoading(true);
      setError(null);

      const [groupRes, settleRes] = await Promise.all([
        fetch(`${API}/groups/${groupId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API}/expenses/settlements/${groupId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (!groupRes.ok) throw new Error("Failed to fetch group");

      const data = await groupRes.json();
      const groupData = {
        ...data,
        members: data.members || [],
        expenses: data.expenses || [],
      };
      setGroup(groupData);

      // Init form state for all members
      const allIds = new Set(groupData.members.map((m) => m._id));
      const initMulti = {};
      const initPct = {};
      const initExact = {};
      groupData.members.forEach((m) => {
        initMulti[m._id] = "";
        initPct[m._id] = "";
        initExact[m._id] = "";
      });

      setExpenseForm((prev) => ({
        ...prev,
        date: prev.date || new Date().toISOString().split("T")[0],
        singlePayer: groupData.members[0]?._id || "",
        splitAmong: allIds,
        multiPayerAmounts: initMulti,
        percentages: initPct,
        exactAmounts: initExact,
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

  useEffect(() => {
    fetchGroup();
  }, [fetchGroup]);

  /* ── Role helpers ──────────────────────────────────────────── */
  const userRole = group?.userRole || "member";
  const isAdmin = userRole === "admin";

  const canDeleteExpense = (expense) => {
    if (isAdmin) return true;
    return (
      expense.createdBy?._id?.toString() === currentUserId ||
      expense.createdBy?.toString() === currentUserId
    );
  };

  /* ── Expense modal helpers ─────────────────────────────────── */
  const multiPayerTotal = Object.values(expenseForm.multiPayerAmounts).reduce(
    (sum, v) => sum + (Number(v) || 0),
    0,
  );

  const expenseTotal =
    expenseForm.payerMode === "single"
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
    const allIds = new Set(group.members.map((m) => m._id));
    const initMulti = {};
    const initPct = {};
    const initExact = {};
    group.members.forEach((m) => {
      initMulti[m._id] = "";
      initPct[m._id] = "";
      initExact[m._id] = "";
    });
    setExpenseForm({
      description: "",
      date: new Date().toISOString().split("T")[0],
      payerMode: "single",
      singlePayer: group.members[0]?._id || "",
      singleAmount: "",
      multiPayerAmounts: initMulti,
      splitType: "equally",
      splitAmong: allIds,
      percentages: initPct,
      exactAmounts: initExact,
    });
    setExpenseError("");
    setShowAddExpenseModal(true);
  };

  /* ── Add Expense ───────────────────────────────────────────── */
  const handleAddExpense = async () => {
    setExpenseError("");
    const {
      description,
      date,
      payerMode,
      singlePayer,
      singleAmount,
      multiPayerAmounts,
      splitType,
      splitAmong,
      percentages,
      exactAmounts,
    } = expenseForm;

    if (!description.trim()) {
      setExpenseError("Description is required");
      return;
    }
    if (!date) {
      setExpenseError("Date is required");
      return;
    }
    if (payerMode === "single") {
      if (!singlePayer) {
        setExpenseError("Select who paid");
        return;
      }
      if (!singleAmount || Number(singleAmount) <= 0) {
        setExpenseError("Enter a valid amount");
        return;
      }
    } else {
      if (multiPayerTotal <= 0) {
        setExpenseError("Enter amounts for at least one payer");
        return;
      }
    }
    if (splitAmong.size === 0) {
      setExpenseError("Select at least one member to split among");
      return;
    }

    if (splitType === "percentage") {
      const total = [...splitAmong].reduce(
        (s, id) => s + (Number(percentages[id]) || 0),
        0,
      );
      if (Math.abs(total - 100) > 0.01) {
        setExpenseError(
          `Percentages must add up to 100 (currently ${total.toFixed(1)})`,
        );
        return;
      }
    }
    if (splitType === "exact") {
      const total = [...splitAmong].reduce(
        (s, id) => s + (Number(exactAmounts[id]) || 0),
        0,
      );
      if (Math.abs(total - expenseTotal) > 0.01) {
        setExpenseError(
          `Exact amounts (${total}) must equal total (${expenseTotal})`,
        );
        return;
      }
    }

    try {
      setSubmittingExp(true);
      const body = {
        groupId,
        description: description.trim(),
        date: date,
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
          [...splitAmong].map((id) => [id, Number(percentages[id]) || 0]),
        );
      }
      if (splitType === "exact") {
        body.exactAmounts = Object.fromEntries(
          [...splitAmong].map((id) => [id, Number(exactAmounts[id]) || 0]),
        );
      }
      const url = editingExpense
        ? `${API}/expenses/${editingExpense._id}`
        : `${API}/expenses`;

      const method = editingExpense ? "PUT" : "POST";
      const res = await fetch(url, {
        method: method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        setExpenseError(err.message || "Failed to add expense");
        return;
      }
      setShowAddExpenseModal(false);
      setEditingExpense(null);
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
      alert(
        "You can only delete expenses you created. Only the group admin can delete any expense.",
      );
      return;
    }
    if (!window.confirm("Delete this expense and reverse its balances?"))
      return;
    try {
      const res = await fetch(`${API}/expenses/${expense._id}`, {
        method: "DELETE",
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

  const handleEdit = (expense) => {
    const members = group.members || [];

    const splitSet = new Set(
      (expense.splitBetween || []).map((m) => m._id || m),
    );

    const percentages = {};
    const exactAmounts = {};
    const multi = {};

    members.forEach((m) => {
      percentages[m._id] = "";
      exactAmounts[m._id] = "";
      multi[m._id] = "";
    });

    setExpenseForm({
      description: expense.description || "",
      date: expense.date?.split("T")[0] || "",
      payerMode: "single",
      singlePayer: expense.paidBy?._id || expense.paidBy,
      singleAmount: expense.amount || "",
      multiPayerAmounts: multi,
      splitType: expense.splitType || "equally",
      splitAmong: splitSet,
      percentages,
      exactAmounts,
    });

    setEditingExpense(expense);
    setShowAddExpenseModal(true);
  };
  /* ── Add Member (admin only) ───────────────────────────────── */
  const handleAddMember = async () => {
    if (!memberEmail.trim()) {
      setMemberError("Email is required");
      return;
    }
    try {
      setAddingMember(true);
      setMemberError("");

      const res = await fetch(`${API}/groups/${groupId}/members`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email: memberEmail.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        setMemberError(data.message || "Failed to add member");
        return;
      }

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
      const res = await fetch(
        `${API}/groups/${groupId}/members/${member._id}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
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
        s.to._id.toString() === memberId.toString(),
    );

  /* ── Loading / Error states ────────────────────────────────── */
  if (loading)
    return (
      <DashboardLayout>
        <div className="loading-state">
          <div className="spinner" />
          <p>Loading group...</p>
        </div>
      </DashboardLayout>
    );

  if (error)
    return (
      <DashboardLayout>
        <div className="error-state">
          <p className="error-message">{error}</p>
          <button className="btn-primary" onClick={fetchGroup}>
            Retry
          </button>
        </div>
      </DashboardLayout>
    );

  if (!group) return null;

  const members = group.members || [];
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
          <div className="group-icon-large">
            <Users size={40} />
          </div>
          <div>
            <h1 className="page-title">{group.name || "Unnamed Group"}</h1>
            <p className="page-subtitle">
              {group.description || "No description"} • {members.length} members
            </p>
            <span
              className={`group-detail-role-badge ${isAdmin ? "badge-admin" : "badge-member"}`}
            >
              {isAdmin ? (
                <>
                  <Crown size={11} /> Admin
                </>
              ) : (
                <>
                  <User size={11} /> Member
                </>
              )}
            </span>
          </div>
        </div>

        <div className="group-detail-actions">
          {isAdmin && (
            <button
              className="btn-secondary"
              onClick={() => setShowAddMemberModal(true)}
            >
              <UserPlus size={18} /> Add Member
            </button>
          )}
          <button className="btn-primary" onClick={openExpenseModal}>
            <Plus size={20} /> Add Expense
          </button>
        </div>
      </div>

      {/* ── Stats ────────────────────────────────────────────── */}
      <div className="group-stats-cards">
        <div className="stat-card">
          <p className="stat-card-label">Total Expenses</p>
          <p className="stat-card-value">
            Rs {(group.totalExpenses || 0).toLocaleString()}
          </p>
        </div>
        <div className="stat-card">
          <p className="stat-card-label">Number of Expenses</p>
          <p className="stat-card-value">{expenses.length}</p>
        </div>
        <div className="stat-card">
          <p className="stat-card-label">Your Balance</p>
          <p
            className={`stat-card-value ${(group.yourBalance || 0) >= 0 ? "positive" : "negative"}`}
          >
            {(group.yourBalance || 0) >= 0 ? "+" : ""}Rs{" "}
            {Math.abs(group.yourBalance || 0).toLocaleString()}
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
                const balance = member.balance || 0;
                const memberSettlements = getMemberSettlements(member._id);
                const isSelf = member._id.toString() === currentUserId;
                const isMemberAdmin = member.role === "admin";

                return (
                  <div key={member._id} className="member-item">
                    <div className="member-item-top">
                      <div className="member-info">
                        <div className="avatar">
                          {member.name?.charAt(0)?.toUpperCase() || "?"}
                        </div>
                        <div>
                          <div className="member-name-row">
                            <p className="member-name">
                              {member.name || "Unknown"}
                            </p>
                            {isMemberAdmin ? (
                              <span className="member-role-pill pill-admin">
                                <Crown size={9} /> Admin
                              </span>
                            ) : (
                              <span className="member-role-pill pill-member">
                                <User size={9} /> Member
                              </span>
                            )}
                            {isSelf && (
                              <span className="member-role-pill pill-you">
                                You
                              </span>
                            )}
                          </div>
                          <p className="member-email">{member.email || ""}</p>
                        </div>
                      </div>

                      <div className="member-right">
                        <div
                          className={`member-balance ${balance >= 0 ? "positive" : "negative"}`}
                        >
                          {balance >= 0 ? "+" : ""}Rs{" "}
                          {Math.abs(balance).toLocaleString()}
                        </div>
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
                          const isDebtor =
                            s.from._id.toString() === member._id.toString();
                          return (
                            <div key={idx} className="settlement-row">
                              <ArrowRight
                                size={12}
                                className={
                                  isDebtor ? "arrow-owe" : "arrow-owed"
                                }
                              />
                              <span
                                className={
                                  isDebtor
                                    ? "settlement-owe"
                                    : "settlement-owed"
                                }
                              >
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
                // console.log(
                //   "expense.date:",
                //   expense.date,
                //   "expense.createdAt:",
                //   expense.createdAt,
                // );
                const canDelete = canDeleteExpense(expense);
                const addedByMe =
                  expense.createdBy?._id?.toString() === currentUserId ||
                  expense.createdBy?.toString() === currentUserId;

                return (
                  <div key={expense._id} className="expense-item">
                    <div className="expense-details">
                      <h4 className="expense-description">
                        {expense.description || "Unnamed Expense"}
                      </h4>
                      <p className="expense-meta">
                        Paid by{" "}
                        {expense.paidBy?.name || expense.paidBy || "Unknown"} •{" "}
                        {formatDate(expense.date || expense.createdAt)}
                        {addedByMe && (
                          <span className="expense-added-by-you">
                            {" "}
                            • Added by you
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="expense-item-actions">
                      <div className="expense-amount">
                        Rs {(expense.amount || 0).toLocaleString()}
                      </div>

                      {canDelete && (
                        <>
                          {/* ✏️ EDIT */}
                          <button
                            className="btn-delete"
                            onClick={() => handleEdit(expense)}
                            title="Edit"
                          >
                            <Pencil size={14} />
                          </button>

                          {/* 🗑️ DELETE */}
                          <button
                            className="btn-delete"
                            onClick={() => handleDeleteExpense(expense)}
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
      <ExpenseModal
        show={showAddExpenseModal}
        onClose={() => {
          setShowAddExpenseModal(false);
          setEditingExpense(null); // ✅ IMPORTANT
        }}
        onSubmit={handleAddExpense}
        expenseForm={expenseForm}
        setExpenseForm={setExpenseForm}
        submitting={submittingExp}
        error={expenseError}
        members={members}
        isEditing={!!editingExpense}
      />

      {/* ── ADD MEMBER MODAL (admin only) ───────────────────────── */}
      {showAddMemberModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowAddMemberModal(false)}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Add Member</h2>
              <button
                className="modal-close-btn"
                onClick={() => setShowAddMemberModal(false)}
              >
                ✕
              </button>
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
              <button
                className="btn-secondary"
                onClick={() => setShowAddMemberModal(false)}
              >
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={handleAddMember}
                disabled={addingMember}
              >
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
