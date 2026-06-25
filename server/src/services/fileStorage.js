// FLOW: File storage abstraction for sellable resources. resourceController uploads buffers
// here and the marketplace download endpoint streams them back. v1 backend is MongoDB GridFS
// (zero external setup, reuses the existing Atlas connection). The Resource model stores a
// `storageProvider` + `storageKey`, so a Cloudinary / R2 / S3 provider can be added later
// without a schema or controller change — only this file changes.

import mongoose from "mongoose";
import { Readable } from "stream";

const BUCKET_NAME = "resourceFiles";

function getBucket() {
  const db = mongoose.connection.db;
  if (!db) throw new Error("Database not connected — cannot access file storage.");
  return new mongoose.mongo.GridFSBucket(db, { bucketName: BUCKET_NAME });
}

// GridFS is "configured" whenever the DB connection is live.
export function isFileStorageConfigured() {
  return mongoose.connection.readyState === 1;
}

/**
 * Store a buffer and return provider-agnostic metadata for the Resource model.
 * @returns {Promise<{provider:string, key:string, size:number, mime:string, fileName:string}>}
 */
export function uploadBuffer(buffer, { filename = "file", mime = "application/octet-stream" } = {}) {
  return new Promise((resolve, reject) => {
    let bucket;
    try {
      bucket = getBucket();
    } catch (err) {
      return reject(err);
    }
    const uploadStream = bucket.openUploadStream(filename, { contentType: mime });
    Readable.from(buffer)
      .pipe(uploadStream)
      .on("error", reject)
      .on("finish", () => {
        resolve({
          provider: "gridfs",
          key: String(uploadStream.id),
          size: buffer.length,
          mime,
          fileName: filename,
        });
      });
  });
}

// Readable stream for the download endpoint to pipe to the HTTP response.
export function openDownloadStream(storageKey) {
  const bucket = getBucket();
  return bucket.openDownloadStream(new mongoose.Types.ObjectId(String(storageKey)));
}

// Best-effort delete (used when a resource or its file is removed/replaced).
export async function deleteFile(storageKey) {
  if (!storageKey) return;
  try {
    await getBucket().delete(new mongoose.Types.ObjectId(String(storageKey)));
  } catch {
    // File may already be gone or id invalid — non-fatal.
  }
}
