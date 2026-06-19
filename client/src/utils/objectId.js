/** MongoDB ObjectId string (24 hex chars). Rejects "undefined"/"null" literals. */
export function isValidObjectId(id) {
  if (id == null || id === "") return false;
  const str = String(id);
  if (str === "undefined" || str === "null") return false;
  return /^[a-f\d]{24}$/i.test(str);
}
