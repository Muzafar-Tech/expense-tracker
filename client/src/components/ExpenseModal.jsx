import React from "react";
import "../pages/DashboardPage/GroupDetail.css";

function ExpenseModal({
  show,
  onClose,
  onSubmit,
  expenseForm,
  setExpenseForm,
  submitting,
  error,
  members = [],
  isEditing,
}) {
  if (!show) return null;

  // ✅ TOTAL CALCULATION
  const expenseTotal =
    expenseForm.payerMode === "single"
      ? Number(expenseForm.singleAmount || 0)
      : Object.values(expenseForm.multiPayerAmounts || {}).reduce(
          (sum, val) => sum + Number(val || 0),
          0,
        );

  const totalPercentage = [...expenseForm.splitAmong].reduce(
    (sum, id) => sum + Number(expenseForm.percentages[id] || 0),
    0,
  );

  const totalExact = [...expenseForm.splitAmong].reduce(
    (sum, id) => sum + Number(expenseForm.exactAmounts[id] || 0),
    0,
  );
  const equalShare =
    expenseForm.splitAmong.size > 0
      ? expenseTotal / expenseForm.splitAmong.size
      : 0;

  const multiPayerTotal = expenseTotal;

  // ✅ TOGGLE MEMBER
  const toggleSplitMember = (id) => {
    setExpenseForm((p) => {
      const newSet = new Set(p.splitAmong);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return { ...p, splitAmong: newSet };
    });
  };

  return (
    <div className="modal-overlay" onClick={() => !submitting && onClose()}>
      <div
        className="modal-content modal-large"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="modal-header">
          <h2 className="modal-title">
            {isEditing ? "Edit Expense" : "Add Expense"}
          </h2>
          <button
            className="modal-close-btn"
            onClick={onClose}
            disabled={submitting}
          >
            ✕
          </button>
        </div>

        {/* BODY */}
        <div className="modal-body">
          {error && <p className="form-error">{error}</p>}

          {/* DESCRIPTION */}
          <div className="form-group">
            <label className="form-label">Description *</label>
            <input
              className="form-input"
              placeholder="e.g. Dinner, Groceries, Rent"
              value={expenseForm.description}
              onChange={(e) =>
                setExpenseForm((p) => ({
                  ...p,
                  description: e.target.value,
                }))
              }
            />
          </div>

          {/* DATE */}
          <div className="form-group">
            <label className="form-label">Date *</label>
            <input
              className="form-input"
              type="date"
              value={expenseForm.date || ""}
              onChange={(e) =>
                setExpenseForm((p) => ({
                  ...p,
                  date: e.target.value,
                }))
              }
            />
          </div>

          {/* PAYMENT MODE */}
          <div className="form-group">
            <label className="form-label">Payment Mode</label>
            <div className="toggle-group">
              {["single", "multi"].map((mode) => (
                <button
                  key={mode}
                  type="button"
                  className={`toggle-btn ${
                    expenseForm.payerMode === mode ? "active" : ""
                  }`}
                  onClick={() =>
                    setExpenseForm((p) => ({ ...p, payerMode: mode }))
                  }
                >
                  {mode === "single" ? "Single Payer" : "Multiple Payers"}
                </button>
              ))}
            </div>
          </div>

          {/* SINGLE PAYER */}
          {expenseForm.payerMode === "single" && (
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Paid By *</label>
                <select
                  className="form-input"
                  value={expenseForm.singlePayer}
                  onChange={(e) =>
                    setExpenseForm((p) => ({
                      ...p,
                      singlePayer: e.target.value,
                    }))
                  }
                >
                  {members.map((m) => (
                    <option key={m._id} value={m._id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Total Amount (Rs) *</label>
                <input
                  className="form-input"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={expenseForm.singleAmount}
                  onChange={(e) =>
                    setExpenseForm((p) => ({
                      ...p,
                      singleAmount: e.target.value,
                    }))
                  }
                />
              </div>
            </div>
          )}

          {/* MULTI PAYER */}
          {expenseForm.payerMode === "multi" && (
            <div className="form-group">
              <label className="form-label">
                How much did each person pay?
              </label>

              <div className="multi-payer-grid">
                {members.map((m) => (
                  <div key={m._id} className="multi-payer-row">
                    <div className="avatar-small">
                      {m.name[0].toUpperCase()}
                    </div>

                    <span className="multi-payer-name">{m.name}</span>

                    <span className="multi-payer-currency">Rs</span>

                    <input
                      className="form-input input-small"
                      type="number"
                      min="0"
                      placeholder="0"
                      value={expenseForm.multiPayerAmounts[m._id] || ""}
                      onChange={(e) =>
                        setExpenseForm((p) => ({
                          ...p,
                          multiPayerAmounts: {
                            ...p.multiPayerAmounts,
                            [m._id]: e.target.value,
                          },
                        }))
                      }
                    />
                  </div>
                ))}
              </div>

              {multiPayerTotal > 0 && (
                <p className="total-hint">
                  Total: Rs {multiPayerTotal.toLocaleString()}
                </p>
              )}
            </div>
          )}

          {/* SPLIT TYPE */}
          <div className="form-group">
            <label className="form-label">Split Type</label>

            <div className="split-type-group">
              {[
                { value: "equally", label: "Equal Split" },
                { value: "percentage", label: "By Percentage" },
                { value: "exact", label: "Exact Amounts" },
              ].map((opt) => (
                <label key={opt.value} className="radio-option">
                  <input
                    type="radio"
                    checked={expenseForm.splitType === opt.value}
                    onChange={() =>
                      setExpenseForm((p) => ({
                        ...p,
                        splitType: opt.value,
                      }))
                    }
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>

          {/* SPLIT AMONG */}
          <div className="form-group">
            <label className="form-label">
              Split Among ({expenseForm.splitAmong.size} of {members.length}{" "}
              selected)
            </label>

            <div className="split-among-grid">
              {members.map((m) => {
                const isSelected = expenseForm.splitAmong.has(m._id);

                return (
                  <div
                    key={m._id}
                    className={`split-member-row ${
                      isSelected ? "selected" : ""
                    }`}
                  >
                    <label className="split-member-label">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSplitMember(m._id)}
                      />

                      <div className="avatar-small">
                        {m.name[0].toUpperCase()}
                      </div>

                      <span>{m.name}</span>
                    </label>

                    {/* PERCENTAGE */}
                    {isSelected && expenseForm.splitType === "percentage" && (
                      <div className="split-input-wrapper">
                        <input
                          className="form-input input-small"
                          type="number"
                          min="0"
                          max="100"
                          value={expenseForm.percentages[m._id] || ""}
                          onChange={(e) =>
                            setExpenseForm((p) => ({
                              ...p,
                              percentages: {
                                ...p.percentages,
                                [m._id]: e.target.value,
                              },
                            }))
                          }
                        />
                        <span className="input-suffix">%</span>

                        {expenseTotal > 0 && expenseForm.percentages[m._id] && (
                          <span className="calc-hint">
                            = Rs{" "}
                            {(
                              (expenseTotal *
                                Number(expenseForm.percentages[m._id])) /
                              100
                            ).toFixed(2)}
                          </span>
                        )}
                      </div>
                    )}

                    {/* EXACT */}
                    {isSelected && expenseForm.splitType === "exact" && (
                      <div className="split-input-wrapper">
                        <span className="input-prefix">Rs</span>
                        <input
                          className="form-input input-small"
                          type="number"
                          min="0"
                          value={expenseForm.exactAmounts[m._id] || ""}
                          onChange={(e) =>
                            setExpenseForm((p) => ({
                              ...p,
                              exactAmounts: {
                                ...p.exactAmounts,
                                [m._id]: e.target.value,
                              },
                            }))
                          }
                        />
                      </div>
                    )}

                    {/* EQUAL */}
                    {isSelected &&
                      expenseForm.splitType === "equally" &&
                      expenseTotal > 0 && (
                        <span className="split-equal-hint">
                          Rs {equalShare.toFixed(2)}
                        </span>
                      )}
                  </div>
                );
              })}
            </div>
            <div className="split-among-grid">
              {members.map((m) => {
                // member UI
              })}
            </div>

            {/* 👇 YAHAN ADD KARNA HAI */}
            {expenseForm.splitType === "percentage" && (
              <p className="running-total">
                Total: {totalPercentage.toFixed(1)}% / 100%
              </p>
            )}

            {expenseForm.splitType === "exact" && expenseTotal > 0 && (
              <p className="running-total">
                Total: Rs {totalExact.toFixed(2)} / Rs {expenseTotal.toFixed(2)}
              </p>
            )}
          </div>
        </div>

        {/* FOOTER */}
        <div className="modal-actions">
          <button
            className="btn-secondary"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </button>

          <button
            className="btn-primary"
            onClick={onSubmit}
            disabled={submitting}
          >
            {submitting
              ? isEditing
                ? "Updating..."
                : "Adding..."
              : isEditing
                ? "Update Expense"
                : "Add Expense"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ExpenseModal;
