import { GoogleGenAI, Type } from "@google/genai";
import { env } from "../../config/env";
import { classifyByRules } from "./atsRuleEngine";

const ai = new GoogleGenAI({
  apiKey: env.geminiApiKey || "dummy-key-to-prevent-instant-crash",
  httpOptions: {
    headers: { "User-Agent": "aistudio-build" },
  },
});

function buildPrompt(record: any) {
  return `
Anda adalah asisten kecerdasan buatan medis ahli triase IGD di Indonesia.
Analisis data berikut berdasarkan standar Australasian Triage Scale (ATS):

1. IDENTITAS & KEDATANGAN:
   - Pasien Umur: ${record.umur} tahun, Gender: ${record.gender}
   - Cara Datang: ${record.caraDatang}
2. RIWAYAT PENYAKIT: ${record.riwayatPenyakit ? record.riwayatPenyakit.join(", ") : "Tidak ada"} ${record.riwayatPenyakitLainnya ? `(${record.riwayatPenyakitLainnya})` : ""}
3. KELUHAN UTAMA & GEJALA TAMBAHAN:
   - Keluhan: ${record.chiefComplaint} ${record.chiefComplaintCustom ? `(${record.chiefComplaintCustom})` : ""}
   - Gejala Tambahan: ${record.gejalaTambahan ? record.gejalaTambahan.join(", ") : "Tidak ada"}
4. SKALA NYERI:
   - Skala: ${record.painScale?.skala}/10 (Kategori: ${record.painScale?.kategori})
   - Lokasi: ${record.painScale?.lokasi || "Tidak terdefinisi"}
   - Menjalar: ${record.painScale?.menjalar ? "Ya" : "Tidak"}
5. TANDA VITAL:
   - TD: ${record.vitalSign?.tekananDarahSistolik}/${record.vitalSign?.tekananDarahDiastolik} mmHg
   - HR: ${record.vitalSign?.heartRate} x/menit
   - RR: ${record.vitalSign?.respiratoryRate} x/menit
   - Temp: ${record.vitalSign?.suhuTubuh} C
   - SpO2: ${record.vitalSign?.saturasiOksigen} %
   - GCS: E${record.vitalSign?.gcs?.eye ?? 4} V${record.vitalSign?.gcs?.verbal ?? 5} M${record.vitalSign?.gcs?.motor ?? 6}
   - AVPU: ${record.vitalSign?.avpu || "Alert"}

Silakan hitung level kecocokan ATS:
- ATS 1: resusitasi segera
- ATS 2: emergensi 10 menit
- ATS 3: gawat 30 menit
- ATS 4: sedikit gawat 60 menit
- ATS 5: tidak gawat 120 menit

Output WAJIB JSON valid:
{
  "atsLevel": <1 | 2 | 3 | 4 | 5>,
  "confidenceScore": <0-100>,
  "warningConditions": [<string>],
  "emergencyIndicator": <boolean>,
  "alasanKlasifikasi": "<Bahasa Indonesia>",
  "rekomendasiAwal": [<string>]
}
`;
}

function ruleFallback(ruleResult: ReturnType<typeof classifyByRules>) {
  const ruleLevel = ruleResult.overrideLevel || 3;
  const ruleIsEmergency = ruleLevel <= 3;
  return {
    atsLevel: ruleLevel,
    confidenceScore: 100,
    warningConditions: ruleResult.warnings,
    emergencyIndicator: ruleResult.emergency,
    alasanKlasifikasi: "Ditentukan oleh guard rail rule-based berdasarkan tabel ATS dewasa/anak: kesadaran, jalan napas/pernapasan, sirkulasi, nyeri, gejala spesifik, dan batas vital sesuai umur.",
    rekomendasiAwal: ruleIsEmergency
      ? ["Prioritaskan asesmen ABCDE", "Pasang monitor bedside dan evaluasi ulang tanda vital", "Siapkan eskalasi ke dokter jaga/ruang resusitasi sesuai level ATS"]
      : ["Observasi dan evaluasi ulang tanda vital sesuai antrean ATS", "Berikan edukasi awal dan dokumentasikan keluhan utama", "Eskalasi bila muncul red flag baru"],
  };
}

async function classifyWithGemini(promptText: string) {
  const geminiModel = "gemini-3.5-flash";
  const response = await ai.models.generateContent({
    model: geminiModel,
    contents: promptText,
    config: {
      systemInstruction: "Anda adalah pakar triase medis emergensi. Balas hanya JSON valid tanpa markdown.",
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          atsLevel: { type: Type.INTEGER },
          confidenceScore: { type: Type.INTEGER },
          warningConditions: { type: Type.ARRAY, items: { type: Type.STRING } },
          emergencyIndicator: { type: Type.BOOLEAN },
          alasanKlasifikasi: { type: Type.STRING },
          rekomendasiAwal: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ["atsLevel", "confidenceScore", "warningConditions", "emergencyIndicator", "alasanKlasifikasi", "rekomendasiAwal"],
      },
    },
  });
  return { parsed: JSON.parse(response.text?.trim() || "{}"), modelUsed: geminiModel, providerUsed: "Gemini" };
}

async function classifyWithHuggingFace(promptText: string, aiModel?: string) {
  const hfModels: Record<string, string> = {
    "openai-oss": "openai/gpt-oss-20b:fastest",
    deepseek: "deepseek-ai/DeepSeek-V4-Flash:fastest",
  };
  const hfModel = hfModels[aiModel || "openai-oss"] || hfModels["openai-oss"];
  const response = await fetch("https://router.huggingface.co/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.huggingFaceApiKey}`,
    },
    body: JSON.stringify({
      model: hfModel,
      messages: [
        { role: "system", content: "Anda adalah pakar triase medis emergensi. Balas hanya JSON valid tanpa markdown." },
        { role: "user", content: promptText },
      ],
      max_tokens: 1200,
      temperature: 0.1,
      stream: false,
    }),
  });
  if (!response.ok) throw new Error(`Hugging Face API returned status ${response.status}`);
  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content || data?.choices?.[0]?.message?.reasoning || data?.generated_text || "";
  const rawJson = text.match(/\{[\s\S]*\}/)?.[0] || text;
  return { parsed: JSON.parse(rawJson), modelUsed: data?.model || hfModel, providerUsed: "Hugging Face" };
}

function extractTriagePrediction(payload: any) {
  const candidates = [
    payload?.choices?.[0]?.message?.content,
    payload?.choices?.[0]?.text,
    payload?.generated_text,
    payload?.record,
    payload?.prediction,
    payload?.result,
    payload?.output?.record,
    payload?.output?.prediction,
    payload?.output,
    Array.isArray(payload?.output) ? payload.output[0] : undefined,
    payload,
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;

    if (typeof candidate === "string") {
      const rawJson = candidate.match(/\{[\s\S]*\}/)?.[0] || candidate;
      try {
        const parsed = JSON.parse(rawJson);
        if (typeof parsed?.atsLevel === "number") return parsed;
      } catch {
        continue;
      }
    }

    if (typeof candidate?.atsLevel === "number") return candidate;
  }

  return null;
}

async function classifyWithRunPod(promptText: string, record: any, ruleResult: ReturnType<typeof classifyByRules>) {
  const usesOpenAiCompatibleEndpoint = /\/v1\/|\/chat\/completions/i.test(env.customModelUrl);
  const targetUrl = usesOpenAiCompatibleEndpoint && !/\/chat\/completions\/?$/i.test(env.customModelUrl)
    ? `${env.customModelUrl.replace(/\/$/, "")}/chat/completions`
    : env.customModelUrl;
  const requestBody = usesOpenAiCompatibleEndpoint
    ? {
        model: env.runpodVllmModel,
        messages: [
          { role: "system", content: "Anda adalah pakar triase medis emergensi. Balas hanya JSON valid tanpa markdown." },
          { role: "user", content: promptText },
        ],
        max_tokens: 1200,
        temperature: 0.1,
        stream: false,
        response_format: { type: "json_object" },
      }
    : {
        input: {
          record,
          ruleResult,
          promptText,
        },
      };

  const response = await fetch(targetUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(env.runpodApiKey ? { Authorization: `Bearer ${env.runpodApiKey}` } : {}),
    },
    body: JSON.stringify(requestBody),
  });
  if (!response.ok) throw new Error(`RunPod API returned status ${response.status}`);

  const data = await response.json();
  const parsed = extractTriagePrediction(data);
  if (!parsed) throw new Error("RunPod model returned data, but atsLevel was not structured properly.");

  return {
    parsed,
    modelUsed: parsed.modelUsed || data?.modelUsed || data?.model || env.runpodVllmModel,
    providerUsed: "Model Mandiri (RunPod)",
  };
}

export async function classifyTriage(record: any, aiProvider?: string, aiModel?: string) {
  const ruleResult = classifyByRules(record);
  const promptText = buildPrompt(record);
  let aiResult: any = null;
  let providerUsed = "Rule-Based";
  let modelUsed = "Clinical Safety Rules v2";

  try {
    if (aiProvider === "huggingface" && env.huggingFaceApiKey) {
      const result = await classifyWithHuggingFace(promptText, aiModel);
      aiResult = result.parsed;
      providerUsed = result.providerUsed;
      modelUsed = result.modelUsed;
    } else if ((aiProvider === "runpod" || aiProvider === "custom") && env.customModelUrl) {
      const result = await classifyWithRunPod(promptText, record, ruleResult);
      aiResult = result.parsed;
      providerUsed = result.providerUsed;
      modelUsed = result.modelUsed;
    } else if (env.geminiApiKey) {
      const result = await classifyWithGemini(promptText);
      aiResult = result.parsed;
      providerUsed = result.providerUsed;
      modelUsed = result.modelUsed;
    }
  } catch (error) {
    console.error("AI classification failed, using rule fallback:", error);
  }

  if (!aiResult || typeof aiResult.atsLevel !== "number") {
    aiResult = ruleFallback(ruleResult);
  }

  let finalAtsLevel = aiResult.atsLevel;
  let finalWarnings = [...(aiResult.warningConditions || [])];
  let finalEmergency = Boolean(aiResult.emergencyIndicator || ruleResult.emergency);

  if (ruleResult.overrideLevel && ruleResult.overrideLevel < finalAtsLevel) {
    finalAtsLevel = ruleResult.overrideLevel;
    finalWarnings = [...ruleResult.warnings, ...finalWarnings];
    finalEmergency = true;
  }

  return {
    atsLevel: finalAtsLevel,
    confidenceScore: aiResult.confidenceScore || 90,
    warningConditions: Array.from(new Set(finalWarnings)),
    emergencyIndicator: finalEmergency,
    alasanKlasifikasi: aiResult.alasanKlasifikasi || "Ditentukan berdasarkan kriteria fisiologis standar ATS.",
    rekomendasiAwal: aiResult.rekomendasiAwal || ["Siapkan ruang resusitasi", "Pasang jalur infus intravena"],
    providerUsed,
    modelUsed,
  };
}
