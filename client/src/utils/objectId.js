// FLOW: Client source file. Data usually comes from props/context/routes/api/client.js, UI logic processes it, and rendered output or user actions go back to parent/API flow.

// FLOW: Small validation helper. Pages pass IDs from route/API into this function before treating them like Mongo ObjectIds.

/** MongoDB ObjectId string (24 hex chars). Rejects "undefined"/"null" literals. */
export function isValidObjectId(id) {
  if (id == null || id === "") return false;
  const str = String(id);
  if (str === "undefined" || str === "null") return false;
  return /^[a-f\d]{24}$/i.test(str);
}

