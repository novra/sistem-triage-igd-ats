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
    } else if (aiProvider === "custom" && env.customModelUrl) {
      const response = await fetch(env.customModelUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ record, ruleResult, promptText }),
      });
      if (!response.ok) throw new Error(`Custom API returned status ${response.status}`);
      const data = await response.json();
      aiResult = data.record || data;
      providerUsed = "Model Mandiri (Custom Endpoint)";
      modelUsed = aiResult.modelUsed || data.modelUsed || data.model || "Custom Endpoint";
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
