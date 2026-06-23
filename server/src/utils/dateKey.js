// FLOW: Date helper. Services pass Date values here, helpers convert them into local day keys/weekday labels, and streak/activity code uses stable day strings.

/** Local calendar date as YYYY-MM-DD (avoids UTC shift from toISOString). */
export function localDateKey(date = new Date()) {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function weekdayShort(dateKey) {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: "short" });
}
