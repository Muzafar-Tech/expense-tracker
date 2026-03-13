// src/components/Navbar/Navbar.jsx
import React from "react";
import { Link, NavLink } from "react-router-dom";

function Navbar() {
  return (
    <header className="border-b border-slate-200 bg-white/90 backdrop-blur-sm">
      <nav className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-2">
          <span className="text-xl font-semibold !text-slate-900"> 
            {/* //text-4xl sm:text-5xl font-bold text-slate-900 */}
            Expense<span className="text-blue-600">Tracker</span>
          </span>
        </Link>

        {/* Links */}
        <div className="flex items-center gap-4 text-sm font-medium">
          <NavLink
            to="/"
            className={({ isActive }) =>
              `px-3 py-1.5 rounded-lg ${
                isActive
                  ? "bg-blue-50 text-blue-700"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`
            }
          >
            Home
          </NavLink>

          <NavLink
            to="/auth"
            className={({ isActive }) =>
              `px-3 py-1.5 rounded-lg ${
                isActive
                  ? "bg-blue-600 text-white"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`
            }
          >
            Login
            {/* Login / Signu */}
          </NavLink>

          {/* <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              `px-3 py-1.5 rounded-lg ${
                isActive
                  ? "bg-emerald-50 text-emerald-700"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`
            }
          >
            Dashboard
          </NavLink> */}
        </div>
      </nav>
    </header>
  );
}

export default Navbar;
