import axios from "./axiosConfig";

/* -------- GET DASHBOARD DATA -------- */

export const getDashboard = async () => {
  const res = await axios.get("/dashboard");
  return res.data;
};