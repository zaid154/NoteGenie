// FLOW: Server source file. Request/model/config values come in here, logic processes them, and the result goes back to controllers, services, database, or API response.

// FLOW: Document/link routes use this before AI generation. URL comes from user request, safety checks block private/local targets, YouTube transcript or webpage text is extracted, then text goes to generationOrchestrator.

// Yeh file ek URL se text nikaalti hai — YouTube transcript ya web page ka content.
import dns from "dns/promises";
import net from "net";
import { YoutubeTranscript } from "youtube-transcript";

// YouTube link hai ya nahi, yeh check karta hai.
function isYouTube(url) {
  return /(?:youtube\.com|youtu\.be)/i.test(url);
}

// Private / internal IP ranges — SSRF rokne ke liye inhe block karte hain.
function isPrivateIp(ip) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number);
    if (a === 10) return true; // 10.0.0.0/8
    if (a === 127) return true; // loopback
    if (a === 169 && b === 254) return true; // link-local (cloud metadata)
    if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
    if (a === 192 && b === 168) return true; // 192.168.0.0/16
    if (a === 0) return true;
    return false;
  }
  // IPv6: loopback, link-local, unique-local, IPv4-mapped.
  const lower = ip.toLowerCase();
  if (lower === "::1" || lower === "::") return true;
  if (lower.startsWith("fe80") || lower.startsWith("fc") || lower.startsWith("fd")) return true;
  if (lower.startsWith("::ffff:")) return isPrivateIp(lower.replace("::ffff:", ""));
  return false;
}

// URL ko parse + validate karta hai aur ensure karta hai ki host public IP par resolve ho.
async function assertSafeUrl(rawUrl) {
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error("That doesn't look like a valid URL.");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Only http and https links are supported.");
  }

  // Hostname ke saare resolved IPs check karte hain.
  let addresses;
  try {
    addresses = await dns.lookup(parsed.hostname, { all: true });
  } catch {
    throw new Error("Could not resolve that link's address.");
  }

  if (addresses.some((a) => isPrivateIp(a.address))) {
    throw new Error("That link points to a private or internal address, which isn't allowed.");
  }

  return parsed;
}

// YouTube video ka transcript text laata hai.
async function extractYouTube(url) {
  try {
    const items = await YoutubeTranscript.fetchTranscript(url);
    const text = items.map((i) => i.text).join(" ");
    if (!text.trim()) {
      const err = new Error("This video has no transcript/captions available.");
      err.statusCode = 400;
      throw err;
    }
    return text;
  } catch (err) {
    if (err.statusCode) throw err;
    const msg = String(err?.message || err);
    if (/video id|retrieve youtube|impossible to retrieve/i.test(msg)) {
      const e = new Error("Invalid YouTube link. Paste a real public video URL (e.g. youtube.com/watch?v=...).");
      e.statusCode = 400;
      throw e;
    }
    if (/disabled|transcript.*unavailable|could not retrieve/i.test(msg)) {
      const e = new Error("This video has no captions/transcript. Try another video or paste an article link.");
      e.statusCode = 400;
      throw e;
    }
    const e = new Error("Could not fetch YouTube transcript. Check the link and try again.");
    e.statusCode = 400;
    throw e;
  }
}

// Aam web page se readable text nikaalta hai (HTML tags hata kar).
async function extractWebPage(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (NoteGenie bot)" },
    redirect: "follow",
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`Page fetch nahi hua (status ${res.status})`);

  const html = await res.text();
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (text.length < 50) throw new Error("Is page se kaafi text nahi mila");
  // Bahut bada na ho isliye limit kar dete hain.
  return text.slice(0, 20000);
}

// Kisi bhi URL se text laane ka single entry point.
export async function extractTextFromUrl(url) {
  if (isYouTube(url)) {
    return { text: await extractYouTube(url), kind: "youtube" };
  }
  // Sirf non-YouTube links ke liye SSRF check (YouTube ka apna domain hai).
  await assertSafeUrl(url);
  return { text: await extractWebPage(url), kind: "web" };
}

