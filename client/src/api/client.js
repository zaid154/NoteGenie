// ============================================================================
// FLOW: Client source file.
// Saari frontend -> backend API requests isi file se jaati hain.
// Yeh axios configure karta hai, JWT token attach karta hai,
// errors handle karta hai aur SSE (Streaming) requests bhi manage karta hai.
// ============================================================================

import axios from "axios";

// ============================================================================
// API BASE URL
// Production me .env ka VITE_API_URL use hoga.
// Development me "/api" Vite proxy backend ko forward karega.
// ============================================================================
export const API_BASE_URL = import.meta.env.VITE_API_URL || "/api";

// ============================================================================
// Axios Instance
// Ab har request me baseURL baar-baar likhne ki zarurat nahi.
// Example:
// api.get("/documents")
// api.post("/auth/login", data)
// ============================================================================
export const api = axios.create({
  baseURL: API_BASE_URL,
});

// ============================================================================
// Full URL banane ke liye helper
// Jab fetch() use karna ho axios ki jagah.
// Example:
// apiUrl("/documents/upload")
// =>
// http://localhost:5000/api/documents/upload
// ============================================================================
export function apiUrl(path) {
  return `${API_BASE_URL}${path}`;
}

// ============================================================================
// Backend ko warm-up request bhejta hai.
// Render free server sleep mode me hota hai,
// isliye app open hote hi health endpoint hit kar dete hain.
//
// Dev mode me ye nahi chalega.
// ============================================================================
export function warmApi() {
  if (import.meta.env.DEV) return;

  fetch(
    `${API_BASE_URL.replace(/\/api\/?$/, "")}/api/health`,
    {
      method: "GET",
    }
  ).catch(() => {});
}

// ============================================================================
// LocalStorage Key
// Isi naam se JWT token browser me save hota hai.
// ============================================================================
const TOKEN_KEY = "notegenie_token";

// ============================================================================
// Browser se token read karo.
// ============================================================================
export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

// ============================================================================
// Login ke baad token save karo.
// Logout par token remove karo.
// ============================================================================
export function setToken(token) {
  if (token)
    localStorage.setItem(TOKEN_KEY, token);
  else
    localStorage.removeItem(TOKEN_KEY);
}

// ============================================================================
// AuthContext ek logout function register karega.
// Agar backend 401 bheje to isi function ko call karenge.
// ============================================================================
let onUnauthorized = null;

export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn;
}

// ============================================================================
// REQUEST INTERCEPTOR
//
// Backend ko request bhejne se pehle automatically
// Authorization header me JWT token attach karta hai.
//
// Login ke baad developer ko manually header nahi bhejna padta.
// ============================================================================
api.interceptors.request.use((config) => {

  const token = getToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// ============================================================================
// RESPONSE INTERCEPTOR
//
// Har response yahan se guzarta hai.
//
// Agar backend bole token invalid hai (401)
// to:
// 1. Token delete
// 2. AuthContext logout
// 3. Login page redirect
// ============================================================================
api.interceptors.response.use(

  (res) => res,

  (err) => {

    if (
      err?.response?.status === 401 &&
      getToken()
    ) {

      setToken(null);

      if (onUnauthorized)
        onUnauthorized();
    }

    return Promise.reject(err);
  }
);

// ============================================================================
// Helper:
// Plan quota khatam hua ya nahi.
// ============================================================================
export function isQuotaError(err) {
  return (
    err?.response?.status === 402 ||
    err?.response?.data?.code === "QUOTA_EXCEEDED"
  );
}

// ============================================================================
// Helper:
// Rate limit (Too Many Requests)
// ============================================================================
export function isRateLimitError(err) {
  return err?.response?.status === 429;
}

// ============================================================================
// Backend ki kisi bhi type ki error ko
// ek readable message me convert karta hai.
//
// Is helper ko saari pages use karti hain.
//
// Example:
//
// toast.error(apiError(err))
// ============================================================================
export function apiError(err) {

  const data = err?.response?.data;

  // -------------------------------
  // 429 Too Many Requests
  // -------------------------------
  if (isRateLimitError(err)) {

    const retryAfter =
      err?.response?.headers?.["retry-after"];

    const base =
      data?.message ||
      "Too many attempts. Please wait a few minutes and try again.";

    return retryAfter
      ? `${base} Try again in about ${retryAfter} seconds.`
      : base;
  }

  // -------------------------------
  // Plan quota khatam
  // -------------------------------
  if (isQuotaError(err)) {
    return (
      data?.message ||
      "You've reached your plan limit. Upgrade for more."
    );
  }

  // -------------------------------
  // Backend JSON Error
  // -------------------------------
  if (data) {

    if (typeof data === "string")
      return data;

    if (data.message)
      return data.message;

    if (
      Array.isArray(data.errors) &&
      data.errors.length
    ) {
      return data.errors
        .map((e) => e.message || e)
        .join(", ");
    }

    if (data.error)
      return data.error;
  }

  // -------------------------------
  // Network Down
  // -------------------------------
  if (err?.code === "ERR_NETWORK") {
    return "Can't reach the server. Is it running?";
  }

  const status = err?.response?.status;

  // -------------------------------
  // Gateway Errors
  // -------------------------------
  if (status >= 502 && status <= 504) {
    return "Server is temporarily unavailable. Wait a moment and try again.";
  }

  // -------------------------------
  // Internal Server Error
  // -------------------------------
  if (
    status === 500 &&
    !data?.message
  ) {
    return "Server error — the backend may be restarting. Refresh the page and try again.";
  }

  // -------------------------------
  // Unknown Status
  // -------------------------------
  if (
    status &&
    err?.message?.startsWith(
      "Request failed with status code"
    )
  ) {
    return "Something went wrong. Please try again.";
  }

  return err?.message || "Something went wrong";
}

// ============================================================================
// SSE STREAM READER
//
// Server continuously data bhej raha hota hai.
//
// Yeh function stream ko read karta hai,
// events ko parse karta hai,
// aur frontend ko bhejta hai.
//
// Example events:
// event: phase
// event: done
// event: error
// ============================================================================
async function readSseStream(
  res,
  { onEvent }
) {

  const reader = res.body.getReader();
  const decoder = new TextDecoder();

  let buffer = "";
  let streamError = null;

  while (true) {

    const { done, value } =
      await reader.read();

    if (done) break;

    buffer += decoder.decode(value, {
      stream: true,
    });

    const parts =
      buffer.split("\n\n");

    buffer = parts.pop() || "";

    for (const part of parts) {

      if (!part.trim()) continue;

      let event = "message";
      let dataStr = "";

      for (const line of part.split("\n")) {

        if (line.startsWith("event:"))
          event = line.slice(6).trim();

        else if (line.startsWith("data:"))
          dataStr += line.slice(5).trim();
      }

      if (!dataStr) continue;

      let data;

      try {
        data = JSON.parse(dataStr);
      } catch {
        data = {
          raw: dataStr,
        };
      }

      if (event === "error") {
        streamError = new Error(
          data.message || "Request failed"
        );
        break;
      }

      // Parent component ko event bhejo.
      onEvent?.(event, data);
    }

    if (streamError) break;
  }

  if (streamError)
    throw streamError;
}

// ============================================================================
// PDF Upload (Streaming)
//
// Upload ke time backend continuously progress bhejta hai.
//
// phase -> Processing
// done -> Upload Complete
// ============================================================================
export async function uploadDocumentStream(
  formData,
  { onPhase, signal } = {}
) {

  const res = await fetch(
    apiUrl("/documents/upload/stream"),
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
      body: formData,
      signal,
    }
  );

  if (!res.ok) {

    const text = await res.text();

    let message = "Upload failed";

    try {
      message =
        JSON.parse(text).message || message;
    } catch {
      if (text)
        message = text.slice(0, 200);
    }

    throw new Error(message);
  }

  let result = null;

  await readSseStream(res, {

    onEvent: (event, data) => {

      if (event === "phase")
        onPhase?.(data);

      if (event === "done")
        result = data;
    },
  });

  if (!result?.documentId)
    throw new Error(
      "Upload finished without a document ID"
    );

  return result;
}

// ============================================================================
// Link Import (Streaming)
//
// URL bhejo.
// Backend webpage process karega.
// Progress realtime milega.
// ============================================================================
export async function importLinkStream(
  body,
  { onPhase, signal } = {}
) {

  const res = await fetch(
    apiUrl("/documents/link/stream"),
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`,
      },

      body: JSON.stringify(body),
      signal,
    }
  );

  if (!res.ok) {

    const data =
      await res.json().catch(() => ({}));

    throw new Error(
      data.message ||
      "Link import failed"
    );
  }

  let result = null;

  await readSseStream(res, {

    onEvent: (event, data) => {

      if (event === "phase")
        onPhase?.(data);

      if (event === "done")
        result = data;
    },
  });

  if (!result?.documentId)
    throw new Error(
      "Import finished without a document ID"
    );

  return result;
}

// ============================================================================
// Text Import (Streaming)
//
// User pasted text bhejta hai.
//
// Backend us text se notes generate karta hai.
//
// Progress realtime milta rehta hai.
// ============================================================================
export async function importTextStream(
  body,
  { onPhase, signal } = {}
) {

  const res = await fetch(
    apiUrl("/documents/text/stream"),
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`,
      },

      body: JSON.stringify(body),
      signal,
    }
  );

  if (!res.ok) {

    const data =
      await res.json().catch(() => ({}));

    throw new Error(
      data.message ||
      "Text import failed"
    );
  }

  let result = null;

  await readSseStream(res, {

    onEvent: (event, data) => {

      if (event === "phase")
        onPhase?.(data);

      if (event === "done")
        result = data;
    },
  });

  if (!result?.documentId)
    throw new Error(
      "Import finished without a document ID"
    );

  return result;
}