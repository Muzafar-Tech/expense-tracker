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

export default function AuthPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [form, setForm] = useState({ email: "", password: "" });

  // ── FUTURE: GOOGLE OAUTH REDIRECT HANDLER ──────────────────────────────
  // Uncomment this when you enable Google login
  // useEffect(() => {
  //   const params = new URLSearchParams(window.location.search);
  //   const token  = params.get("token");
  //   if (token) {
  //     localStorage.setItem("token", token);
  //     window.history.replaceState({}, document.title, "/auth");
  //     window.location.href = "/dashboard";
  //   }
  // }, []);

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
          {/* <button
            className="google-btn"
            onClick={() => { window.location.href = "http://localhost:5000/api/auth/google"; }}
          >
            <GoogleIcon />
            Continue with Google
          </button>
          <div className="auth-divider">
            <div className="auth-divider-line" />
            <span>OR</span>
            <div className="auth-divider-line" />
          </div> */}

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