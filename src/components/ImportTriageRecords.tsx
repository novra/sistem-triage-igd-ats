import React, { useEffect, useRef, useState } from "react";
import { TriageRecord } from "../types";
import {
  Sparkles,
  Terminal,
  User,
  Activity,
  Flame,
  ArrowRight,
  ClipboardCheck,
  RotateCcw,
  BookOpen,
  Mic,
  Square
} from "lucide-react";
import { Card } from "./ui/Card";
import { Button } from "./ui/Button";
import { Badge } from "./ui/Badge";
import { TextareaField } from "./ui/Input";
import { useSpeechRecognition } from "../hooks/useSpeechRecognition";

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
    title: "Kasus Kardiovaskular Akut",
    label: "Nyeri Dada",
    text: "Mas Budi, umur 45 tahun, RM-99812 dibawa oleh ambulans dalam keadaan sadar penuh (Alert). Mengeluh nyeri dada berat sebelah kiri menjalar ke bahu kiri dan punggung, sudah berlangsung sejak 3 jam lalu. Skala nyeri 8 dari 10. Pasien tampak berkeringat dingin, mual, dan cemas. TTV: tekanan darah 150/90 mmHg, HR/nadi 105 x/menit reguler, napas atau respiratory rate 26 x/menit, suhu tubuh 36.6 C, SpO2 93%. Riwayat mengidap penyakit jantung koroner dan hipertensi tidak terkontrol."
  },
  {
    title: "Kasus Febris Anak",
    label: "Demam Tinggi",
    text: "Anak Cici, perempuan berusia 4 tahun dibawa ibunya berjalan sendiri dengan keluhan demam tinggi naik turun sejak 3 hari disertai muntah 2 kali hari ini. Anak tampak rewel, lemas, dan tidak mau makan. Skala nyeri kepala dinilai ringan 2 dari 10. Tanda vital: suhu badan sangat panas 39.2 C, frekuensi nadi 115 x/menit, laju napas 22 x/menit, SpO2 98%. Kesadaran Alert, tidak didapatkan adanya kaku kuduk ataupun kejang, pemeriksaan abdomen supel tidak kembung."
  },
  {
    title: "Kasus Trauma & Penurunan Kesadaran",
    label: "Kecelakaan",
    text: "Tn. Heri, 28 tahun dibawa dengan stretcher oleh polisi setelah mengalami kecelakaan lalu lintas tunggal. Pasien mengalami penurunan kesadaran, hanya merespon saat diberikan rangsangan nyeri pada sternum (AVPU Pain). Mengalami luka parah robek disertai perdarahan aktif pada dada sebelah kanan dan trauma kepala ringan. Hasil TTV: tensi sangat rendah 90/60 mmHg (hipotensi), nadi cepat teraba lemah 130 x/menit, napas cepat dangkal 32 x/menit (takipnea), suhu tubuh 36.0 C, dan saturasi oksigen sangat kritis SpO2 88% dengan tampak sianosis pada ujung jari tangan. Skor GCS dinilai E2 V2 M4."
  }
];

function ExtractedField({ label, icon: Icon, iconTone, children, className = "" }: { label: string; icon: React.ComponentType<{ size?: number; className?: string }>; iconTone: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`space-y-2 rounded-xl border border-border/70 bg-surface p-3 ${className}`}>
      <div className="flex items-center gap-1.5 text-xs font-black uppercase text-text-muted">
        <Icon size={12} className={iconTone} />
        <span>{label}</span>
      </div>
      {children}
    </div>
  );
}

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
  const narrativeBaseRef = useRef("");
  const { isSupported: isVoiceSupported, isListening, start: startListening, stop: stopListening } = useSpeechRecognition(
    (finalText, interimText) => setNarrative(`${narrativeBaseRef.current}${finalText}${interimText}`),
  );
  const engineLabel = aiProvider === "runpod"
    ? "Model Mandiri"
    : aiProvider === "huggingface"
      ? `Hugging Face (${aiModel === "deepseek" ? "DeepSeek" : "OpenAI OSS"})`
      : "Rule-Based Klinis";

  useEffect(() => {
    setParsedRecord(null);
  }, [aiProvider, aiModel]);

  const handleLoadPreset = (text: string) => {
    setNarrative(text);
    setParsedRecord(null);
    setErrorMsg(null);
  };

  const handleToggleVoice = () => {
    if (isListening) {
      stopListening();
      return;
    }
    if (!isVoiceSupported) {
      setErrorMsg("Rekam suara belum didukung di browser ini. Gunakan Chrome atau Edge terbaru, atau ketik narasi secara manual.");
      return;
    }
    setErrorMsg(null);
    narrativeBaseRef.current = narrative.trim() ? `${narrative.trim()} ` : "";
    startListening();
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
        const baseMsg = data.source === "ai"
          ? "AI berhasil memilah & mengekstrak data narasi klinis!"
          : "Berhasil memilah data narasi klinis (mode cepat/heuristik).";
        setSuccessMsg(data.notice ? `${baseMsg} ${data.notice}` : baseMsg);
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
    setSuccessMsg("Data hasil pilahan berhasil disuntikkan ke formulir di halaman ini. Silakan periksa dan koreksi datanya.");
    const targetElement = document.getElementById("narrative-injected-form");
    if (targetElement) {
      targetElement.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const gcsTotalParsed = parsedRecord?.vitalSign?.gcs
    ? (parsedRecord.vitalSign.gcs.eye || 4) +
      (parsedRecord.vitalSign.gcs.verbal || 5) +
      (parsedRecord.vitalSign.gcs.motor || 6)
    : 15;

  const examFindings = parsedRecord ? [
    parsedRecord.pemeriksaanFisik?.kepala?.perdarahan && "Perdarahan Kepala",
    parsedRecord.pemeriksaanFisik?.kepala?.pupilAnisokor && "Pupil Anisokor",
    parsedRecord.pemeriksaanFisik?.kepala?.sianosis && "Sianosis Kepala",
    parsedRecord.pemeriksaanFisik?.kepala?.penurunanKesadaran && "Koma/Delirium",
    parsedRecord.pemeriksaanFisik?.kepala?.kejang && "Kejang Aktif",
    parsedRecord.pemeriksaanFisik?.dada?.retraksi && "Retraksi Dada",
    parsedRecord.pemeriksaanFisik?.dada?.wheezing && "Wheezing Suara Napas",
    parsedRecord.pemeriksaanFisik?.dada?.nyeriDada && "Nyeri Dada Kardiologis",
    parsedRecord.pemeriksaanFisik?.dada?.asimetriDindingDada && "Asimetri Paru",
    parsedRecord.pemeriksaanFisik?.dada?.distressRespirasi && "Gawat Napas Kritis",
    parsedRecord.pemeriksaanFisik?.perut?.defenseMuscular && "Defense Muscular Perut",
    parsedRecord.pemeriksaanFisik?.perut?.rigidAbdomen && "Abdomen Rigid",
    parsedRecord.pemeriksaanFisik?.perut?.muntah && "Muntah",
    parsedRecord.pemeriksaanFisik?.ekstremitasAtas?.perfusiBuruk && "Perfusi Akral Buruk",
    parsedRecord.pemeriksaanFisik?.ekstremitasBawah?.edema && "Edema Tungkai",
  ].filter(Boolean) as string[] : [];

  return (
    <Card padding="lg" className="space-y-6" id="narrative-ai-parser-widget">
      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-border/70 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Badge tone="primary" className="mb-1" icon={<Sparkles size={11} className="animate-pulse" />}>
            Mesin Aktif: {engineLabel}
          </Badge>
          <h3 className="flex items-center gap-2 text-sm font-black tracking-tight text-text">Pengurai & Pemilah Narasi Klinis IGD (NLP)</h3>
          <p className="text-xs font-medium leading-relaxed text-text-muted">
            Ketik atau tempel narasi klinis bebas. Mesin yang dipilih akan memilah identitas, tanda vital, lokasi nyeri, dan temuan fisik menjadi data terstruktur.
          </p>
        </div>
      </div>

      {/* Preset Buttons */}
      <div className="space-y-2">
        <span className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-text-muted">
          <BookOpen size={12} />
          <span>Klik Contoh Demo Kasus Untuk Mencoba:</span>
        </span>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
          {CLINICAL_PRESETS.map((p, index) => (
            <button
              key={index}
              type="button"
              onClick={() => handleLoadPreset(p.text)}
              className="rounded-xl border border-border/70 p-3 text-left transition hover:border-primary/40 hover:bg-bg hover:shadow-sm"
            >
              <div className="line-clamp-1 text-xs font-bold text-text">{p.title}</div>
              <span className="mt-1 inline-block text-xs font-black uppercase tracking-wider text-primary">Kategori: {p.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Textarea Input area */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black uppercase tracking-wider text-text-muted">Masukkan Catatan / Narasi Keluhan IGD Pasien:</span>
          <span className="font-mono text-xs text-text-muted">{narrative.length} karakter</span>
        </div>

        <div className="flex items-center justify-between gap-3">
          <Button
            type="button"
            variant={isListening ? "danger" : "outline"}
            size="sm"
            onClick={handleToggleVoice}
            disabled={loading}
            leftIcon={isListening ? <Square size={13} /> : <Mic size={13} />}
          >
            {isListening ? "Berhenti Merekam" : "Rekam Suara Dokter"}
          </Button>
          {isListening && (
            <span className="flex items-center gap-1.5 text-xs font-bold text-danger">
              <span className="size-2 animate-pulse rounded-full bg-danger" />
              Mendengarkan (Bahasa Indonesia)...
            </span>
          )}
          {!isVoiceSupported && (
            <span className="text-xs font-medium text-text-muted">Rekam suara butuh Chrome/Edge</span>
          )}
        </div>

        <div className="relative">
          <TextareaField
            value={narrative}
            onChange={(e) => setNarrative(e.target.value)}
            disabled={loading}
            rows={5}
            placeholder="Contoh: Laki-laki Tn. Budi umur 45 tahun datang digendong keluarga karena mengeluh sesak napas berat disertai demam 38 derajat celsius sejak 2 hari yang lalu..."
          />
          {narrative && !loading && (
            <button
              type="button"
              onClick={() => setNarrative("")}
              className="absolute bottom-3 right-3 rounded-lg border border-border bg-surface px-2 py-1 text-xs font-bold text-text-muted shadow-sm transition hover:text-text"
              title="Reset Input"
            >
              Hapus
            </button>
          )}
        </div>
      </div>

      {/* Submit Controls */}
      <div className="flex flex-col items-stretch justify-end gap-3 border-b border-border/70 pb-5 sm:flex-row sm:items-center">
        {narrative && (
          <Button variant="ghost" size="sm" onClick={() => handleLoadPreset("")} leftIcon={<RotateCcw size={12} />} className="w-full sm:w-auto">
            Reset
          </Button>
        )}
        <Button
          variant="primary"
          disabled={loading || !narrative.trim()}
          loading={loading}
          onClick={handleParseNarrative}
          leftIcon={!loading ? <Sparkles size={14} /> : undefined}
          className="w-full sm:w-auto"
        >
          {loading ? "Sedang Memilah Data Triase..." : "Pilah dan Strukturisasi Narasi"}
        </Button>
      </div>

      {/* AI Extraction Progress Simulator / Result Dashboard */}
      {parsedRecord && (
        <div className="space-y-4 rounded-2xl border border-dashed border-primary/30 bg-bg p-5">
          <div className="flex flex-col gap-3 border-b border-border/70 pb-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Badge tone="secondary">Berhasil Diurai</Badge>
              <h4 className="flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-primary">
                <Terminal size={13} />
                <span>Hasil Ekstraksi Data Klinis</span>
              </h4>
            </div>

            <Button variant="primary" size="sm" onClick={handleApplyToForm} leftIcon={<ClipboardCheck size={13} />} rightIcon={<ArrowRight size={12} />}>
              Tampilkan di Formulir Hasil
            </Button>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
            <ExtractedField label="Identitas Pasien" icon={User} iconTone="text-text-muted">
              <div className="space-y-1">
                <span className="block truncate text-xs font-bold text-text">{parsedRecord.namaPasien || "Tidak terurai"}</span>
                <span className="block text-xs font-semibold text-primary">{parsedRecord.nomorRM || "KOSONG/BARU"}</span>
                <span className="block text-xs font-medium text-text-muted">{parsedRecord.umur} Tahun &middot; {parsedRecord.gender}</span>
              </div>
            </ExtractedField>

            <ExtractedField label="Hasil Tanda Vital (TTV)" icon={Activity} iconTone="text-danger" className="sm:col-span-1 md:col-span-2">
              <div className="grid grid-cols-2 gap-2 min-[480px]:grid-cols-3">
                {[
                  { label: "TD (mmHg)", value: `${parsedRecord.vitalSign.tekananDarahSistolik}/${parsedRecord.vitalSign.tekananDarahDiastolik}` },
                  { label: "Nadi (HR)", value: `${parsedRecord.vitalSign.heartRate}x` },
                  { label: "Napas (RR)", value: `${parsedRecord.vitalSign.respiratoryRate}x` },
                  { label: "Suhu (T)", value: `${parsedRecord.vitalSign.suhuTubuh} °C` },
                  { label: "SpO2 (%)", value: `${parsedRecord.vitalSign.saturasiOksigen}%` },
                  { label: "Kesadaran", value: `${parsedRecord.vitalSign.avpu || "Alert"}${gcsTotalParsed < 15 ? ` (GCS ${gcsTotalParsed})` : ""}` },
                ].map((item) => (
                  <div key={item.label} className="rounded-lg bg-bg p-1.5 text-center">
                    <span className="block text-xs font-bold uppercase text-text-muted">{item.label}</span>
                    <span className="text-xs font-bold text-text">{item.value}</span>
                  </div>
                ))}
              </div>
            </ExtractedField>

            <ExtractedField label="Nyeri & Lokasi" icon={Flame} iconTone="text-warning">
              <div className="space-y-1">
                <span className="text-xs font-black uppercase text-amber-700 dark:text-amber-400">Skala {parsedRecord.painScale.skala}/10</span>
                <span className="block truncate text-xs font-semibold text-text">Lokasi: {parsedRecord.painScale.lokasi || "Tidak ada"}</span>
                <span className="block text-xs font-semibold text-text-muted">Nyeri Menjalar: {parsedRecord.painScale.menjalar ? "Ya" : "Tidak"}</span>
              </div>
            </ExtractedField>
          </div>

          <div className="grid grid-cols-1 gap-3 pt-1 md:grid-cols-2">
            <ExtractedField label="Riwayat Komorbid & Gejala Tambahan" icon={User} iconTone="text-text-muted">
              <div className="flex flex-wrap gap-1.5">
                {parsedRecord.riwayatPenyakit && parsedRecord.riwayatPenyakit.length > 0 ? (
                  parsedRecord.riwayatPenyakit.map((r, i) => (
                    <Badge key={i} tone="primary" className="rounded-md px-1.5 py-0.5 text-xs">Komorbid: {r}</Badge>
                  ))
                ) : (
                  <span className="text-xs font-medium text-text-muted">Tidak terdeteksi komorbid</span>
                )}
                {parsedRecord.gejalaTambahan?.map((r, i) => (
                  <Badge key={i} tone="warning" className="rounded-md px-1.5 py-0.5 text-xs">Gejala: {r}</Badge>
                ))}
              </div>
            </ExtractedField>

            <ExtractedField label="Kelainan Pemeriksaan Fisik (CPPT)" icon={Activity} iconTone="text-danger">
              <div className="flex flex-wrap gap-1.5">
                {examFindings.length > 0 ? (
                  examFindings.map((item, index) => (
                    <Badge key={index} tone="danger" className="rounded-md px-1.5 py-0.5 text-xs">{item}</Badge>
                  ))
                ) : (
                  <span className="font-mono text-xs font-medium text-text-muted">Normal (Bebas dari anomali klinis akut)</span>
                )}
              </div>
            </ExtractedField>
          </div>

          <div className="flex justify-end border-t border-border/70 pt-2">
            <Button variant="primary" fullWidth onClick={handleApplyToForm} leftIcon={<ClipboardCheck size={14} />} rightIcon={<ArrowRight size={14} />}>
              Suntikkan ke Formulir di Halaman Ini
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
