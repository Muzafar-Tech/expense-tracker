// client/src/api/balanceApi.js
import axios from "./axiosConfig";

/* GET /api/balances */
export const getBalances = async () => {
  const res = await axios.get("/balances");
  return res.data;
};

/* POST /api/balances/settle-request
   DEBTOR sends a payment request to the creditor.
   Body: { balanceId, amount, note? }
*/
export const requestSettle = async ({ balanceId, amount, note = "" }) => {
  const res = await axios.post("/balances/settle-request", {
    balanceId,
    amount,
    note,
  });
  return res.data;
};

/* POST /api/balances/confirm
   CREDITOR confirms payment received (with or without prior request).
   Body: { balanceId, amount, settlementId? }
*/
export const confirmSettle = async ({ balanceId, amount, settlementId }) => {
  const res = await axios.post("/balances/confirm", {
    balanceId,
    amount,
    ...(settlementId && { settlementId }),
  });
  return res.data;
};

/* POST /api/balances/reject
   CREDITOR rejects a pending payment request.
   Body: { balanceId, settlementId }
*/
export const rejectSettle = async ({ balanceId, settlementId }) => {
  const res = await axios.post("/balances/reject", {
    balanceId,
    settlementId,
  });
  return res.data;
};

/* GET /api/balances/received */
export const getReceived = async () => {
  const res = await axios.get("/balances/received");
  return res.data;
};

/* PATCH /api/balances/received/add — Body: { amount } */
export const addReceived = async (amount) => {
  const res = await axios.patch("/balances/received/add", { amount });
  return res.data;
};

/* PATCH /api/balances/received/set — Body: { amount } */
export const setReceived = async (amount) => {
  const res = await axios.patch("/balances/received/set", { amount });
  return res.data;
};