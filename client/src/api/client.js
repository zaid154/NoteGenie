import axios from "axios";

// Ek hi axios instance poore app me. baseURL "/api" Vite proxy se backend pe jata hai.
export const api = axios.create({ baseURL: "/api" });

const TOKEN_KEY = "notegenie_token";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

// Har request me JWT token apne aap laga dete hain.
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Backend ki error message ko aasaani se nikaalne ka helper.
export function apiError(err) {
  return err?.response?.data?.message || err?.message || "Something went wrong";
}
