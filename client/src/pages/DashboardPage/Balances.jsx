// client/src/pages/DashboardPage/Balances.jsx
import { useState, useEffect, useCallback } from "react";
import {
  DollarSign,
  Edit2,
  RotateCcw,
  Send,
  CheckCircle,
  XCircle,
  Clock,
  Bell,
} from "lucide-react";
import DashboardLayout from "./DashboardLayout";
import "./Dashboard.css";

const API = "http://localhost:5000/api";
const EPSILON = 0.001;

const fmt = (n) => Math.abs(Number(n || 0)).toLocaleString();

export default function Balances() {
  const [balances, setBalances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Received amount
  const [receivedAmount, setReceivedAmount] = useState(0);
  const [receivedLoading, setReceivedLoading] = useState(true);
  const [showEditReceived, setShowEditReceived] = useState(false);
  const [editReceivedValue, setEditReceivedValue] = useState("");
  const [savingReceived, setSavingReceived] = useState(false);

  // Active modal: "request" (debtor) | "confirm" (creditor) | null
  const [modalMode, setModalMode] = useState(null);
  const [selectedBalanceId, setSelectedBalanceId] = useState(null);
  const [customAmount, setCustomAmount] = useState("");
  const [paymentNote, setPaymentNote] = useState("");
  const [modalLoading, setModalLoading] = useState(false);

  // Which pending request the creditor is acting on
  const [actingSettlementId, setActingSettlementId] = useState(null);

  const token = localStorage.getItem("token");

  // Derive live balance object from id — avoids stale closure bugs
  const selectedBalance =
    balances.find((b) => String(b.balanceId) === String(selectedBalanceId)) ??
    null;

  /* ── Fetch balances ─────────────────────────────────────── */
  const fetchBalances = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API}/balances`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch balances");
      const data = await res.json();
      // Handle both array and { balances: [...] } response shapes
      setBalances(Array.isArray(data) ? data : data.balances || []);
      setError(null);
    } catch (err) {
      setError("Failed to load balances");
      setBalances([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  /* ── Fetch received amount ──────────────────────────────── */
  const fetchReceived = useCallback(async () => {
    try {
      setReceivedLoading(true);
      const res = await fetch(`${API}/balances/received`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const val = data.totalReceived ?? 0;
        setReceivedAmount(val);
        window.dispatchEvent(
          new CustomEvent("receivedAmountUpdated", { detail: { total: val } }),
        );
      }
    } catch (err) {
      console.error("fetchReceived error:", err);
    } finally {
      setReceivedLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchBalances();
    fetchReceived();

    // Re-fetch when another tab/component fires a balance update
    const onUpdate = () => {
      fetchBalances();
      fetchReceived();
    };
    window.addEventListener("balanceUpdated", onUpdate);
    return () => window.removeEventListener("balanceUpdated", onUpdate);
  }, [fetchBalances, fetchReceived]);

  /* ── Open modals ────────────────────────────────────────── */
  const openRequestModal = (balance) => {
    setSelectedBalanceId(String(balance.balanceId));
    setCustomAmount(String(Math.abs(balance.amount)));
    setPaymentNote("");
    setActingSettlementId(null);
    setModalMode("request");
  };

  const openConfirmModal = (balance, settlementId = null) => {
    setSelectedBalanceId(String(balance.balanceId));
    const pending = balance.pendingRequests?.find(
      (p) => String(p.settlementId) === String(settlementId),
    );
    setCustomAmount(String(Math.abs(pending?.amount ?? balance.amount)));
    setActingSettlementId(settlementId);
    setModalMode("confirm");
  };

  const closeModal = () => {
    setModalMode(null);
    setSelectedBalanceId(null);
    setCustomAmount("");
    setPaymentNote("");
    setActingSettlementId(null);
  };

  /* ── DEBTOR: Send settle-up request ─────────────────────── */
  const handleSendRequest = async () => {
    if (!selectedBalance) return;
    const amount = parseFloat(customAmount);
    if (!amount || amount <= 0) return alert("Enter a valid amount");
    if (amount > Math.abs(selectedBalance.amount) + EPSILON) {
      return alert(`Amount cannot exceed Rs ${fmt(selectedBalance.amount)}`);
    }

    setModalLoading(true);
    try {
      const res = await fetch(`${API}/balances/settle-request`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          balanceId: selectedBalance.balanceId,
          amount,
          note: paymentNote,
        }),
      });
      const data = await res.json();
      if (!res.ok) return alert(data.message || "Failed to send request");

      await fetchBalances();
      closeModal();
      alert("Payment request sent! Waiting for confirmation.");
    } catch (err) {
      alert("Something went wrong. Please try again.");
    } finally {
      setModalLoading(false);
    }
  };

  /* ── CREDITOR: Confirm payment ──────────────────────────── */
  const handleConfirm = async () => {
    if (!selectedBalance) return;
    const amount = parseFloat(customAmount);
    if (!amount || amount <= 0) return alert("Enter a valid amount");
    if (amount > Math.abs(selectedBalance.amount) + EPSILON) {
      return alert(`Amount cannot exceed Rs ${fmt(selectedBalance.amount)}`);
    }

    setModalLoading(true);
    try {
      const body = {
        balanceId: selectedBalance.balanceId,
        amount,
        ...(actingSettlementId && { settlementId: actingSettlementId }),
      };

      const res = await fetch(`${API}/balances/confirm`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) return alert(data.message || "Failed to confirm");

      if (data.totalReceived !== undefined) {
        setReceivedAmount(data.totalReceived);
        window.dispatchEvent(
          new CustomEvent("receivedAmountUpdated", {
            detail: { total: data.totalReceived },
          }),
        );
      }

      const isFullyPaid = data.remaining <= EPSILON;

      setBalances((prev) =>
        isFullyPaid
          ? prev.filter(
              (b) => String(b.balanceId) !== String(selectedBalance.balanceId),
            )
          : prev.map((b) =>
              String(b.balanceId) === String(selectedBalance.balanceId)
                ? { ...b, amount: data.remaining, pendingRequests: [] }
                : b,
            ),
      );

      window.dispatchEvent(new CustomEvent("balanceUpdated"));
      closeModal();
    } catch (err) {
      alert("Something went wrong. Please try again.");
    } finally {
      setModalLoading(false);
    }
  };

  /* ── CREDITOR: Reject a pending request ─────────────────── */
  const handleReject = async (balance, settlementId) => {
    if (
      !window.confirm(
        "Reject this payment request? The balance will remain unchanged.",
      )
    )
      return;
    try {
      const res = await fetch(`${API}/balances/reject`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ balanceId: balance.balanceId, settlementId }),
      });
      const data = await res.json();
      if (!res.ok) return alert(data.message || "Failed to reject");
      setBalances((prev) =>
        prev.map((b) =>
          String(b.balanceId) === String(balance.balanceId)
            ? {
                ...b,
                pendingRequests: b.pendingRequests?.filter(
                  (p) => String(p.settlementId) !== String(settlementId),
                ),
              }
            : b,
        ),
      );
    } catch (err) {
      alert("Something went wrong.");
    }
  };

  /* ── Received Amount — Edit / Reset ─────────────────────── */
  const openEditReceived = () => {
    setEditReceivedValue(String(receivedAmount));
    setShowEditReceived(true);
  };

  const saveEditReceived = async () => {
    const val = parseFloat(editReceivedValue);
    if (isNaN(val) || val < 0) return alert("Enter a valid amount");
    setSavingReceived(true);
    try {
      const res = await fetch(`${API}/balances/received/set`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ amount: val }),
      });
      if (res.ok) {
        const data = await res.json();
        setReceivedAmount(data.totalReceived);
        window.dispatchEvent(
          new CustomEvent("receivedAmountUpdated", {
            detail: { total: data.totalReceived },
          }),
        );
      }
    } finally {
      setSavingReceived(false);
      setShowEditReceived(false);
    }
  };

  const resetReceived = async () => {
    if (!window.confirm("Reset received amount to 0?")) return;
    try {
      const res = await fetch(`${API}/balances/received/set`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ amount: 0 }),
      });
      if (res.ok) {
        setReceivedAmount(0);
        window.dispatchEvent(
          new CustomEvent("receivedAmountUpdated", { detail: { total: 0 } }),
        );
      }
    } catch (err) {
      alert("Failed to reset.");
    }
  };

  /* ── Summary numbers ────────────────────────────────────── */
  const totalOwe = balances
    .filter((b) => b.type === "owe")
    .reduce((s, b) => s + Math.abs(b.amount || 0), 0);
  const totalOwed = balances
    .filter((b) => b.type === "owes")
    .reduce((s, b) => s + Math.abs(b.amount || 0), 0);

  /* ── Note label inside modal ────────────────────────────── */
  const getModalNote = () => {
    if (!selectedBalance || !customAmount) return null;
    const entered = parseFloat(customAmount) || 0;
    const total = Math.abs(selectedBalance.amount);
    if (entered <= 0) return null;
    if (entered >= total - EPSILON)
      return { cls: "settle-note-full", text: "✅ Full settlement" };
    return {
      cls: "settle-note-partial",
      text: `⚠️ Partial — Rs ${fmt(total - entered)} will remain`,
    };
  };

  const note = getModalNote();

  if (loading)
    return (
      <DashboardLayout>
        <div className="loading-state">
          <div className="spinner" />
          <p>Loading balances...</p>
        </div>
      </DashboardLayout>
    );

  if (error)
    return (
      <DashboardLayout>
        <div className="error-state">
          <p className="error-message">{error}</p>
          <button className="btn-primary" onClick={fetchBalances}>
            Retry
          </button>
        </div>
      </DashboardLayout>
    );

  return (
    <DashboardLayout>
      {/* ── Page Header ──────────────────────────────────────── */}
      <div className="dashboard-header">
        <div>
          <h1 className="page-title">Balances</h1>
          <p className="page-subtitle">Manage who owes what</p>
        </div>
      </div>

      {/* ── Summary Cards ────────────────────────────────────── */}
      <div className="balance-summary">
        <div className="balance-card balance-owe">
          <p className="balance-label">You Owe</p>
          <p className="balance-amount">Rs {fmt(totalOwe)}</p>
        </div>
        <div className="balance-card balance-owed">
          <p className="balance-label">Owed to You</p>
          <p className="balance-amount">Rs {fmt(totalOwed)}</p>
        </div>

        {/* Received Amount card */}
        <div className="balance-summary-card received-card">
          <DollarSign size={20} className="received-icon" />
          <div className="received-card-body">
            <p className="inline-block font-bold text-white">Total Received</p>
            {showEditReceived ? (
              <div className="received-edit-row">
                <span>Rs</span>
                <input
                  className="received-edit-input"
                  type="number"
                  value={editReceivedValue}
                  autoFocus
                  onChange={(e) => setEditReceivedValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveEditReceived();
                    if (e.key === "Escape") setShowEditReceived(false);
                  }}
                  disabled={savingReceived}
                />
                <button
                  className="received-edit-save"
                  onClick={saveEditReceived}
                  disabled={savingReceived}
                >
                  ✓
                </button>
                <button
                  className="received-edit-cancel"
                  onClick={() => setShowEditReceived(false)}
                >
                  ✕
                </button>
              </div>
            ) : (
              <p className="received-amount-green">
                {receivedLoading ? "Loading…" : `Rs ${fmt(receivedAmount)}`}
              </p>
            )}
            <div className="received-actions">
              <button
                className="received-action-btn"
                onClick={openEditReceived}
                disabled={showEditReceived || savingReceived}
              >
                <Edit2 size={12} /> Edit
              </button>
              <button
                className="received-action-btn received-reset-btn"
                onClick={resetReceived}
                disabled={savingReceived}
              >
                <RotateCcw size={12} /> Reset
              </button>
            </div>
          </div>
        </div>
      </div>

      {balances.length === 0 ? (
        <div className="empty-state" style={{ marginTop: 40 }}>
          <DollarSign size={48} />
          <p>All settled up! 🎉</p>
        </div>
      ) : (
        <div className="balances-full-list">
          {/* ── YOU OWE section (Debtor view) ─────────────────── */}
          {balances.filter((b) => b.type === "owe").length > 0 && (
            <div className="balance-section">
              <h2 className="balance-section-title owe-title">You Owe</h2>
              {balances
                .filter((b) => b.type === "owe")
                .map((balance) => {
                  const hasPending = balance.pendingRequests?.length > 0;
                  return (
                    <div key={balance.balanceId} className="balance-full-card">
                      <div className="balance-person-info">
                        <div className="avatar-large">
                          {balance.person?.charAt(0) || "?"}
                        </div>
                        <div>
                          <p className="balance-person-name">
                            {balance.person}
                          </p>
                          <p className="balance-person-email">
                            {balance.email}
                          </p>
                          <p className="balance-groups">
                            {balance.groups?.join(", ")}
                          </p>
                        </div>
                      </div>

                      <div className="balance-amount-section">
                        <p className="balance-owe-amount">
                          Rs {fmt(balance.amount)}
                        </p>

                        {hasPending && (
                          <div className="pending-indicator">
                            <Clock size={13} />
                            <span>Request sent — awaiting confirmation</span>
                          </div>
                        )}

                        {!hasPending && (
                          <button
                            className="btn-settle"
                            onClick={() => openRequestModal(balance)}
                          >
                            <Send size={14} /> Settle Up
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}

          {/* ── OWES YOU section (Creditor view) ──────────────── */}
          {balances.filter((b) => b.type === "owes").length > 0 && (
            <div className="balance-section">
              <h2 className="balance-section-title owes-title">Owes You</h2>
              {balances
                .filter((b) => b.type === "owes")
                .map((balance) => (
                  <div key={balance.balanceId} className="balance-full-card">
                    <div className="balance-person-info">
                      <div className="avatar-large">
                        {balance.person?.charAt(0) || "?"}
                      </div>
                      <div>
                        <p className="balance-person-name">{balance.person}</p>
                        <p className="balance-person-email">{balance.email}</p>
                        <p className="balance-groups">
                          {balance.groups?.join(", ")}
                        </p>
                      </div>
                    </div>

                    <div className="balance-amount-section">
                      <p className="balance-owes-amount">
                        Rs {fmt(balance.amount)}
                      </p>

                      {/* Pending requests for creditor to act on */}
                      {balance.pendingRequests?.map((req) => (
                        <div
                          key={req.settlementId}
                          className="pending-request-card"
                        >
                          <div className="pending-request-info">
                            <Clock size={13} />
                            <span>
                              {balance.person} claims paid Rs {fmt(req.amount)}
                            </span>
                            {req.note && (
                              <span className="pending-note">"{req.note}"</span>
                            )}
                          </div>
                          <div className="pending-request-actions">
                            <button
                              className="btn-confirm-small"
                              onClick={() =>
                                openConfirmModal(balance, req.settlementId)
                              }
                            >
                              <CheckCircle size={12} /> Confirm
                            </button>
                            <button
                              className="btn-reject-small"
                              onClick={() =>
                                handleReject(balance, req.settlementId)
                              }
                            >
                              <XCircle size={12} /> Reject
                            </button>
                          </div>
                        </div>
                      ))}

                      <div className="owes-actions">
                        {/* Send Reminder */}
                        <button
                          className="remind-btn"
                          onClick={() =>
                            alert(
                              `Reminder sent to ${balance.person || "this person"}`,
                            )
                          }
                        >
                          <Bell size={14} /> Send Reminder
                        </button>

                        {/* Direct confirm (cash payment — no request needed) */}
                        <button
                          className="btn-confirm"
                          onClick={() => openConfirmModal(balance, null)}
                        >
                          <CheckCircle size={14} /> Confirm Payment
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* ── Modal: Send Request (Debtor) ─────────────────────── */}
      {modalMode === "request" && selectedBalance && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">
                Settle Up with {selectedBalance.person}
              </h2>
              <button className="modal-close-btn" onClick={closeModal}>
                ✕
              </button>
            </div>

            <p className="modal-subtitle">
              You owe <strong>Rs {fmt(selectedBalance.amount)}</strong>. Enter
              the amount you paid and send a request for{" "}
              {selectedBalance.person} to confirm.
            </p>

            <div className="form-group">
              <label className="form-label">Amount (Rs)</label>
              <input
                className="form-input"
                type="number"
                min="1"
                max={Math.abs(selectedBalance.amount)}
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                autoFocus
              />
            </div>

            <div className="form-group">
              <label className="form-label">Note (optional)</label>
              <input
                className="form-input"
                type="text"
                placeholder="e.g. Sent via Easypaisa"
                value={paymentNote}
                onChange={(e) => setPaymentNote(e.target.value)}
              />
            </div>

            {note && <p className={`settle-note ${note.cls}`}>{note.text}</p>}

            <div className="modal-actions">
              <button className="btn-secondary" onClick={closeModal}>
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={handleSendRequest}
                disabled={modalLoading}
              >
                <Send size={14} />
                {modalLoading ? "Sending..." : "Send Request"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Confirm Payment (Creditor) ────────────────── */}
      {modalMode === "confirm" && selectedBalance && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">
                Confirm Payment from {selectedBalance.person}
              </h2>
              <button className="modal-close-btn" onClick={closeModal}>
                ✕
              </button>
            </div>

            <p className="modal-subtitle">
              {selectedBalance.person} owes you{" "}
              <strong>Rs {fmt(selectedBalance.amount)}</strong>. Confirm how
              much you actually received.
            </p>

            <div className="form-group">
              <label className="form-label">Amount Received (Rs)</label>
              <input
                className="form-input"
                type="number"
                min="1"
                max={Math.abs(selectedBalance.amount)}
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                autoFocus
              />
            </div>

            {note && <p className={`settle-note ${note.cls}`}>{note.text}</p>}

            <div className="modal-actions">
              <button className="btn-secondary" onClick={closeModal}>
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={handleConfirm}
                disabled={modalLoading}
              >
                <CheckCircle size={14} />
                {modalLoading ? "Confirming..." : "Yes, Received"}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
