// client/src/pages/DashboardPage/AllExpenses.jsx
import { useState, useEffect } from "react";
import { Search, Trash2 } from "lucide-react";
import DashboardLayout from "./DashboardLayout";
import "./Dashboard.css";

const API = process.env.REACT_APP_API_URL;

function AllExpenses() {
  const [expenses, setExpenses]       = useState([]);
  const [groups, setGroups]           = useState(["all"]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterGroup, setFilterGroup] = useState("all");
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);

  const token = localStorage.getItem("token");

  useEffect(() => { fetchExpenses(); }, []);

  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    const d = new Date(dateStr);
    return isNaN(d.getTime())
      ? dateStr
      : d.toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" });
  };

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${API}/expenses`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch expenses");
      const data = await res.json();
      const expensesData = Array.isArray(data) ? data : data.expenses || [];
      setExpenses(expensesData);
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
    if (!window.confirm("Are you sure you want to delete this expense?")) return;
    try {
      const res = await fetch(`${API}/expenses/${id}`, {
        method:  "DELETE",
        headers: { Authorization: `Bearer ${token}` },
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
        const matchesSearch = (expense.description || "")
          .toLowerCase()
          .includes(searchQuery.toLowerCase());
        const matchesGroup =
          filterGroup === "all" || expense.group?.name === filterGroup;
        return matchesSearch && matchesGroup;
      })
    : [];

  const totalAmount = filteredExpenses.reduce(
    (sum, expense) => sum + (expense.amount || 0), 0
  );

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

      {loading && (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading expenses...</p>
        </div>
      )}

      {error && !loading && (
        <div className="error-state">
          <p className="error-message">{error}</p>
          <button className="btn-primary" onClick={fetchExpenses}>Retry</button>
        </div>
      )}

      {!loading && !error && (
        <>
          <div className="summary-card">
            <div className="summary-item">
              <span className="summary-label">Total Expenses</span>
              <span className="summary-value">Rs {totalAmount.toLocaleString()}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Number of Expenses</span>
              <span className="summary-value">{filteredExpenses.length}</span>
            </div>
          </div>

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