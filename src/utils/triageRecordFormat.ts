import { TriageRecord } from "../types";

export function formatDate(isoStr?: string) {
  if (!isoStr) return "-";
  const date = new Date(isoStr);
  return (
    date.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }) +
    " " +
    date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
  );
}

export function joinList(values?: string[]) {
  if (!values || values.length === 0) return "-";
  return values.join(", ");
}

export function getTrueFindings(group?: Record<string, boolean>) {
  if (!group) return "-";
  const findings = Object.entries(group)
    .filter(([, value]) => value)
    .map(([key]) =>
      key
        .replace(/([A-Z])/g, " $1")
        .replace(/^./, (char) => char.toUpperCase())
    );
  return findings.length > 0 ? findings.join(", ") : "Tidak ada temuan positif";
}

export function getModelUsed(record: TriageRecord) {
  if (record.atsPrediction?.modelUsed) return record.atsPrediction.modelUsed;
  switch (record.atsPrediction?.providerUsed) {
    case "Gemini":
      return "gemini-3.5-flash";
    case "Hugging Face":
      return "mistralai/Mistral-7B-Instruct-v0.3";
    case "Model Mandiri (RunPod)":
      return "triage-qwen3-lora";
    case "Model Mandiri (Custom Endpoint)":
      return "Custom Endpoint";
    case "Rule-Based":
      return "Clinical Safety Rules v1";
    default:
      return "-";
  }
}
