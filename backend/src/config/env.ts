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
};

export const isProduction = env.nodeEnv === "production";
