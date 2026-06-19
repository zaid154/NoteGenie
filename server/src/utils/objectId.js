import mongoose from "mongoose";

/** Strict MongoDB ObjectId check (rejects invalid 12-byte strings). */
export function isValidObjectId(id) {
  if (id == null || id === "") return false;
  const str = String(id);
  if (str === "undefined" || str === "null") return false;
  if (!mongoose.Types.ObjectId.isValid(str)) return false;
  return String(new mongoose.Types.ObjectId(str)) === str;
}

export function assertValidObjectId(id, label = "ID") {
  if (!isValidObjectId(id)) {
    const err = new Error(`Invalid ${label}`);
    err.statusCode = 400;
    throw err;
  }
}
