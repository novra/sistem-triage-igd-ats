import fs from "fs";
import path from "path";
import pino from "pino";
import { isProduction } from "./config/env";

const logsDir = path.join(process.cwd(), "logs");
fs.mkdirSync(logsDir, { recursive: true });
const logFile = path.join(logsDir, `app-${new Date().toISOString().slice(0, 10)}.log`);

// PII pasien (nama, RM, narasi klinis, payload rekam medis) tidak boleh ikut tertulis ke
// file log lokal ini — hanya identitas teknis (level, provider, durasi, dst) yang di-log.
const redactPaths = [
  "req.body",
  "req.headers.authorization",
  "payload",
  "record",
  "narrative",
  "rawResponse",
  "*.namaPasien",
  "*.nomorRM",
  "*.patient_name",
  "*.patient_rm",
];

export const logger = pino({
  level: process.env.LOG_LEVEL || (isProduction ? "info" : "debug"),
  redact: { paths: redactPaths, censor: "[redacted]" },
  timestamp: pino.stdTimeFunctions.isoTime,
  transport: {
    targets: [
      { target: "pino/file", level: "debug", options: { destination: logFile, mkdir: true } },
      ...(isProduction
        ? []
        : [{ target: "pino-pretty", level: "debug", options: { colorize: true, translateTime: "HH:MM:ss", ignore: "pid,hostname" } }]),
    ],
  },
});
