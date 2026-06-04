import mongoose from "mongoose";

// Singleton app settings (admin UI se Gemini key/model update hota hai).
const settingsSchema = new mongoose.Schema(
  {
    key: { type: String, default: "app", unique: true },
    geminiApiKey: { type: String, default: "" },
    geminiModel: { type: String, default: "gemini-2.5-flash" },
  },
  { timestamps: true }
);

export const Settings = mongoose.model("Settings", settingsSchema);

// Hamesha ek hi settings document use karte hain.
export async function getAppSettings() {
  let doc = await Settings.findOne({ key: "app" });
  if (!doc) {
    doc = await Settings.create({ key: "app" });
  }
  return doc;
}
