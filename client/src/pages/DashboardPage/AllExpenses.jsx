// client/src/pages/DashboardPage/AllExpenses.jsx
import { useState, useEffect } from "react";
import { Search, Trash2, Download, FileText, X } from "lucide-react";
import DashboardLayout from "./DashboardLayout";
import "./Dashboard.css";

const API = process.env.REACT_APP_API_URL;

/* ═════════════════════════════════════════════════════════════
   HELPERS
═════════════════════════════════════════════════════════════ */
const fmtDate = (d) => {
  if (!d) return "N/A";
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? d : dt.toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" });
};
const fmtRs  = (n) => `Rs ${Number(n || 0).toLocaleString("en-PK")}`;
const getName = (p) => {
  if (!p) return "Unknown";
  if (typeof p === "string") return p;
  return p.name || p.email || "Unknown";
};

/* ─────────────────────────────────────────────────────────────
   Get a specific person's share from an expense
   debtorShares is a Map/object keyed by userId
─────────────────────────────────────────────────────────────── */
const getPersonShare = (expense, personName) => {
  const splitBetween = expense.splitBetween || [];
  // Find the member object matching the person name
  const member = splitBetween.find(
    (m) => (m?.name || (typeof m === "string" ? m : "")) === personName
  );
  if (!member) return null;

  const memberId = member._id || member;
  // debtorShares is populated from backend as a plain object
  const shares = expense.debtorShares || {};
  const share  = shares[memberId?.toString?.()];

  if (share !== undefined && share !== null) return share;

  // Fallback: equal split
  if (splitBetween.length > 0) {
    return Math.round((expense.amount / splitBetween.length) * 100) / 100;
  }
  return expense.amount;
};

/* ═════════════════════════════════════════════════════════════
   PDF GENERATOR
═════════════════════════════════════════════════════════════ */
function generateExpensePDF({
  expenses, reportType, filterValue, generatedBy,
  balances, groupMembers,
}) {
  const now     = new Date();
  const dateStr = now.toLocaleDateString("en-PK", { day: "numeric", month: "long", year: "numeric" });
  const timeStr = now.toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" });

  /* ── Balance summary block ─────────────────────────────── */
  const balanceSection = (bals) => {
    if (!bals || bals.length === 0) return "";
    const rows = bals.map((b) => {
      const isOwe = b.type === "owe";
      const color = isOwe ? "#dc2626" : "#16a34a";
      const sign  = isOwe ? "−" : "+";
      const label = isOwe ? `You owe ${b.person}` : `${b.person} owes you`;
      return `<tr>
        <td><strong>${b.person}</strong></td>
        <td style="color:${color};font-weight:700">${sign} ${fmtRs(b.amount)}</td>
        <td style="color:${color}">${label}</td>
      </tr>`;
    }).join("");
    return `
      <div class="section-block balance-block">
        <div class="section-heading">Balance Summary</div>
        <table class="balance-table">
          <thead><tr><th>Person</th><th>Amount</th><th>Status</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  };

  /* ── Standard expense table (full amount) ──────────────── */
  const expenseTable = (list, showTotal = true) => {
    const total = list.reduce((s, e) => s + (e.amount || 0), 0);
    const rows  = list.map((exp, i) => `
      <tr class="${i % 2 === 0 ? "r-even" : "r-odd"}">
        <td class="tc">${i + 1}</td>
        <td class="td">${exp.description || "—"}</td>
        <td>${exp.group?.name || "Personal"}</td>
        <td>${getName(exp.paidBy)}</td>
        <td class="tc">${(exp.splitBetween || []).length}</td>
        <td>${fmtDate(exp.createdAt || exp.date)}</td>
        <td class="tr amt">${fmtRs(exp.amount)}</td>
      </tr>`).join("");
    return `
      <table>
        <thead><tr>
          <th class="tc" style="width:32px">#</th>
          <th>Description</th>
          <th>Group</th>
          <th>Paid By</th>
          <th class="tc">Split</th>
          <th>Date</th>
          <th class="tr" style="width:110px">Amount</th>
        </tr></thead>
        <tbody>
          ${rows}
          ${showTotal ? `<tr class="total-row">
            <td colspan="6" class="tr" style="font-size:11px;letter-spacing:.4px">TOTAL</td>
            <td class="tr amt" style="font-size:15px">${fmtRs(total)}</td>
          </tr>` : ""}
        </tbody>
      </table>`;
  };

  /* ── Person expense table (shows SPLIT amount, not full) ── */
  const personExpenseTable = (list, personName) => {
    const rows = list.map((exp, i) => {
      const share   = getPersonShare(exp, personName);
      const isPayer = getName(exp.paidBy) === personName;
      const inSplit = (exp.splitBetween || []).some(
        (m) => (m?.name || (typeof m === "string" ? m : "")) === personName
      );

      // If this person paid but is NOT in the split (expense split on others)
      // show who it was split among and their amounts
      let shareDisp;
      if (!inSplit && isPayer) {
        const others = (exp.splitBetween || [])
          .map((m) => {
            const n = m?.name || (typeof m === "string" ? m : "Unknown");
            const s = getPersonShare(exp, n);
            return `${n}: ${s !== null ? fmtRs(s) : fmtRs(exp.amount)}`;
          })
          .join(", ");
        shareDisp = `<span style="color:#64748b;font-size:11px">Split on: ${others || "others"}</span>`;
      } else {
        shareDisp = `<span class="amt">${share !== null ? fmtRs(share) : fmtRs(exp.amount)}</span>`;
      }

      return `
        <tr class="${i % 2 === 0 ? "r-even" : "r-odd"}">
          <td class="tc">${i + 1}</td>
          <td class="td">${exp.description || "—"}</td>
          <td>${exp.group?.name || "Personal"}</td>
          <td>${getName(exp.paidBy)}${isPayer ? ' <span class="paid-badge">paid</span>' : ""}</td>
          <td>${fmtDate(exp.createdAt || exp.date)}</td>
          <td class="tr">${shareDisp}</td>
        </tr>`;
    }).join("");

    // Total share = only expenses where person is actually in the split
    const totalShare = list.reduce((s, exp) => {
      const inSplit = (exp.splitBetween || []).some(
        (m) => (m?.name || (typeof m === "string" ? m : "")) === personName
      );
      if (!inSplit) return s; // paid but split on others — don't count in their share
      const share = getPersonShare(exp, personName);
      return s + (share || 0);
    }, 0);

    return `
      <table>
        <thead><tr>
          <th class="tc" style="width:32px">#</th>
          <th>Description</th>
          <th>Group</th>
          <th>Paid By</th>
          <th>Date</th>
          <th class="tr" style="width:160px">${personName}'s Share / Split</th>
        </tr></thead>
        <tbody>
          ${rows}
          <tr class="total-row">
            <td colspan="5" class="tr" style="font-size:11px;letter-spacing:.4px">TOTAL SHARE</td>
            <td class="tr amt" style="font-size:15px">${fmtRs(totalShare)}</td>
          </tr>
        </tbody>
      </table>`;
  };

  /* ── Group table with per-member split columns ─────────── */
  const groupExpenseTable = (list, members) => {
    if (!members || members.length === 0) return expenseTable(list, true);

    const memberCols = members.map((m) => `<th class="tr">${m}</th>`).join("");
    const grandTotal = list.reduce((s, e) => s + (e.amount || 0), 0);
    const memberTotals = {};
    members.forEach((m) => { memberTotals[m] = 0; });

    const rows = list.map((exp, i) => {
      const memberCells = members.map((mName) => {
        const inSplit = (exp.splitBetween || []).some(
          (sb) => (sb?.name || (typeof sb === "string" ? sb : "")) === mName
        );
        if (!inSplit) return `<td class="tr" style="color:#94a3b8">—</td>`;
        const share = getPersonShare(exp, mName);
        const val   = share !== null ? share : 0;
        memberTotals[mName] += val;
        return `<td class="tr amt-sm">${fmtRs(val)}</td>`;
      }).join("");

      return `
        <tr class="${i % 2 === 0 ? "r-even" : "r-odd"}">
          <td class="tc">${i + 1}</td>
          <td class="td">${exp.description || "—"}</td>
          <td>${getName(exp.paidBy)}</td>
          <td>${fmtDate(exp.createdAt || exp.date)}</td>
          <td class="tr amt">${fmtRs(exp.amount)}</td>
          ${memberCells}
        </tr>`;
    }).join("");

    const memberTotalCells = members.map(
      (m) => `<td class="tr amt" style="font-size:13px">${fmtRs(memberTotals[m])}</td>`
    ).join("");

    return `
      <table>
        <thead><tr>
          <th class="tc" style="width:32px">#</th>
          <th>Description</th>
          <th>Paid By</th>
          <th>Date</th>
          <th class="tr">Total</th>
          ${memberCols}
        </tr></thead>
        <tbody>
          ${rows}
          <tr class="total-row">
            <td colspan="4" class="tr" style="font-size:11px;letter-spacing:.4px">TOTALS</td>
            <td class="tr amt" style="font-size:14px">${fmtRs(grandTotal)}</td>
            ${memberTotalCells}
          </tr>
        </tbody>
      </table>`;
  };

  /* ══════════════════════════════════════════════════════════
     BUILD REPORT BODY
  ══════════════════════════════════════════════════════════ */
  let reportTitle    = "";
  let reportSubtitle = "";
  let bodyHtml       = "";
  let summaryCards   = "";

  /* ── CURRENT VIEW ─────────────────────────────────────── */
  if (reportType === "current") {
    const total     = expenses.reduce((s, e) => s + (e.amount || 0), 0);
    reportTitle     = "Expense Report — Current View";
    reportSubtitle  = `${expenses.length} expense${expenses.length !== 1 ? "s" : ""} · Filter: ${filterValue || "All"}`;
    summaryCards    = `
      <div class="summary-bar">
        <div class="scard blue"><div class="sc-label">Total Expenses</div><div class="sc-val">${expenses.length}</div></div>
        <div class="scard green"><div class="sc-label">Grand Total</div><div class="sc-val">${fmtRs(total)}</div></div>
        <div class="scard purple"><div class="sc-label">Filter</div><div class="sc-val" style="font-size:13px">${filterValue || "All"}</div></div>
      </div>`;

    // If multiple people involved, show per-person columns
    const personSet = new Set();
    expenses.forEach((e) => {
      (e.splitBetween || []).forEach((m) => {
        const n = m?.name || (typeof m === "string" ? m : null);
        if (n) personSet.add(n);
      });
      const p = getName(e.paidBy);
      if (p && p !== "Unknown") personSet.add(p);
    });
    const personList = Array.from(personSet).sort();

    if (personList.length > 1 && personList.length <= 6) {
      // Show grouped per-person table
      bodyHtml = `<div class="section-block">
        <div class="section-heading group-heading"><span>Expense Breakdown</span><span class="group-total">${fmtRs(total)}</span></div>
        ${groupExpenseTable(expenses, personList)}
      </div>`;
    } else {
      bodyHtml = expenseTable(expenses, true);
    }
    if (balances && balances.length > 0) bodyHtml += balanceSection(balances);
  }

  /* ── SINGLE GROUP ─────────────────────────────────────── */
  else if (reportType === "single-group") {
    const total    = expenses.reduce((s, e) => s + (e.amount || 0), 0);
    reportTitle    = `Group Report — ${filterValue}`;
    reportSubtitle = `${expenses.length} expense${expenses.length !== 1 ? "s" : ""}`;

    // Build member balance summary for this group
    const memberBalSummary = balances && balances.length > 0
      ? `<div class="member-bal-summary">
          <div class="section-heading" style="background:#eff6ff;color:#1d4ed8;border-bottom:1px solid #bfdbfe;">Member Balances in ${filterValue}</div>
          <div class="member-bal-grid">
            ${balances.map((b) => {
              const isOwe  = b.type === "owe";
              const color  = isOwe ? "#dc2626" : "#16a34a";
              const bg     = isOwe ? "#fef2f2" : "#f0fdf4";
              const border = isOwe ? "#fecaca" : "#bbf7d0";
              const label  = isOwe ? `Owes you` : `Owes you`;
              const sign   = isOwe ? "−" : "+";
              return `<div class="member-bal-card" style="border-color:${border};background:${bg}">
                <div class="member-bal-name">${b.person}</div>
                <div class="member-bal-amount" style="color:${color}">${sign} ${fmtRs(b.amount)}</div>
                <div class="member-bal-label" style="color:${color}">${isOwe ? "You owe" : "Owes you"}</div>
              </div>`;
            }).join("")}
          </div>
        </div>`
      : "";

    summaryCards = `
      <div class="summary-bar">
        <div class="scard blue"><div class="sc-label">Group</div><div class="sc-val" style="font-size:13px">${filterValue}</div></div>
        <div class="scard green"><div class="sc-label">Grand Total</div><div class="sc-val">${fmtRs(total)}</div></div>
        <div class="scard purple"><div class="sc-label">Expenses</div><div class="sc-val">${expenses.length}</div></div>
      </div>`;

    bodyHtml = `<div class="section-block">
      <div class="section-heading group-heading"><span>Expense Breakdown</span><span class="group-total">${fmtRs(total)}</span></div>
      ${groupExpenseTable(expenses, groupMembers || [])}
    </div>`;
    bodyHtml += memberBalSummary;
    if (balances && balances.length > 0) bodyHtml += balanceSection(balances);
  }

  /* ── ALL GROUPS ───────────────────────────────────────── */
  else if (reportType === "all-groups") {
    reportTitle    = "All Groups — Expense Report";
    reportSubtitle = "Complete group-wise breakdown";
    const grouped  = {};
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
      return `
        <div class="section-block">
          <div class="section-heading group-heading">
            <span>${gName}</span>
            <span class="group-total">${fmtRs(total)}</span>
          </div>
          ${expenseTable(list, true)}
        </div>`;
    }).join("");
    if (balances && balances.length > 0) bodyHtml += balanceSection(balances);
  }

  /* ── SINGLE PERSON ────────────────────────────────────── */
  else if (reportType === "single-person") {
    reportTitle    = `Person Report — ${filterValue}`;
    reportSubtitle = `Expenses involving ${filterValue} — showing individual split amounts`;

    // Include expense if:
    // 1. Person is in splitBetween, OR
    // 2. Person is the payer (catches personal/no-group expenses)
    const myExpenses = expenses.filter((e) => {
      const inSplit = (e.splitBetween || []).some(
        (m) => (m?.name || (typeof m === "string" ? m : "")) === filterValue
      );
      const isPayer = getName(e.paidBy) === filterValue;
      return inSplit || isPayer;
    });

    // Section 1: expenses paid BY this person
    const paidByMe = myExpenses.filter((e) => getName(e.paidBy) === filterValue);
    // Section 2: expenses paid by OTHERS but split includes this person
    const splitIntoMe = myExpenses.filter((e) =>
      getName(e.paidBy) !== filterValue &&
      (e.splitBetween || []).some(
        (m) => (m?.name || (typeof m === "string" ? m : "")) === filterValue
      )
    );

    const myTotalShare = myExpenses.reduce((s, exp) => {
      const inSplit = (exp.splitBetween || []).some(
        (m) => (m?.name || (typeof m === "string" ? m : "")) === filterValue
      );
      if (inSplit) {
        const share = getPersonShare(exp, filterValue);
        return s + (share || 0);
      }
      // Payer only (not split among others) — full amount is theirs
      return s + (exp.amount || 0);
    }, 0);
    const paidTotal = paidByMe.reduce((s, e) => s + (e.amount || 0), 0);

    summaryCards = `
      <div class="summary-bar">
        <div class="scard blue"><div class="sc-label">Paid by ${filterValue}</div><div class="sc-val">${fmtRs(paidTotal)}</div></div>
        <div class="scard purple"><div class="sc-label">Total Share</div><div class="sc-val">${fmtRs(myTotalShare)}</div></div>
        <div class="scard green"><div class="sc-label">Expenses Involved</div><div class="sc-val">${myExpenses.length}</div></div>
      </div>`;

    bodyHtml = "";

    if (paidByMe.length > 0) {
      bodyHtml += `
        <div class="section-block">
          <div class="section-heading group-heading"><span>Expenses Paid by ${filterValue}</span></div>
          ${personExpenseTable(paidByMe, filterValue)}
        </div>`;
    }

    if (splitIntoMe.length > 0) {
      bodyHtml += `
        <div class="section-block">
          <div class="section-heading" style="background:#f5f3ff;color:#7c3aed;border-bottom:1px solid #ddd6fe;">
            <span>Expenses Shared with ${filterValue}</span>
          </div>
          ${personExpenseTable(splitIntoMe, filterValue)}
        </div>`;
    }

    if (myExpenses.length === 0) {
      bodyHtml = `<div style="padding:40px;text-align:center;color:#64748b;">No expenses found for ${filterValue}</div>`;
    }

    // Balance summary — show ALL balances (both owe and owes)
    if (balances && balances.length > 0) bodyHtml += balanceSection(balances);
  }

  /* ── ALL PERSONS ──────────────────────────────────────── */
  else if (reportType === "all-persons") {
    reportTitle    = "All Persons — Expense Report";
    reportSubtitle = "Person-wise breakdown with individual split amounts";
    const grandTotal = expenses.reduce((s, e) => s + (e.amount || 0), 0);

    // Collect all unique person names from splitBetween
    const personSet = new Set();
    expenses.forEach((e) => {
      (e.splitBetween || []).forEach((m) => {
        const n = m?.name || (typeof m === "string" ? m : null);
        if (n) personSet.add(n);
      });
      const p = getName(e.paidBy);
      if (p && p !== "Unknown") personSet.add(p);
    });
    const personNames = Array.from(personSet).sort();

    summaryCards = `
      <div class="summary-bar">
        <div class="scard blue"><div class="sc-label">Persons</div><div class="sc-val">${personNames.length}</div></div>
        <div class="scard green"><div class="sc-label">Grand Total</div><div class="sc-val">${fmtRs(grandTotal)}</div></div>
        <div class="scard purple"><div class="sc-label">Total Expenses</div><div class="sc-val">${expenses.length}</div></div>
      </div>`;

    bodyHtml = personNames.map((pName) => {
      // Only expenses where this person is in splitBetween
      const involved = expenses.filter((e) =>
        (e.splitBetween || []).some(
          (m) => (m?.name || (typeof m === "string" ? m : "")) === pName
        )
      );
      const totalShare = involved.reduce((s, exp) => {
        const share = getPersonShare(exp, pName);
        return s + (share || 0);
      }, 0);
      const pBal = balances ? balances.filter((b) => b.person === pName) : [];
      const balHtml = pBal.map((b) => {
        const isOwe = b.type === "owe";
        return `<span class="person-bal ${isOwe ? "red" : "green"}">
          ${isOwe ? `Owes ${fmtRs(b.amount)}` : `Owed ${fmtRs(b.amount)}`}
        </span>`;
      }).join(" ");

      return `
        <div class="section-block">
          <div class="section-heading person-heading">
            <div style="display:flex;align-items:center;gap:10px;width:100%;">
              <div class="person-avatar">${pName[0].toUpperCase()}</div>
              <div style="flex:1">
                <div style="font-size:14px;font-weight:700">${pName}</div>
                <div style="font-size:12px;color:#64748b">Total Share: ${fmtRs(totalShare)}</div>
              </div>
              ${balHtml ? `<div class="person-bal-row">${balHtml}</div>` : ""}
            </div>
          </div>
          ${involved.length > 0 ? personExpenseTable(involved, pName) : `<div style="padding:16px;color:#94a3b8;text-align:center;font-size:12px;">No expenses</div>`}
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
  body { font-family: 'Inter', Arial, sans-serif; font-size: 12.5px; color: #1e293b; background: #fff;
    -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .page { padding: 36px 44px; max-width: 980px; margin: 0 auto; }

  .doc-header { display: flex; justify-content: space-between; align-items: flex-start;
    padding-bottom: 18px; border-bottom: 3px solid #1d4ed8; margin-bottom: 24px; }
  .brand-name { font-size: 24px; font-weight: 800; color: #1d4ed8; letter-spacing: -0.8px; line-height: 1; }
  .brand-sub  { font-size: 11px; color: #64748b; font-weight: 400; margin-top: 3px; }
  .doc-meta   { text-align: right; font-size: 11.5px; color: #64748b; line-height: 1.8; }
  .doc-meta strong { color: #1e293b; }

  .doc-title    { font-size: 20px; font-weight: 700; color: #0f172a; letter-spacing: -0.4px; margin-bottom: 3px; }
  .doc-subtitle { font-size: 12px; color: #64748b; margin-bottom: 22px; }

  .summary-bar { display: flex; gap: 14px; margin-bottom: 24px; }
  .scard { flex: 1; padding: 14px 18px; border-radius: 10px; border-left: 4px solid; }
  .scard.blue   { background: #eff6ff; border-color: #1d4ed8; }
  .scard.green  { background: #f0fdf4; border-color: #16a34a; }
  .scard.purple { background: #f5f3ff; border-color: #7c3aed; }
  .scard.red    { background: #fef2f2; border-color: #dc2626; }
  .sc-label { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: .5px; color: #64748b; }
  .sc-val   { font-size: 18px; font-weight: 700; color: #0f172a; margin-top: 3px; }

  .section-block { margin-bottom: 28px; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; }
  .section-heading { display: flex; justify-content: space-between; align-items: center;
    padding: 11px 16px; background: #f8fafc; border-bottom: 1px solid #e2e8f0;
    font-size: 13px; font-weight: 700; color: #0f172a; }
  .group-heading   { background: #eff6ff; border-bottom-color: #bfdbfe; color: #1d4ed8; }
  .group-total     { font-size: 13px; color: #1d4ed8; font-weight: 700; }
  .person-heading  { background: #f0fdf4; border-bottom-color: #bbf7d0; color: #15803d; }

  .person-avatar { width: 30px; height: 30px; border-radius: 50%; background: #1d4ed8; color: #fff;
    font-size: 13px; font-weight: 700; display: inline-flex; align-items: center; justify-content: center; }
  .person-bal-row { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 3px; }
  .person-bal { font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 20px; }
  .person-bal.green { background: #dcfce7; color: #15803d; }
  .person-bal.red   { background: #fee2e2; color: #dc2626; }

  .paid-badge { display: inline-block; font-size: 9px; font-weight: 700; padding: 1px 5px;
    background: #dbeafe; color: #1d4ed8; border-radius: 4px; margin-left: 4px; vertical-align: middle; }

  /* Member balance grid in group report */
  .member-bal-summary { margin-bottom: 28px; border: 1px solid #bfdbfe; border-radius: 10px; overflow: hidden; }
  .member-bal-grid { display: flex; flex-wrap: wrap; gap: 0; padding: 16px; background: #fff; gap: 12px; }
  .member-bal-card { flex: 1; min-width: 140px; padding: 14px 16px; border-radius: 8px; border: 1px solid; }
  .member-bal-name   { font-size: 13px; font-weight: 700; color: #1e293b; margin-bottom: 4px; }
  .member-bal-amount { font-size: 18px; font-weight: 800; margin-bottom: 2px; }
  .member-bal-label  { font-size: 11px; font-weight: 500; }

  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  thead tr { background: #1d4ed8; color: #fff; }
  thead th { padding: 9px 12px; text-align: left; font-weight: 600; font-size: 11px; letter-spacing: .3px; }
  .tc { text-align: center; }
  .tr { text-align: right; }
  tbody tr.r-even { background: #f8fafc; }
  tbody tr.r-odd  { background: #fff; }
  tbody td { padding: 8px 12px; border-bottom: 1px solid #f1f5f9; color: #374151; vertical-align: middle; }
  tbody td.amt    { font-weight: 700; color: #1d4ed8; }
  tbody td.amt-sm { font-weight: 600; color: #1d4ed8; font-size: 11.5px; }
  .td { font-weight: 600; color: #0f172a; }
  tr.total-row td { background: #1e293b !important; color: #f1f5f9 !important; font-weight: 700;
    padding: 10px 12px; border-bottom: none; }
  tr.total-row td.amt { color: #60a5fa !important; }

  .balance-block { border-color: #fde68a; }
  .balance-block .section-heading { background: #fffbeb; border-bottom-color: #fde68a; color: #92400e; }
  .balance-table thead tr { background: #92400e; }

  .doc-footer { margin-top: 28px; padding-top: 12px; border-top: 1px solid #e2e8f0;
    display: flex; justify-content: space-between; font-size: 10.5px; color: #94a3b8; }

  @media print {
    .page { padding: 16px 20px; }
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
<script>window.onload=function(){setTimeout(function(){window.print();},500);};<\/script>
</body>
</html>`;

  const win = window.open("", "_blank", "width=1050,height=800");
  if (win) { win.document.write(html); win.document.close(); }
}

/* ═════════════════════════════════════════════════════════════
   COMPONENT
═════════════════════════════════════════════════════════════ */
function AllExpenses() {
  const [expenses, setExpenses]         = useState([]);
  const [groups, setGroups]             = useState([{ name: "all", _id: null }]);
  const [persons, setPersons]           = useState(["all"]);
  const [balances, setBalances]         = useState([]);
  const [currentUser, setCurrentUser]   = useState(null);
  const [searchQuery, setSearchQuery]   = useState("");
  const [filterGroup, setFilterGroup]   = useState("all");
  const [filterPerson, setFilterPerson] = useState("all");
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);

  const [showReportModal, setShowReportModal]       = useState(false);
  const [reportType, setReportType]                 = useState("current");
  const [reportGroupFilter, setReportGroupFilter]   = useState("all");
  const [reportPersonFilter, setReportPersonFilter] = useState("all");

  const token = localStorage.getItem("token");

  useEffect(() => { fetchAll(); }, []);

  const resolvePaidBy = (p) => {
    if (!p) return "Unknown";
    if (typeof p === "string") return p;
    return p.name || p.email || "Unknown";
  };

  const fetchAll = async () => {
    try {
      setLoading(true);
      setError(null);

      // ── Current user ───────────────────────────────────────
      try {
        const uRes = await fetch(`${API}/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
        if (uRes.ok) setCurrentUser(await uRes.json());
      } catch { /* optional */ }

      // ── Expenses ───────────────────────────────────────────
      const eRes = await fetch(`${API}/expenses`, { headers: { Authorization: `Bearer ${token}` } });
      if (!eRes.ok) throw new Error("Failed to fetch expenses");
      const eData  = await eRes.json();
      const expList = Array.isArray(eData) ? eData : eData.expenses || [];
      setExpenses(expList);

      // ── Groups ─────────────────────────────────────────────
      try {
        const gRes = await fetch(`${API}/groups`, { headers: { Authorization: `Bearer ${token}` } });
        if (gRes.ok) {
          const gData = await gRes.json();
          const gList = Array.isArray(gData) ? gData : gData.groups || [];
          setGroups([
            { name: "all", _id: null },
            ...gList.map((g) => ({ name: g.name, _id: g._id, members: g.members })),
          ]);
        }
      } catch { /* fallback to expenses */ }

      // ── Persons ────────────────────────────────────────────
      const personSet = new Set();
      expList.forEach((e) => {
        const p = resolvePaidBy(e.paidBy);
        if (p && p !== "Unknown") personSet.add(p);
        (e.splitBetween || []).forEach((m) => {
          const n = m?.name || (typeof m === "string" ? m : null);
          if (n) personSet.add(n);
        });
      });

      // ── Balances ───────────────────────────────────────────
      try {
        const bRes = await fetch(`${API}/balances`, { headers: { Authorization: `Bearer ${token}` } });
        if (bRes.ok) {
          const bData = await bRes.json();
          const bList = Array.isArray(bData) ? bData : bData.balances || [];
          setBalances(bList);
          bList.forEach((b) => { if (b.person) personSet.add(b.person); });
        }
      } catch { /* optional */ }

      setPersons(["all", ...Array.from(personSet).sort()]);

    } catch (err) {
      console.error("Fetch error:", err);
      setError("Failed to load expenses");
    } finally {
      setLoading(false);
    }
  };

  /* ── Can this user delete this expense? ───────────────── */
  const canDelete = (expense) => {
    if (!currentUser) return false;
    // Creator can always delete their own expense
    const createdById = expense.createdBy?._id || expense.createdBy;
    if (createdById?.toString() === currentUser._id?.toString()) return true;
    // Group admin can delete any expense in their group
    if (expense.group?._id || expense.group) {
      const groupId    = expense.group?._id || expense.group;
      const groupObj   = groups.find((g) => g._id?.toString() === groupId?.toString());
      if (groupObj?.members) {
        const me = groupObj.members.find(
          (m) => (m.user?._id || m.user)?.toString() === currentUser._id?.toString()
        );
        if (me?.role === "admin") return true;
      }
    }
    return false;
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
    const matchSearch  = (e.description || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchGroup   = filterGroup === "all" || e.group?.name === filterGroup;
    const matchPerson  = filterGroup !== "all"
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
    const userName = currentUser?.name || localStorage.getItem("userName") || "User";
    let rType, rFilter, rExpenses, rBalances, rGroupMembers;

    if (reportType === "current") {
      rType    = "current";
      const parts = [];
      if (filterGroup  !== "all") parts.push(`Group: ${filterGroup}`);
      if (filterPerson !== "all") parts.push(`Person: ${filterPerson}`);
      if (searchQuery.trim())     parts.push(`"${searchQuery}"`);
      rFilter   = parts.join(" · ") || "All";
      rExpenses = filteredExpenses;
      const names = new Set();
      filteredExpenses.forEach((e) => {
        const p = resolvePaidBy(e.paidBy);
        if (p && p !== "Unknown") names.add(p);
        (e.splitBetween || []).forEach((m) => { if (m?.name) names.add(m.name); });
      });
      rBalances = balances.filter((b) => names.has(b.person));
    }
    else if (reportType === "group") {
      if (reportGroupFilter === "all") {
        rType     = "all-groups";
        rFilter   = "All Groups";
        rExpenses = expenses;
        rBalances = balances;
      } else {
        rType         = "single-group";
        rFilter       = reportGroupFilter;
        rExpenses     = expenses.filter((e) => e.group?.name === reportGroupFilter);
        // Collect member names for group columns
        const memberNames = new Set();
        rExpenses.forEach((e) => {
          (e.splitBetween || []).forEach((m) => { if (m?.name) memberNames.add(m.name); });
          const p = resolvePaidBy(e.paidBy);
          if (p && p !== "Unknown") memberNames.add(p);
        });
        rGroupMembers = Array.from(memberNames).sort();
        // Only balances for members of this group
        rBalances     = balances.filter((b) => memberNames.has(b.person));
      }
    }
    else if (reportType === "person") {
      if (reportPersonFilter === "all") {
        rType     = "all-persons";
        rFilter   = "All Persons";
        rExpenses = expenses;
        rBalances = balances;
      } else {
        rType     = "single-person";
        rFilter   = reportPersonFilter;
        // Include: in splitBetween OR is the payer
        rExpenses = expenses.filter((e) => {
          const inSplit = (e.splitBetween || []).some(
            (m) => (m?.name || (typeof m === "string" ? m : "")) === reportPersonFilter
          );
          const isPayer = resolvePaidBy(e.paidBy) === reportPersonFilter;
          return inSplit || isPayer;
        });
        // Only show balances directly related to this person:
        // b.person = someone who owes the logged-in user (shown as "Owes you")
        // Filter to only the selected person's entry
        rBalances = balances.filter((b) => b.person === reportPersonFilter);
      }
    }

    setShowReportModal(false);
    generateExpensePDF({
      expenses:     rExpenses,
      reportType:   rType,
      filterValue:  rFilter,
      generatedBy:  userName,
      balances:     rBalances,
      groupMembers: rGroupMembers,
    });
  };

  const fmtDate = (dateStr) => {
    if (!dateStr) return "N/A";
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? dateStr
      : d.toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" });
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
                      <td>{fmtDate(expense.createdAt || expense.date)}</td>
                      <td className="expense-amount-cell">Rs {(expense.amount || 0).toLocaleString()}</td>
                      <td>
                        {/* Only show delete if user has permission */}
                        {canDelete(expense) && (
                          <button
                            onClick={() => handleDeleteExpense(expense._id)}
                            className="expense-delete-btn"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
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

      {/* REPORT MODAL */}
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
                Generate a professional PDF with expense details, split amounts, and balance summaries.
              </p>

              <div className="form-group">
                <label className="form-label">Report Type</label>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {[
                    { value: "current", label: "Current View",  desc: "Exports exactly what you see now (with active filters)" },
                    { value: "group",   label: "By Group",      desc: "Group expenses with per-member split columns and balance summary" },
                    { value: "person",  label: "By Person",     desc: "Person's split amounts only — what they actually owe or are owed" },
                  ].map((opt) => (
                    <label
                      key={opt.value}
                      style={{
                        display: "flex", alignItems: "flex-start", gap: 12,
                        padding: "12px 14px",
                        background: reportType === opt.value ? "var(--accent-dim)" : "var(--glass-white)",
                        border: `1px solid ${reportType === opt.value ? "rgba(79,142,247,0.4)" : "var(--glass-border)"}`,
                        borderRadius: "var(--radius-md)", cursor: "pointer", transition: "all 0.2s",
                      }}
                    >
                      <input type="radio" name="reportType" value={opt.value}
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

              {reportType === "group" && (
                <div className="form-group">
                  <label className="form-label">Select Group</label>
                  <select className="form-input" value={reportGroupFilter} onChange={(e) => setReportGroupFilter(e.target.value)}>
                    <option value="all">All Groups (group-wise breakdown)</option>
                    {groups.filter((g) => (g?.name ?? g) !== "all").map((g) => {
                      const name = g?.name ?? g;
                      return <option key={name} value={name}>{name}</option>;
                    })}
                  </select>
                </div>
              )}

              {reportType === "person" && (
                <div className="form-group">
                  <label className="form-label">Select Person</label>
                  <select className="form-input" value={reportPersonFilter} onChange={(e) => setReportPersonFilter(e.target.value)}>
                    <option value="all">All Persons (person-wise breakdown)</option>
                    {persons.filter((p) => p !== "all").map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                  <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 6 }}>
                    Shows only expenses where this person is in the split. Amounts shown are their individual share.
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