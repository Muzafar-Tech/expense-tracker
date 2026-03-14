import { useState, useEffect } from "react";
import { Search, Trash2 } from "lucide-react";
import DashboardLayout from "./DashboardLayout";
import "./Dashboard.css";

function AllExpenses() {
  const [expenses, setExpenses] = useState([]);
  const [groups, setGroups] = useState(["all"]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterGroup, setFilterGroup] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const token = localStorage.getItem("token");

  useEffect(() => {
    fetchExpenses();
  }, []);

  // Safe date formatter — consistent with Dashboard.jsx / GroupDetail.jsx
  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    const d = new Date(dateStr);
    return isNaN(d.getTime())
      ? dateStr
      : d.toLocaleDateString("en-PK", {
          day: "numeric",
          month: "short",
          year: "numeric",
        });
  };

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      setError(null); // reset error on each attempt

      const res = await fetch("https://expense-tracker-backend-74i4.onrender.com/api/expenses", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) throw new Error("Failed to fetch expenses");

      const data = await res.json();

      const expensesData = Array.isArray(data) ? data : data.expenses || [];
      setExpenses(expensesData);

      // Extract unique group names for the filter dropdown
      const uniqueGroups = [
        "all",
        ...new Set(expensesData.map((e) => e.group?.name).filter(Boolean)),
      ];
      setGroups(uniqueGroups);
    } catch (err) {
      console.error("Fetch expenses error:", err);
      setError("Failed to load expenses");
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteExpense = async (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this expense?"
    );
    if (!confirmDelete) return;

    try {
      const res = await fetch(`https://expense-tracker-backend-74i4.onrender.com/api/expenses/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        setExpenses((prev) => prev.filter((exp) => exp._id !== id));
      } else {
        const data = await res.json();
        alert(data.message || "Failed to delete expense");
      }
    } catch (err) {
      console.error("Delete expense error:", err);
      alert("Failed to delete expense");
    }
  };

  const filteredExpenses = Array.isArray(expenses)
    ? expenses.filter((expense) => {
        // Safe toLowerCase — won't crash if description is null/undefined
        const matchesSearch = (expense.description || "")
          .toLowerCase()
          .includes(searchQuery.toLowerCase());
        const matchesGroup =
          filterGroup === "all" || expense.group?.name === filterGroup;
        return matchesSearch && matchesGroup;
      })
    : [];

  const totalAmount = filteredExpenses.reduce(
    (sum, expense) => sum + (expense.amount || 0),
    0
  );

  // Safely resolve paidBy whether it's a string or a populated object
  const resolvePaidBy = (paidBy) => {
    if (!paidBy) return "Unknown";
    if (typeof paidBy === "string") return paidBy;
    return paidBy.name || paidBy.email || "Unknown";
  };

  return (
    <DashboardLayout>
      <div className="dashboard-header">
        <div>
          <h1 className="page-title">All Expenses</h1>
          <p className="page-subtitle">Complete history of your expenses</p>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="search-filter-row">
        <div className="search-container">
          <Search size={20} className="search-icon" />
          <input
            type="text"
            placeholder="Search expenses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>

        <select
          value={filterGroup}
          onChange={(e) => setFilterGroup(e.target.value)}
          className="filter-select"
        >
          {groups.map((group) => (
            <option key={group} value={group}>
              {group === "all" ? "All Groups" : group}
            </option>
          ))}
        </select>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading expenses...</p>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="error-state">
          <p className="error-message">{error}</p>
          <button className="btn-primary" onClick={fetchExpenses}>
            Retry
          </button>
        </div>
      )}

      {/* Content */}
      {!loading && !error && (
        <>
          {/* Summary Card */}
          <div className="summary-card">
            <div className="summary-item">
              <span className="summary-label">Total Expenses</span>
              <span className="summary-value">
                Rs {totalAmount.toLocaleString()}
              </span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Number of Expenses</span>
              <span className="summary-value">{filteredExpenses.length}</span>
            </div>
          </div>

          {/* Expenses Table */}
          {filteredExpenses.length > 0 ? (
            <div className="expenses-table-container">
              <table className="expenses-table">
                <thead>
                  <tr>
                    <th>Description</th>
                    <th>Group</th>
                    <th>Paid By</th>
                    <th>Split Between</th>
                    <th>Date</th>
                    <th className="expense-amount-header">Amount</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredExpenses.map((expense) => (
                    <tr key={expense._id}>
                      <td className="expense-description-cell">
                        {expense.description || "Unnamed Expense"}
                      </td>
                      <td>
                        <span className="group-badge">
                          {expense.group?.name || "Unknown"}
                        </span>
                      </td>
                      <td>{resolvePaidBy(expense.paidBy)}</td>
                      <td className="split-members">
                        {expense.splitBetween?.length || 0} members
                      </td>
                      {/* ── FIXED: use createdAt first, fallback to date ── */}
                      <td>{formatDate(expense.createdAt || expense.date)}</td>
                      <td className="expense-amount-cell">
                        Rs {(expense.amount || 0).toLocaleString()}
                      </td>
                      <td>
                        <button
                          onClick={() => handleDeleteExpense(expense._id)}
                          className="expense-delete-btn"
                          title="Delete expense"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              <p>No expenses found</p>
            </div>
          )}
        </>
      )}
    </DashboardLayout>
  );
}

export default AllExpenses;
