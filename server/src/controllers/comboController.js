// FLOW: Combo API logic. Admin (manage_combos) creates/edits bundles; public routes list/detail
// active combos for the storefront. Resource internals (storageKey) are never leaked.

import { Combo } from "../models/Combo.js";
import { Resource } from "../models/Resource.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import { assertValidObjectId, isValidObjectId } from "../utils/objectId.js";
import { logAdminAction } from "../services/adminAudit.js";

function slugify(str) {
  return String(str || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 70);
}

function comboResourceShape(r) {
  return {
    id: r._id,
    title: r.title,
    resourceType: r.resourceType,
    year: r.year,
    isPaid: r.isPaid,
    price: r.price,
    courseCode: r.courseCode,
  };
}

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------
export const listCombosAdmin = asyncHandler(async (_req, res) => {
  const combos = await Combo.find().sort({ order: 1, createdAt: -1 }).lean();
  res.json({
    combos: combos.map((c) => ({
      id: c._id,
      title: c.title,
      slug: c.slug,
      price: c.price,
      isActive: c.isActive,
      resourceCount: (c.resourceIds || []).length,
      coverUrl: c.coverUrl,
    })),
  });
});

export const createCombo = asyncHandler(async (req, res) => {
  const title = String(req.body.title || "").trim();
  if (!title) return res.status(400).json({ message: "Title is required" });
  const resourceIds = (Array.isArray(req.body.resourceIds) ? req.body.resourceIds : []).filter(isValidObjectId);
  if (resourceIds.length < 1) return res.status(400).json({ message: "Add at least one resource" });

  const slug = slugify(req.body.slug || title) || slugify(`${title}-${Date.now()}`);
  if (await Combo.exists({ slug })) return res.status(409).json({ message: "A combo with this slug already exists" });

  const combo = await Combo.create({
    title,
    slug,
    description: String(req.body.description || ""),
    resourceIds,
    price: Math.max(0, Math.round(Number(req.body.price) || 0)),
    coverUrl: String(req.body.coverUrl || ""),
    order: Number(req.body.order) || 0,
    isActive: req.body.isActive !== false,
    createdBy: req.user._id,
  });
  await logAdminAction(req, "combo.create", "combo", combo._id, { title, price: combo.price });
  res.status(201).json({ combo });
});

export const updateCombo = asyncHandler(async (req, res) => {
  assertValidObjectId(req.params.id, "combo ID");
  const combo = await Combo.findById(req.params.id);
  if (!combo) return res.status(404).json({ message: "Combo not found" });

  const { title, description, price, coverUrl, order, isActive, resourceIds, slug } = req.body;
  if (title !== undefined) combo.title = String(title).trim();
  if (slug !== undefined) combo.slug = slugify(slug);
  if (description !== undefined) combo.description = String(description);
  if (price !== undefined) combo.price = Math.max(0, Math.round(Number(price) || 0));
  if (coverUrl !== undefined) combo.coverUrl = String(coverUrl);
  if (order !== undefined) combo.order = Number(order) || 0;
  if (isActive !== undefined) combo.isActive = Boolean(isActive);
  if (Array.isArray(resourceIds)) combo.resourceIds = resourceIds.filter(isValidObjectId);

  await combo.save();
  await logAdminAction(req, "combo.update", "combo", combo._id, { title: combo.title });
  res.json({ combo });
});

export const deleteCombo = asyncHandler(async (req, res) => {
  assertValidObjectId(req.params.id, "combo ID");
  const combo = await Combo.findByIdAndDelete(req.params.id);
  if (!combo) return res.status(404).json({ message: "Combo not found" });
  await logAdminAction(req, "combo.delete", "combo", combo._id, { title: combo.title });
  res.json({ message: "Deleted" });
});

// ---------------------------------------------------------------------------
// Public
// ---------------------------------------------------------------------------
export const listCombosPublic = asyncHandler(async (_req, res) => {
  const combos = await Combo.find({ isActive: true }).sort({ order: 1, createdAt: -1 }).lean();
  res.json({
    combos: combos.map((c) => ({
      id: c._id,
      title: c.title,
      slug: c.slug,
      description: c.description,
      price: c.price,
      currency: c.currency,
      coverUrl: c.coverUrl,
      resourceCount: (c.resourceIds || []).length,
    })),
  });
});

export const getComboPublic = asyncHandler(async (req, res) => {
  assertValidObjectId(req.params.id, "combo ID");
  const combo = await Combo.findOne({ _id: req.params.id, isActive: true })
    .populate({ path: "resourceIds", match: { isActive: true } })
    .lean();
  if (!combo) return res.status(404).json({ message: "Combo not found" });

  const resources = (combo.resourceIds || []).filter(Boolean).map(comboResourceShape);
  const originalTotal = resources.reduce((s, r) => s + (r.isPaid ? r.price : 0), 0);

  res.json({
    combo: {
      id: combo._id,
      title: combo.title,
      description: combo.description,
      price: combo.price,
      currency: combo.currency,
      coverUrl: combo.coverUrl,
      resources,
      originalTotal,
      savings: Math.max(0, originalTotal - combo.price),
    },
  });
});
