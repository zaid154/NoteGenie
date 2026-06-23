// FLOW: Server source file. Request/model/config values come in here, logic processes them, and the result goes back to controllers, services, database, or API response.

// FLOW: Document controllers call this for PDF/link generation and SSE progress. Input comes from upload/link request, this delegates to generationOrchestrator, then returns the created Document or pipeline result.

// SSE helpers and upload entry points (delegates to generationOrchestrator).
import { runPdfPipeline, runLinkPipeline } from "./generationOrchestrator.js";
export { parseTags } from "../utils/documentTags.js";

export function writeSse(res, event, data) {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  if (typeof res.flush === "function") res.flush();
}

export function initSse(res) {
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders?.();
}

export async function buildNotesFromPdf({ buffer, originalname, userId, body, onProgress }) {
  const { doc } = await runPdfPipeline({ buffer, originalname, userId, body, onProgress });
  return doc;
}

export async function buildNotesFromLink({ url, userId, body, onProgress }) {
  const { doc } = await runLinkPipeline({ url, userId, body, onProgress });
  return doc;
}

export async function buildMaterialFromPdf(opts) {
  return runPdfPipeline(opts);
}

export async function buildMaterialFromLink(opts) {
  return runLinkPipeline(opts);
}

