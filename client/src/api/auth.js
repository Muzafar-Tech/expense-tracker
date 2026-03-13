import axios from "./axiosConfig";

export const signup = async (data) => {
  const res = await axios.post("/auth/signup", data);
  return res.data;
};

export const login = async (data) => {
  const res = await axios.post("/auth/login", data);

  if (res.data.token) {
    sessionStorage.setItem("token", res.data.token);
  }

  return res.data;
};