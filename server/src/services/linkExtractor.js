import { YoutubeTranscript } from "youtube-transcript";

// YouTube link hai ya nahi, yeh check karta hai.
function isYouTube(url) {
  return /(?:youtube\.com|youtu\.be)/i.test(url);
}

// YouTube video ka transcript text laata hai.
async function extractYouTube(url) {
  const items = await YoutubeTranscript.fetchTranscript(url);
  const text = items.map((i) => i.text).join(" ");
  if (!text.trim()) throw new Error("Is video ka transcript nahi mila");
  return text;
}

// Aam web page se readable text nikaalta hai (HTML tags hata kar).
async function extractWebPage(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (NoteGenie bot)" },
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
  return { text: await extractWebPage(url), kind: "web" };
}
