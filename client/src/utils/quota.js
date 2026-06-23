// FLOW: Client source file. Data usually comes from props/context/routes/api/client.js, UI logic processes it, and rendered output or user actions go back to parent/API flow.

// FLOW: Quota helper. Usage data comes from billing/auth APIs, this checks if a feature limit is reached and helps UI disable or show upgrade prompts.

export function isQuotaExceeded(usage, feature) {
  if (!usage?.limits || usage.limits[feature] == null) return false;
  const used = usage.used?.[feature] ?? 0;
  return used >= usage.limits[feature];
}

export function isQuotaError(err) {
  return err?.response?.status === 402 || err?.response?.data?.code === "QUOTA_EXCEEDED";
}

