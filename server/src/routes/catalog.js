// FLOW: Public catalog route map. /api/catalog requests enter here. Browse/search/detail are
// PUBLIC (no auth) so students can explore before signing up (lead-gen). The marketplace
// buy/download/my-purchases routes (added by marketplaceController) require auth.

import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  browseUniversities,
  browsePrograms,
  browseCourses,
  browseProgramsFlat,
  getStorefront,
} from "../controllers/catalogController.js";
import {
  searchResources,
  getResourcePublic,
} from "../controllers/resourceController.js";
import {
  listCombosPublic,
  getComboPublic,
} from "../controllers/comboController.js";
import {
  createResourceOrder,
  verifyResourcePayment,
  createCartOrder,
  verifyCartPayment,
  downloadResource,
  downloadByToken,
  listMyPurchases,
} from "../controllers/marketplaceController.js";

const router = Router();

// --- Public browse (no auth) ---
router.get("/storefront", getStorefront);
router.get("/universities", browseUniversities);
router.get("/universities/:id/programs", browsePrograms);
router.get("/programs/flat", browseProgramsFlat);
router.get("/programs/:id/courses", browseCourses);
router.get("/resources", searchResources);
router.get("/combos", listCombosPublic);
router.get("/combos/:id", getComboPublic);

// --- Marketplace (auth required) — registered before "/resources/:id" so the
// literal paths aren't captured by the :id param route. ---
router.post("/resources/order", requireAuth, createResourceOrder);
router.post("/resources/verify", requireAuth, verifyResourcePayment);
router.post("/cart/order", requireAuth, createCartOrder);
router.post("/cart/verify", requireAuth, verifyCartPayment);
router.get("/me/purchases", requireAuth, listMyPurchases);
router.get("/resources/:id/download", requireAuth, downloadResource);
router.get("/download/:token", requireAuth, downloadByToken);

router.get("/resources/:id", getResourcePublic);

export default router;
