// Yeh file backend se baat karne ka kaam karti hai.
// axios ek library hai jo HTTP request (GET, POST, etc.) bhejti hai.
import axios from "axios";

// baseURL: production me VITE_API_URL set karo; dev me "/api" Vite proxy se backend pe jata hai.
export const API_BASE_URL = import.meta.env.VITE_API_URL || "/api";

// "api" ek ready-made axios object hai. Iske through hum sab request bhejte hain.
// Example: api.get("/documents") ya api.post("/auth/login", data)
export const api = axios.create({ baseURL: API_BASE_URL });

// Streaming fetch jaise cases ke liye full URL banata hai (axios instance bypass).
export function apiUrl(path) {
  return `${API_BASE_URL}${path}`;
}

const TOKEN_KEY = "notegenie_token";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

// 401 par AuthContext ko bata kar logout karwane ke liye ek registerable handler.
let onUnauthorized = null;
export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn;
}

// Har request me JWT token apne aap laga dete hain.
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Token expire/invalid (401) hone par session saaf karke logout trigger karte hain.
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response?.status === 401 && getToken()) {
      setToken(null);
      if (onUnauthorized) onUnauthorized();
    }
    return Promise.reject(err);
  }
);

// Backend ki error message ko aasaani se nikaalne ka helper (alag-alag shapes handle karta hai).
export function isQuotaError(err) {
  return err?.response?.status === 402 || err?.response?.data?.code === "QUOTA_EXCEEDED";
}

export function isRateLimitError(err) {
  return err?.response?.status === 429;
}

export function apiError(err) {
  const data = err?.response?.data;
  if (isRateLimitError(err)) {
    const retryAfter = err?.response?.headers?.["retry-after"];
    const base = data?.message || "Too many attempts. Please wait a few minutes and try again.";
    return retryAfter ? `${base} Try again in about ${retryAfter} seconds.` : base;
  }
  if (isQuotaError(err)) {
    return data?.message || "You've reached your plan limit. Upgrade for more.";
  }
  if (data) {
    if (typeof data === "string") return data;
    if (data.message) return data.message;
    if (Array.isArray(data.errors) && data.errors.length) {
      return data.errors.map((e) => e.message || e).join(", ");
    }
    if (data.error) return data.error;
  }
  if (err?.code === "ERR_NETWORK") return "Can't reach the server. Is it running?";
  return err?.message || "Something went wrong";
}
