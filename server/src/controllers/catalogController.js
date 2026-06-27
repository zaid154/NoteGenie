// FLOW: Catalog API logic. Admin catalog routes (manage_catalog) and public browse routes
// send requests here; this reads/writes University/Program/Course, guards against orphan
// deletes, logs admin actions, and returns JSON to admin pages and student browse pages.

import { University } from "../models/University.js";
import { Program } from "../models/Program.js";
import { Course } from "../models/Course.js";
import { Resource } from "../models/Resource.js";
import { getAppSettings, resolveFeatures, resolveTheme } from "../models/Settings.js";
import { env } from "../config/env.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import { assertValidObjectId } from "../utils/objectId.js";
import { logAdminAction } from "../services/adminAudit.js";

function slugify(str) {
  return String(str || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

// ---------------------------------------------------------------------------
// Universities (admin)
// ---------------------------------------------------------------------------
export const listUniversities = asyncHandler(async (_req, res) => {
  const universities = await University.find().sort({ order: 1, name: 1 }).lean();
  res.json({ universities });
});

export const createUniversity = asyncHandler(async (req, res) => {
  const name = String(req.body.name || "").trim();
  if (!name) return res.status(400).json({ message: "Name is required" });
  const slug = slugify(req.body.slug || name);
  if (await University.exists({ slug })) {
    return res.status(409).json({ message: "A university with this slug already exists" });
  }
  const university = await University.create({
    name,
    slug,
    shortName: String(req.body.shortName || "").trim(),
    description: String(req.body.description || ""),
    logoUrl: String(req.body.logoUrl || ""),
    order: Number(req.body.order) || 0,
    isActive: req.body.isActive !== false,
  });
  await logAdminAction(req, "catalog.university.create", "university", university._id, { name });
  res.status(201).json({ university });
});

export const updateUniversity = asyncHandler(async (req, res) => {
  assertValidObjectId(req.params.id, "university ID");
  const university = await University.findById(req.params.id);
  if (!university) return res.status(404).json({ message: "University not found" });

  const { name, shortName, description, logoUrl, order, isActive, slug } = req.body;
  if (name !== undefined) university.name = String(name).trim();
  if (slug !== undefined) university.slug = slugify(slug);
  if (shortName !== undefined) university.shortName = String(shortName).trim();
  if (description !== undefined) university.description = String(description);
  if (logoUrl !== undefined) university.logoUrl = String(logoUrl);
  if (order !== undefined) university.order = Number(order) || 0;
  if (isActive !== undefined) university.isActive = Boolean(isActive);

  await university.save();
  await logAdminAction(req, "catalog.university.update", "university", university._id, { name: university.name });
  res.json({ university });
});

export const deleteUniversity = asyncHandler(async (req, res) => {
  assertValidObjectId(req.params.id, "university ID");
  if (await Program.exists({ universityId: req.params.id })) {
    return res.status(400).json({ message: "Remove this university's programs first." });
  }
  const university = await University.findByIdAndDelete(req.params.id);
  if (!university) return res.status(404).json({ message: "University not found" });
  await logAdminAction(req, "catalog.university.delete", "university", university._id, { name: university.name });
  res.json({ message: "Deleted" });
});

// ---------------------------------------------------------------------------
// Programs (admin)
// ---------------------------------------------------------------------------
export const listPrograms = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.universityId) {
    assertValidObjectId(req.query.universityId, "university ID");
    filter.universityId = req.query.universityId;
  }
  const programs = await Program.find(filter).sort({ order: 1, name: 1 }).lean();
  res.json({ programs });
});

export const createProgram = asyncHandler(async (req, res) => {
  const { universityId } = req.body;
  assertValidObjectId(universityId, "university ID");
  if (!(await University.exists({ _id: universityId }))) {
    return res.status(404).json({ message: "University not found" });
  }
  const name = String(req.body.name || "").trim();
  if (!name) return res.status(400).json({ message: "Name is required" });
  const slug = slugify(req.body.slug || name);
  if (await Program.exists({ universityId, slug })) {
    return res.status(409).json({ message: "A program with this slug already exists in this university" });
  }
  const program = await Program.create({
    universityId,
    name,
    slug,
    level: req.body.level || "",
    description: String(req.body.description || ""),
    order: Number(req.body.order) || 0,
    isActive: req.body.isActive !== false,
  });
  await logAdminAction(req, "catalog.program.create", "program", program._id, { name });
  res.status(201).json({ program });
});

export const updateProgram = asyncHandler(async (req, res) => {
  assertValidObjectId(req.params.id, "program ID");
  const program = await Program.findById(req.params.id);
  if (!program) return res.status(404).json({ message: "Program not found" });

  const { name, slug, level, description, order, isActive } = req.body;
  if (name !== undefined) program.name = String(name).trim();
  if (slug !== undefined) program.slug = slugify(slug);
  if (level !== undefined) program.level = level || "";
  if (description !== undefined) program.description = String(description);
  if (order !== undefined) program.order = Number(order) || 0;
  if (isActive !== undefined) program.isActive = Boolean(isActive);

  await program.save();
  await logAdminAction(req, "catalog.program.update", "program", program._id, { name: program.name });
  res.json({ program });
});

export const deleteProgram = asyncHandler(async (req, res) => {
  assertValidObjectId(req.params.id, "program ID");
  if (await Course.exists({ programId: req.params.id })) {
    return res.status(400).json({ message: "Remove this program's courses first." });
  }
  const program = await Program.findByIdAndDelete(req.params.id);
  if (!program) return res.status(404).json({ message: "Program not found" });
  await logAdminAction(req, "catalog.program.delete", "program", program._id, { name: program.name });
  res.json({ message: "Deleted" });
});

// ---------------------------------------------------------------------------
// Courses (admin)
// ---------------------------------------------------------------------------
export const listCourses = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.programId) {
    assertValidObjectId(req.query.programId, "program ID");
    filter.programId = req.query.programId;
  }
  if (req.query.universityId) {
    assertValidObjectId(req.query.universityId, "university ID");
    filter.universityId = req.query.universityId;
  }
  const courses = await Course.find(filter).sort({ order: 1, code: 1 }).lean();
  res.json({ courses });
});

export const createCourse = asyncHandler(async (req, res) => {
  const { programId } = req.body;
  assertValidObjectId(programId, "program ID");
  const program = await Program.findById(programId).select("universityId").lean();
  if (!program) return res.status(404).json({ message: "Program not found" });

  const code = String(req.body.code || "").trim().toUpperCase();
  const name = String(req.body.name || "").trim();
  if (!code || !name) return res.status(400).json({ message: "Code and name are required" });
  if (await Course.exists({ programId, code })) {
    return res.status(409).json({ message: "A course with this code already exists in this program" });
  }
  const course = await Course.create({
    programId,
    universityId: program.universityId,
    code,
    name,
    credits: req.body.credits != null ? Number(req.body.credits) : null,
    description: String(req.body.description || ""),
    order: Number(req.body.order) || 0,
    isActive: req.body.isActive !== false,
  });
  await logAdminAction(req, "catalog.course.create", "course", course._id, { code, name });
  res.status(201).json({ course });
});

export const updateCourse = asyncHandler(async (req, res) => {
  assertValidObjectId(req.params.id, "course ID");
  const course = await Course.findById(req.params.id);
  if (!course) return res.status(404).json({ message: "Course not found" });

  const { code, name, credits, description, order, isActive } = req.body;
  if (code !== undefined) course.code = String(code).trim().toUpperCase();
  if (name !== undefined) course.name = String(name).trim();
  if (credits !== undefined) course.credits = credits != null && credits !== "" ? Number(credits) : null;
  if (description !== undefined) course.description = String(description);
  if (order !== undefined) course.order = Number(order) || 0;
  if (isActive !== undefined) course.isActive = Boolean(isActive);

  await course.save();
  await logAdminAction(req, "catalog.course.update", "course", course._id, { code: course.code });
  res.json({ course });
});

export const deleteCourse = asyncHandler(async (req, res) => {
  assertValidObjectId(req.params.id, "course ID");
  if (await Resource.exists({ courseId: req.params.id })) {
    return res.status(400).json({ message: "Remove this course's resources first." });
  }
  const course = await Course.findByIdAndDelete(req.params.id);
  if (!course) return res.status(404).json({ message: "Course not found" });
  await logAdminAction(req, "catalog.course.delete", "course", course._id, { code: course.code });
  res.json({ message: "Deleted" });
});

// ---------------------------------------------------------------------------
// Public browse (no auth) — only active rows
// ---------------------------------------------------------------------------
export const browseUniversities = asyncHandler(async (_req, res) => {
  const universities = await University.find({ isActive: true })
    .select("name slug shortName description logoUrl")
    .sort({ order: 1, name: 1 })
    .lean();
  res.json({ universities });
});

export const browsePrograms = asyncHandler(async (req, res) => {
  assertValidObjectId(req.params.id, "university ID");
  const programs = await Program.find({ universityId: req.params.id, isActive: true })
    .select("name slug level description")
    .sort({ order: 1, name: 1 })
    .lean();
  res.json({ programs });
});

export const browseCourses = asyncHandler(async (req, res) => {
  assertValidObjectId(req.params.id, "program ID");
  const courses = await Course.find({ programId: req.params.id, isActive: true })
    .select("code name credits description")
    .sort({ order: 1, code: 1 })
    .lean();
  res.json({ courses });
});

// Public storefront content (safe subset of admin settings). No auth.
export const getStorefront = asyncHandler(async (_req, res) => {
  const settings = await getAppSettings();
  const s = settings.storefront || {};
  // DB value wins; env provides the fallback default. Empty everywhere → "" (UI hides the link).
  res.json({
    features: resolveFeatures(settings),
    theme: resolveTheme(settings),
    aiEnabled: settings.aiEnabled !== false,
    storefront: {
      utilityBarText: s.utilityBarText || "",
      whatsappNumber: s.whatsappNumber || env.whatsappNumber || "",
      supportEmail: s.supportEmail || env.supportEmail || "",
      heroTitle: s.heroTitle || "",
      heroSubtitle: s.heroSubtitle || "",
      heroBannerUrl: s.heroBannerUrl || "",
      socials: {
        instagram: s.instagram || env.social.instagram || "",
        facebook: s.facebook || env.social.facebook || "",
        youtube: s.youtube || env.social.youtube || "",
        telegram: s.telegram || env.social.telegram || "",
      },
    },
  });
});

// Flat list of all active programs across universities — for the storefront
// "Select degree" dropdown and the shop-by-degree grid.
export const browseProgramsFlat = asyncHandler(async (_req, res) => {
  const programs = await Program.find({ isActive: true })
    .select("name slug level universityId")
    .populate("universityId", "name shortName")
    .sort({ order: 1, name: 1 })
    .lean();
  res.json({
    programs: programs
      .filter((p) => p.universityId)
      .map((p) => ({
        id: p._id,
        name: p.name,
        level: p.level,
        universityId: p.universityId._id,
        universityName: p.universityId.name,
        universityShort: p.universityId.shortName,
      })),
  });
});
