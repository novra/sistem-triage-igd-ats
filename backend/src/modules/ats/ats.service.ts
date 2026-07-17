import { GoogleGenAI, Type } from "@google/genai";
import { env } from "../../config/env";
import { logger } from "../../logger";
import { recordEvent } from "../monitoring/events.repository";
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
6. STATUS JALAN NAPAS/PERNAPASAN:
   - Pola napas: ${record.vitalSign?.polaNapas || "Tidak terisi"}
   - Otot bantu napas: ${record.vitalSign?.ototBantuNapas ? "Ya" : "Tidak"}
   - Retraksi: ${record.vitalSign?.retraksi ? "Ya" : "Tidak"}
   - Stridor: ${record.vitalSign?.stridor ? "Ya" : "Tidak"}
   - Wheezing: ${record.vitalSign?.wheezing ? "Ya" : "Tidak"}
   - Apnea: ${record.vitalSign?.apnea ? "Ya" : "Tidak"}
7. PEMERIKSAAN FISIK RELEVAN:
   - Kepala: ${JSON.stringify(record.pemeriksaanFisik?.kepala || {})}
   - Leher: ${JSON.stringify(record.pemeriksaanFisik?.leher || {})}
   - Dada: ${JSON.stringify(record.pemeriksaanFisik?.dada || {})}
   - Perut: ${JSON.stringify(record.pemeriksaanFisik?.perut || {})}
   - Ekstremitas atas: ${JSON.stringify(record.pemeriksaanFisik?.ekstremitasAtas || {})}
   - Ekstremitas bawah: ${JSON.stringify(record.pemeriksaanFisik?.ekstremitasBawah || {})}

Silakan hitung level kecocokan ATS:
- ATS Kategori 1 (Red): resusitasi segera
- ATS Kategori 2 (Orange): emergensi 10 menit
- ATS Kategori 3 (Green): gawat 30 menit
- ATS Kategori 4 (Blue): sedikit gawat 60 menit
- ATS Kategori 5 (White): tidak gawat 120 menit

Output WAJIB JSON valid:
{
  "atsLevel": <1 | 2 | 3 | 4 | 5>,
  "atsCategory": "ATS Kategori <1-5> (<Red|Orange|Green|Blue|White>)",
  "confidenceScore": <0-100>,
  "warningConditions": [<string>],
  "emergencyIndicator": <boolean>,
  "alasanKlasifikasi": "<alasan klinis singkat yang mendukung kategori ATS dalam Bahasa Indonesia>",
  "rekomendasiAwal": [<string>]
}
Jangan sertakan field lain selain di atas. Jangan tulis penjelasan/reasoning di luar objek JSON.`;
}

const atsCategoryLabels: Record<number, string> = {
  1: "ATS Kategori 1 (Red)",
  2: "ATS Kategori 2 (Orange)",
  3: "ATS Kategori 3 (Green)",
  4: "ATS Kategori 4 (Blue)",
  5: "ATS Kategori 5 (White)",
};

function toAtsLevel(value: unknown): 1 | 2 | 3 | 4 | 5 | null {
  const numericValue = typeof value === "number" ? value : Number(String(value || "").match(/[1-5]/)?.[0]);
  return numericValue >= 1 && numericValue <= 5 ? (numericValue as 1 | 2 | 3 | 4 | 5) : null;
}

function readAtsLevel(value: any): 1 | 2 | 3 | 4 | 5 | null {
  return toAtsLevel(
    value?.atsLevel ??
      value?.ats_level ??
      value?.ats ??
      value?.level ??
      value?.category ??
      value?.kategori ??
      value?.atsCategory ??
      value?.ats_category ??
      value?.kategoriATS ??
      value?.kategoriAts ??
      value?.kategori_ats,
  );
}

function parseJsonPayloads(text: string) {
  const candidates = [text.trim()];
  const fencedBlocks = Array.from(text.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi)).map((match) => match[1]?.trim()).filter(Boolean);
  candidates.push(...fencedBlocks);

  for (const opening of ["{", "["]) {
    const closing = opening === "{" ? "}" : "]";
    let start = -1;
    let depth = 0;
    for (let i = 0; i < text.length; i += 1) {
      const char = text[i];
      if (char === opening) {
        if (depth === 0) start = i;
        depth += 1;
      } else if (char === closing && depth > 0) {
        depth -= 1;
        if (depth === 0 && start >= 0) candidates.push(text.slice(start, i + 1));
      }
    }
  }

  return candidates.flatMap((candidate) => {
    try {
      return [JSON.parse(candidate)];
    } catch {
      return [];
    }
  });
}

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  if (typeof value === "string" && value.trim()) return [value.trim()];
  return [];
}

function listPositiveFindings(groupName: string, values: Record<string, unknown> | undefined) {
  if (!values) return [];
  return Object.entries(values)
    .filter(([, value]) => value === true)
    .map(([key]) => `${groupName}: ${key}`);
}

function buildClinicalInfo(record: any, ruleWarnings: string[] = []) {
  const vitalSign = record.vitalSign || {};
  const painScale = record.painScale || {};
  const gcsTotal = (Number(vitalSign.gcs?.eye) || 4) + (Number(vitalSign.gcs?.verbal) || 5) + (Number(vitalSign.gcs?.motor) || 6);
  const exam = record.pemeriksaanFisik || {};
  const info = [
    `Keluhan utama: ${record.chiefComplaint || "tidak terisi"}${record.chiefComplaintCustom ? ` (${record.chiefComplaintCustom})` : ""}`,
    `Gejala tambahan: ${(record.gejalaTambahan || []).join(", ") || "tidak ada/ tidak terisi"}`,
    `Tanda vital: TD ${vitalSign.tekananDarahSistolik ?? "-"} / ${vitalSign.tekananDarahDiastolik ?? "-"} mmHg, HR ${vitalSign.heartRate ?? "-"} x/menit, RR ${vitalSign.respiratoryRate ?? "-"} x/menit, suhu ${vitalSign.suhuTubuh ?? "-"} C, SpO2 ${vitalSign.saturasiOksigen ?? "-"}%`,
    `Kesadaran: AVPU ${vitalSign.avpu || "Alert"}, GCS E${vitalSign.gcs?.eye ?? 4}V${vitalSign.gcs?.verbal ?? 5}M${vitalSign.gcs?.motor ?? 6} total ${gcsTotal}`,
    `Jalan napas/pernapasan: pola ${vitalSign.polaNapas || "tidak terisi"}, otot bantu ${vitalSign.ototBantuNapas ? "ya" : "tidak"}, retraksi ${vitalSign.retraksi ? "ya" : "tidak"}, stridor ${vitalSign.stridor ? "ya" : "tidak"}, wheezing ${vitalSign.wheezing ? "ya" : "tidak"}, apnea ${vitalSign.apnea ? "ya" : "tidak"}`,
    `Nyeri: skala ${painScale.skala ?? 0}/10 (${painScale.kategori || "tidak nyeri"}), lokasi ${painScale.lokasi || "tidak terisi"}, menjalar ${painScale.menjalar ? "ya" : "tidak"}`,
    `Faktor risiko/komorbid: ${(record.riwayatPenyakit || []).join(", ") || "tidak ada/ tidak terisi"}${record.riwayatPenyakitLainnya ? ` (${record.riwayatPenyakitLainnya})` : ""}`,
    ...listPositiveFindings("Pemeriksaan kepala", exam.kepala),
    ...listPositiveFindings("Pemeriksaan leher", exam.leher),
    ...listPositiveFindings("Pemeriksaan dada", exam.dada),
    ...listPositiveFindings("Pemeriksaan perut", exam.perut),
    ...listPositiveFindings("Pemeriksaan ekstremitas atas", exam.ekstremitasAtas),
    ...listPositiveFindings("Pemeriksaan ekstremitas bawah", exam.ekstremitasBawah),
    ...ruleWarnings,
  ];
  return Array.from(new Set(info.filter(Boolean)));
}

function buildMissingInfo(record: any) {
  const missing: string[] = [];
  const vitalSign = record.vitalSign || {};
  if (!record.chiefComplaint && !record.chiefComplaintCustom) missing.push("Keluhan utama dan onset keluhan.");
  if (!vitalSign.tekananDarahSistolik || !vitalSign.tekananDarahDiastolik) missing.push("Tekanan darah lengkap.");
  if (!vitalSign.heartRate) missing.push("Frekuensi nadi/heart rate.");
  if (!vitalSign.respiratoryRate) missing.push("Frekuensi napas/respiratory rate.");
  if (!vitalSign.saturasiOksigen) missing.push("Saturasi oksigen/SpO2.");
  if (!vitalSign.gcs) missing.push("Skor GCS lengkap.");
  if (!vitalSign.avpu) missing.push("Status kesadaran AVPU.");
  if (!record.pemeriksaanFisik) missing.push("Pemeriksaan fisik terarah sesuai keluhan.");
  if (!record.riwayatPenyakit?.length && !record.riwayatPenyakitLainnya) missing.push("Riwayat penyakit penyerta, alergi, obat rutin, dan faktor risiko.");
  return missing;
}

function ruleFallback(ruleResult: ReturnType<typeof classifyByRules>) {
  const ruleLevel = ruleResult.overrideLevel || 3;
  const ruleIsEmergency = ruleLevel <= 3;
  return {
    atsLevel: ruleLevel,
    atsCategory: atsCategoryLabels[ruleLevel],
    confidenceScore: 100,
    warningConditions: ruleResult.warnings,
    emergencyIndicator: ruleResult.emergency,
    alasanKlasifikasi: "Ditentukan oleh guard rail rule-based berdasarkan tabel ATS dewasa/anak: kesadaran, jalan napas/pernapasan, sirkulasi, nyeri, gejala spesifik, dan batas vital sesuai umur.",
    informasiKlinisDigunakan: [],
    informasiTambahanDiperlukan: [],
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
          atsCategory: { type: Type.STRING },
          confidenceScore: { type: Type.INTEGER },
          warningConditions: { type: Type.ARRAY, items: { type: Type.STRING } },
          emergencyIndicator: { type: Type.BOOLEAN },
          alasanKlasifikasi: { type: Type.STRING },
          rekomendasiAwal: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ["atsLevel", "atsCategory", "confidenceScore", "warningConditions", "emergencyIndicator", "alasanKlasifikasi", "rekomendasiAwal"],
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

function extractTriagePrediction(payload: any, depth = 0): any {
  if (!payload || depth > 6) return null;

  if (typeof payload === "string") {
    for (const parsedPayload of parseJsonPayloads(payload)) {
      const parsed = extractTriagePrediction(parsedPayload, depth + 1);
      if (parsed) return parsed;
    }
    return null;
  }

  if (Array.isArray(payload)) {
    for (const item of payload) {
      const parsed = extractTriagePrediction(item, depth + 1);
      if (parsed) return parsed;
    }
    return null;
  }

  if (readAtsLevel(payload)) return payload;

  const candidates = [
    payload?.parsed,
    payload?.choices?.[0]?.message?.content,
    payload?.choices?.[0]?.message?.reasoning,
    payload?.choices?.[0]?.text,
    payload?.generated_text,
    payload?.text,
    payload?.record,
    payload?.prediction,
    payload?.result,
    payload?.output?.record,
    payload?.output?.prediction,
    payload?.output,
  ];

  for (const candidate of candidates) {
    const parsed = extractTriagePrediction(candidate, depth + 1);
    if (parsed) return parsed;
  }

  return null;
}

async function classifyWithRunPod(promptText: string, record: any, ruleResult: ReturnType<typeof classifyByRules>) {
  const usesOpenAiCompatibleEndpoint = /\/v1\/|\/chat\/completions/i.test(env.customModelUrl);
  const targetUrl = usesOpenAiCompatibleEndpoint && !/\/chat\/completions\/?$/i.test(env.customModelUrl)
    ? `${env.customModelUrl.replace(/\/$/, "")}/chat/completions`
    : env.customModelUrl;
  // Qwen3 defaults to "thinking" mode, which can burn the whole max_tokens budget on
  // reasoning tokens before ever emitting the JSON answer. enable_thinking:false keeps
  // the full budget for the actual JSON output.
  const requestBody = usesOpenAiCompatibleEndpoint
    ? {
        model: env.runpodVllmModel,
        messages: [
          { role: "system", content: "Anda adalah pakar triase medis emergensi. Balas hanya JSON valid tanpa markdown." },
          { role: "user", content: promptText },
        ],
        max_tokens: 3000,
        temperature: 0.1,
        stream: false,
        response_format: { type: "json_object" },
        chat_template_kwargs: { enable_thinking: false },
      }
    : {
        input: {
          record,
          ruleResult,
          prompt: promptText,
          promptText,
          max_tokens: 3000,
          chat_template_kwargs: { enable_thinking: false },
          messages: [
            { role: "system", content: "Anda adalah pakar triase medis emergensi. Balas hanya JSON valid tanpa markdown." },
            { role: "user", content: promptText },
          ],
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
  if (data?.status === "FAILED" || data?.error) {
    throw new Error(`RunPod model failed: ${data?.error || data?.status}`);
  }
  const parsed = extractTriagePrediction(data);
  if (!parsed) {
    logger.error(
      { finishReason: data?.choices?.[0]?.finish_reason, rawResponse: JSON.stringify(data).slice(0, 3000) },
      "RunPod ATS parse failure",
    );
    throw new Error("RunPod model returned data, but atsLevel was not structured properly.");
  }

  return {
    parsed,
    modelUsed: parsed.modelUsed || data?.modelUsed || data?.model || env.runpodVllmModel,
    providerUsed: "Model Mandiri (RunPod)",
  };
}

export async function classifyTriage(
  record: any,
  aiProvider?: string,
  aiModel?: string,
  actingUser?: { id: string; email: string },
) {
  const startedAt = Date.now();
  const ruleResult = classifyByRules(record);
  const promptText = buildPrompt(record);
  let aiResult: any = null;
  let providerUsed = "Rule-Based";
  let modelUsed = "Clinical Safety Rules v2";
  let aiFailed = false;

  try {
    if (aiProvider === "rulebased") {
      aiResult = ruleFallback(ruleResult);
    } else if (aiProvider === "huggingface" && env.huggingFaceApiKey) {
      const result = await classifyWithHuggingFace(promptText, aiModel);
      aiResult = result.parsed;
      providerUsed = result.providerUsed;
      modelUsed = result.modelUsed;
    } else if ((aiProvider === "runpod" || aiProvider === "custom") && env.customModelUrl) {
      const result = await classifyWithRunPod(promptText, record, ruleResult);
      aiResult = result.parsed;
      providerUsed = result.providerUsed;
      modelUsed = result.modelUsed;
    } else if (aiProvider === "gemini" && env.geminiApiKey) {
      const result = await classifyWithGemini(promptText);
      aiResult = result.parsed;
      providerUsed = result.providerUsed;
      modelUsed = result.modelUsed;
    }
  } catch (error) {
    aiFailed = true;
    logger.error({ err: error, aiProvider, aiModel }, "AI classification failed, using rule fallback");
    recordEvent({
      eventType: "ai_failure",
      level: "error",
      provider: aiProvider || "unknown",
      model: aiModel,
      durationMs: Date.now() - startedAt,
      message: error instanceof Error ? error.message : String(error),
      detail: { context: "classify" },
      userId: actingUser?.id,
      userEmail: actingUser?.email,
    });
  }

  const parsedLevel = readAtsLevel(aiResult);
  const hasIndependentAiResult = Boolean(parsedLevel && providerUsed !== "Rule-Based");
  const aiSuggestedLevel = hasIndependentAiResult ? parsedLevel : null;
  const aiSuggestedReason = hasIndependentAiResult
    ? String(aiResult?.alasanKlasifikasi || "Model tidak memberikan alasan klasifikasi.")
    : null;
  const aiSuggestedConfidence = hasIndependentAiResult ? Number(aiResult?.confidenceScore) || 0 : null;
  if (!aiResult || !parsedLevel) {
    aiResult = ruleFallback(ruleResult);
  }

  let finalAtsLevel = readAtsLevel(aiResult) || 3;
  let finalWarnings = toStringArray(aiResult.warningConditions || aiResult.kondisiPeringatan || aiResult.redFlags);
  let finalEmergency = Boolean(aiResult.emergencyIndicator || ruleResult.emergency);

  const ruleOverrode = Boolean(
    ruleResult.overrideLevel && ruleResult.overrideLevel <= 3 && ruleResult.overrideLevel < finalAtsLevel,
  );
  if (ruleOverrode) {
    finalAtsLevel = ruleResult.overrideLevel!;
    finalWarnings = [...ruleResult.warnings, ...finalWarnings];
    finalEmergency = true;
  }

  const guardRailLevel = ruleResult.overrideLevel;
  const recommendationsDiffer = Boolean(
    aiSuggestedLevel && guardRailLevel && aiSuggestedLevel !== guardRailLevel,
  );
  const guardRailReasons = guardRailLevel
    ? ruleResult.warnings.filter((warning) =>
        warning.startsWith(`Rule-Based ATS ${guardRailLevel}:`) || !warning.startsWith("Rule-Based ATS "),
      )
    : [];

  logger.info(
    {
      aiProviderRequested: aiProvider || "rulebased",
      providerUsed,
      modelUsed,
      aiFailed,
      ruleOverrode,
      aiSuggestedLevel,
      guardRailLevel,
      recommendationsDiffer,
      finalAtsLevel,
      emergencyIndicator: finalEmergency,
      durationMs: Date.now() - startedAt,
    },
    "ATS classification decided",
  );

  recordEvent({
    eventType: "ats_classification",
    level: "info",
    provider: providerUsed,
    model: modelUsed,
    atsLevel: finalAtsLevel,
    durationMs: Date.now() - startedAt,
    detail: {
      aiProviderRequested: aiProvider || "rulebased",
      aiFailed,
      ruleOverrode,
      aiSuggestedLevel,
      guardRailLevel,
      recommendationsDiffer,
      emergencyIndicator: finalEmergency,
    },
    userId: actingUser?.id,
    userEmail: actingUser?.email,
  });

  const clinicalInfo = [
    ...toStringArray(aiResult.informasiKlinisDigunakan || aiResult.clinicalInformationUsed || aiResult.dataKlinisDigunakan),
    ...buildClinicalInfo(record, ruleResult.warnings),
  ];
  const missingInfo = [
    ...toStringArray(aiResult.informasiTambahanDiperlukan || aiResult.additionalInformationNeeded || aiResult.dataTambahanDiperlukan),
    ...buildMissingInfo(record),
  ];

  return {
    atsLevel: finalAtsLevel,
    atsCategory: atsCategoryLabels[finalAtsLevel],
    confidenceScore: aiResult.confidenceScore || 90,
    warningConditions: Array.from(new Set(finalWarnings)),
    emergencyIndicator: finalEmergency,
    alasanKlasifikasi: ruleOverrode
      ? `Guard rail klinis menaikkan prioritas dari ATS ${aiSuggestedLevel} menjadi ATS ${guardRailLevel} berdasarkan red flag yang terdeteksi. Keputusan final tetap memerlukan validasi nakes.`
      : aiResult.alasanKlasifikasi || "Ditentukan berdasarkan kriteria fisiologis standar ATS.",
    informasiKlinisDigunakan: Array.from(new Set(clinicalInfo)),
    informasiTambahanDiperlukan: Array.from(new Set(missingInfo)),
    rekomendasiAwal: aiResult.rekomendasiAwal || ["Siapkan ruang resusitasi", "Pasang jalur infus intravena"],
    providerUsed,
    modelUsed,
    decisionSupport: hasIndependentAiResult && aiSuggestedLevel && guardRailLevel
      ? {
          aiRecommendation: {
            atsLevel: aiSuggestedLevel,
            atsCategory: atsCategoryLabels[aiSuggestedLevel],
            confidenceScore: aiSuggestedConfidence || 0,
            alasanKlasifikasi: aiSuggestedReason || "Model tidak memberikan alasan klasifikasi.",
          },
          guardRailRecommendation: {
            atsLevel: guardRailLevel,
            atsCategory: atsCategoryLabels[guardRailLevel],
            reasons: guardRailReasons,
          },
          recommendationsDiffer,
          guardRailApplied: ruleOverrode,
        }
      : undefined,
  };
}
