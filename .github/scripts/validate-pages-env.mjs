import { appendFileSync } from "node:fs";
import { loadEnv } from "vite";

// Empty optional GitHub secrets must not hide the tracked public .env fallback.
for (const name of ["VITE_SUPABASE_URL", "VITE_SUPABASE_PUBLISHABLE_KEY"]) {
  if (!process.env[name]) delete process.env[name];
}
const env = loadEnv("production", process.cwd(), "VITE_");
const url = env.VITE_SUPABASE_URL;
const key = env.VITE_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) throw new Error("Missing public backend configuration for the Pages build.");
if (new URL(url).origin !== "https://xcsbvlpsbonekvmavddh.supabase.co") {
  throw new Error("Pages backend URL does not match this project's backend.");
}
let publicKey = key.startsWith("sb_publishable_");
if (!publicKey && key.split(".").length === 3) {
  try {
    publicKey = JSON.parse(Buffer.from(key.split(".")[1], "base64url").toString()).role === "anon";
  } catch { /* Reject malformed credentials without logging them. */ }
}
if (!publicKey || /[\r\n]/.test(key)) throw new Error("Only a public/anon key is allowed in the frontend build.");
if (process.env.GITHUB_ENV) {
  appendFileSync(process.env.GITHUB_ENV, `VITE_SUPABASE_URL=${url}\nVITE_SUPABASE_PUBLISHABLE_KEY=${key}\n`);
}
console.log("Pages public backend configuration validated; credentials were not logged.");