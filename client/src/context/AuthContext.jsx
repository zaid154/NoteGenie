// FLOW: Client source file. Data usually comes from props/context/routes/api/client.js, UI logic processes it, and rendered output or user actions go back to parent/API flow.

// FLOW: Auth state provider for the whole client. Token/API helpers come from api/client.js, user data comes from /auth/me/login/register APIs, and children read it through useAuth().

// Yeh file "kaun user login hai" yeh poore app ko batati hai.
// Iski wajah se kisi bhi page me hum user ki info aur login/logout functions use kar sakte hain.
import { createContext, useContext, useEffect, useState } from "react";
import { api, setToken, getToken, setUnauthorizedHandler, apiError } from "../api/client.js";

// Context ek dabba (box) hai jisme hum data rakhte hain.
const AuthContext = createContext(null);

// Provider poore app ko yeh data deta hai (main.jsx me lagta hai).
export function AuthProvider({ children }) {
  // user = abhi login wala user (null matlab koi login nahi).
  const [user, setUser] = useState(null);
  // loading = true jab tak hum check kar rahe hain ki user login hai ya nahi.
  const [loading, setLoading] = useState(true);

  // 401 par (token expire/invalid) session saaf kar dete hain.
  // client.js ko bata dete hain ki "agar 401 aaye to user ko null kar dena".
  useEffect(() => {
    setUnauthorizedHandler(() => setUser(null));
    // Cleanup: component hatne par handler bhi hata do.
    return () => setUnauthorizedHandler(null);
  }, []);

  // App load hote hi: agar token hai to current user fetch karo.
  useEffect(() => {
    async function loadUser() {
      // Token hi nahi hai to login nahi hai. Loading band karo.
      if (!getToken()) {
        setLoading(false);
        return;
      }
      try {
        // Backend se "mera profile" mangwao.
        const { data } = await api.get("/auth/me");
        setUser(data.user);
      } catch {
        // Token kharab hai to use hata do.
        setToken(null);
        setUser(null);
      } finally {
        // Chahe success ho ya fail, loading to band karni hai.
        setLoading(false);
      }
    }
    loadUser();
  }, []);

  // Login: email/password backend ko bhejo, token aur user save karo.
  async function login(email, password) {
    const { data } = await api.post("/auth/login", { email, password });
    setToken(data.token);
    setUser(data.user);
  }

  // Register: naya account banao, fir wahi token/user save karo.
  async function register(name, email, password) {
    const { data } = await api.post("/auth/register", { name, email, password });
    setToken(data.token);
    setUser(data.user);
  }

  // Logout: token aur user dono hata do.
  function logout() {
    setToken(null);
    setUser(null);
  }

  // refreshUser: user ki latest info dobara mangwao (jaise profile update ke baad).
  async function refreshUser() {
    try {
      const { data } = await api.get("/auth/me");
      setUser(data.user);
      return data.user;
    } catch {
      return null;
    }
  }

  // hasPermission: admin ke paas sab hai; staff ke paas sirf granted permissions; user ke paas kuch nahi.
  function hasPermission(key) {
    if (!user) return false;
    if (user.role === "admin") return true;
    if (user.role === "staff") return (user.permissions || []).includes(key);
    return false;
  }

  // value = jo bhi cheezein hum dusre components ko dena chahte hain.
  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
}

// useAuth = chhota helper. Kisi bhi component me "const { user } = useAuth()" likho.
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (ctx === null) {
    // Agar koi AuthProvider ke bahar use kare to galti pakad lo.
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}

// apiError yahan se bhi export kar dete hain taaki pages ek hi jagah se import kar sakein.
export { apiError };

