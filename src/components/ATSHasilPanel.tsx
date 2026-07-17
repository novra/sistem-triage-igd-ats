import React, { useState, useEffect } from "react";
import { TriageRecord, ATS_LEVEL_DETAILS } from "../types";
import { ShieldAlert, AlertCircle, Save, Activity, CheckCircle2, UserCheck, Bot, Scale, ShieldCheck } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "./ui/Toast";
import { Card } from "./ui/Card";
import { Badge } from "./ui/Badge";
import { Button } from "./ui/Button";
import { Input, SelectField, TextareaField } from "./ui/Input";

interface ATSHasilPanelProps {
  data: TriageRecord;
  onSave: (overrideData?: {
    atsLevelOverride?: 1 | 2 | 3 | 4 | 5;
    alasanOverride?: string;
    namaPetugas?: string;
    jabatanPetugas?: string;
  }) => void;
  isSaving: boolean;
}

export default function ATSHasilPanel({ data, onSave, isSaving }: ATSHasilPanelProps) {
  const { user } = useAuth();
  const toast = useToast();
  const [overrideLevel, setOverrideLevel] = useState<number | "">("");
  const [reasonOverride, setReasonOverride] = useState("");
  const [showOverride, setShowOverride] = useState(false);
  const [namaPetugas, setNamaPetugas] = useState(() => {
    return data.atsFinal?.namaPetugas || user?.name || localStorage.getItem("triage_nama_petugas") || "";
  });
  const [jabatanPetugas, setJabatanPetugas] = useState(() => {
    return data.atsFinal?.jabatanPetugas || localStorage.getItem("triage_jabatan_petugas") || "Perawat IGD";
  });

  const prediction = data.atsPrediction;

  // Sync state if record already has an override
  useEffect(() => {
    if (data.atsFinal?.atsLevelOverride) {
      setOverrideLevel(data.atsFinal.atsLevelOverride);
      setReasonOverride(data.atsFinal.alasanOverride || "");
      setShowOverride(true);
    } else {
      setOverrideLevel("");
      setReasonOverride("");
      setShowOverride(false);
    }
    if (data.atsFinal?.namaPetugas) {
      setNamaPetugas(data.atsFinal.namaPetugas);
    }
    if (data.atsFinal?.jabatanPetugas) {
      setJabatanPetugas(data.atsFinal.jabatanPetugas);
    }
  }, [data]);

  useEffect(() => {
    if (namaPetugas) {
      localStorage.setItem("triage_nama_petugas", namaPetugas);
    }
  }, [namaPetugas]);

  useEffect(() => {
    if (jabatanPetugas) {
      localStorage.setItem("triage_jabatan_petugas", jabatanPetugas);
    }
  }, [jabatanPetugas]);

  if (!prediction) {
    return (
      <Card padding="lg" className="border-dashed py-12 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-bg text-text-muted">
          <Activity size={24} className="animate-pulse" />
        </div>
        <div className="mt-3">
          <h3 className="text-sm font-bold text-text">Analisis ATS Belum Dimulai</h3>
          <p className="mx-auto mt-1 max-w-xs text-xs text-text-muted">
            Selesaikan pengisian data pasien, keluhan utama, dan tanda vital lalu klik tombol <strong>"Analisis ATS dengan AI"</strong>.
          </p>
        </div>
      </Card>
    );
  }

  const baseLevel = prediction.atsLevel as 1 | 2 | 3 | 4 | 5;
  const currentLevel = (overrideLevel !== "" ? Number(overrideLevel) : baseLevel) as 1 | 2 | 3 | 4 | 5;
  const levelDetails = ATS_LEVEL_DETAILS[currentLevel];
  const predictionDetails = ATS_LEVEL_DETAILS[baseLevel];
  const hasOverride = overrideLevel !== "" || Boolean(data.atsFinal?.atsLevelOverride);
  const decisionSupport = prediction.decisionSupport;
  const showIndependentModelComparison = Boolean(
    prediction.providerUsed?.includes("Model Mandiri")
      && decisionSupport?.recommendationsDiffer,
  );
  const validatorName = namaPetugas.trim() || data.atsFinal?.namaPetugas || "Belum divalidasi";
  const validatorRole = jabatanPetugas || data.atsFinal?.jabatanPetugas || "Belum ditentukan";

  const handleTriggerSave = () => {
    if (!namaPetugas.trim()) {
      toast.error("Harap isi Nama Tenaga Kesehatan terlebih dahulu.");
      return;
    }

    const payload: {
      atsLevelOverride?: 1 | 2 | 3 | 4 | 5;
      alasanOverride?: string;
      namaPetugas: string;
      jabatanPetugas: string;
    } = {
      namaPetugas: namaPetugas.trim(),
      jabatanPetugas
    };

    if (overrideLevel !== "") {
      payload.atsLevelOverride = Number(overrideLevel) as 1 | 2 | 3 | 4 | 5;
      payload.alasanOverride = reasonOverride;
    }

    onSave(payload);
  };

  const chooseRecommendation = (source: "ai" | "guardrail", level: 1 | 2 | 3 | 4 | 5) => {
    setShowOverride(true);
    setOverrideLevel(level);
    setReasonOverride(
      source === "ai"
        ? `Keputusan final nakes memilih ATS ${level} dari rekomendasi model mandiri setelah membandingkan dengan guard rail klinis.`
        : `Keputusan final nakes memilih ATS ${level} dari saran guard rail setelah meninjau rekomendasi model mandiri.`,
    );
    requestAnimationFrame(() => {
      document.getElementById("clinical-final-decision")?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  };

  const chooseIndependentClinicalDecision = () => {
    setShowOverride(true);
    setOverrideLevel("");
    setReasonOverride("");
    requestAnimationFrame(() => {
      document.getElementById("clinical-final-decision")?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  };

  const saveDisabled = isSaving || (showOverride && !reasonOverride) || !namaPetugas.trim();

  return (
    <div className="space-y-4" id="ats-hasil-panel-container">
      {/* Disclaimer Banner */}
      <div className="flex gap-3 rounded-2xl border border-warning/30 bg-warning/10 p-4">
        <ShieldAlert size={20} className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wide text-amber-900 dark:text-amber-300">Bukan Rekomendasi Klinis Final (Beta Version)</h4>
          <p className="mt-0.5 text-xs font-medium leading-relaxed text-amber-800 dark:text-amber-400">
            Sistem triase ini masih berada dalam tahap beta/research prototype (clinical decision support). Hasil prediksi AI bersifat menunjang dan wajib diverifikasi oleh dokter/perawat triase IGD penanggung jawab.
          </p>
        </div>
      </div>

      {/* Main Color Coded Result Panel */}
      <div className={`rounded-3xl border p-6 shadow-md transition-all ${levelDetails.color}`}>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <span className="flex flex-wrap items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-wider opacity-90">
              <span>HASIL ATS AKTIF</span>
              {prediction.providerUsed && (
                <span className="rounded bg-black/30 px-1.5 py-0.5 text-xs font-black tracking-widest text-yellow-300">VIA {prediction.providerUsed}</span>
              )}
              {prediction.modelUsed && (
                <span className="rounded bg-black/25 px-1.5 py-0.5 text-xs font-black tracking-widest">MODEL {prediction.modelUsed}</span>
              )}
            </span>
            <h2 className="text-2xl font-black leading-tight">{levelDetails.name}</h2>
            <p className="text-sm font-bold opacity-90">{levelDetails.subtitle}</p>
          </div>

          <div className="rounded-xl border border-white/20 bg-white/15 px-3.5 py-2 text-center font-mono">
            <span className="block text-xs font-bold uppercase leading-none tracking-wide">Confidence</span>
            <span className="text-xl font-black">{prediction.confidenceScore}%</span>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 border-t border-white/10 pt-4 text-xs">
          <div className="rounded-xl border border-white/5 bg-white/10 p-2.5">
            <span className="block text-xs font-bold opacity-75">Batas Waktu Penanganan</span>
            <span className="text-sm font-extrabold">{levelDetails.timeLimit}</span>
          </div>
          <div className="rounded-xl border border-white/5 bg-white/10 p-2.5">
            <span className="block text-xs font-bold opacity-75">Indikator Emergency</span>
            <span className="text-sm font-extrabold">{prediction.emergencyIndicator ? "Gawat Darurat" : "Stabil / Low Risk"}</span>
          </div>
        </div>
      </div>

      {showIndependentModelComparison && decisionSupport && (
        <Card padding="lg" className="border-warning/40" aria-labelledby="recommendation-comparison-title">
          <div className="mb-4 flex items-start gap-3">
            <div className="rounded-2xl bg-warning/15 p-3 text-amber-800 dark:text-amber-400">
              <Scale size={24} />
            </div>
            <div>
              <h3 id="recommendation-comparison-title" className="text-lg font-black text-text">Rekomendasi AI dan Guard Rail Berbeda</h3>
              <p className="mt-1 text-sm font-medium text-text-muted">
                Bandingkan kedua sumber berikut. Keduanya merupakan data pendukung; keputusan ATS final tetap ditetapkan dan divalidasi oleh nakes.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card padding="md" className="border-primary/20">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-primary">
                  <Bot size={20} />
                  <h4 className="font-black">Rekomendasi Model Mandiri</h4>
                </div>
                <Badge tone="primary" className="rounded-xl px-3 py-1.5 text-sm">ATS {decisionSupport.aiRecommendation.atsLevel}</Badge>
              </div>
              <p className="mt-3 text-base font-black text-text">{ATS_LEVEL_DETAILS[decisionSupport.aiRecommendation.atsLevel].name}</p>
              <p className="text-sm font-bold text-text-muted">Confidence AI {decisionSupport.aiRecommendation.confidenceScore}%</p>
              <p className="mt-3 text-sm font-medium leading-relaxed text-text">{decisionSupport.aiRecommendation.alasanKlasifikasi}</p>
              <Button variant="outline" fullWidth className="mt-4" onClick={() => chooseRecommendation("ai", decisionSupport.aiRecommendation.atsLevel)}>
                Tetapkan ATS {decisionSupport.aiRecommendation.atsLevel} sebagai Keputusan Nakes
              </Button>
            </Card>

            <Card padding="md" className="border-warning/40">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-amber-800 dark:text-amber-400">
                  <ShieldCheck size={20} />
                  <h4 className="font-black">Saran Guard Rail Rule-Based</h4>
                </div>
                <Badge tone="warning" className="rounded-xl px-3 py-1.5 text-sm">ATS {decisionSupport.guardRailRecommendation.atsLevel}</Badge>
              </div>
              <p className="mt-3 text-base font-black text-text">{ATS_LEVEL_DETAILS[decisionSupport.guardRailRecommendation.atsLevel].name}</p>
              <p className="text-sm font-bold text-text-muted">
                {decisionSupport.guardRailApplied ? "Guard rail diterapkan sebagai pengaman sistem" : "Guard rail ditampilkan sebagai pembanding"}
              </p>
              <ul className="mt-3 space-y-2 text-sm font-medium leading-relaxed text-text">
                {decisionSupport.guardRailRecommendation.reasons.map((reason, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="mt-2 size-2 shrink-0 rounded-full bg-warning" />
                    <span>{reason.replace(/^Rule-Based ATS [1-5]:\s*/, "")}</span>
                  </li>
                ))}
              </ul>
              <Button variant="outline" fullWidth className="mt-4 border-warning/40" onClick={() => chooseRecommendation("guardrail", decisionSupport.guardRailRecommendation.atsLevel)}>
                Tetapkan ATS {decisionSupport.guardRailRecommendation.atsLevel} sebagai Keputusan Nakes
              </Button>
            </Card>
          </div>

          <div className="mt-4 rounded-2xl border border-primary/20 bg-primary/5 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h4 className="font-black text-text">Keputusan berbeda dari kedua rekomendasi?</h4>
                <p className="mt-1 text-sm font-medium text-text-muted">
                  Nakes dapat menetapkan level ATS lain berdasarkan pemeriksaan langsung dan pertimbangan klinis profesional.
                </p>
              </div>
              <Button variant="primary" className="shrink-0" onClick={chooseIndependentClinicalDecision}>
                Tetapkan ATS Lain
              </Button>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card padding="md" className="space-y-3">
          <div className="flex items-center justify-between gap-3 border-b border-border/70 pb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-text">Hasil Sistem Sebelum Validasi</h3>
            <Badge tone="primary">{prediction.providerUsed || "Rule-Based"}</Badge>
          </div>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-lg font-black text-text">{predictionDetails.name}</p>
              <p className="text-xs font-bold text-text-muted">{predictionDetails.timeLimit}</p>
            </div>
            <div className="text-right">
              <span className="block text-xs font-bold uppercase text-text-muted">Confidence</span>
              <span className="text-xl font-black text-text">{prediction.confidenceScore}%</span>
            </div>
          </div>
          <div className="space-y-1 text-xs font-medium text-text-muted">
            <p><strong className="text-text">Model:</strong> {prediction.modelUsed || "Clinical Safety Rules v1"}</p>
            <p><strong className="text-text">Kategori:</strong> {prediction.atsCategory || `ATS Kategori ${prediction.atsLevel}`}</p>
            <p><strong className="text-text">Emergency:</strong> {prediction.emergencyIndicator ? "Ya" : "Tidak"}</p>
          </div>
        </Card>

        <Card padding="md" className="space-y-3">
          <div className="flex items-center justify-between gap-3 border-b border-border/70 pb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-text">Hasil Final / Override</h3>
            <Badge tone={hasOverride ? "warning" : "secondary"}>{hasOverride ? "Override Klinis" : "Sesuai Prediksi"}</Badge>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle2 size={18} className={`mt-0.5 shrink-0 ${hasOverride ? "text-amber-600 dark:text-amber-400" : "text-secondary"}`} />
            <div>
              <p className="text-lg font-black text-text">{levelDetails.name}</p>
              <p className="text-xs font-bold text-text-muted">{levelDetails.timeLimit}</p>
              {hasOverride && (
                <p className="mt-2 text-xs font-medium leading-relaxed text-text-muted">
                  {reasonOverride || data.atsFinal?.alasanOverride || "Alasan override belum diisi."}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-border/70 bg-bg p-3">
            <UserCheck size={16} className="shrink-0 text-text-muted" />
            <div className="min-w-0">
              <span className="block text-xs font-bold uppercase tracking-wider text-text-muted">Validator</span>
              <span className="block truncate text-xs font-black text-text">{validatorName}</span>
              <span className="block truncate text-xs font-semibold text-text-muted">{validatorRole}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Warning List */}
      {prediction.warningConditions && prediction.warningConditions.length > 0 && (
        <div className="space-y-2 rounded-2xl border border-danger/30 bg-danger/5 p-4">
          <div className="flex items-center gap-2 text-xs font-bold text-danger">
            <AlertCircle size={15} className="animate-pulse" />
            <span>ALARM BAHAYA / RED FLAGS TERDETEKSI:</span>
          </div>
          <ul className="list-inside list-disc space-y-1 text-xs font-medium text-danger">
            {prediction.warningConditions.map((warn, index) => (
              <li key={index}>{warn}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Detailed clinical reasoning */}
      <Card padding="md" className="space-y-3">
        <h3 className="border-b border-border/70 pb-2 text-xs font-bold uppercase tracking-wider text-text">Analisis Klinis AI Triage</h3>
        <p className="text-xs font-medium leading-relaxed text-text-muted">{prediction.alasanKlasifikasi}</p>
      </Card>

      {/* Clinical information used */}
      {prediction.informasiKlinisDigunakan && prediction.informasiKlinisDigunakan.length > 0 && (
        <Card padding="md" className="space-y-3">
          <h3 className="border-b border-border/70 pb-2 text-xs font-bold uppercase tracking-wider text-text">Informasi Klinis yang Digunakan</h3>
          <ul className="space-y-1.5 text-xs text-text-muted">
            {prediction.informasiKlinisDigunakan.map((item, i) => (
              <li key={i} className="flex items-start gap-2 font-medium">
                <span className="mt-0.5 shrink-0 font-bold text-primary">-</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Missing clinical information */}
      {prediction.informasiTambahanDiperlukan && prediction.informasiTambahanDiperlukan.length > 0 && (
        <Card padding="md" className="space-y-3 border-primary/20 bg-primary/5">
          <h3 className="border-b border-primary/20 pb-2 text-xs font-bold uppercase tracking-wider text-text">Informasi Tambahan yang Masih Diperlukan</h3>
          <ul className="space-y-1.5 text-xs text-text-muted">
            {prediction.informasiTambahanDiperlukan.map((item, i) => (
              <li key={i} className="flex items-start gap-2 font-medium">
                <span className="mt-0.5 shrink-0 font-bold text-primary">-</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Early actions */}
      <Card padding="md" className="space-y-3">
        <h3 className="border-b border-border/70 pb-2 text-xs font-bold uppercase tracking-wider text-text">Rekomendasi Tindakan Keperawatan IGD Awal</h3>
        <ul className="space-y-1.5 text-xs text-text-muted">
          {prediction.rekomendasiAwal?.map((rec, i) => (
            <li key={i} className="flex items-start gap-2 font-medium">
              <span className="mt-0.5 shrink-0 font-bold text-secondary">&#10003;</span>
              <span>{rec}</span>
            </li>
          ))}
        </ul>
      </Card>

      {/* Override mechanism */}
      <Card padding="md" id="clinical-final-decision" className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-text">Keputusan Final Nakes (Dokter/Perawat)</h3>
          <button type="button" onClick={() => setShowOverride(!showOverride)} className="text-xs font-bold text-primary hover:underline">
            {showOverride ? "Batalkan Override" : "Aktifkan override keputusan"}
          </button>
        </div>

        {showOverride && (
          <div className="space-y-3 rounded-xl border border-warning/30 bg-warning/5 p-3">
            <p className="rounded-xl border border-warning/30 bg-surface p-3 text-xs font-semibold leading-relaxed text-text">
              Pilih rekomendasi AI, saran guard rail, atau level ATS lain sesuai hasil asesmen langsung. Keputusan dan alasan di bawah akan dicatat sebagai keputusan final nakes.
            </p>
            <SelectField
              id="select-override-level"
              label="Ubah Level ATS Menjadi:"
              value={overrideLevel}
              onChange={(e) => setOverrideLevel(e.target.value !== "" ? Number(e.target.value) : "")}
            >
              <option value="">-- Pilih Level Baru --</option>
              <option value={1}>ATS 1 — Merah (Resusitasi / Segera)</option>
              <option value={2}>ATS 2 — Orange (≤ 10 menit)</option>
              <option value={3}>ATS 3 — Hijau (≤ 30 menit)</option>
              <option value={4}>ATS 4 — Biru (≤ 60 menit)</option>
              <option value={5}>ATS 5 — Putih (≤ 120 menit)</option>
            </SelectField>

            <TextareaField
              id="input-override-reason"
              label="Alasan override keputusan AI *"
              rows={2}
              placeholder="Alasan keprofesian dokter/perawat..."
              value={reasonOverride}
              onChange={(e) => setReasonOverride(e.target.value)}
            />
          </div>
        )}
      </Card>

      {/* Clinician Authentication Panel */}
      <Card padding="md" className="space-y-3 bg-bg">
        <h3 className="border-b border-border/70 pb-2 text-xs font-bold uppercase tracking-wider text-text">Verifikasi Petugas Triase IGD (Dokter/Perawat)</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input
            id="input-clinician-name"
            label="Nama Tenaga Kesehatan *"
            placeholder=" "
            value={namaPetugas}
            onChange={(e) => setNamaPetugas(e.target.value)}
            required
          />
          <SelectField id="select-clinician-role" label="Jabatan / Role Tugas *" value={jabatanPetugas} onChange={(e) => setJabatanPetugas(e.target.value)}>
            <option value="Perawat IGD">Perawat IGD</option>
            <option value="Dokter Jaga PJ">Dokter Jaga PJ</option>
            <option value="Kepala Tim Jaga">Kepala Tim Jaga</option>
            <option value="Dokter Triase Utama">Dokter Triase Utama</option>
            <option value="Residen Senior">Residen Senior</option>
          </SelectField>
        </div>
      </Card>

      {/* After analysis, saving is the only primary record action. */}
      <div className="space-y-2.5 pt-2">
        <Button
          variant="secondary"
          size="lg"
          fullWidth
          disabled={saveDisabled}
          loading={isSaving}
          onClick={handleTriggerSave}
          leftIcon={!isSaving ? <Save size={16} /> : undefined}
        >
          {isSaving ? "Menyimpan Data..." : "Simpan Hasil Triase ke Database"}
        </Button>
        {showOverride && !reasonOverride && (
          <p className="mt-1 text-center text-xs font-semibold text-danger">* Harap isi alasan override klinis untuk mengaktifkan penyimpanan data.</p>
        )}
        {!namaPetugas.trim() && (
          <p className="mt-1 text-center text-xs font-semibold text-danger">* Harap isi Nama Tenaga Kesehatan untuk mengaktifkan penyimpanan data.</p>
        )}
      </div>
    </div>
  );
}
