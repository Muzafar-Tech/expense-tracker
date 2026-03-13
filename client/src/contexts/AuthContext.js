// client/src/contexts/AuthContext.js
import { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken]       = useState(() => localStorage.getItem("token"));
  const [currentUser, setCurrentUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);

  // Fetch the logged-in user's profile whenever token changes
  useEffect(() => {
    if (!token) {
      setCurrentUser(null);
      setLoadingUser(false);
      return;
    }
    const fetchUser = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setCurrentUser(data);
        } else {
          // Token invalid — clear it
          logout();
        }
      } catch (err) {
        console.error("AuthContext fetchUser error:", err);
      } finally {
        setLoadingUser(false);
      }
    };
    fetchUser();
  }, [token]);

  const login = (newToken) => {
    localStorage.setItem("token", newToken);
    setToken(newToken);
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setCurrentUser(null);
  };

  return (
    <AuthContext.Provider value={{ token, currentUser, loadingUser, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// Convenience hook
export const useAuth = () => useContext(AuthContext);

export default AuthContext;