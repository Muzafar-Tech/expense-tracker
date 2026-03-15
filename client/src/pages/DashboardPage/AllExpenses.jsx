// client/src/pages/DashboardPage/AllExpenses.jsx
import { useState, useEffect } from "react";
import { Search, Trash2, Download, FileText, X } from "lucide-react";
import DashboardLayout from "./DashboardLayout";
import "./Dashboard.css";

const API = process.env.REACT_APP_API_URL;

/* ═════════════════════════════════════════════════════════════
   PDF GENERATOR — pure browser, zero dependencies
   window.open → styled HTML → window.print()
═════════════════════════════════════════════════════════════ */
function generateExpensePDF({ expenses, reportType, filterValue, generatedBy, balances, allExpenses }) {

  const fmt  = (d) => {
    if (!d) return "N/A";
    const dt = new Date(d);
    return isNaN(dt.getTime()) ? d : dt.toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" });
  };
  const fmtRs = (n) => `Rs ${Number(n || 0).toLocaleString("en-PK")}`;
  const paidBy = (p) => {
    if (!p) return "Unknown";
    if (typeof p === "string") return p;
    return p.name || p.email || "Unknown";
  };

  const now = new Date();
  const dateStr = now.toLocaleDateString("en-PK", { day: "numeric", month: "long", year: "numeric" });
  const timeStr = now.toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" });

  /* ── Build expense rows HTML ─────────────────────────────── */
  const expenseRows = (list) => list.map((exp, i) => `
    <tr class="${i % 2 === 0 ? "r-even" : "r-odd"}">
      <td class="tc">${i + 1}</td>
      <td class="td">${exp.description || "—"}</td>
      <td>${paidBy(exp.paidBy)}</td>
      <td class="tc">${exp.splitBetween?.length || exp.splitAmong?.length || "—"}</td>
      <td>${fmt(exp.createdAt || exp.date)}</td>
      <td class="tr amt">${fmtRs(exp.amount)}</td>
    </tr>
  `).join("");

  const expenseTable = (list, showTotal = true) => {
    const total = list.reduce((s, e) => s + (e.amount || 0), 0);
    return `
      <table>
        <thead>
          <tr>
            <th class="tc" style="width:36px">#</th>
            <th>Description</th>
            <th>Paid By</th>
            <th class="tc">Split</th>
            <th>Date</th>
            <th class="tr" style="width:120px">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${expenseRows(list)}
          ${showTotal ? `
          <tr class="total-row">
            <td colspan="5" class="tr" style="font-size:12px;letter-spacing:.4px">TOTAL</td>
            <td class="tr amt" style="font-size:15px">${fmtRs(total)}</td>
          </tr>` : ""}
        </tbody>
      </table>`;
  };

  /* ── Balance summary section ─────────────────────────────── */
  const balanceSection = (relevantBalances) => {
    if (!relevantBalances || relevantBalances.length === 0) return "";
    const rows = relevantBalances.map((b) => {
      const isOwe  = b.type === "owe";
      const color  = isOwe ? "#dc2626" : "#16a34a";
      const sign   = isOwe ? "−" : "+";
      const label  = isOwe
        ? `You owe ${b.person}`
        : `${b.person} owes you`;
      return `
        <tr>
          <td><strong>${b.person}</strong></td>
          <td style="color:${color};font-weight:700">${sign} ${fmtRs(b.amount)}</td>
          <td style="color:${color}">${label}</td>
        </tr>`;
    }).join("");

    return `
      <div class="section-block balance-block">
        <div class="section-heading">Balance Summary</div>
        <table class="balance-table">
          <thead>
            <tr>
              <th>Person</th>
              <th>Amount</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  };

  /* ══════════════════════════════════════════════════════════
     BUILD REPORT BODY based on reportType
  ══════════════════════════════════════════════════════════ */
  let reportTitle = "";
  let reportSubtitle = "";
  let bodyHtml = "";
  let summaryCards = "";

  /* ── CURRENT VIEW ─────────────────────────────────────── */
  if (reportType === "current") {
    const total = expenses.reduce((s, e) => s + (e.amount || 0), 0);
    reportTitle    = "Expense Report — Current View";
    reportSubtitle = `${expenses.length} expense${expenses.length !== 1 ? "s" : ""} · Filter: ${filterValue || "All"}`;
    summaryCards   = `
      <div class="summary-bar">
        <div class="scard blue"><div class="sc-label">Total Expenses</div><div class="sc-val">${expenses.length}</div></div>
        <div class="scard green"><div class="sc-label">Grand Total</div><div class="sc-val">${fmtRs(total)}</div></div>
        <div class="scard purple"><div class="sc-label">Filter</div><div class="sc-val" style="font-size:14px">${filterValue || "All"}</div></div>
      </div>`;
    bodyHtml = expenseTable(expenses);
    if (balances && balances.length > 0) bodyHtml += balanceSection(balances);
  }

  /* ── SINGLE GROUP ─────────────────────────────────────── */
  else if (reportType === "single-group") {
    const total = expenses.reduce((s, e) => s + (e.amount || 0), 0);
    reportTitle    = `Group Report — ${filterValue}`;
    reportSubtitle = `${expenses.length} expense${expenses.length !== 1 ? "s" : ""}`;
    summaryCards   = `
      <div class="summary-bar">
        <div class="scard blue"><div class="sc-label">Group</div><div class="sc-val" style="font-size:14px">${filterValue}</div></div>
        <div class="scard green"><div class="sc-label">Grand Total</div><div class="sc-val">${fmtRs(total)}</div></div>
        <div class="scard purple"><div class="sc-label">Expenses</div><div class="sc-val">${expenses.length}</div></div>
      </div>`;
    bodyHtml = expenseTable(expenses);
    if (balances && balances.length > 0) bodyHtml += balanceSection(balances);
  }

  /* ── ALL GROUPS (grouped by group name) ───────────────── */
  else if (reportType === "all-groups") {
    reportTitle    = "All Groups — Expense Report";
    reportSubtitle = `Complete group-wise breakdown`;

    // Group expenses by group name
    const grouped = {};
    expenses.forEach((e) => {
      const g = e.group?.name || "No Group";
      if (!grouped[g]) grouped[g] = [];
      grouped[g].push(e);
    });

    const grandTotal = expenses.reduce((s, e) => s + (e.amount || 0), 0);
    const groupNames = Object.keys(grouped).sort();

    summaryCards = `
      <div class="summary-bar">
        <div class="scard blue"><div class="sc-label">Groups</div><div class="sc-val">${groupNames.length}</div></div>
        <div class="scard green"><div class="sc-label">Grand Total</div><div class="sc-val">${fmtRs(grandTotal)}</div></div>
        <div class="scard purple"><div class="sc-label">Total Expenses</div><div class="sc-val">${expenses.length}</div></div>
      </div>`;

    bodyHtml = groupNames.map((gName) => {
      const list  = grouped[gName];
      const total = list.reduce((s, e) => s + (e.amount || 0), 0);
      const gBalances = balances ? balances.filter((b) => {
        // match balances that mention this group (best effort from groups array)
        return b.groups?.includes(gName) || true; // show all if no group info
      }) : [];
      return `
        <div class="section-block">
          <div class="section-heading group-heading">
            <span>${gName}</span>
            <span class="group-total">${fmtRs(total)}</span>
          </div>
          ${expenseTable(list, true)}
        </div>`;
    }).join("");

    // Overall balance summary at the end
    if (balances && balances.length > 0) bodyHtml += balanceSection(balances);
  }

  /* ── SINGLE PERSON ────────────────────────────────────── */
  else if (reportType === "single-person") {
    const total = expenses.reduce((s, e) => s + (e.amount || 0), 0);
    reportTitle    = `Person Report — ${filterValue}`;
    reportSubtitle = `All expenses involving ${filterValue}`;

    // Separate: paid by this person vs split among
    const paidByPerson = expenses.filter((e) => paidBy(e.paidBy) === filterValue);
    const splitWith    = expenses.filter((e) => paidBy(e.paidBy) !== filterValue);
    const paidTotal    = paidByPerson.reduce((s, e) => s + (e.amount || 0), 0);
    const splitTotal   = splitWith.reduce((s, e) => s + (e.amount || 0), 0);

    // Balance info for this person
    const personBalances = balances ? balances.filter(
      (b) => b.person === filterValue || b.creditor === filterValue
    ) : [];

    summaryCards = `
      <div class="summary-bar">
        <div class="scard blue"><div class="sc-label">Paid By ${filterValue}</div><div class="sc-val">${fmtRs(paidTotal)}</div></div>
        <div class="scard purple"><div class="sc-label">Split In</div><div class="sc-val">${fmtRs(splitTotal)}</div></div>
        <div class="scard green"><div class="sc-label">Total Involved</div><div class="sc-val">${fmtRs(total)}</div></div>
      </div>`;

    bodyHtml = "";

    if (paidByPerson.length > 0) {
      bodyHtml += `
        <div class="section-block">
          <div class="section-heading">Expenses Paid by ${filterValue}</div>
          ${expenseTable(paidByPerson, true)}
        </div>`;
    }

    if (splitWith.length > 0) {
      bodyHtml += `
        <div class="section-block">
          <div class="section-heading">Expenses Shared with ${filterValue}</div>
          ${expenseTable(splitWith, true)}
        </div>`;
    }

    if (personBalances.length > 0) {
      bodyHtml += balanceSection(personBalances);
    } else if (balances && balances.length > 0) {
      bodyHtml += balanceSection(balances);
    }
  }

  /* ── ALL PERSONS (person-wise breakdown) ──────────────── */
  else if (reportType === "all-persons") {
    reportTitle    = "All Persons — Expense Report";
    reportSubtitle = "Complete person-wise breakdown";

    // Collect all unique person names
    const personSet = new Set();
    expenses.forEach((e) => {
      const p = paidBy(e.paidBy);
      if (p && p !== "Unknown") personSet.add(p);
      (e.splitAmong || []).forEach((m) => {
        const n = m?.name || (typeof m === "string" ? m : null);
        if (n) personSet.add(n);
      });
    });
    const personNames = Array.from(personSet).sort();
    const grandTotal  = expenses.reduce((s, e) => s + (e.amount || 0), 0);

    summaryCards = `
      <div class="summary-bar">
        <div class="scard blue"><div class="sc-label">Persons</div><div class="sc-val">${personNames.length}</div></div>
        <div class="scard green"><div class="sc-label">Grand Total</div><div class="sc-val">${fmtRs(grandTotal)}</div></div>
        <div class="scard purple"><div class="sc-label">Total Expenses</div><div class="sc-val">${expenses.length}</div></div>
      </div>`;

    bodyHtml = personNames.map((pName) => {
      const involved = expenses.filter((e) => {
        if (paidBy(e.paidBy) === pName) return true;
        return (e.splitAmong || []).some(
          (m) => (m?.name || (typeof m === "string" ? m : "")) === pName
        );
      });
      const total  = involved.reduce((s, e) => s + (e.amount || 0), 0);
      const pBal   = balances ? balances.filter((b) => b.person === pName) : [];

      let balHtml = "";
      if (pBal.length > 0) {
        balHtml = pBal.map((b) => {
          const isOwe = b.type === "owe";
          return `<span class="person-bal ${isOwe ? "red" : "green"}">
            ${isOwe ? `Owes ${b.creditor || "someone"} ${fmtRs(b.amount)}` : `Owed ${fmtRs(b.amount)} by ${b.debtor || "someone"}`}
          </span>`;
        }).join(" ");
      }

      return `
        <div class="section-block">
          <div class="section-heading person-heading">
            <div class="person-avatar">${pName[0].toUpperCase()}</div>
            <div>
              <span>${pName}</span>
              <span class="group-total">${fmtRs(total)}</span>
              ${balHtml ? `<div class="person-bal-row">${balHtml}</div>` : ""}
            </div>
          </div>
          ${expenseTable(involved, true)}
        </div>`;
    }).join("");

    if (balances && balances.length > 0) bodyHtml += balanceSection(balances);
  }

  /* ══════════════════════════════════════════════════════════
     FINAL HTML
  ══════════════════════════════════════════════════════════ */
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>${reportTitle}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: 'Inter', Arial, sans-serif;
    font-size: 12.5px;
    color: #1e293b;
    background: #fff;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .page { padding: 36px 44px; max-width: 960px; margin: 0 auto; }

  /* ── Header ── */
  .doc-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding-bottom: 18px;
    border-bottom: 3px solid #1d4ed8;
    margin-bottom: 24px;
  }
  .brand-name {
    font-size: 24px;
    font-weight: 800;
    color: #1d4ed8;
    letter-spacing: -0.8px;
    line-height: 1;
  }
  .brand-sub { font-size: 11px; color: #64748b; font-weight: 400; margin-top: 3px; }
  .doc-meta { text-align: right; font-size: 11.5px; color: #64748b; line-height: 1.8; }
  .doc-meta strong { color: #1e293b; }

  /* ── Title ── */
  .doc-title { font-size: 20px; font-weight: 700; color: #0f172a; letter-spacing: -0.4px; margin-bottom: 3px; }
  .doc-subtitle { font-size: 12px; color: #64748b; margin-bottom: 22px; }

  /* ── Summary cards ── */
  .summary-bar { display: flex; gap: 14px; margin-bottom: 24px; }
  .scard {
    flex: 1; padding: 14px 18px;
    border-radius: 10px;
    border-left: 4px solid;
  }
  .scard.blue   { background: #eff6ff; border-color: #1d4ed8; }
  .scard.green  { background: #f0fdf4; border-color: #16a34a; }
  .scard.purple { background: #f5f3ff; border-color: #7c3aed; }
  .scard.red    { background: #fef2f2; border-color: #dc2626; }
  .sc-label { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: .5px; color: #64748b; }
  .sc-val   { font-size: 19px; font-weight: 700; color: #0f172a; margin-top: 3px; }

  /* ── Section blocks ── */
  .section-block {
    margin-bottom: 30px;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    overflow: hidden;
  }
  .section-heading {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 18px;
    background: #f8fafc;
    border-bottom: 1px solid #e2e8f0;
    font-size: 13px;
    font-weight: 700;
    color: #0f172a;
  }
  .group-heading { background: #eff6ff; border-bottom-color: #bfdbfe; color: #1d4ed8; }
  .group-total { font-size: 14px; color: #1d4ed8; font-weight: 700; }

  .person-heading { background: #f0fdf4; border-bottom-color: #bbf7d0; color: #15803d; flex-direction: column; align-items: flex-start; gap: 6px; padding: 14px 18px; }
  .person-avatar {
    width: 32px; height: 32px; border-radius: 50%;
    background: #1d4ed8; color: #fff;
    font-size: 14px; font-weight: 700;
    display: inline-flex; align-items: center; justify-content: center;
    margin-right: 10px; vertical-align: middle;
  }
  .person-bal-row { margin-top: 5px; display: flex; gap: 8px; flex-wrap: wrap; }
  .person-bal {
    font-size: 11px; font-weight: 600;
    padding: 3px 10px; border-radius: 20px;
  }
  .person-bal.green { background: #dcfce7; color: #15803d; }
  .person-bal.red   { background: #fee2e2; color: #dc2626; }

  /* ── Tables ── */
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  thead tr { background: #1d4ed8; color: #fff; }
  thead th { padding: 10px 14px; text-align: left; font-weight: 600; font-size: 11px; letter-spacing: .3px; }
  .tc { text-align: center; }
  .tr { text-align: right; }
  tbody tr.r-even { background: #f8fafc; }
  tbody tr.r-odd  { background: #fff; }
  tbody tr:hover  { background: #eff6ff; }
  tbody td { padding: 9px 14px; border-bottom: 1px solid #f1f5f9; color: #374151; vertical-align: middle; }
  tbody td.amt { font-weight: 700; color: #1d4ed8; }
  .td  { font-weight: 600; color: #0f172a; }

  tr.total-row td {
    background: #1e293b !important;
    color: #f1f5f9 !important;
    font-weight: 700;
    padding: 11px 14px;
    border-bottom: none;
  }
  tr.total-row td.amt { color: #60a5fa !important; }

  /* ── Balance table ── */
  .balance-block { border-color: #fde68a; }
  .balance-block .section-heading { background: #fffbeb; border-bottom-color: #fde68a; color: #92400e; }
  .balance-table thead tr { background: #92400e; }

  /* ── Footer ── */
  .doc-footer {
    margin-top: 32px;
    padding-top: 14px;
    border-top: 1px solid #e2e8f0;
    display: flex;
    justify-content: space-between;
    font-size: 10.5px;
    color: #94a3b8;
  }

  @media print {
    body { padding: 0; }
    .page { padding: 18px 24px; }
    thead { display: table-header-group; }
    tbody tr { page-break-inside: avoid; }
    .section-block { page-break-inside: avoid; break-inside: avoid; }
  }
</style>
</head>
<body>
<div class="page">

  <div class="doc-header">
    <div>
      <div class="brand-name">ExpenseTracker</div>
      <div class="brand-sub">expense-tracker-mernx.netlify.app</div>
    </div>
    <div class="doc-meta">
      <div>Generated by: <strong>${generatedBy || "—"}</strong></div>
      <div>Date: <strong>${dateStr}</strong></div>
      <div>Time: <strong>${timeStr}</strong></div>
    </div>
  </div>

  <div class="doc-title">${reportTitle}</div>
  <div class="doc-subtitle">${reportSubtitle}</div>

  ${summaryCards}
  ${bodyHtml}

  <div class="doc-footer">
    <span>ExpenseTracker — Auto-generated report</span>
    <span>This document is for informational purposes only.</span>
  </div>

</div>
<script>
  window.onload = function() { setTimeout(function() { window.print(); }, 500); };
<\/script>
</body>
</html>`;

  const win = window.open("", "_blank", "width=1000,height=780");
  if (win) { win.document.write(html); win.document.close(); }
}

/* ═════════════════════════════════════════════════════════════
   COMPONENT
═════════════════════════════════════════════════════════════ */
function AllExpenses() {
  const [expenses, setExpenses]         = useState([]);
  const [groups, setGroups]             = useState(["all"]);
  const [persons, setPersons]           = useState(["all"]);
  const [balances, setBalances]         = useState([]);
  const [searchQuery, setSearchQuery]   = useState("");
  const [filterGroup, setFilterGroup]   = useState("all");
  const [filterPerson, setFilterPerson] = useState("all");
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);

  // Report modal
  const [showReportModal, setShowReportModal]           = useState(false);
  const [reportType, setReportType]                     = useState("current");
  const [reportGroupFilter, setReportGroupFilter]       = useState("all");
  const [reportPersonFilter, setReportPersonFilter]     = useState("all");

  const token = localStorage.getItem("token");

  useEffect(() => { fetchAll(); }, []);

  const fmt = (dateStr) => {
    if (!dateStr) return "N/A";
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? dateStr
      : d.toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" });
  };

  const resolvePaidBy = (paidBy) => {
    if (!paidBy) return "Unknown";
    if (typeof paidBy === "string") return paidBy;
    return paidBy.name || paidBy.email || "Unknown";
  };

  const fetchAll = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch expenses
      const eRes = await fetch(`${API}/expenses`, { headers: { Authorization: `Bearer ${token}` } });
      if (!eRes.ok) throw new Error("Failed to fetch expenses");
      const eData = await eRes.json();
      const expList = Array.isArray(eData) ? eData : eData.expenses || [];
      setExpenses(expList);

      // Build group list — fetch directly so all groups appear even with no expenses
      try {
        const gRes = await fetch(`${API}/groups`, { headers: { Authorization: `Bearer ${token}` } });
        if (gRes.ok) {
          const gData = await gRes.json();
          const gList = Array.isArray(gData) ? gData : gData.groups || [];
          // Store both name and _id so PDF balance filter can use _id
          setGroups([
            { name: "all", _id: null },
            ...gList.map((g) => ({ name: g.name, _id: g._id })),
          ]);
        } else {
          // Fallback: extract from expenses
          const fromExp = [...new Set(expList.map((e) => e.group?.name).filter(Boolean))];
          setGroups([{ name: "all", _id: null }, ...fromExp.map((n) => ({ name: n, _id: null }))]);
        }
      } catch {
        const fromExp = [...new Set(expList.map((e) => e.group?.name).filter(Boolean))];
        setGroups([{ name: "all", _id: null }, ...fromExp.map((n) => ({ name: n, _id: null }))]);
      }

      // Build person list from expenses (paidBy + splitBetween populated names)
      const personSet = new Set();
      expList.forEach((e) => {
        const p = resolvePaidBy(e.paidBy);
        if (p && p !== "Unknown") personSet.add(p);
        // splitBetween is populated with { name, email } objects
        (e.splitBetween || []).forEach((m) => {
          const n = m?.name || (typeof m === "string" ? m : null);
          if (n) personSet.add(n);
        });
      });
      setPersons(["all", ...Array.from(personSet).sort()]);

      // Fetch balances — also use them to enrich the person list
      try {
        const bRes = await fetch(`${API}/balances`, { headers: { Authorization: `Bearer ${token}` } });
        if (bRes.ok) {
          const bData = await bRes.json();
          const bList = Array.isArray(bData) ? bData : bData.balances || [];
          setBalances(bList);
          // Add balance persons to the person set (catches personal-expense people
          // who may not appear in group expenses)
          bList.forEach((b) => {
            if (b.person && b.person !== "Unknown") personSet.add(b.person);
          });
          setPersons(["all", ...Array.from(personSet).sort()]);
        }
      } catch { /* balances optional */ }

    } catch (err) {
      console.error("Fetch error:", err);
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
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setExpenses((prev) => prev.filter((e) => e._id !== id));
      } else {
        const d = await res.json();
        alert(d.message || "Failed to delete expense");
      }
    } catch { alert("Failed to delete expense"); }
  };

  /* ── Filtering ──────────────────────────────────────────── */
  const filteredExpenses = expenses.filter((e) => {
    const matchSearch = (e.description || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchGroup  = filterGroup === "all" || e.group?.name === filterGroup;
    // When a specific group is selected, don't apply person filter
    // (person filter is for cross-group / personal expense filtering)
    const matchPerson = filterGroup !== "all"
      ? true
      : filterPerson === "all" || (() => {
          if (resolvePaidBy(e.paidBy) === filterPerson) return true;
          return (e.splitBetween || []).some(
            (m) => (m?.name || (typeof m === "string" ? m : "")) === filterPerson
          );
        })();
    return matchSearch && matchGroup && matchPerson;
  });

  const totalAmount = filteredExpenses.reduce((s, e) => s + (e.amount || 0), 0);

  /* ── PDF download ───────────────────────────────────────── */
  const handleDownloadReport = () => {
    const userName = localStorage.getItem("userName") || "User";

    let rType, rFilter, rExpenses, rBalances;

    if (reportType === "current") {
      rType    = "current";
      const parts = [];
      if (filterGroup  !== "all") parts.push(`Group: ${filterGroup}`);
      if (filterPerson !== "all") parts.push(`Person: ${filterPerson}`);
      if (searchQuery.trim())     parts.push(`"${searchQuery}"`);
      rFilter   = parts.join(" · ") || "All";
      rExpenses = filteredExpenses;

      // Only show balances for persons actually present in the current filtered expenses
      const currentPersonNames = new Set();
      filteredExpenses.forEach((e) => {
        const p = resolvePaidBy(e.paidBy);
        if (p && p !== "Unknown") currentPersonNames.add(p);
        (e.splitBetween || []).forEach((m) => {
          const n = m?.name || (typeof m === "string" ? m : null);
          if (n) currentPersonNames.add(n);
        });
      });
      rBalances = balances.filter((b) => currentPersonNames.has(b.person));
    }
    else if (reportType === "group") {
      if (reportGroupFilter === "all") {
        rType     = "all-groups";
        rFilter   = "All Groups";
        rExpenses = expenses;
        rBalances = balances;
      } else {
        rType     = "single-group";
        rFilter   = reportGroupFilter;
        rExpenses = expenses.filter((e) => e.group?.name === reportGroupFilter);

        // Derive balance summary from this group's expenses directly.
        // Collect all unique person names involved in this group's expenses,
        // then find their balances from the full balances list.
        const groupPersonNames = new Set();
        rExpenses.forEach((e) => {
          const p = resolvePaidBy(e.paidBy);
          if (p && p !== "Unknown") groupPersonNames.add(p);
          (e.splitBetween || []).forEach((m) => {
            const n = m?.name || (typeof m === "string" ? m : null);
            if (n) groupPersonNames.add(n);
          });
        });
        // Only include balances where the person is a member of this group
        rBalances = balances.filter((b) => groupPersonNames.has(b.person));
      }
    }
    else if (reportType === "person") {
      if (reportPersonFilter === "all") {
        rType     = "all-persons";
        rFilter   = "All Persons";
        rExpenses = expenses;
      } else {
        rType     = "single-person";
        rFilter   = reportPersonFilter;
        rExpenses = expenses.filter((e) => {
          if (resolvePaidBy(e.paidBy) === reportPersonFilter) return true;
          return (e.splitBetween || []).some(
            (m) => (m?.name || (typeof m === "string" ? m : "")) === reportPersonFilter
          );
        });
      }
      // Filter balances for this person
      rBalances = reportPersonFilter === "all"
        ? balances
        : balances.filter((b) => b.person === reportPersonFilter);
    }

    setShowReportModal(false);
    generateExpensePDF({
      expenses:    rExpenses,
      reportType:  rType,
      filterValue: rFilter,
      generatedBy: userName,
      balances:    rBalances,
      allExpenses: expenses,
    });
  };

  return (
    <DashboardLayout>
      <div className="dashboard-header">
        <div>
          <h1 className="page-title">All Expenses</h1>
          <p className="page-subtitle">Complete history of your expenses</p>
        </div>
        <button className="btn-primary" onClick={() => setShowReportModal(true)}>
          <Download size={18} /> Download Report
        </button>
      </div>

      {/* Filters */}
      <div className="search-filter-row" style={{ flexWrap: "wrap", gap: 12 }}>
        <div className="search-container" style={{ flex: "1 1 220px", marginBottom: 0 }}>
          <Search size={20} className="search-icon" />
          <input
            type="text"
            placeholder="Search expenses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>
        <select value={filterGroup} onChange={(e) => setFilterGroup(e.target.value)} className="filter-select">
          {groups.map((g) => {
            const val = g?.name ?? g;
            return <option key={val} value={val}>{val === "all" ? "All Groups" : val}</option>;
          })}
        </select>
        <select value={filterPerson} onChange={(e) => setFilterPerson(e.target.value)} className="filter-select">
          {persons.map((p) => <option key={p} value={p}>{p === "all" ? "All Persons" : p}</option>)}
        </select>
        {(filterGroup !== "all" || filterPerson !== "all" || searchQuery) && (
          <button className="btn-secondary" onClick={() => { setFilterGroup("all"); setFilterPerson("all"); setSearchQuery(""); }}>
            <X size={14} /> Clear
          </button>
        )}
      </div>

      {/* Active filter badges */}
      {(filterGroup !== "all" || filterPerson !== "all") && (
        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
          {filterGroup !== "all" && (
            <span className="group-badge" style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
              Group: {filterGroup}
              <button onClick={() => setFilterGroup("all")} style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", padding: 0, lineHeight: 1 }}>×</button>
            </span>
          )}
          {filterPerson !== "all" && (
            <span className="group-badge" style={{ display: "inline-flex", alignItems: "center", gap: 5, borderColor: "rgba(52,211,153,0.3)", background: "rgba(52,211,153,0.08)", color: "var(--green)" }}>
              Person: {filterPerson}
              <button onClick={() => setFilterPerson("all")} style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", padding: 0, lineHeight: 1 }}>×</button>
            </span>
          )}
        </div>
      )}

      {loading && <div className="loading-state"><div className="spinner" /><p>Loading expenses...</p></div>}

      {error && !loading && (
        <div className="error-state">
          <p className="error-message">{error}</p>
          <button className="btn-primary" onClick={fetchAll}>Retry</button>
        </div>
      )}

      {!loading && !error && (
        <>
          <div className="summary-card">
            <div className="summary-item">
              <span className="summary-label">Total Amount</span>
              <span className="summary-value">Rs {totalAmount.toLocaleString()}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Expenses Count</span>
              <span className="summary-value">{filteredExpenses.length}</span>
            </div>
            {filterPerson !== "all" && (
              <div className="summary-item">
                <span className="summary-label">Person Filter</span>
                <span className="summary-value" style={{ fontSize: 15 }}>{filterPerson}</span>
              </div>
            )}
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
                      <td className="expense-description-cell">{expense.description || "Unnamed Expense"}</td>
                      <td><span className="group-badge">{expense.group?.name || "No Group"}</span></td>
                      <td>{resolvePaidBy(expense.paidBy)}</td>
                      <td className="split-members">{expense.splitBetween?.length || 0} members</td>
                      <td>{fmt(expense.createdAt || expense.date)}</td>
                      <td className="expense-amount-cell">Rs {(expense.amount || 0).toLocaleString()}</td>
                      <td>
                        <button onClick={() => handleDeleteExpense(expense._id)} className="expense-delete-btn" title="Delete">
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state"><p>No expenses found</p></div>
          )}
        </>
      )}

      {/* ══════════════════════════════════════════════════════════
          REPORT MODAL
      ══════════════════════════════════════════════════════════ */}
      {showReportModal && (
        <div className="modal-overlay" onClick={() => setShowReportModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <h2 className="modal-title" style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <FileText size={20} style={{ color: "var(--accent-soft)" }} />
                Download Report
              </h2>
              <button className="modal-close-btn" onClick={() => setShowReportModal(false)}>✕</button>
            </div>

            <div style={{ padding: "4px 0 8px" }}>
              <p style={{ color: "var(--text-secondary)", fontSize: 13, marginBottom: 20, lineHeight: 1.6 }}>
                Generate a professional PDF with expense details, totals, and balance summaries.
              </p>

              {/* Report type */}
              <div className="form-group">
                <label className="form-label">Report Type</label>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {[
                    { value: "current", label: "Current View",     desc: "Exports exactly what you see now (with active filters)" },
                    { value: "group",   label: "By Group",         desc: "All expenses for a specific group or all groups, with balance summary" },
                    { value: "person",  label: "By Person",        desc: "All expenses for a person — what they paid, what they owe" },
                  ].map((opt) => (
                    <label
                      key={opt.value}
                      style={{
                        display: "flex", alignItems: "flex-start", gap: 12,
                        padding: "12px 14px",
                        background: reportType === opt.value ? "var(--accent-dim)" : "var(--glass-white)",
                        border: `1px solid ${reportType === opt.value ? "rgba(79,142,247,0.4)" : "var(--glass-border)"}`,
                        borderRadius: "var(--radius-md)",
                        cursor: "pointer",
                        transition: "all 0.2s",
                      }}
                    >
                      <input
                        type="radio" name="reportType" value={opt.value}
                        checked={reportType === opt.value}
                        onChange={() => setReportType(opt.value)}
                        style={{ marginTop: 2, accentColor: "var(--accent-soft)" }}
                      />
                      <div>
                        <div style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: 13, marginBottom: 2 }}>{opt.label}</div>
                        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{opt.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Group picker */}
              {reportType === "group" && (
                <div className="form-group">
                  <label className="form-label">Select Group</label>
                  <select className="form-input" value={reportGroupFilter} onChange={(e) => setReportGroupFilter(e.target.value)}>
                    <option value="all">All Groups (group-wise breakdown)</option>
                    {groups
                      .filter((g) => (g?.name ?? g) !== "all")
                      .map((g) => {
                        const name = g?.name ?? g;
                        return <option key={name} value={name}>{name}</option>;
                      })}
                  </select>
                </div>
              )}

              {/* Person picker */}
              {reportType === "person" && (
                <div className="form-group">
                  <label className="form-label">Select Person</label>
                  <select className="form-input" value={reportPersonFilter} onChange={(e) => setReportPersonFilter(e.target.value)}>
                    <option value="all">All Persons (person-wise breakdown)</option>
                    {persons.filter((p) => p !== "all").map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                  <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 6 }}>
                    Report will show what they paid, what they owe, and all related expenses.
                  </p>
                </div>
              )}
            </div>

            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowReportModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleDownloadReport}>
                <Download size={16} /> Generate PDF
              </button>
            </div>
          </div>
        </div>
      )}

    </DashboardLayout>
  );
}

export default AllExpenses;