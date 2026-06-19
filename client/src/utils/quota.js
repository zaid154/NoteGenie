export function isQuotaExceeded(usage, feature) {
  if (!usage?.limits || usage.limits[feature] == null) return false;
  const used = usage.used?.[feature] ?? 0;
  return used >= usage.limits[feature];
}

export function isQuotaError(err) {
  return err?.response?.status === 402 || err?.response?.data?.code === "QUOTA_EXCEEDED";
}
