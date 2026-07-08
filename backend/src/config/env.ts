import dotenv from "dotenv";

dotenv.config();

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 3000),
  databaseUrl: process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/triage_ats",
  geminiApiKey: process.env.GEMINI_API_KEY || "",
  huggingFaceApiKey: process.env.HUGGINGFACE_API_KEY || process.env.HF_TOKEN || "",
  customModelUrl: process.env.CUSTOM_MODEL_URL || "",
  runpodVllmToken: process.env.RUNPOD_VLLM_TOKEN || "",
};

export const isProduction = env.nodeEnv === "production";
