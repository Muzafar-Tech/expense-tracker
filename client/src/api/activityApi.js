import axios from "./axiosConfig";

/* -------- GET ACTIVITIES -------- */

export const getActivities = async () => {
  const res = await axios.get("/activity");
  return res.data;
};