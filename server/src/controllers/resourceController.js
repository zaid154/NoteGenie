// FLOW: Resource API logic. Admin resource routes (manage_resources) upload/edit/delete
// sellable items here (file goes through services/fileStorage.js); public browse/search/detail
// routes return catalog items WITHOUT storage internals so paid files can't be bypassed.

import { Resource, RESOURCE_TYPES } from "../models/Resource.js";
import { Course } from "../models/Course.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import { assertValidObjectId } from "../utils/objectId.js";
import { logAdminAction } from "../services/adminAudit.js";
import { uploadBuffer, deleteFile } from "../services/fileStorage.js";

// Public-safe shape: never leaks storageKey/fileUrl (those gate the paid download).
function publicResource(r) {
  const productType = r.productType || "digital";
  const isDigital = productType === "digital";
  return {
    id: r._id,
    title: r.title,
    description: r.description,
    resourceType: r.resourceType,
    year: r.year,
    session: r.session,
    isPaid: r.isPaid,
    price: r.price,
    currency: r.currency,
    previewUrl: r.previewUrl,
    pages: r.pages,
    fileName: r.fileName,
    mime: r.mime,
    size: r.size,
    downloadCount: r.downloadCount,
    courseId: r.courseId,
    courseCode: r.courseCode,
    universityId: r.universityId,
    programId: r.programId,
    createdAt: r.createdAt,
    // Product type + safe digital/physical info (NEVER licenseKey / downloadUrl / storageKey).
    productType,
    isDigital,
    version: r.version || "",
    downloadLimit: r.downloadLimit ?? null,
    downloadExpiryDays: r.downloadExpiryDays ?? null,
    instantDownload: r.instantDownload !== false,
    shippingRequired: isDigital ? false : r.shippingRequired !== false,
    deliveryCharges: isDigital ? 0 : r.deliveryCharges || 0,
    codAvailable: isDigital ? false : !!r.codAvailable,
    weightGrams: isDigital ? null : r.weightGrams ?? null,
    dimensions: isDigital ? "" : r.dimensions || "",
    inStock: isDigital ? true : r.manageInventory ? (r.stock || 0) > 0 : true,
    stock: isDigital ? null : r.stock ?? 0,
  };
}

function parsePaging(query) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  return { page, limit, skip: (page - 1) * limit };
}

function normalizePrice(isPaid, priceRaw) {
  if (!isPaid) return 0;
  const n = Math.round(Number(priceRaw) || 0);
  return n > 0 ? n : 0;
}

// Multipart sends everything as strings — parse the digital/physical product fields.
function asBool(v) {
  return v === true || v === "true";
}
function numOrNull(v) {
  return v === undefined || v === "" || v === null ? null : Number(v);
}

// Apply the product-type + digital/physical fields from a request body onto a Resource document.
function applyProductFields(resource, body) {
  if (["digital", "physical"].includes(body.productType)) resource.productType = body.productType;

  // Digital
  if (body.downloadUrl !== undefined) resource.downloadUrl = String(body.downloadUrl || "").trim();
  if (body.downloadLimit !== undefined) resource.downloadLimit = numOrNull(body.downloadLimit);
  if (body.downloadExpiryDays !== undefined) resource.downloadExpiryDays = numOrNull(body.downloadExpiryDays);
  if (body.version !== undefined) resource.version = String(body.version || "").trim();
  if (body.licenseKey !== undefined) resource.licenseKey = String(body.licenseKey || "");
  if (body.instantDownload !== undefined) resource.instantDownload = asBool(body.instantDownload);
  if (body.allowMultipleFiles !== undefined) resource.allowMultipleFiles = asBool(body.allowMultipleFiles);
  if (body.documentationUrl !== undefined) resource.documentationUrl = String(body.documentationUrl || "").trim();

  // Physical
  if (body.sku !== undefined) resource.sku = String(body.sku || "").trim();
  if (body.stock !== undefined) resource.stock = Number(body.stock) || 0;
  if (body.weightGrams !== undefined) resource.weightGrams = numOrNull(body.weightGrams);
  if (body.dimensions !== undefined) resource.dimensions = String(body.dimensions || "").trim();
  if (body.shippingRequired !== undefined) resource.shippingRequired = asBool(body.shippingRequired);
  if (body.lowStockAlert !== undefined) resource.lowStockAlert = numOrNull(body.lowStockAlert);
  if (body.deliveryCharges !== undefined) resource.deliveryCharges = Number(body.deliveryCharges) || 0;
  if (body.codAvailable !== undefined) resource.codAvailable = asBool(body.codAvailable);
  if (body.manageInventory !== undefined) resource.manageInventory = asBool(body.manageInventory);
}

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------
export const listResourcesAdmin = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePaging(req.query);
  const filter = {};
  if (req.query.courseId) {
    assertValidObjectId(req.query.courseId, "course ID");
    filter.courseId = req.query.courseId;
  }
  if (req.query.universityId) {
    assertValidObjectId(req.query.universityId, "university ID");
    filter.universityId = req.query.universityId;
  }
  if (req.query.resourceType && RESOURCE_TYPES.includes(req.query.resourceType)) {
    filter.resourceType = req.query.resourceType;
  }
  if (req.query.search?.trim()) {
    filter.title = { $regex: req.query.search.trim(), $options: "i" };
  }

  const [resources, total] = await Promise.all([
    Resource.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Resource.countDocuments(filter),
  ]);

  res.json({
    resources: resources.map((r) => ({ ...publicResource(r), isActive: r.isActive, storageProvider: r.storageProvider })),
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  });
});

export const createResource = asyncHandler(async (req, res) => {
  const { courseId, resourceType } = req.body;
  assertValidObjectId(courseId, "course ID");
  const course = await Course.findById(courseId).select("programId universityId code").lean();
  if (!course) return res.status(404).json({ message: "Course not found" });
  if (!RESOURCE_TYPES.includes(resourceType)) {
    return res.status(400).json({ message: "Invalid resource type" });
  }
  const title = String(req.body.title || "").trim();
  if (!title) return res.status(400).json({ message: "Title is required" });

  const productType = ["digital", "physical"].includes(req.body.productType) ? req.body.productType : "digital";
  const downloadUrl = String(req.body.downloadUrl || "").trim();
  // Digital products need a stored file OR an external URL; physical products need neither.
  if (productType === "digital" && !req.file && !downloadUrl) {
    return res.status(400).json({ message: "Upload a file or provide a download URL for a digital product." });
  }

  const isPaid = asBool(req.body.isPaid);
  const price = normalizePrice(isPaid, req.body.price);

  let stored = null;
  if (req.file) {
    try {
      stored = await uploadBuffer(req.file.buffer, {
        filename: req.file.originalname,
        mime: req.file.mimetype,
      });
    } catch (err) {
      return res.status(503).json({ message: `File storage unavailable: ${err.message}` });
    }
  }

  const resource = new Resource({
    courseId,
    programId: course.programId,
    universityId: course.universityId,
    courseCode: course.code,
    title,
    description: String(req.body.description || ""),
    resourceType,
    year: String(req.body.year || "").trim(),
    session: String(req.body.session || "").trim(),
    isPaid,
    price,
    currency: "INR",
    pages: req.body.pages ? Number(req.body.pages) : null,
    previewUrl: String(req.body.previewUrl || ""),
    isActive: req.body.isActive !== "false",
    uploadedBy: req.user._id,
    ...(stored
      ? { storageProvider: stored.provider, storageKey: stored.key, fileName: stored.fileName, mime: stored.mime, size: stored.size }
      : {}),
  });
  applyProductFields(resource, req.body);
  await resource.save();

  await logAdminAction(req, "resource.create", "resource", resource._id, { title, isPaid, price, productType });
  res.status(201).json({ resource: publicResource(resource) });
});

export const updateResource = asyncHandler(async (req, res) => {
  assertValidObjectId(req.params.id, "resource ID");
  const resource = await Resource.findById(req.params.id);
  if (!resource) return res.status(404).json({ message: "Resource not found" });

  const { title, description, resourceType, year, session, isPaid, price, pages, previewUrl, isActive } = req.body;
  if (title !== undefined) resource.title = String(title).trim();
  if (description !== undefined) resource.description = String(description);
  if (resourceType !== undefined && RESOURCE_TYPES.includes(resourceType)) resource.resourceType = resourceType;
  if (year !== undefined) resource.year = String(year).trim();
  if (session !== undefined) resource.session = String(session).trim();
  if (isPaid !== undefined) resource.isPaid = isPaid === "true" || isPaid === true;
  if (price !== undefined) resource.price = normalizePrice(resource.isPaid, price);
  if (pages !== undefined) resource.pages = pages ? Number(pages) : null;
  if (previewUrl !== undefined) resource.previewUrl = String(previewUrl);
  if (isActive !== undefined) resource.isActive = isActive === "true" || isActive === true;
  applyProductFields(resource, req.body);

  // Optional file replacement.
  if (req.file) {
    const oldKey = resource.storageKey;
    const stored = await uploadBuffer(req.file.buffer, {
      filename: req.file.originalname,
      mime: req.file.mimetype,
    });
    resource.storageProvider = stored.provider;
    resource.storageKey = stored.key;
    resource.fileName = stored.fileName;
    resource.mime = stored.mime;
    resource.size = stored.size;
    if (oldKey) deleteFile(oldKey);
  }

  await resource.save();
  await logAdminAction(req, "resource.update", "resource", resource._id, { title: resource.title });
  res.json({ resource: publicResource(resource) });
});

export const deleteResource = asyncHandler(async (req, res) => {
  assertValidObjectId(req.params.id, "resource ID");
  const resource = await Resource.findByIdAndDelete(req.params.id);
  if (!resource) return res.status(404).json({ message: "Resource not found" });
  if (resource.storageKey) deleteFile(resource.storageKey);
  await logAdminAction(req, "resource.delete", "resource", resource._id, { title: resource.title });
  res.json({ message: "Deleted" });
});

// ---------------------------------------------------------------------------
// Public browse / search
// ---------------------------------------------------------------------------
export const searchResources = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePaging(req.query);
  const filter = { isActive: true };

  for (const [param, label] of [
    ["courseId", "course ID"],
    ["programId", "program ID"],
    ["universityId", "university ID"],
  ]) {
    if (req.query[param]) {
      assertValidObjectId(req.query[param], label);
      filter[param] = req.query[param];
    }
  }
  if (req.query.courseCode?.trim()) filter.courseCode = req.query.courseCode.trim().toUpperCase();
  if (req.query.year?.trim()) filter.year = req.query.year.trim();
  // resourceType accepts a single value OR a comma list (for multi-type storefront categories).
  if (req.query.resourceType?.trim()) {
    const types = req.query.resourceType.split(",").map((t) => t.trim()).filter((t) => RESOURCE_TYPES.includes(t));
    if (types.length === 1) filter.resourceType = types[0];
    else if (types.length > 1) filter.resourceType = { $in: types };
  }
  if (req.query.q?.trim()) filter.$text = { $search: req.query.q.trim() };
  // Free/paid filter — used by the storefront "Free only" toggle and the free-first browse.
  if (req.query.price === "free") filter.isPaid = false;
  else if (req.query.price === "paid") filter.isPaid = true;

  // Sort options surfaced in the storefront toolbar. Default keeps newest-first.
  const SORTS = {
    popular: { downloadCount: -1, createdAt: -1 },
    latest: { createdAt: -1 },
    price_low: { price: 1, createdAt: -1 },
    price_high: { price: -1, createdAt: -1 },
    // Free items first (isPaid false sorts before true), then most popular.
    free_first: { isPaid: 1, downloadCount: -1, createdAt: -1 },
  };
  const sort = SORTS[req.query.sort] || { createdAt: -1 };

  const [resources, total] = await Promise.all([
    Resource.find(filter).sort(sort).skip(skip).limit(limit).lean(),
    Resource.countDocuments(filter),
  ]);

  res.json({
    resources: resources.map(publicResource),
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  });
});

export const getResourcePublic = asyncHandler(async (req, res) => {
  assertValidObjectId(req.params.id, "resource ID");
  const resource = await Resource.findOne({ _id: req.params.id, isActive: true }).lean();
  if (!resource) return res.status(404).json({ message: "Resource not found" });
  res.json({ resource: publicResource(resource) });
});
