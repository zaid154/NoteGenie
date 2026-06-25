// FLOW: Resource Mongoose model. A sellable/downloadable catalog item attached to a Course
// (question paper, assignment, solved assignment, book, guide, notes). university/program/
// courseCode are denormalized for fast browse/search. File storage fields are provider-agnostic
// (see services/fileStorage.js) so the storage backend can be swapped without a schema change.

import mongoose from "mongoose";

export const RESOURCE_TYPES = [
  "question_paper",
  "assignment",
  "solved_assignment",
  "book",
  "guide",
  "notes",
  "project",
  "synopsis",
];

const resourceSchema = new mongoose.Schema(
  {
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true, index: true },
    programId: { type: mongoose.Schema.Types.ObjectId, ref: "Program", index: true },
    universityId: { type: mongoose.Schema.Types.ObjectId, ref: "University", index: true },
    courseCode: { type: String, default: "", trim: true, uppercase: true, index: true },

    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    resourceType: { type: String, enum: RESOURCE_TYPES, required: true, index: true },
    year: { type: String, default: "", trim: true },     // e.g. "2024"
    session: { type: String, default: "", trim: true },  // e.g. "June 2024"

    // Marketplace. Prices are stored in paise to match the Razorpay/env convention.
    isPaid: { type: Boolean, default: false, index: true },
    price: { type: Number, default: 0 },
    currency: { type: String, default: "INR" },

    // Provider-agnostic file storage.
    storageProvider: { type: String, enum: ["gridfs", "cloudinary", "r2", "s3"], default: "gridfs" },
    storageKey: { type: String, default: "" }, // GridFS file id / object key / public_id
    fileUrl: { type: String, default: "" },     // canonical url (re-signed on download where applicable)
    fileName: { type: String, default: "" },
    mime: { type: String, default: "" },
    size: { type: Number, default: 0 },
    pages: { type: Number, default: null },
    previewUrl: { type: String, default: "" }, // optional free preview/thumbnail

    downloadCount: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true, index: true },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

resourceSchema.index({ courseId: 1, resourceType: 1 });
resourceSchema.index({ universityId: 1, programId: 1, courseId: 1 });
resourceSchema.index({ courseCode: 1, year: 1 });
resourceSchema.index({ isActive: 1, isPaid: 1 });
resourceSchema.index({ title: "text", description: "text" });

export const Resource = mongoose.model("Resource", resourceSchema);
