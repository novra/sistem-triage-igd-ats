import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Resolve DB path
const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "triage_records.json");

// Ensure data folder exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify([], null, 2), "utf-8");
}

// Initialize Gemini Client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "dummy-key-to-prevent-instant-crash",
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

app.use(express.json());

// Helper to read database
function readRecords(): any[] {
  try {
    const data = fs.readFileSync(DB_FILE, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading database file", error);
    return [];
  }
}

// Helper to write database
function writeRecords(records: any[]) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(records, null, 2), "utf-8");
  } catch (error) {
    console.error("Error writing database file", error);
  }
}

// Rule-based clinical triage overrides for safety
function runRuleBasedTriage(record: any) {
  const { vitalSign, painScale } = record;
  const warnings: string[] = [];
  let overrideLevel: 1 | 2 | 3 | 4 | 5 | null = null;
  let emergency = false;

  const rr = Number(vitalSign.respiratoryRate) || 0;
  const hr = Number(vitalSign.heartRate) || 0;
  const spo2 = Number(vitalSign.saturasiOksigen) || 0;
  const sbp = Number(vitalSign.tekananDarahSistolik) || 0;
  const gcsTotal = (Number(vitalSign.gcs?.eye) || 4) + (Number(vitalSign.gcs?.verbal) || 5) + (Number(vitalSign.gcs?.motor) || 6);
  const avval = vitalSign.avpu || "Alert";

  // ATS 1 Conditions (Immediate Resuscitation)
  if (avval === "Unresponsive") {
    warnings.push("⚠️ Override Rule-Based ATS 1: Status kesadaran tidak respon (AVPU Unresponsive).");
    overrideLevel = 1;
    emergency = true;
  }
  if (gcsTotal <= 8) {
    warnings.push(`⚠️ Override Rule-Based ATS 1: GCS sangat rendah (E${vitalSign.gcs?.eye ?? 1}V${vitalSign.gcs?.verbal ?? 1}M${vitalSign.gcs?.motor ?? 1} = ${gcsTotal} ≤ 8) - Ancaman koma / airway compromise.`);
    overrideLevel = 1;
    emergency = true;
  }
  if (spo2 > 0 && spo2 < 85) {
    warnings.push(`⚠️ Override Rule-Based ATS 1: Saturasi Oksigen Kritis (SpO2 ${spo2}% < 85%) - Hipoksia ekstrem.`);
    overrideLevel = 1;
    emergency = true;
  }
  if (rr > 0 && (rr < 8 || rr > 35)) {
    warnings.push(`⚠️ Override Rule-Based ATS 1: Frekuensi Napas Kritis (RR ${rr} x/mnt) - Resiko henti napas.`);
    overrideLevel = 1;
    emergency = true;
  }
  if (hr > 0 && (hr < 40 || hr > 140)) {
    warnings.push(`⚠️ Override Rule-Based ATS 1: Frekuensi Jantung Kritis (HR ${hr} x/mnt) - Syok Bengap Kardiovaskular.`);
    overrideLevel = 1;
    emergency = true;
  }
  if (vitalSign.apnea) {
    warnings.push("⚠️ Override Rule-Based ATS 1: Pasien mengalami Apnea / Henti Napas.");
    overrideLevel = 1;
    emergency = true;
  }

  // ATS 2 Conditions if not ATS 1
  if (!overrideLevel) {
    if (avval === "Pain") {
      warnings.push("⚠️ Override Rule-Based ATS 2: Status kesadaran respon nyeri (AVPU Pain) - Kegawatan moderat.");
      overrideLevel = 2;
      emergency = true;
    }
    if (avval === "Verbal") {
      warnings.push("⚠️ Override Rule-Based ATS 2: Status kesadaran respon suara (AVPU Verbal) - Kegawatan moderat.");
      overrideLevel = 2;
      emergency = true;
    }
    if (gcsTotal >= 9 && gcsTotal <= 12) {
      warnings.push(`⚠️ Override Rule-Based ATS 2: Penurunan kesadaran moderat (GCS ${gcsTotal}).`);
      overrideLevel = 2;
      emergency = true;
    }
    if (spo2 >= 85 && spo2 <= 90) {
      warnings.push(`⚠️ Override Rule-Based ATS 2: Desaturasi moderat-berat (SpO2 ${spo2}%).`);
      overrideLevel = 2;
      emergency = true;
    }
    if (rr > 30 && rr <= 35) {
      warnings.push(`⚠️ Override Rule-Based ATS 2: Takipnea berat (RR ${rr} x/mnt).`);
      overrideLevel = 2;
      emergency = true;
    }
    if (hr > 120 && hr <= 140) {
      warnings.push(`⚠️ Override Rule-Based ATS 2: Takikardia berat (HR ${hr} x/mnt).`);
      overrideLevel = 2;
      emergency = true;
    }
    const ccNormalized = (record.chiefComplaint || "").toLowerCase();
    if (painScale.skala >= 7 && (ccNormalized.includes("nyeri dada") || ccNormalized.includes("chest pain") || ccNormalized.includes("stroke") || ccNormalized.includes("nyeri kepala"))) {
      warnings.push(`⚠️ Override Rule-Based ATS 2: Nyeri hebat skala ${painScale.skala}/10 pada kecurigaan jantung/neurologis (${record.chiefComplaint}).`);
      overrideLevel = 2;
      emergency = true;
    }
  }

  return { overrideLevel, warnings, emergency };
}

// 1. HEALTH CHECK
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// 2. ATS CLASSIFY WITH AI (GEMINI / HUGGING FACE / RULE-BASED FALLBACK)
app.post("/api/triage/classify", async (req, res) => {
  try {
    const { aiProvider, ...record } = req.body;
    if (!record || !record.vitalSign) {
      return res.status(400).json({ error: "Data triage tidak lengkap" });
    }

    // A. Run clinical rule calculations
    const ruleResult = runRuleBasedTriage(record);

    let providerUsed = "Rule-Based";
    let modelUsed = "Clinical Safety Rules v1";
    const selectedProvider = aiProvider || "gemini";

    // B. Default structure for fallback or rule-based safety
    let aiResult = {
      atsLevel: 3,
      confidenceScore: 70,
      warningConditions: [] as string[],
      emergencyIndicator: false,
      alasanKlasifikasi: "Klasifikasi dasar otomatis.",
      rekomendasiAwal: ["Observasi vital sign secara kontinu."]
    };

    const promptText = `
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
   - Temp: ${record.vitalSign?.suhuTubuh} °C
   - SpO2: ${record.vitalSign?.saturasiOksigen} %
   - GCS: E${record.vitalSign?.gcs?.eye ?? 4} V${record.vitalSign?.gcs?.verbal ?? 5} M${record.vitalSign?.gcs?.motor ?? 6}
   - Pola Napas: ${record.vitalSign?.polaNapas}
   - Tambahan Napas: ${[
      record.vitalSign?.ototBantuNapas && "penggunaan otot bantu napas",
      record.vitalSign?.retraksi && "retraksi dinding dada",
      record.vitalSign?.stridor && "stridor",
      record.vitalSign?.wheezing && "wheezing",
      record.vitalSign?.apnea && "apnea",
      record.vitalSign?.takipnea && "takipnea",
      record.vitalSign?.bradipnea && "bradipnea",
   ].filter(Boolean).join(", ") || "Tidak ada"}
6. PEMERIKSAAN FISIK (SOAP - OBJECTIVE):
   - Kepala: ${Object.entries(record.pemeriksaanFisik?.kepala || {}).filter(([_, v]) => v).map(([k]) => k).join(", ") || "Normal"}
   - Leher: ${Object.entries(record.pemeriksaanFisik?.leher || {}).filter(([_, v]) => v).map(([k]) => k).join(", ") || "Normal"}
   - Dada: ${Object.entries(record.pemeriksaanFisik?.dada || {}).filter(([_, v]) => v).map(([k]) => k).join(", ") || "Normal"}
   - Perut: ${Object.entries(record.pemeriksaanFisik?.perut || {}).filter(([_, v]) => v).map(([k]) => k).join(", ") || "Normal"}
   - Ekstremitas Atas: ${Object.entries(record.pemeriksaanFisik?.ekstremitasAtas || {}).filter(([_, v]) => v).map(([k]) => k).join(", ") || "Normal"}
   - Ekstremitas Bawah: ${Object.entries(record.pemeriksaanFisik?.ekstremitasBawah || {}).filter(([_, v]) => v).map(([k]) => k).join(", ") || "Normal"}

Silakan hitung level kecocokan ATS:
- ATS 1 (Bila ada ancaman jiwa langsung - Resusitasi segera)
- ATS 2 (Kondisi emergensi, mengancam sirkulasi/jalan napas, atau nyeri dada/stroke akut)
- ATS 3 (Kondisi urgent, tidak mengancam nyawa segera namun berisiko memburuk secara drastis dalam waktu singkat)
- ATS 4 (Semi-urgent, kondisi pasien stabil, tidak ada tanda-tanda merah atau oranye)
- ATS 5 (Non-urgent, masalah ringan, kontrol kronis, atau keluhan administratif)

Tuliskan analisis medis Anda dalam Bahasa Indonesia yang formal. Output WAJIB berupa JSON valid dengan format persis di bawah:
{
  "atsLevel": <1 | 2 | 3 | 4 | 5>,
  "confidenceScore": <nilai keyakinan 0-100 sebagai integer>,
  "warningConditions": [<array of string peringatan bahaya klinis>],
  "emergencyIndicator": <boolean gawat darurat>,
  "alasanKlasifikasi": "<penjelasan lengkap dalam Bahasa Indonesia>",
  "rekomendasiAwal": [<array of string awal tindakan medis/keperawatan triase>]
}
`;

    let actionFailed = false;

    if (selectedProvider === "huggingface") {
      const hfToken = process.env.HUGGINGFACE_API_KEY || process.env.HF_TOKEN;
      if (!hfToken) {
        console.warn("Hugging Face API token missing - falling back to rule-based safety check");
        actionFailed = true;
      } else {
        try {
          const hfModel = "mistralai/Mistral-7B-Instruct-v0.3";
          modelUsed = hfModel;
          const hfUrl = `https://api-inference.huggingface.co/models/${hfModel}`;

          console.log(`Sending request to Hugging Face Model: ${hfModel}...`);
          const hfResponse = await fetch(hfUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${hfToken}`
            },
            body: JSON.stringify({
              inputs: `<s>[INST] ${promptText} \nRESPONSE ONLY JSON: [/INST]`,
              parameters: {
                max_new_tokens: 1000,
                temperature: 0.1,
                return_full_text: false
              }
            })
          });

          if (!hfResponse.ok) {
            throw new Error(`Hugging Face API returned status ${hfResponse.status}`);
          }

          const responseData = await hfResponse.json();
          let generatedText = "";
          if (Array.isArray(responseData) && responseData[0]?.generated_text) {
            generatedText = responseData[0].generated_text;
          } else if (responseData?.generated_text) {
            generatedText = responseData.generated_text;
          } else if (typeof responseData === "string") {
            generatedText = responseData;
          } else if (responseData && responseData.error) {
            throw new Error(`Hugging Face API error: ${responseData.error}`);
          } else {
            throw new Error("Invalid response format from Hugging Face Inference API");
          }

          // Robust parsing of JSON from generated response
          const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
          const rawJson = jsonMatch ? jsonMatch[0] : generatedText;
          const parsed = JSON.parse(rawJson);

          if (parsed && typeof parsed.atsLevel === "number") {
            aiResult = parsed;
            providerUsed = "Hugging Face";
            modelUsed = hfModel;
          } else {
            throw new Error("Hugging Face JSON parsed successfully, but missing expected properties");
          }
        } catch (e) {
          console.error("Hugging Face Triage classification failed:", e);
          actionFailed = true;
        }
      }
    } else if (selectedProvider === "custom") {
      const customModelUrl = process.env.CUSTOM_MODEL_URL;
      if (!customModelUrl) {
        console.warn("CUSTOM_MODEL_URL missing - using rule-based fallback");
        actionFailed = true;
      } else {
        try {
          console.log(`Sending clinical triage data to custom trained model endpoint: ${customModelUrl}...`);
          const customResponse = await fetch(customModelUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              record,
              ruleResult,
              promptText
            })
          });

          if (!customResponse.ok) {
            throw new Error(`Custom API returned status ${customResponse.status}`);
          }

          const responseData = await customResponse.json();
          const parsed = responseData.record || responseData;
          if (parsed && typeof parsed.atsLevel === "number") {
            aiResult = {
              atsLevel: parsed.atsLevel,
              confidenceScore: parsed.confidenceScore || 95,
              warningConditions: parsed.warningConditions || [],
              emergencyIndicator: typeof parsed.emergencyIndicator === "boolean" ? parsed.emergencyIndicator : false,
              alasanKlasifikasi: parsed.alasanKlasifikasi || "Ditentukan oleh model mandiri Anda.",
              rekomendasiAwal: parsed.rekomendasiAwal || []
            };
            providerUsed = "Model Mandiri (Custom Endpoint)";
            modelUsed = parsed.modelUsed || responseData.modelUsed || responseData.model || "Custom Endpoint";
          } else {
            throw new Error("Custom Model API returned data, but 'atsLevel' was not structured properly.");
          }
        } catch (customErr) {
          console.error("Custom trained model classification failed:", customErr);
          actionFailed = true;
        }
      }
    } else {
      // DEFAULT: Gemini
      if (!process.env.GEMINI_API_KEY) {
        console.warn("GEMINI_API_KEY missing - falling back to rule-based safety check");
        actionFailed = true;
      } else {
        try {
          const geminiModel = "gemini-3.5-flash";
          const response = await ai.models.generateContent({
            model: geminiModel,
            contents: promptText,
            config: {
              systemInstruction: `Anda adalah pakar triase medis emergensi berlisensi di Indonesia. Analisis kasus triase seobjektif mungkin. Dahulukan keselamatan pasien. Berikan keluaran terstruktur sesuai format JSON schema yang diminta.`,
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  atsLevel: { type: Type.INTEGER, description: "Level ATS (1, 2, 3, 4, atau 5)" },
                  confidenceScore: { type: Type.INTEGER, description: "Tingkat keyakinan model (skala 0-100)" },
                  warningConditions: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Peringatan kritis / tanda bahaya klinis yang diidentifikasi" },
                  emergencyIndicator: { type: Type.BOOLEAN, description: "Kondisi gawat darurat (true) atau tidak (false)" },
                  alasanKlasifikasi: { type: Type.STRING, description: "Alasan lengkap penentuan level ATS tersebut dalam Bahasa Indonesia" },
                  rekomendasiAwal: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Daftar rekomendasi tindakan medis awal di triase dalam Bahasa Indonesia" }
                },
                required: ["atsLevel", "confidenceScore", "warningConditions", "emergencyIndicator", "alasanKlasifikasi", "rekomendasiAwal"]
              }
            }
          });

          const parsed = JSON.parse(response.text?.trim() || "{}");
          if (parsed.atsLevel) {
            aiResult = parsed;
            providerUsed = "Gemini";
            modelUsed = geminiModel;
          } else {
            throw new Error("Gemini classification succeeded, but returned blank schema");
          }
        } catch (e) {
          console.error("Gemini classification failed", e);
          actionFailed = true;
        }
      }
    }

    // FALLBACK IF AI METHOD FAILED OR WAS UNCONFIGURED
    if (actionFailed) {
      providerUsed = "Rule-Based";
      modelUsed = "Clinical Safety Rules v1";
      aiResult = {
        atsLevel: ruleResult.overrideLevel || 3,
        confidenceScore: 100,
        warningConditions: ruleResult.warnings,
        emergencyIndicator: ruleResult.emergency,
        alasanKlasifikasi: ruleResult.overrideLevel 
          ? `Terdeteksi kriteria bahaya kritis (Rule-Based Triage) di IGD: GCS, saturasi, heart rate, atau respirasi tidak stabil.`
          : "[Rule-Based Fallback] Klasifikasi dasar otomatis. Token penyedia AI tidak terdeteksi atau mengalami kendala koneksi API.",
        rekomendasiAwal: ["Segera lakukan resusitasi", "Posisikan semi-fowler jika sesak", "Siapkan jalur IV dan monitor bedside"]
      };
    }

    // C. Combine Rule-Based Validation with AI Result (Safe override ensures ATS 1/2 is enforced if signs match)
    let finalAtsLevel = aiResult.atsLevel;
    let finalWarnings = [...(aiResult.warningConditions || [])];
    let finalEmergency = aiResult.emergencyIndicator || ruleResult.emergency;

    if (ruleResult.overrideLevel && ruleResult.overrideLevel < finalAtsLevel) {
      finalAtsLevel = ruleResult.overrideLevel;
      finalWarnings = [...ruleResult.warnings, ...finalWarnings];
      finalEmergency = true;
    }

    return res.json({
      atsLevel: finalAtsLevel,
      confidenceScore: aiResult.confidenceScore || 90,
      warningConditions: Array.from(new Set(finalWarnings)),
      emergencyIndicator: finalEmergency,
      alasanKlasifikasi: aiResult.alasanKlasifikasi || "Ditentukan berdasarkan kriteria fisiologis standar ATS.",
      rekomendasiAwal: aiResult.rekomendasiAwal || ["Siapkan ruang resusitasi", "Pasang jalur infus intravena"],
      providerUsed: providerUsed,
      modelUsed: modelUsed
    });

  } catch (error: any) {
    console.error("Encountered error during ATS Triage Classification", error);
    res.status(500).json({ error: "Gagal memproses triase ATS" });
  }
});

// 2.5. PARSE CLINIICAL NARRATIVE WITH AI (GEMINI STRUCTURED OUTPUT)
app.post("/api/triage/parse-narrative", async (req, res) => {
  try {
    const { narrative } = req.body;
    if (!narrative || typeof narrative !== "string" || !narrative.trim()) {
      return res.status(400).json({ error: "Data narasi klinis kosong atau tidak valid" });
    }

    // Default structure for fallback if Gemini is missing or fails
    const defaultResult = {
      nomorRM: "RM-99001",
      namaPasien: "Pasien Baru",
      umur: 30,
      gender: "Laki-laki",
      caraDatang: "Jalan sendiri",
      riwayatPenyakit: [] as string[],
      riwayatPenyakitLainnya: "",
      chiefComplaint: "Lain-lain",
      chiefComplaintCustom: narrative.length > 150 ? narrative.slice(0, 147) + "..." : narrative,
      gejalaTambahan: [] as string[],
      vitalSign: {
        tekananDarahSistolik: 120,
        tekananDarahDiastolik: 80,
        heartRate: 80,
        respiratoryRate: 18,
        suhuTubuh: 36.5,
        saturasiOksigen: 98,
        gcs: { eye: 4, verbal: 5, motor: 6 },
        polaNapas: "reguler",
        ototBantuNapas: false,
        retraksi: false,
        stridor: false,
        wheezing: false,
        apnea: false,
        takipnea: false,
        bradipnea: false,
        avpu: "Alert"
      },
      painScale: {
        skala: 0,
        kategori: "tidak nyeri",
        lokasi: "Tidak ada",
        menjalar: false
      },
      pemeriksaanFisik: {
        kepala: { perdarahan: false, deformitas: false, pupilAnisokor: false, pupilIsokor: true, traumaKepala: false, kejang: false, sianosis: false, penurunanKesadaran: false },
        leher: { deviasiTrakea: false, distensiVenaJugularis: false, kakuKuduk: false, traumaLeher: false, pembesaranKelenjar: false, stridor: false },
        dada: { retraksi: false, wheezing: false, ronki: false, suaraNapasMenurun: false, nyeriDada: false, penggunaanOtotBantuNapas: false, asimetriDindingDada: false, distressRespirasi: false },
        perut: { distensiAbdomen: false, nyeriTekan: false, defenseMuscular: false, muntah: false, perdarahan: false, ascites: false, nyeriKuadranKananBawah: false, rigidAbdomen: false },
        ekstremitasAtas: { kelemahanMotorik: false, deformitas: false, edema: false, sianosis: false, tremor: false, perfusiBuruk: false, perdarahanAktif: false },
        ekstremitasBawah: { edema: false, deformitas: false, kelemahanMotorik: false, sianosis: false, perfusiBuruk: false, trauma: false, perdarahanAktif: false }
      }
    };

    if (!process.env.GEMINI_API_KEY) {
      console.warn("GEMINI_API_KEY missing - using heuristic fallback extraction for narrative");
      // Basic fallback heuristic mapping
      const text = narrative.toLowerCase();
      
      // Try extracting age
      const ageMatch = text.match(/(\d+)\s*(tahun|thn|th|yo|old)/);
      if (ageMatch) defaultResult.umur = parseInt(ageMatch[1]);

      // Try detecting gender
      if (text.includes("wanita") || text.includes("perempuan") || text.includes("ibu") || text.includes("ny.") || text.includes("nona") || text.includes("sdri.")) {
        defaultResult.gender = "Perempuan";
      }

      // Try detecting RM
      const rmMatch = text.match(/(rm|no_rm|rekam medis|nomor rm)\s*[:-]?\s*([a-zA-Z\d-]+)/);
      if (rmMatch) defaultResult.nomorRM = rmMatch[2].toUpperCase().trim();

      // Try detecting BP
      const bpMatch = text.match(/(\d{2,3})\s*\/\s*(\d{2,3})/);
      if (bpMatch) {
         defaultResult.vitalSign.tekananDarahSistolik = parseInt(bpMatch[1]);
         defaultResult.vitalSign.tekananDarahDiastolik = parseInt(bpMatch[2]);
      }

      // Try detecting pulse/HR
      const hrMatch = text.match(/(hr|nadi|pulse|heart rate)\s*[:-]?\s*(\d+)/) || text.match(/nadi\s+(\d+)/);
      if (hrMatch) defaultResult.vitalSign.heartRate = parseInt(hrMatch[2] || hrMatch[1]);

      // Try detecting respiratory
      const rrMatch = text.match(/(rr|napas|nafas|respiratory)\s*[:-]?\s*(\d+)/) || text.match(/nafas\s+(\d+)/);
      if (rrMatch) defaultResult.vitalSign.respiratoryRate = parseInt(rrMatch[2] || rrMatch[1]);

      // Try detecting SpO2
      const spo2Match = text.match(/(spo2|saturasi|oxygen|oksigen)\s*[:-]?\s*(\d+)/);
      if (spo2Match) defaultResult.vitalSign.saturasiOksigen = parseInt(spo2Match[2] || spo2Match[1]);

      // Try detecting Temp
      const tempMatch = text.match(/(temp|suhu|t)\s*[:-]?\s*(\d+[,.]?\d*)/);
      if (tempMatch) defaultResult.vitalSign.suhuTubuh = parseFloat(tempMatch[2].replace(",", "."));

      // Try matching complaint category
      if (text.includes("sesak") || text.includes("sulit bernapas") || text.includes("asb")) {
        defaultResult.chiefComplaint = "Sesak napas";
      } else if (text.includes("nyeri dada") || text.includes("chest pain") || text.includes("jantung")) {
        defaultResult.chiefComplaint = "Nyeri dada";
      } else if (text.includes("demam") || text.includes("panas") || text.includes("suhu tinggi")) {
        defaultResult.chiefComplaint = "Demam";
      } else if (text.includes("pingsan") || text.includes("penurunan kesadaran") || text.includes("koma") || text.includes("somnolen")) {
        defaultResult.chiefComplaint = "Penurunan kesadaran";
      }

      return res.json({ success: true, record: defaultResult, source: "heuristic" });
    }

    const systemPrompt = `Anda adalah sistem pengurai triase medis (NLP Clinical Narrative Parser) profesional di IGD rumah sakit Indonesia.
Tugas Anda adalah membaca narasi/catatan keluhan bebas (text unstructured) dari perawat/dokter tentang pasien IGD, kemudian memilah ("memilah") informasi tersebut dan mengonversinya secara presisi ke dalam struktur data triase klinis (structured JSON).

Ingat kriteria parsing berikut:
1. Nama: Cari nama pasien (misal: Tn. Budi, Ny. Aminah, An. Cinta). Pisahkan gelar/panggilan (Tn/Ny/An) jika perlu atau biarkan lengkap.
2. Umur: Deteksi usia dari teks. Jika tidak ada, gunakan nilai default 25 atau 30.
3. Gender: Tentukan "Laki-laki" atau "Perempuan" berdasarkan profil panggilan (Tn., Ny., bapak, ibu, mas, mbak, sdr, sdri, atau kata eksplisit).
4. Cara Datang: Pilih yang sesuai berdasarkan info ambulans, stretcher, roda, atau jalan kaki.
5. Keluhan Utama (chiefComplaint): Pilih wajib dari kategori standard: "Sesak napas", "Nyeri dada", "Trauma", "Demam", "Penurunan kesadaran", "Kejang", "Nyeri perut", "Muntah/diare", "Stroke", "Luka/perdarahan", atau "Lain-lain".
6. Tanda-Tanda Vital (TTV): Cari angka tekanan darah (Sistolik/Diastolik), Nadi/HR, Pernapasan/RR, Suhu, dan SpO2. Petakan ke dalam kolom 'vitalSign' secara presisi.
7. Pemeriksaan fisik: Cari kata-kata spesifik yang mengindikasikan kelainan fisik (misal: pupil anisokor, trauma kepala, asimetri dada, retraksi dada, rigid abdomen, dsb) dan set boolean bernilai true jika terdeteksi kelainan tersebut.

Tulis keluaran Anda murni dalam format JSON yang valid berbasis schema yang dipersyaratkan. Jangan berikan teks penjelasan atau Markdown penutup lain di luar JSON.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `Berikut adalah narasi klinis pasien yang harus Anda pilah dan ekstrak ke dalam data triage standar:
---
${narrative}
---`,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            nomorRM: { type: Type.STRING, description: "Nomor rekam medis dari teks (contoh: RM-12004 atau RM-1244), jika tidak ada kosongkan atau beri kode 'RM-' baru berkualitas" },
            namaPasien: { type: Type.STRING, description: "Nama pasien" },
            umur: { type: Type.INTEGER, description: "Umur pasien dalam angka tahun" },
            gender: { type: Type.STRING, description: "Wajib salah satu: 'Laki-laki' atau 'Perempuan'" },
            caraDatang: { type: Type.STRING, description: "Wajib salah satu: 'Jalan sendiri', 'Kursi roda', 'Stretcher' atau 'Ambulans'" },
            riwayatPenyakit: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING }, 
              description: "Daftar riwayat komorbid, misal: ['Hipertensi', 'Diabetes Melitus']" 
            },
            riwayatPenyakitLainnya: { type: Type.STRING, description: "Riwayat lain jika tidak masuk kategori" },
            chiefComplaint: { 
              type: Type.STRING, 
              description: "Wajib salah satu dari: 'Sesak napas', 'Nyeri dada', 'Trauma', 'Demam', 'Penurunan kesadaran', 'Kejang', 'Nyeri perut', 'Muntah/diare', 'Stroke', 'Luka/perdarahan', 'Lain-lain'" 
            },
            chiefComplaintCustom: { type: Type.STRING, description: "Catatan atau rincian deskripsi keluhan bebas sejelas mungkin" },
            gejalaTambahan: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING }, 
              description: "Gejala tambahan yang relevan, contoh: ['Sesak berat', 'Diaforesis (Keringat dingin)']" 
            },
            vitalSign: {
              type: Type.OBJECT,
              properties: {
                tekananDarahSistolik: { type: Type.INTEGER },
                tekananDarahDiastolik: { type: Type.INTEGER },
                heartRate: { type: Type.INTEGER },
                respiratoryRate: { type: Type.INTEGER },
                suhuTubuh: { type: Type.NUMBER },
                saturasiOksigen: { type: Type.INTEGER },
                gcs: {
                  type: Type.OBJECT,
                  properties: {
                    eye: { type: Type.INTEGER },
                    verbal: { type: Type.INTEGER },
                    motor: { type: Type.INTEGER }
                  },
                  required: ["eye", "verbal", "motor"]
                },
                polaNapas: { type: Type.STRING, description: "Pilihan: 'reguler' atau 'irreguler'" },
                ototBantuNapas: { type: Type.BOOLEAN },
                retraksi: { type: Type.BOOLEAN },
                stridor: { type: Type.BOOLEAN },
                wheezing: { type: Type.BOOLEAN },
                apnea: { type: Type.BOOLEAN },
                takipnea: { type: Type.BOOLEAN },
                bradipnea: { type: Type.BOOLEAN },
                avpu: { type: Type.STRING, description: "Pilihan: 'Alert', 'Verbal', 'Pain', atau 'Unresponsive'" }
              },
              required: [
                "tekananDarahSistolik", "tekananDarahDiastolik", "heartRate", "respiratoryRate", 
                "suhuTubuh", "saturasiOksigen", "gcs", "polaNapas", "ototBantuNapas", 
                "retraksi", "stridor", "wheezing", "apnea", "takipnea", "bradipnea", "avpu"
              ]
            },
            painScale: {
              type: Type.OBJECT,
              properties: {
                skala: { type: Type.INTEGER, description: "Skala nyeri 0-10" },
                kategori: { type: Type.STRING, description: "Pilihan: 'tidak nyeri', 'ringan', 'sedang', atau 'berat'" },
                lokasi: { type: Type.STRING },
                menjalar: { type: Type.BOOLEAN }
              },
              required: ["skala", "kategori", "lokasi", "menjalar"]
            },
            pemeriksaanFisik: {
              type: Type.OBJECT,
              properties: {
                kepala: {
                  type: Type.OBJECT,
                  properties: {
                    perdarahan: { type: Type.BOOLEAN },
                    deformitas: { type: Type.BOOLEAN },
                    pupilAnisokor: { type: Type.BOOLEAN },
                    pupilIsokor: { type: Type.BOOLEAN },
                    traumaKepala: { type: Type.BOOLEAN },
                    kejang: { type: Type.BOOLEAN },
                    sianosis: { type: Type.BOOLEAN },
                    penurunanKesadaran: { type: Type.BOOLEAN }
                  },
                  required: ["perdarahan", "deformitas", "pupilAnisokor", "pupilIsokor", "traumaKepala", "kejang", "sianosis", "penurunanKesadaran"]
                },
                leher: {
                  type: Type.OBJECT,
                  properties: {
                    deviasiTrakea: { type: Type.BOOLEAN },
                    distensiVenaJugularis: { type: Type.BOOLEAN },
                    kakuKuduk: { type: Type.BOOLEAN },
                    traumaLeher: { type: Type.BOOLEAN },
                    pembesaranKelenjar: { type: Type.BOOLEAN },
                    stridor: { type: Type.BOOLEAN }
                  },
                  required: ["deviasiTrakea", "distensiVenaJugularis", "kakuKuduk", "traumaLeher", "pembesaranKelenjar", "stridor"]
                },
                dada: {
                  type: Type.OBJECT,
                  properties: {
                    retraksi: { type: Type.BOOLEAN },
                    wheezing: { type: Type.BOOLEAN },
                    ronki: { type: Type.BOOLEAN },
                    suaraNapasMenurun: { type: Type.BOOLEAN },
                    nyeriDada: { type: Type.BOOLEAN },
                    penggunaanOtotBantuNapas: { type: Type.BOOLEAN },
                    asimetriDindingDada: { type: Type.BOOLEAN },
                    distressRespirasi: { type: Type.BOOLEAN }
                  },
                  required: ["retraksi", "wheezing", "ronki", "suaraNapasMenurun", "nyeriDada", "penggunaanOtotBantuNapas", "asimetriDindingDada", "distressRespirasi"]
                },
                perut: {
                  type: Type.OBJECT,
                  properties: {
                    distensiAbdomen: { type: Type.BOOLEAN },
                    nyeriTekan: { type: Type.BOOLEAN },
                    defenseMuscular: { type: Type.BOOLEAN },
                    muntah: { type: Type.BOOLEAN },
                    perdarahan: { type: Type.BOOLEAN },
                    ascites: { type: Type.BOOLEAN },
                    nyeriKuadranKananBawah: { type: Type.BOOLEAN },
                    rigidAbdomen: { type: Type.BOOLEAN }
                  },
                  required: ["distensiAbdomen", "nyeriTekan", "defenseMuscular", "muntah", "perdarahan", "ascites", "nyeriKuadranKananBawah", "rigidAbdomen"]
                },
                ekstremitasAtas: {
                  type: Type.OBJECT,
                  properties: {
                    kelemahanMotorik: { type: Type.BOOLEAN },
                    deformitas: { type: Type.BOOLEAN },
                    edema: { type: Type.BOOLEAN },
                    sianosis: { type: Type.BOOLEAN },
                    tremor: { type: Type.BOOLEAN },
                    perfusiBuruk: { type: Type.BOOLEAN },
                    perdarahanAktif: { type: Type.BOOLEAN }
                  },
                  required: ["kelemahanMotorik", "deformitas", "edema", "sianosis", "tremor", "perfusiBuruk", "perdarahanAktif"]
                },
                ekstremitasBawah: {
                  type: Type.OBJECT,
                  properties: {
                    edema: { type: Type.BOOLEAN },
                    deformitas: { type: Type.BOOLEAN },
                    kelemahanMotorik: { type: Type.BOOLEAN },
                    sianosis: { type: Type.BOOLEAN },
                    perfusiBuruk: { type: Type.BOOLEAN },
                    trauma: { type: Type.BOOLEAN },
                    perdarahanAktif: { type: Type.BOOLEAN }
                  },
                  required: ["edema", "deformitas", "kelemahanMotorik", "sianosis", "perfusiBuruk", "trauma", "perdarahanAktif"]
                }
              },
              required: ["kepala", "leher", "dada", "perut", "ekstremitasAtas", "ekstremitasBawah"]
            }
          },
          required: [
            "nomorRM", "namaPasien", "umur", "gender", "caraDatang", "riwayatPenyakit", 
            "riwayatPenyakitLainnya", "chiefComplaint", "chiefComplaintCustom", 
            "gejalaTambahan", "vitalSign", "painScale", "pemeriksaanFisik"
          ]
        }
      }
    });

    const parsedResult = JSON.parse(response.text?.trim() || "{}");
    return res.json({ success: true, record: parsedResult, source: "gemini" });

  } catch (error: any) {
    console.error("Narrative clinical extraction failed:", error);
    res.status(500).json({ error: "Gagal memilah narasi klinis lewat AI." });
  }
});

// 3. GET ALL TRIAGE RECORDS WITH FILTER/SEARCH
app.get("/api/triage/records", (req, res) => {
  try {
    const records = readRecords();
    const { search } = req.query;
    
    let filtered = [...records];
    if (search) {
      const q = String(search).toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.namaPasien.toLowerCase().includes(q) ||
          r.nomorRM.toLowerCase().includes(q) ||
          (r.chiefComplaint || "").toLowerCase().includes(q)
      );
    }
    
    // Reverse chronological order
    filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    res.json(filtered);
  } catch (err) {
    res.status(500).json({ error: "Gagal mengambil daftar rekam triase" });
  }
});

// 4. SAVE NEW OR UPDATE EXISTING RECORD
app.post("/api/triage/records", (req, res) => {
  try {
    const newRecord = req.body;
    if (!newRecord.nomorRM || !newRecord.namaPasien) {
      return res.status(400).json({ error: "Nomor RM dan Nama Pasien wajib diisi" });
    }

    const records = readRecords();
    const timestamp = new Date().toISOString();
    
    let storedRecord: any;

    if (newRecord.id) {
      // Find and update
      const idx = records.findIndex((r) => r.id === newRecord.id);
      if (idx !== -1) {
        storedRecord = {
          ...records[idx],
          ...newRecord,
          timestamp, // update timestamp
          auditLogs: [
            ...(records[idx].auditLogs || []),
            {
              action: "Update Data Triase",
              timestamp,
              user: "Perawat Triage Tri IGD",
            },
          ],
        };
        records[idx] = storedRecord;
      } else {
        return res.status(404).json({ error: "Rekam triase tidak ditemukan" });
      }
    } else {
      // Create new
      const id = "TRG-" + Math.random().toString(36).substr(2, 9).toUpperCase();
      storedRecord = {
        ...newRecord,
        id,
        timestamp,
        auditLogs: [
          {
            action: "Pendaftaran & Triase Baru",
            timestamp,
            user: "Perawat Triage Tri IGD",
          },
        ],
      };
      records.push(storedRecord);
    }

    writeRecords(records);
    res.json(storedRecord);
  } catch (err) {
    console.error("Failed to save record:", err);
    res.status(500).json({ error: "Gagal menyimpan rekam triase" });
  }
});

// 5. EXPORT FOR AI MACHINE LEARNING TRAINING (NLP preprocessing compatible format)
app.get("/api/triage/export", (req, res) => {
  try {
    const records = readRecords();
    const resolveModelUsed = (r: any) => {
      if (r.atsPrediction?.modelUsed) return r.atsPrediction.modelUsed;
      switch (r.atsPrediction?.providerUsed) {
        case "Gemini":
          return "gemini-3.5-flash";
        case "Hugging Face":
          return "mistralai/Mistral-7B-Instruct-v0.3";
        case "Model Mandiri (Custom Endpoint)":
          return "Custom Endpoint";
        case "Rule-Based":
          return "Clinical Safety Rules v1";
        default:
          return "";
      }
    };
    
    // Prepare standardized structured features suited directly for NLP modeling
    const exportedData = records.map((r) => ({
      record_id: r.id,
      timestamp: r.timestamp,
      patient_rm: r.nomorRM,
      age: r.umur,
      gender: r.gender,
      cara_datang: r.caraDatang,
      riwayat_penyakit: r.riwayatPenyakit ? r.riwayatPenyakit.join(" | ") : "",
      riwayat_lainnya: r.riwayatPenyakitLainnya || "",
      keluhan_utama: r.chiefComplaint,
      keluhan_kustom: r.chiefComplaintCustom || "",
      gejala_tambahan: r.gejalaTambahan ? r.gejalaTambahan.join(" | ") : "",
      
      // Physiological data
      systolic_bp: r.vitalSign?.tekananDarahSistolik || 0,
      diastolic_bp: r.vitalSign?.tekananDarahDiastolik || 0,
      heart_rate: r.vitalSign?.heartRate || 0,
      respiratory_rate: r.vitalSign?.respiratoryRate || 0,
      body_temp: r.vitalSign?.suhuTubuh || 0.0,
      spo2: r.vitalSign?.saturasiOksigen || 100,
      gcs_eye: r.vitalSign?.gcs?.eye || 4,
      gcs_verbal: r.vitalSign?.gcs?.verbal || 5,
      gcs_motor: r.vitalSign?.gcs?.motor || 6,
      gcs_total: (r.vitalSign?.gcs?.eye || 4) + (r.vitalSign?.gcs?.verbal || 5) + (r.vitalSign?.gcs?.motor || 6),
      avpu: r.vitalSign?.avpu || "Alert",
      pola_napas: r.vitalSign?.polaNapas || "reguler",
      
      // Pain specs
      pain_scale: r.painScale?.skala || 0,
      pain_category: r.painScale?.kategori || "tidak nyeri",
      pain_location: r.painScale?.lokasi || "",
      pain_radiating: r.painScale?.menjalar ? 1 : 0,

      // Target Output
      predicted_ats: r.atsPrediction?.atsLevel || 3,
      final_ats: r.atsFinal?.atsLevelFinal || r.atsPrediction?.atsLevel || 3,
      ai_confidence: r.atsPrediction?.confidenceScore || 0,
      ai_provider_used: r.atsPrediction?.providerUsed || "",
      ai_model_used: resolveModelUsed(r),
      is_emergency: r.atsPrediction?.emergencyIndicator ? 1 : 0,
      classification_reasoning: r.atsPrediction?.alasanKlasifikasi || "",
      nama_petugas: r.atsFinal?.namaPetugas || "",
      jabatan_petugas: r.atsFinal?.jabatanPetugas || "",
      
      // Full concatenated SOAP Subjective/Objective string for NLP preprocessing, e.g. text classification
      nlp_concatenated_clinical_text: `SUBJECTIVE: Keluhan ${r.chiefComplaint}. ${r.chiefComplaintCustom ? `Kustom: ${r.chiefComplaintCustom}` : ""}. Riwayat: ${r.riwayatPenyakit ? r.riwayatPenyakit.join(", ") : "Tidak ada"}. Gejala tambahan: ${r.gejalaTambahan ? r.gejalaTambahan.join(", ") : "Tidak ada"}. Nyeri pada ${r.painScale?.lokasi || "N/A"} skala ${r.painScale?.skala}/10. OBJECTIVE: TD: ${r.vitalSign?.tekananDarahSistolik}/${r.vitalSign?.tekananDarahDiastolik} mmHg, HR: ${r.vitalSign?.heartRate}x, RR: ${r.vitalSign?.respiratoryRate}x, Temp: ${r.vitalSign?.suhuTubuh}C, SpO2: ${r.vitalSign?.saturasiOksigen}%, GCS E${r.vitalSign?.gcs?.eye || 4}V${r.vitalSign?.gcs?.verbal || 5}M${r.vitalSign?.gcs?.motor || 6}, AVPU: ${r.vitalSign?.avpu || "Alert"}.`,
    }));

    res.json({
      count: exportedData.length,
      exportDate: new Date().toISOString(),
      format: "NLP_ready_dataset",
      data: exportedData
    });
  } catch (err) {
    res.status(500).json({ error: "Gagal mengolah dataset ekspor" });
  }
});

// 6. DELETE RECORD
app.delete("/api/triage/records/:id", (req, res) => {
  try {
    const { id } = req.params;
    const records = readRecords();
    const idx = records.findIndex((r) => r.id === id);
    if (idx !== -1) {
      records.splice(idx, 1);
      writeRecords(records);
      return res.json({ success: true, message: `Triase ${id} terhapus` });
    }
    return res.status(404).json({ error: "Rekam triase tidak ditemukan" });
  } catch (err) {
    res.status(500).json({ error: "Gagal menghapus rekam triase" });
  }
});

// Setup Vite Dev Server / Static Hosting
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[ATS Server] running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
