// FLOW: Client source file. Data usually comes from props/context/routes/api/client.js, UI logic processes it, and rendered output or user actions go back to parent/API flow.

// FLOW: All frontend backend calls pass through this file. API base comes from VITE_API_URL or /api proxy, token comes from localStorage, requests get Authorization, and errors are normalized for pages.

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

/** Wake Render / verify API is reachable (fire-and-forget on app load). */
export function warmApi() {
  if (import.meta.env.DEV) return;
  fetch(`${API_BASE_URL.replace(/\/api\/?$/, "")}/api/health`, { method: "GET" }).catch(() => {});
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
  const status = err?.response?.status;
  if (status >= 502 && status <= 504) {
    return "Server is temporarily unavailable. Wait a moment and try again.";
  }
  if (status === 500 && !data?.message) {
    return "Server error — the backend may be restarting. Refresh the page and try again.";
  }
  if (status && err?.message?.startsWith("Request failed with status code")) {
    return "Something went wrong. Please try again.";
  }
  return err?.message || "Something went wrong";
}

async function readSseStream(res, { onEvent }) {
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let streamError = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() || "";

    for (const part of parts) {
      if (!part.trim()) continue;
      let event = "message";
      let dataStr = "";
      for (const line of part.split("\n")) {
        if (line.startsWith("event:")) event = line.slice(6).trim();
        else if (line.startsWith("data:")) dataStr += line.slice(5).trim();
      }
      if (!dataStr) continue;
      let data;
      try {
        data = JSON.parse(dataStr);
      } catch {
        data = { raw: dataStr };
      }
      if (event === "error") {
        streamError = new Error(data.message || "Request failed");
        break;
      }
      onEvent?.(event, data);
    }
    if (streamError) break;
  }

  if (streamError) throw streamError;
}

/** Upload PDF with SSE progress. Returns { documentId, generationMode }. */
export async function uploadDocumentStream(formData, { onPhase, signal } = {}) {
  const res = await fetch(apiUrl("/documents/upload/stream"), {
    method: "POST",
    headers: { Authorization: `Bearer ${getToken()}` },
    body: formData,
    signal,
  });

  if (!res.ok) {
    const text = await res.text();
    let message = "Upload failed";
    try {
      message = JSON.parse(text).message || message;
    } catch {
      if (text) message = text.slice(0, 200);
    }
    throw new Error(message);
  }

  let result = null;
  await readSseStream(res, {
    onEvent: (event, data) => {
      if (event === "phase") onPhase?.(data);
      if (event === "done") result = data;
    },
  });

  if (!result?.documentId) throw new Error("Upload finished without a document ID");
  return result;
}

/** Import link with SSE progress. Returns { documentId, generationMode }. */
export async function importLinkStream(body, { onPhase, signal } = {}) {
  const res = await fetch(apiUrl("/documents/link/stream"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify(body),
    signal,
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || "Link import failed");
  }

  let result = null;
  await readSseStream(res, {
    onEvent: (event, data) => {
      if (event === "phase") onPhase?.(data);
      if (event === "done") result = data;
    },
  });

  if (!result?.documentId) throw new Error("Import finished without a document ID");
  return result;
}

/** Import pasted text with SSE progress. Returns { documentId, generationMode }. */
export async function importTextStream(body, { onPhase, signal } = {}) {
  const res = await fetch(apiUrl("/documents/text/stream"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify(body),
    signal,
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || "Text import failed");
  }

  let result = null;
  await readSseStream(res, {
    onEvent: (event, data) => {
      if (event === "phase") onPhase?.(data);
      if (event === "done") result = data;
    },
  });

  if (!result?.documentId) throw new Error("Import finished without a document ID");
  return result;
}

