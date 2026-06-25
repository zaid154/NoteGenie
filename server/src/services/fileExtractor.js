// FLOW: Server source file. The generation orchestrator calls this for "extract"
// category uploads (DOCX/PPTX/TXT). Buffer + category come in, plain text goes back
// and is fed into the normal text generation pipeline.

// DOCX uses `mammoth`, PPTX uses `officeparser`. Both are loaded lazily so a
// missing optional dependency only fails the relevant upload, not server start.

function tooShort(text) {
  return String(text || "").trim().length < 20;
}

async function extractDocx(buffer) {
  let mammoth;
  try {
    mammoth = (await import("mammoth")).default;
  } catch {
    const err = new Error("Word document support is not installed on the server (mammoth).");
    err.statusCode = 400;
    throw err;
  }
  const { value } = await mammoth.extractRawText({ buffer });
  return value;
}

async function extractPptx(buffer) {
  let officeParser;
  try {
    officeParser = (await import("officeparser")).default;
  } catch {
    const err = new Error("PowerPoint support is not installed on the server (officeparser).");
    err.statusCode = 400;
    throw err;
  }
  // parseOfficeAsync accepts a Buffer and resolves to the extracted text.
  return officeParser.parseOfficeAsync(buffer);
}

function extractPlainText(buffer) {
  return buffer.toString("utf8");
}

/**
 * Extract readable text from an "extract"-category upload.
 * @param {Buffer} buffer
 * @param {"docx"|"pptx"|"plaintext"} category
 * @returns {Promise<string>}
 */
export async function extractTextFromFile(buffer, category) {
  let text = "";
  if (category === "docx") text = await extractDocx(buffer);
  else if (category === "pptx") text = await extractPptx(buffer);
  else if (category === "plaintext") text = extractPlainText(buffer);
  else {
    const err = new Error("Unsupported file for text extraction.");
    err.statusCode = 400;
    throw err;
  }

  if (tooShort(text)) {
    const err = new Error("Couldn't read enough text from that file. It may be empty, image-only, or corrupted.");
    err.statusCode = 400;
    throw err;
  }
  return text;
}
