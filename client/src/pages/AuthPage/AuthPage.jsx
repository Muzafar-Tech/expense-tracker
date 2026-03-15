import { useState, useEffect } from "react";
import "./AuthPage.css";
import axios from "../../api/axiosConfig";

const EyeIcon = ({ open }) => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {open ? (
      <>
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ) : (
      <>
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
        <line x1="1" y1="1" x2="23" y2="23" />
      </>
    )}
  </svg>
);
const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
    <g>
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
      <path d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 6.293C4.672 4.166 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </g>
  </svg>
);
export default function AuthPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [form, setForm] = useState({ email: "", password: "" });

  // ── FUTURE: GOOGLE OAUTH REDIRECT HANDLER ──────────────────────────────
  // Uncomment this when you enable Google login
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token  = params.get("token");
    if (token) {
      localStorage.setItem("token", token);
      window.history.replaceState({}, document.title, "/auth");
      window.location.href = "/dashboard";
    }
  }, []);

  const handleSubmit = async (e) => {
  e.preventDefault();
  try {
    const response = await axios.post("/auth/login", {
      email: form.email,
      password: form.password,
    });
    const token = response.data.token;
    localStorage.setItem("token", token);
    window.location.href = "/dashboard";
  } catch (error) {
    console.error(error);
    alert(error.response?.data?.message || "Invalid credentials");
  }
};

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  return (
    <div className="auth-root">
      {/* Decorative blobs */}
      <div className="auth-blob auth-blob-top" />
      <div className="auth-blob auth-blob-bottom" />

      <div className="auth-wrapper">
        {/* Logo / Brand */}
        <div className="auth-logo">
          <div className="auth-logo-inner">
            <div className="auth-logo-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <span className="auth-logo-text">ExpenseTracker</span>
          </div>
        </div>

        {/* Card */}
        <div className="auth-card">
          {/* Heading */}
          <div className="auth-heading">
            <h2>Welcome back</h2>
            <p>Log in to your expense dashboard</p>
          </div>

          {/* FUTURE: Google button — uncomment when you want public login */}
          <button
            className="google-btn"
            onClick={() => { window.location.href = `${process.env.REACT_APP_API_URL}/auth/google`; }}
          >
            <GoogleIcon />
            Continue with Google
          </button>
          <div className="auth-divider">
            <div className="auth-divider-line" />
            <span>OR</span>
            <div className="auth-divider-line" />
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            {/* Email */}
            <div>
              <label>Email</label>
              <input
                type="email"
                value={form.email}
                onChange={handleChange("email")}
                placeholder="you@example.com"
                required
                className="auth-input"
                onFocus={(e) => (e.target.style.borderColor = "#7c3aed")}
                onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.1)")}
              />
            </div>

            {/* Password */}
            <div>
              <label>Password</label>
              <div className="auth-input-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={handleChange("password")}
                  placeholder="••••••••"
                  required
                  className="auth-input auth-input-with-icon"
                  onFocus={(e) => (e.target.style.borderColor = "#7c3aed")}
                  onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.1)")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="auth-eye-btn"
                >
                  <EyeIcon open={showPassword} />
                </button>
              </div>
            </div>

            {/* Remember me + Forgot password */}
            <div className="auth-remember-row">
              <label className="auth-remember-label">
                <div
                  onClick={() => setRememberMe(!rememberMe)}
                  className={`auth-remember-box ${rememberMe ? "auth-remember-box-on" : ""}`}
                >
                  {rememberMe && (
                    <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                      <path
                        d="M2 6l3 3 5-5"
                        stroke="white"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </div>
                <span>Remember me</span>
              </label>

              {/* <button
                type="button"
                className="auth-forgot-btn"
                onMouseEnter={(e) => (e.currentTarget.style.color = "#c4b5fd")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#a78bfa")}
              >
                Forgot password?
              </button> */}
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="auth-submit-btn"
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = "0.92";
                e.currentTarget.style.transform = "translateY(-1px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = "1";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              Log in
            </button>
          </form>

          {/* FUTURE: Sign up link — uncomment when you want public signup */}
          {/* <p className="auth-bottom-text">
            Don't have an account?{" "}
            <button className="auth-bottom-switch" onClick={() => setMode("signup")}>
              Sign up
            </button>
          </p> */}
        </div>

        <p className="auth-footer-note">Protected by bank-grade encryption</p>
      </div>
    </div>
  );
}