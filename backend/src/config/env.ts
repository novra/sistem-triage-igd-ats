import dotenv from "dotenv";

dotenv.config({ path: [".env.local", ".env"] });

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 3000),
  databaseUrl: process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/triage_ats",
  geminiApiKey: process.env.GEMINI_API_KEY || "",
  huggingFaceApiKey: process.env.HUGGINGFACE_API_KEY || process.env.HF_TOKEN || "",
  customModelUrl: process.env.CUSTOM_MODEL_URL || process.env.RUNPOD_ENDPOINT_URL || "",
  runpodApiKey: process.env.RUNPOD_API_KEY || process.env.RUNPOD_VLLM_TOKEN || "",
  runpodVllmModel: process.env.RUNPOD_VLLM_MODEL || process.env.CUSTOM_MODEL_NAME || "triage-qwen3-lora",
  jwtSecret: process.env.JWT_SECRET || "",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "10h",
  resendApiKey: process.env.RESEND_API_KEY || "",
  emailFrom: process.env.EMAIL_FROM || "onboarding@resend.dev",
  appUrl: process.env.APP_URL || "http://localhost:3000",
  adminEmail: process.env.ADMIN_EMAIL || "",
  adminName: process.env.ADMIN_NAME || "Administrator",
  adminPassword: process.env.ADMIN_PASSWORD || "",
};

export const isProduction = env.nodeEnv === "production";

const DEV_FALLBACK_JWT_SECRET = "dev-only-insecure-secret-change-me";
if (!env.jwtSecret) {
  if (isProduction) {
    throw new Error("JWT_SECRET wajib diisi saat NODE_ENV=production. Set env var ini sebelum menjalankan server.");
  }
  console.warn("[env] JWT_SECRET tidak diset, memakai secret dev bawaan yang TIDAK aman. Jangan pakai di production.");
  env.jwtSecret = DEV_FALLBACK_JWT_SECRET;
}
