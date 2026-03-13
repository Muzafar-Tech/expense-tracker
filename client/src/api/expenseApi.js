import axios from "./axiosConfig";

/* -------- GET ALL EXPENSES -------- */

export const getExpenses = async () => {
  const res = await axios.get("/expenses");
  return res.data;
};

/* -------- CREATE EXPENSE -------- */

export const createExpense = async (data) => {
  const res = await axios.post("/expenses", data);
  return res.data;
};

/* -------- DELETE EXPENSE -------- */

export const deleteExpense = async (id) => {
  const res = await axios.delete(`/expenses/${id}`);
  return res.data;
};