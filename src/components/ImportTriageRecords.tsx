import React, { useState } from "react";
import { TriageRecord, Gender, CaraDatang } from "../types";
import { 
  Sparkles, 
  Terminal, 
  User, 
  Activity, 
  Flame, 
  Stethoscope, 
  AlertCircle, 
  CheckCircle, 
  ArrowRight,
  ClipboardCheck,
  RotateCcw,
  BookOpen
} from "lucide-react";

interface ImportTriageRecordsProps {
  onApplyRecord: (record: TriageRecord) => void;
  setErrorMsg: (msg: string | null) => void;
  setSuccessMsg: (msg: string | null) => void;
  aiProvider: string;
  aiModel: string;
}

// 3 Realistic Indonesian Healthcare Handover Presets for immediate Q&As
const CLINICAL_PRESETS = [
  {
    title: "🚨 Kasus Kardiovaskular Akut",
    label: "Nyeri Dada",
    text: "Mas Budi, umur 45 tahun, RM-99812 dibawa oleh ambulans dalam keadaan sadar penuh (Alert). Mengeluh nyeri dada berat sebelah kiri menjalar ke bahu kiri dan punggung, sudah berlangsung sejak 3 jam lalu. Skala nyeri 8 dari 10. Pasien tampak berkeringat dingin, mual, dan cemas. TTV: tekanan darah 150/90 mmHg, HR/nadi 105 x/menit reguler, napas atau respiratory rate 26 x/menit, suhu tubuh 36.6 C, SpO2 93%. Riwayat mengidap penyakit jantung koroner dan hipertensi tidak terkontrol."
  },
  {
    title: "🧸 Kasus Febris Anak",
    label: "Demam Tinggi",
    text: "Anak Cici, perempuan berusia 4 tahun dibawa ibunya berjalan sendiri dengan keluhan demam tinggi naik turun sejak 3 hari disertai muntah 2 kali hari ini. Anak tampak rewel, lemas, dan tidak mau makan. Skala nyeri kepala dinilai ringan 2 dari 10. Tanda vital: suhu badan sangat panas 39.2 C, frekuensi nadi 115 x/menit, laju napas 22 x/menit, SpO2 98%. Kesadaran Alert, tidak didapatkan adanya kaku kuduk ataupun kejang, pemeriksaan abdomen supel tidak kembung."
  },
  {
    title: "⚡ Kasus Trauma & Penurunan Kesadaran",
    label: "Kecelakaan",
    text: "Tn. Heri, 28 tahun dibawa dengan stretcher oleh polisi setelah mengalami kecelakaan lalu lintas tunggal. Pasien mengalami penurunan kesadaran, hanya merespon saat diberikan rangsangan nyeri pada sternum (AVPU Pain). Mengalami luka parah robek disertai perdarahan aktif pada dada sebelah kanan dan trauma kepala ringan. Hasil TTV: tensi sangat rendah 90/60 mmHg (hipotensi), nadi cepat teraba lemah 130 x/menit, napas cepat dangkal 32 x/menit (takipnea), suhu tubuh 36.0 C, dan saturasi oksigen sangat kritis SpO2 88% dengan tampak sianosis pada ujung jari tangan. Skor GCS dinilai E2 V2 M4."
  }
];

export default function ImportTriageRecords({
  onApplyRecord,
  setErrorMsg,
  setSuccessMsg,
  aiProvider,
  aiModel,
}: ImportTriageRecordsProps) {
  const [narrative, setNarrative] = useState("");
  const [loading, setLoading] = useState(false);
  const [parsedRecord, setParsedRecord] = useState<TriageRecord | null>(null);

  const handleLoadPreset = (text: string) => {
    setNarrative(text);
    setParsedRecord(null);
    setErrorMsg(null);
  };

  const handleParseNarrative = async () => {
    if (!narrative.trim()) {
      setErrorMsg("Harap masukkan data narasi klinis terlebih dahulu.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    setParsedRecord(null);

    try {
      const res = await fetch("/api/triage/parse-narrative", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ narrative, aiProvider, aiModel }),
      });

      if (!res.ok) {
        throw new Error("Gagal menghubungi server triage parser.");
      }

      const data = await res.json();
      if (data.success && data.record) {
        setParsedRecord(data.record);
        setSuccessMsg(
          data.source === "ai"
            ? "🎉 AI berhasil memilah & mengekstrak data narasi klinis!"
            : "✅ Berhasil memilah data narasi klinis (mode cepat/heuristik)."
        );
      } else {
        throw new Error(data.error || "Gagal menstrukturisasikan data narasi klinis.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Terjadi kendala internal saat mengekstrak narasi.");
    } finally {
      setLoading(false);
    }
  };

  const handleApplyToForm = () => {
    if (!parsedRecord) return;
    onApplyRecord(parsedRecord);
    setSuccessMsg("📋 Data hasil pilahan AI berhasil disuntikkan ke formulir triase di bawah! Silakan tinjau & klik hitung ATS.");
    // Scroll smoothly to Form View
    const targetElement = document.getElementById("clinical-form-container");
    if (targetElement) {
      targetElement.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const gcsTotalParsed = parsedRecord?.vitalSign?.gcs
    ? (parsedRecord.vitalSign.gcs.eye || 4) + 
      (parsedRecord.vitalSign.gcs.verbal || 5) + 
      (parsedRecord.vitalSign.gcs.motor || 6)
    : 15;

  return (
    <div 
      className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-6" 
      id="narrative-ai-parser-widget"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-50 dark:border-slate-800/80 pb-4">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-wider rounded-full mb-1">
            <Sparkles size={11} className="animate-pulse" />
            <span>Fitur Utama AI</span>
          </span>
          <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2">
            <span>🧠 Pengurai & Pemilah Narasi Klinis IGD (NLP)</span>
          </h3>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium leading-relaxed">
            Ketik atau tempel salinan narasi klinis bebas (verbal handover, rekam medis perawat, atau keluhan bebas). AI akan langsung memilah ("memilah") informasi identitas, tanda vital, lokasi nyeri, hingga kelainan fisik secara terstruktur.
          </p>
        </div>
      </div>

      {/* Preset Buttons */}
      <div className="space-y-2">
        <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
          <BookOpen size={12} />
          <span>Klik Contoh Demo Kasus Untuk Mencoba:</span>
        </label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          {CLINICAL_PRESETS.map((p, index) => (
            <button
              key={index}
              type="button"
              onClick={() => handleLoadPreset(p.text)}
              className="p-3 text-left border border-slate-100 dark:border-slate-800 rounded-xl hover:border-indigo-400 hover:bg-slate-50/50 dark:hover:bg-slate-950/20 hover:shadow-xs transition cursor-pointer"
            >
              <div className="text-[11px] font-bold text-slate-700 dark:text-slate-350 line-clamp-1">
                {p.title}
              </div>
              <span className="inline-block text-[9px] font-black tracking-wider uppercase text-indigo-500 mt-1">
                Kategori: {p.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Textarea Input area */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="block text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Masukkan Catatan / Narasi Keluhan IGD Pasien:
          </label>
          <span className="text-[9px] font-mono text-slate-400">
            {narrative.length} karakter
          </span>
        </div>

        <div className="relative">
          <textarea
            value={narrative}
            onChange={(e) => setNarrative(e.target.value)}
            disabled={loading}
            rows={5}
            placeholder="Contoh: Laki-laki Tn. Budi umur 45 tahun datang digendong keluarga karena mengeluh sesak napas berat disertai demam 38 derajat celsius sejak 2 hari yang lalu..."
            className="w-full text-xs font-medium px-4 py-3.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 dark:bg-slate-950/40 dark:border-slate-800 dark:text-slate-200 outline-none rounded-2xl transition leading-relaxed shadow-inner focus:shadow-none"
          />
          {narrative && !loading && (
            <button
              type="button"
              onClick={() => setNarrative("")}
              className="absolute right-3.5 bottom-3.5 p-1 text-[9px] font-bold text-slate-400 bg-white dark:bg-slate-850 hover:text-slate-600 dark:hover:text-slate-300 border border-slate-100 dark:border-slate-750/50 rounded-lg shadow-3xs hover:shadow-xs transition"
              title="Reset Input"
            >
              Hapus
            </button>
          )}
        </div>
      </div>

      {/* Submit Controls */}
      <div className="flex items-center gap-3 justify-end border-b border-slate-50 dark:border-slate-850 pb-5">
        {narrative && (
          <button
            type="button"
            onClick={() => handleLoadPreset("")}
            className="px-4 py-2 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-indigo-600 transition flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw size={12} />
            <span>Reset</span>
          </button>
        )}
        <button
          type="button"
          onClick={handleParseNarrative}
          disabled={loading || !narrative.trim()}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition select-none shadow-sm cursor-pointer ${
            loading 
              ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed" 
              : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-100 dark:shadow-none"
          }`}
        >
          {loading ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
              <span>Sedang Memilah Data Triage...</span>
            </>
          ) : (
            <>
              <Sparkles size={14} className="animate-bounce" />
              <span>Pilah & Strukturisasi via AI</span>
            </>
          )}
        </button>
      </div>

      {/* AI Extraction Progress Simulator / Result Dashboard */}
      {parsedRecord && (
        <div className="space-y-4 animate-fade-in bg-slate-50/50 dark:bg-slate-950/20 border border-dashed border-indigo-200 dark:border-indigo-900 rounded-2xl p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className="p-1 px-2 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 text-[10px] font-black uppercase tracking-wider rounded-md">
                ✓ Berhasil Diurai
              </span>
              <h4 className="text-[12px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest flex items-center gap-1.5">
                <Terminal size={13} />
                <span>Hasil Ekstraksi Fitur Klinis AI</span>
              </h4>
            </div>

            <button
              onClick={handleApplyToForm}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-black uppercase tracking-wider rounded-xl cursor-pointer"
            >
              <ClipboardCheck size={13} />
              <span>Terapkan ke Formulir Utama</span>
              <ArrowRight size={12} className="ml-0.5 animate-pulse" />
            </button>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {/* Identity */}
            <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-800 shadow-3xs space-y-2">
              <div className="flex items-center gap-1.5 text-[9px] font-black text-slate-400 uppercase">
                <User size={12} className="text-slate-400" />
                <span>Identitas Pasien</span>
              </div>
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block truncate">
                  {parsedRecord.namaPasien || "Tidak terurai"}
                </span>
                <span className="text-[10px] font-semibold text-indigo-500 block">
                  {parsedRecord.nomorRM || "KOSONG/BARU"}
                </span>
                <span className="text-[10px] text-slate-500 font-medium block">
                  {parsedRecord.umur} Tahun · {parsedRecord.gender}
                </span>
              </div>
            </div>

            {/* Vital Signs metrics */}
            <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-800 shadow-3xs space-y-2 sm:col-span-1 md:col-span-2">
              <div className="flex items-center gap-1.5 text-[9px] font-black text-slate-400 uppercase">
                <Activity size={12} className="text-red-500" />
                <span>Hasil Tanda Vital (TTV)</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="text-center bg-slate-50 dark:bg-slate-950/40 p-1.5 rounded-lg">
                  <span className="text-[9px] font-bold text-slate-400 block uppercase">TD (mmHg)</span>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-350">
                    {parsedRecord.vitalSign.tekananDarahSistolik}/{parsedRecord.vitalSign.tekananDarahDiastolik}
                  </span>
                </div>
                <div className="text-center bg-slate-50 dark:bg-slate-950/40 p-1.5 rounded-lg">
                  <span className="text-[9px] font-bold text-slate-400 block uppercase">Nadi (HR)</span>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-350">
                    {parsedRecord.vitalSign.heartRate}x
                  </span>
                </div>
                <div className="text-center bg-slate-50 dark:bg-slate-950/40 p-1.5 rounded-lg">
                  <span className="text-[9px] font-bold text-slate-400 block uppercase">Napas (RR)</span>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-350">
                    {parsedRecord.vitalSign.respiratoryRate}x
                  </span>
                </div>
                <div className="text-center bg-slate-50 dark:bg-slate-950/40 p-1.5 rounded-lg">
                  <span className="text-[9px] font-bold text-slate-400 block uppercase">Suhu (T)</span>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-350">
                    {parsedRecord.vitalSign.suhuTubuh} °C
                  </span>
                </div>
                <div className="text-center bg-slate-50 dark:bg-slate-950/40 p-1.5 rounded-lg">
                  <span className="text-[9px] font-bold text-slate-400 block uppercase">SpO2 (%)</span>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-350">
                    {parsedRecord.vitalSign.saturasiOksigen}%
                  </span>
                </div>
                <div className="text-center bg-slate-50 dark:bg-slate-950/40 p-1.5 rounded-lg">
                  <span className="text-[9px] font-bold text-slate-400 block uppercase">Kesadaran</span>
                  <span className="text-[10px] font-bold text-indigo-500 block uppercase">
                    {parsedRecord.vitalSign.avpu || "Alert"} {gcsTotalParsed < 15 && `(GCS ${gcsTotalParsed})`}
                  </span>
                </div>
              </div>
            </div>

            {/* Pain details */}
            <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-800 shadow-3xs space-y-2">
              <div className="flex items-center gap-1.5 text-[9px] font-black text-slate-400 uppercase">
                <Flame size={12} className="text-orange-500" />
                <span>Nyeri & Lokasi</span>
              </div>
              <div className="space-y-1">
                <span className="text-xs font-black uppercase text-orange-600">
                  Skala {parsedRecord.painScale.skala}/10
                </span>
                <span className="text-[10px] font-semibold text-slate-700 dark:text-slate-300 block truncate">
                  Lokasi: {parsedRecord.painScale.lokasi || "Tidak ada"}
                </span>
                <span className="text-[9px] text-slate-500 font-semibold block">
                  Nyeri Menjalar: {parsedRecord.painScale.menjalar ? "✓ Ya" : "✗ Tidak"}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            {/* Clinical signs & symptoms extracted */}
            <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-800 shadow-3xs space-y-1.5">
              <div className="text-[9px] font-black text-slate-400 uppercase block">
                🏥 Riwayat Komorbid & Gejala Tambahan:
              </div>
              <div className="flex flex-wrap gap-1.5">
                {parsedRecord.riwayatPenyakit && parsedRecord.riwayatPenyakit.length > 0 ? (
                  parsedRecord.riwayatPenyakit.map((r, i) => (
                    <span key={i} className="px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400">
                      Komorbid: {r}
                    </span>
                  ))
                ) : (
                  <span className="text-[10px] text-slate-400 font-medium">Tidak terdeteksi komorbid</span>
                )}

                {parsedRecord.gejalaTambahan && parsedRecord.gejalaTambahan.length > 0 && (
                  parsedRecord.gejalaTambahan.map((r, i) => (
                    <span key={i} className="px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
                      Gejala: {r}
                    </span>
                  ))
                )}
              </div>
            </div>

            {/* Extracted Objective/Physical examination signs */}
            <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-800 shadow-3xs space-y-1.5">
              <div className="text-[9px] font-black text-slate-400 uppercase block">
                🔬 Kelainan Pemeriksaan Fisik (Anomali SOAP):
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[
                  // Kepala
                  parsedRecord.pemeriksaanFisik?.kepala?.perdarahan && "Perdarahan Kepala",
                  parsedRecord.pemeriksaanFisik?.kepala?.pupilAnisokor && "Pupil Anisokor 👁️",
                  parsedRecord.pemeriksaanFisik?.kepala?.sianosis && "Sianosis Kepala",
                  parsedRecord.pemeriksaanFisik?.kepala?.penurunanKesadaran && "Koma/Delirium",
                  parsedRecord.pemeriksaanFisik?.kepala?.kejang && "Kejang Aktif",
                  // Dada
                  parsedRecord.pemeriksaanFisik?.dada?.retraksi && "Retraksi Dada 🫁",
                  parsedRecord.pemeriksaanFisik?.dada?.wheezing && "Wheezing Suara Napas",
                  parsedRecord.pemeriksaanFisik?.dada?.nyeriDada && "Nyeri Dada Kardiologis",
                  parsedRecord.pemeriksaanFisik?.dada?.asimetriDindingDada && "Asimetri Paru ⚠️",
                  parsedRecord.pemeriksaanFisik?.dada?.distressRespirasi && "Gawat Napas Kritis",
                  // Perut
                  parsedRecord.pemeriksaanFisik?.perut?.defenseMuscular && "Defense Muscular Perut",
                  parsedRecord.pemeriksaanFisik?.perut?.rigidAbdomen && "Abdomen Rigid / Peritonitis",
                  parsedRecord.pemeriksaanFisik?.perut?.muntah && "Muntah Proyektil",
                  // Extremities
                  parsedRecord.pemeriksaanFisik?.ekstremitasAtas?.perfusiBuruk && "Perfusi Akral Buruk",
                  parsedRecord.pemeriksaanFisik?.ekstremitasBawah?.edema && "Edema Anasarka"
                ].filter(Boolean).length > 0 ? (
                  [
                    parsedRecord.pemeriksaanFisik?.kepala?.perdarahan && "Perdarahan Kepala",
                    parsedRecord.pemeriksaanFisik?.kepala?.pupilAnisokor && "Pupil Anisokor 👁️",
                    parsedRecord.pemeriksaanFisik?.kepala?.sianosis && "Sianosis Kepala",
                    parsedRecord.pemeriksaanFisik?.kepala?.penurunanKesadaran && "Koma/Delirium",
                    parsedRecord.pemeriksaanFisik?.kepala?.kejang && "Kejang Aktif",
                    parsedRecord.pemeriksaanFisik?.dada?.retraksi && "Retraksi Dada 🫁",
                    parsedRecord.pemeriksaanFisik?.dada?.wheezing && "Wheezing Suara Napas",
                    parsedRecord.pemeriksaanFisik?.dada?.nyeriDada && "Nyeri Dada Kardiologis",
                    parsedRecord.pemeriksaanFisik?.dada?.asimetriDindingDada && "Asimetri Paru ⚠️",
                    parsedRecord.pemeriksaanFisik?.dada?.distressRespirasi && "Gawat Napas Kritis",
                    parsedRecord.pemeriksaanFisik?.perut?.defenseMuscular && "Defense Muscular Perut",
                    parsedRecord.pemeriksaanFisik?.perut?.rigidAbdomen && "Abdomen Rigid",
                    parsedRecord.pemeriksaanFisik?.perut?.muntah && "Muntah",
                    parsedRecord.pemeriksaanFisik?.ekstremitasAtas?.perfusiBuruk && "Perfusi Akral Buruk",
                    parsedRecord.pemeriksaanFisik?.ekstremitasBawah?.edema && "Edema Tungkai"
                  ]
                    .filter(Boolean)
                    .map((item, index) => (
                      <span key={index} className="px-1.5 py-0.5 rounded-md text-[9px] font-black bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400">
                        {item}
                      </span>
                    ))
                ) : (
                  <span className="text-[10px] text-slate-400 font-medium font-mono">Normal (Bebas dari anomali klinis akut)</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={handleApplyToForm}
              className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-widest cursor-pointer shadow-md shadow-indigo-100 dark:shadow-none"
            >
              <ClipboardCheck size={14} />
              <span>Suntikkan Ke Formulir Pengisian Dan Lakukan Triage</span>
              <ArrowRight size={14} className="animate-pulse" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
