import dns from "node:dns";
import mongoose from "mongoose";
import "dotenv/config";

dns.setServers(["8.8.8.8"]);

const uri = process.env.MONGO_URI;

console.log("URI:", uri);

try {
  await mongoose.connect(uri);
  console.log("✅ Connected");
  process.exit(0);
} catch (err) {
  console.error(err);
  process.exit(1);
}