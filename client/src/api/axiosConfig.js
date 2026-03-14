import axios from "axios";

const axiosConfig = axios.create({
  baseURL: "https://expense-tracker-backend-74i4.onrender.com/api",
});

/* -------- REQUEST INTERCEPTOR -------- */

axiosConfig.interceptors.request.use(
  (config) => {

    const token = localStorage.getItem("token"); // ✅ FIXED: was sessionStorage

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;

  },
  (error) => {
    return Promise.reject(error);
  }
);

export default axiosConfig;