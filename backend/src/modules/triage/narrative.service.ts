import { GoogleGenAI } from "@google/genai";
import { env } from "../../config/env";
import { callRunPod } from "../../shared/runpod";

const ai = new GoogleGenAI({
  apiKey: env.geminiApiKey || "dummy-key-to-prevent-instant-crash",
  httpOptions: {
    headers: { "User-Agent": "aistudio-build" },
  },
});

// Harus sinkron dengan daftar checkbox di src/components/IdentitasForm.tsx (HISTORIC_DISEASES)
const HISTORIC_DISEASES = [
  "Hipertensi",
  "Diabetes Melitus",
  "Penyakit Jantung",
  "Stroke",
  "Asma",
  "PPOK",
  "Gagal Ginjal",
  "Epilepsi",
  "Kanker",
  "Kehamilan",
  "Alergi Obat",
  "Tidak ada riwayat penyakit",
];

// Level nyeri kualitatif dipakai hanya kalau tidak ada angka eksplisit sama sekali.
// (?:\s+\S+){0,4} mengizinkan kata sisipan seperti "dada yang" di antara
// "nyeri" dan kata intensitasnya, tapi dibatasi jaraknya agar tidak salah
// tangkap kata umum ("sedang", "ringan") dari klausa lain yang tak terkait.
const PAIN_QUALITATIVE_LEVELS: [RegExp, number][] = [
  [/nyeri\b(?:\s+\S+){0,4}\s+(?:tak\s*tertahankan|luar biasa)/i, 9],
  [/nyeri\b(?:\s+\S+){0,4}\s+(?:sangat\s+)?(?:berat|hebat)/i, 8],
  [/nyeri\b(?:\s+\S+){0,4}\s+sedang\b/i, 5],
  [/nyeri\b(?:\s+\S+){0,3}\s+ringan\b/i, 2],
];

const DISEASE_KEYWORDS: [RegExp, string][] = [
  [/hipertensi|tekanan darah tinggi/, "Hipertensi"],
  [/diabetes|kencing manis|\bdm\b/, "Diabetes Melitus"],
  [/penyakit jantung|jantung koroner|arteri koroner|\bpjk\b|coronary artery|gagal jantung|\bcabg\b|bypass graft/, "Penyakit Jantung"],
  [/\bstroke\b/, "Stroke"],
  [/\basma\b/, "Asma"],
  [/ppok|bronkitis kronis|\bcopd\b/, "PPOK"],
  [/gagal ginjal|cuci darah|hemodialisis/, "Gagal Ginjal"],
  [/epilepsi|kejang berulang/, "Epilepsi"],
  [/kanker|tumor ganas|keganasan|karsinoma|metastasis|metastatik|onkologi/, "Kanker"],
  [/\bhamil\b|kehamilan/, "Kehamilan"],
  [/alergi obat|alergi\s+(?:terhadap\s+)?(?!makanan\b|debu\b|dingin\b|cuaca\b|serbuk\b|udara\b|logam\b)[a-z]{3,}/, "Alergi Obat"],
];

// Kata setelah "riwayat ..." yang menandakan klausa sudah berpindah topik
// (bukan lagi bagian dari daftar riwayat), dipakai untuk membatasi ekstraksi.
const HISTORY_STOP_MARKERS = /\b(datang|dibawa|tiba|mengeluh|dengan keluhan|menyangkal|sejak|dirujuk|masuk)\b/i;
const HISTORY_NEGATION_MARKERS = /\b(tidak|tanpa|tak ada|disangkal|bukan)\b/i;

function isCoveredByDiseaseKeyword(item: string): boolean {
  const lower = item.toLowerCase();
  return DISEASE_KEYWORDS.some(([pattern]) => pattern.test(lower));
}

/**
 * Tangkap riwayat/alergi yang disebutkan tapi tidak cocok ke 11 opsi checkbox
 * baku (mis. "dislipidemia", "hipotensi", "alergi terhadap penisilin" bila
 * sudah tercakup DISEASE_KEYWORDS akan dikecualikan di sini), alih-alih
 * dibuang begitu saja. Best-effort saja — narasi kompleks tetap lebih
 * baik ditangani lewat fallback AI (lihat isHeuristicResultWeak).
 */
function extractRiwayatLainnya(narrative: string): string {
  const items: string[] = [];
  const clauseRegex = /riwayat\s+([^.]+?)(?=\.|$)/gi;
  let match: RegExpExecArray | null;
  while ((match = clauseRegex.exec(narrative)) !== null) {
    const precedingContext = narrative.slice(Math.max(0, match.index - 25), match.index);
    if (HISTORY_NEGATION_MARKERS.test(precedingContext)) continue;

    let clause = match[1];
    const stopMatch = clause.match(HISTORY_STOP_MARKERS);
    if (stopMatch && stopMatch.index !== undefined) clause = clause.slice(0, stopMatch.index);

    const parts = clause
      .split(/,|\bdan\b|\bserta\b/i)
      .map((s) => s.trim())
      .filter((s) => s.length >= 3);
    items.push(...parts);
  }

  const seen = new Set<string>();
  const leftovers = items.filter((item) => {
    if (isCoveredByDiseaseKeyword(item)) return false;
    const key = item.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return leftovers
    .map((item) => item.charAt(0).toUpperCase() + item.slice(1))
    .join(", ")
    .slice(0, 300);
}

/**
 * Cari skala nyeri per kalimat (bukan window karakter tetap) supaya tidak
 * kehilangan angka yang berjarak jauh dari kata "nyeri"/"skala", dan
 * mengenali format umum lain (VAS/NRS, bare number, deskripsi kualitatif).
 * Prioritas: angka eksplisit ("X/10", "X dari 10") > VAS/NRS > angka polos
 * dekat kata skala/nyeri > deskripsi kualitatif (ringan/sedang/berat).
 */
function findPainScale(text: string): number | null {
  const sentences = text.split(/(?<=[.!?])\s+/);
  const isSentenceNegated = (sentence: string) => /\b(tidak|tanpa|menyangkal|disangkal|bukan|tak ada)\b/i.test(sentence);

  for (const sentence of sentences) {
    if (!/nyeri|skala|\bvas\b|\bnrs\b/i.test(sentence) || isSentenceNegated(sentence)) continue;

    const withDenominator = sentence.match(/(\d{1,2}(?:[.,]\d)?)\s*(?:\/|dari)\s*10\b/);
    if (withDenominator) return Math.min(10, Math.round(parseFloat(withDenominator[1].replace(",", "."))));

    const vasNrs = sentence.match(/\b(?:vas|nrs)\b\s*[:\-]?\s*(\d{1,2})\b/i);
    if (vasNrs) return Math.min(10, parseInt(vasNrs[1], 10));

    const bareScale =
      sentence.match(/skala\s*(?:nyeri)?\s*[:\-]?\s*(\d{1,2})\b/i) ||
      sentence.match(/nyeri\s*(?:dinilai|dirasakan)?\s*(?:skala)?\s*[:\-]?\s*(\d{1,2})\b/i);
    if (bareScale) return Math.min(10, parseInt(bareScale[1], 10));
  }

  for (const sentence of sentences) {
    if (isSentenceNegated(sentence)) continue;
    for (const [pattern, level] of PAIN_QUALITATIVE_LEVELS) {
      if (pattern.test(sentence)) return level;
    }
  }

  return null;
}

export function parseNarrativeHeuristic(narrative: string) {
  const text = narrative.toLowerCase();
  const result: any = {
    nomorRM: "",
    namaPasien: "Pasien Baru",
    umur: 30,
    gender: "Laki-laki",
    caraDatang: "Jalan sendiri",
    riwayatPenyakit: [],
    riwayatPenyakitLainnya: "",
    chiefComplaint: "Lain-lain",
    chiefComplaintCustom: narrative.length > 150 ? `${narrative.slice(0, 147)}...` : narrative,
    gejalaTambahan: [],
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
      avpu: "Alert",
    },
    painScale: { skala: 0, kategori: "tidak nyeri", lokasi: "Tidak ada", menjalar: false },
    pemeriksaanFisik: {
      kepala: { perdarahan: false, deformitas: false, pupilAnisokor: false, pupilIsokor: true, traumaKepala: false, kejang: false, sianosis: false, penurunanKesadaran: false },
      leher: { deviasiTrakea: false, distensiVenaJugularis: false, kakuKuduk: false, traumaLeher: false, pembesaranKelenjar: false, stridor: false },
      dada: { retraksi: false, wheezing: false, ronki: false, suaraNapasMenurun: false, nyeriDada: false, penggunaanOtotBantuNapas: false, asimetriDindingDada: false, distressRespirasi: false },
      perut: { distensiAbdomen: false, nyeriTekan: false, defenseMuscular: false, muntah: false, perdarahan: false, ascites: false, nyeriKuadranKananBawah: false, rigidAbdomen: false },
      ekstremitasAtas: { kelemahanMotorik: false, deformitas: false, edema: false, sianosis: false, tremor: false, perfusiBuruk: false, perdarahanAktif: false },
      ekstremitasBawah: { edema: false, deformitas: false, kelemahanMotorik: false, sianosis: false, perfusiBuruk: false, trauma: false, perdarahanAktif: false },
    },
  };

  const ageMatch = text.match(/(\d{1,3})\s*(tahun|th|yo|y\/o)/);
  if (ageMatch) result.umur = parseInt(ageMatch[1], 10);
  if (text.includes("wanita") || text.includes("perempuan") || text.includes("ibu") || text.includes("ny.")) result.gender = "Perempuan";
  if (text.includes("ambulans")) result.caraDatang = "Ambulans";
  else if (text.includes("stretcher")) result.caraDatang = "Stretcher";
  else if (text.includes("kursi roda")) result.caraDatang = "Kursi roda";

  // \b di kedua sisi "rm" mencegah salah tangkap dalam kata seperti "bermotor";
  // capture wajib mengandung digit karena nomor RM selalu numerik.
  const rmMatch = text.match(/\b(?:no\.?\s*rm|nomor\s*rm|rekam\s*medis|rm)\b\s*[:-]?\s*([a-zA-Z0-9-]*\d[a-zA-Z0-9-]*)/);
  if (rmMatch) result.nomorRM = rmMatch[1].toUpperCase().trim();
  const bpMatch = text.match(/(\d{2,3})\s*\/\s*(\d{2,3})/);
  if (bpMatch) {
    result.vitalSign.tekananDarahSistolik = parseInt(bpMatch[1], 10);
    result.vitalSign.tekananDarahDiastolik = parseInt(bpMatch[2], 10);
  }
  const hrMatch = text.match(/(hr|nadi|pulse|heart rate)\s*[:-]?\s*(\d+)/) || text.match(/nadi\s+(\d+)/);
  if (hrMatch) result.vitalSign.heartRate = parseInt(hrMatch[2] || hrMatch[1], 10);
  const rrMatch = text.match(/(rr|napas|nafas|respiratory)\s*[:-]?\s*(\d+)/) || text.match(/nafas\s+(\d+)/);
  if (rrMatch) result.vitalSign.respiratoryRate = parseInt(rrMatch[2] || rrMatch[1], 10);
  const spo2Match = text.match(/(spo2|saturasi|oxygen|oksigen)\s*[:-]?\s*(\d+)/);
  if (spo2Match) result.vitalSign.saturasiOksigen = parseInt(spo2Match[2] || spo2Match[1], 10);
  // Kalau narasi cuma menyebut suhu dalam Fahrenheit (tanpa Celsius eksplisit),
  // konversi ke Celsius supaya field suhuTubuh (selalu dalam Celsius) tidak
  // diam-diam jatuh ke default 36.5 padahal sebenarnya disebutkan.
  const tempCelsiusMatch =
    text.match(/suhu\s*(?:tubuh|badan)?\s*[:-]?\s*(\d{2}(?:[.,]\d{1,2})?)\s*°?\s*c\b/) ||
    text.match(/(\d{2}[.,]\d{1,2})\s*°?\s*c\b/);
  if (tempCelsiusMatch) {
    result.vitalSign.suhuTubuh = parseFloat(tempCelsiusMatch[1].replace(",", "."));
  } else {
    const tempFahrenheitMatch =
      text.match(/suhu\s*(?:tubuh|badan)?\s*[:-]?\s*(\d{2,3}(?:[.,]\d{1,2})?)\s*°?\s*f\b/) ||
      text.match(/(\d{2,3}[.,]\d{1,2})\s*°?\s*f\b/);
    if (tempFahrenheitMatch) {
      const fahrenheit = parseFloat(tempFahrenheitMatch[1].replace(",", "."));
      result.vitalSign.suhuTubuh = Math.round(((fahrenheit - 32) * 5 / 9) * 10) / 10;
    }
  }

  const foundSkala = findPainScale(text);
  if (foundSkala !== null) {
    result.painScale.skala = foundSkala;
    result.painScale.kategori = foundSkala === 0 ? "tidak nyeri" : foundSkala <= 3 ? "ringan" : foundSkala <= 6 ? "sedang" : "berat";
  }
  if (text.includes("menjalar")) result.painScale.menjalar = true;

  for (const [pattern, label] of DISEASE_KEYWORDS) {
    if (pattern.test(text) && !result.riwayatPenyakit.includes(label)) result.riwayatPenyakit.push(label);
  }
  result.riwayatPenyakitLainnya = extractRiwayatLainnya(narrative);

  const isPresent = (keyword: string) => text.includes(keyword) && !isNegatedMention(text, keyword);

  if (isPresent("sesak")) result.chiefComplaint = "Sesak napas";
  else if (isPresent("nyeri dada")) result.chiefComplaint = "Nyeri dada";
  else if (isPresent("trauma") || isPresent("kecelakaan")) result.chiefComplaint = "Trauma";
  else if (isPresent("demam")) result.chiefComplaint = "Demam";
  else if (isPresent("pingsan") || isPresent("penurunan kesadaran")) result.chiefComplaint = "Penurunan kesadaran";

  if (isPresent("sianosis")) result.gejalaTambahan.push("Sianosis");
  if (isPresent("perdarahan")) result.gejalaTambahan.push("Perdarahan aktif");
  if (isPresent("distress")) result.gejalaTambahan.push("Distress pernapasan");
  if (isPresent("nyeri menjalar")) result.gejalaTambahan.push("Nyeri menjalar");
  if (isPresent("kebas") || isPresent("mati rasa") || isPresent("kesemutan") || isPresent("kelemahan anggota gerak")) {
    result.gejalaTambahan.push("Kelemahan anggota gerak");
    result.pemeriksaanFisik.ekstremitasAtas.kelemahanMotorik = true;
  }

  return result;
}

/**
 * Deteksi kasar apakah sebuah kata kunci gejala disebutkan dalam klausa yang
 * dinegasikan ("menyangkal nyeri dada", "tidak sesak", dst). Batas klausa
 * dipatok ke kalimat sebelumnya (tanda titik terakhir) karena daftar gejala
 * yang disangkal biasanya dipisah koma dalam satu kalimat panjang.
 */
function isNegatedMention(text: string, keyword: string): boolean {
  const idx = text.indexOf(keyword);
  if (idx === -1) return false;
  const sentenceStart = text.lastIndexOf(".", idx) + 1;
  const clause = text.slice(sentenceStart, idx);
  return /\b(tidak|tanpa|menyangkal|disangkal|bukan|tak ada|tak\s|negatif)\b/.test(clause);
}

/**
 * Narasi klinis yang panjang/rinci biasanya memuat nuansa (riwayat penyakit,
 * gejala spesifik) yang tidak tertangkap oleh keyword matching di atas.
 * Dipakai router untuk memutuskan kapan perlu penyempurnaan via AI.
 */
export function isHeuristicResultWeak(narrative: string, record: ReturnType<typeof parseNarrativeHeuristic>) {
  const isDetailedNarrative = narrative.trim().length >= 350;
  const missedCoreSignals = record.riwayatPenyakit.length === 0 && record.painScale.skala === 0;
  return isDetailedNarrative || missedCoreSignals;
}

function buildExtractionPrompt(narrative: string) {
  return `Anda adalah asisten ekstraksi data medis IGD. Baca narasi klinis bebas berikut dan susun ulang menjadi data pasien terstruktur.

NARASI:
"""
${narrative}
"""

Aturan:
- nomorRM: gunakan nomor RM hanya bila disebutkan jelas dalam narasi; bila tidak disebutkan, isi string kosong "" agar aplikasi membuat nomor RM pasien baru secara otomatis.
- riwayatPenyakit HANYA boleh berisi nilai dari daftar berikut, pilih yang relevan (boleh lebih dari satu, kosongkan [] bila tidak disebutkan): ${HISTORIC_DISEASES.join(", ")}.
- riwayatPenyakitLainnya: tulis riwayat penyakit/bedah/kondisi lain yang disebutkan namun tidak ada di daftar di atas, pisahkan dengan koma. Kosongkan "" bila tidak ada.
- painScale.skala: angka 0-10 sesuai intensitas nyeri yang disebutkan; 0 bila tidak disebutkan nyeri.
- vitalSign.suhuTubuh WAJIB dalam Celsius. Bila narasi menyebutkan suhu dalam Fahrenheit (°F), konversi ke Celsius dengan rumus (F-32)*5/9 sebelum ditulis ke field ini.
- Bila suatu data tidak disebutkan dalam narasi, gunakan nilai default wajar (mis. GCS E4V5M6, AVPU Alert, suhu 36.5).

Output WAJIB JSON valid dengan struktur persis berikut (tanpa markdown, tanpa penjelasan tambahan):
{
  "nomorRM": "<string>",
  "namaPasien": "<string>",
  "umur": <number>,
  "gender": "<Laki-laki|Perempuan>",
  "caraDatang": "<Jalan sendiri|Ambulans|Stretcher|Kursi roda>",
  "riwayatPenyakit": [<string>],
  "riwayatPenyakitLainnya": "<string>",
  "chiefComplaint": "<string>",
  "chiefComplaintCustom": "<string>",
  "gejalaTambahan": [<string>],
  "vitalSign": {
    "tekananDarahSistolik": <number>, "tekananDarahDiastolik": <number>,
    "heartRate": <number>, "respiratoryRate": <number>, "suhuTubuh": <number>, "saturasiOksigen": <number>,
    "gcs": { "eye": <number 1-4>, "verbal": <number 1-5>, "motor": <number 1-6> },
    "polaNapas": "<string>", "ototBantuNapas": <boolean>, "retraksi": <boolean>, "stridor": <boolean>, "wheezing": <boolean>, "apnea": <boolean>,
    "avpu": "<Alert|Verbal|Pain|Unresponsive>"
  },
  "painScale": { "skala": <0-10>, "kategori": "<string>", "lokasi": "<string>", "menjalar": <boolean> },
  "pemeriksaanFisik": {
    "kepala": { "perdarahan": <boolean>, "deformitas": <boolean>, "pupilAnisokor": <boolean>, "pupilIsokor": <boolean>, "traumaKepala": <boolean>, "kejang": <boolean>, "sianosis": <boolean>, "penurunanKesadaran": <boolean> },
    "leher": { "deviasiTrakea": <boolean>, "distensiVenaJugularis": <boolean>, "kakuKuduk": <boolean>, "traumaLeher": <boolean>, "pembesaranKelenjar": <boolean>, "stridor": <boolean> },
    "dada": { "retraksi": <boolean>, "wheezing": <boolean>, "ronki": <boolean>, "suaraNapasMenurun": <boolean>, "nyeriDada": <boolean>, "penggunaanOtotBantuNapas": <boolean>, "asimetriDindingDada": <boolean>, "distressRespirasi": <boolean> },
    "perut": { "distensiAbdomen": <boolean>, "nyeriTekan": <boolean>, "defenseMuscular": <boolean>, "muntah": <boolean>, "perdarahan": <boolean>, "ascites": <boolean>, "nyeriKuadranKananBawah": <boolean>, "rigidAbdomen": <boolean> },
    "ekstremitasAtas": { "kelemahanMotorik": <boolean>, "deformitas": <boolean>, "edema": <boolean>, "sianosis": <boolean>, "tremor": <boolean>, "perfusiBuruk": <boolean>, "perdarahanAktif": <boolean> },
    "ekstremitasBawah": { "edema": <boolean>, "deformitas": <boolean>, "kelemahanMotorik": <boolean>, "sianosis": <boolean>, "perfusiBuruk": <boolean>, "trauma": <boolean>, "perdarahanAktif": <boolean> }
  }
}`;
}

const EXTRACTION_SYSTEM_INSTRUCTION = "Anda adalah asisten ekstraksi data rekam medis IGD. Balas hanya JSON valid tanpa markdown.";

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

function extractRecordPayload(payload: any, depth = 0): any {
  if (!payload || depth > 6) return null;

  if (typeof payload === "string") {
    for (const parsedPayload of parseJsonPayloads(payload)) {
      const parsed = extractRecordPayload(parsedPayload, depth + 1);
      if (parsed) return parsed;
    }
    return null;
  }

  if (Array.isArray(payload)) {
    for (const item of payload) {
      const parsed = extractRecordPayload(item, depth + 1);
      if (parsed) return parsed;
    }
    return null;
  }

  if (payload.vitalSign || payload.chiefComplaint || payload.namaPasien || payload.painScale) return payload;

  const candidates = [
    payload?.choices?.[0]?.message?.content,
    payload?.choices?.[0]?.message?.reasoning,
    payload?.choices?.[0]?.text,
    // Bentuk balasan job-queue RunPod worker-vllm (bukan rute /openai/): output[].choices[].tokens[].
    Array.isArray(payload?.choices?.[0]?.tokens) ? payload.choices[0].tokens.join("") : undefined,
    payload?.generated_text,
    payload?.text,
    payload?.record,
    payload?.result,
    payload?.output?.record,
    payload?.output,
  ];

  for (const candidate of candidates) {
    const parsed = extractRecordPayload(candidate, depth + 1);
    if (parsed) return parsed;
  }

  return null;
}

async function extractWithGemini(promptText: string) {
  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash",
    contents: promptText,
    config: {
      systemInstruction: EXTRACTION_SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
    },
  });
  return extractRecordPayload(JSON.parse(response.text?.trim() || "{}"));
}

async function extractWithHuggingFace(promptText: string, aiModel?: string) {
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
        { role: "system", content: EXTRACTION_SYSTEM_INSTRUCTION },
        { role: "user", content: promptText },
      ],
      max_tokens: 3000,
      temperature: 0.1,
      stream: false,
    }),
  });
  if (!response.ok) throw new Error(`Hugging Face API returned status ${response.status}`);
  const data = await response.json();
  return extractRecordPayload(data);
}

async function extractWithRunPod(promptText: string) {
  const usesOpenAiCompatibleEndpoint = /\/v1\/|\/chat\/completions/i.test(env.customModelUrl);
  const targetUrl = usesOpenAiCompatibleEndpoint && !/\/chat\/completions\/?$/i.test(env.customModelUrl)
    ? `${env.customModelUrl.replace(/\/$/, "")}/chat/completions`
    : env.customModelUrl;
  const messages = [
    { role: "system", content: EXTRACTION_SYSTEM_INSTRUCTION },
    { role: "user", content: promptText },
  ];
  const requestBody = usesOpenAiCompatibleEndpoint
    ? {
        model: env.runpodVllmModel,
        messages,
        // 1200 dipilih supaya prompt (skema ekstraksi + narasi) + max_tokens tidak melebihi
        // max_model_len endpoint (banyak deployment RunPod dibatasi 4096 token) — pernah
        // diverifikasi max_tokens 3000 bikin worker balas HTTP 500 generik begitu
        // prompt+budget lewat batas konteks model.
        max_tokens: 1200,
        temperature: 0.1,
        stream: false,
        response_format: { type: "json_object" },
        chat_template_kwargs: { enable_thinking: false },
      }
    : {
        input: {
          prompt: promptText,
          promptText,
          // sampling_params adalah satu-satunya field resmi yang dibaca worker-vllm untuk
          // parameter generasi di rute job-queue (/run, /runsync) — max_tokens/temperature
          // di top-level input diabaikan. chat_template_kwargs TIDAK didukung sama sekali di
          // rute ini (hanya di /openai/v1/chat/completions), jadi tetap disertakan hanya
          // untuk kompatibilitas handler custom lain yang mungkin membacanya langsung.
          sampling_params: { max_tokens: 1200, temperature: 0.1 },
          max_tokens: 1200,
          chat_template_kwargs: { enable_thinking: false },
          messages,
        },
      };

  const data = await callRunPod({
    targetUrl,
    requestBody,
    apiKey: env.runpodApiKey,
    isJobQueueFormat: !usesOpenAiCompatibleEndpoint,
  });
  return extractRecordPayload(data);
}

export async function parseNarrativeWithAI(narrative: string, aiProvider?: string, aiModel?: string) {
  if (!aiProvider || aiProvider === "rulebased") return null;
  const promptText = buildExtractionPrompt(narrative);

  let record: any = null;
  if (aiProvider === "huggingface" && env.huggingFaceApiKey) {
    record = await extractWithHuggingFace(promptText, aiModel);
  } else if ((aiProvider === "runpod" || aiProvider === "custom") && env.customModelUrl) {
    record = await extractWithRunPod(promptText);
  } else if (aiProvider === "gemini" && env.geminiApiKey) {
    record = await extractWithGemini(promptText);
  }

  if (!record) throw new Error("AI tidak mengembalikan data rekam medis yang terstruktur.");
  return record;
}
