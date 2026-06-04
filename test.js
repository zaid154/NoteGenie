import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

console.log("API KEY FOUND:", !!process.env.GEMINI_API_KEY);

const genAI = new GoogleGenerativeAI(
  process.env.GEMINI_API_KEY
);

async function run() {
  try {
    console.log("Calling Gemini...");

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
    });

    const result = await model.generateContent(
      "i am zaid i am check is this api is working or not"
    );

    console.log(result.response.text());
  } catch (err) {
    console.error("ERROR:");
    console.error(err);
  }
}

run();