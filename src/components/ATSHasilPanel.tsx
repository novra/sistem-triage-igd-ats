import React, { useState, useEffect } from "react";
import { TriageRecord, ATS_LEVEL_DETAILS } from "../types";
import { ShieldAlert, AlertCircle, Save, HelpCircle, Activity, Undo, FileText } from "lucide-react";
import { generateIGDReportPDF } from "../utils/pdfGenerator";

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
  const [overrideLevel, setOverrideLevel] = useState<number | "">("");
  const [reasonOverride, setReasonOverride] = useState("");
  const [showOverride, setShowOverride] = useState(false);
  const [namaPetugas, setNamaPetugas] = useState(() => {
    return data.atsFinal?.namaPetugas || localStorage.getItem("triage_nama_petugas") || "";
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
      <div className="bg-white p-6 rounded-2xl border border-dashed border-slate-200 text-center py-12 space-y-3 shadow-xs">
        <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mx-auto">
          <Activity size={24} className="animate-pulse" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-700">Analisis ATS Belum Dimulai</h3>
          <p className="text-xs text-slate-400 max-w-xs mx-auto mt-1">
            Selesaikan pengisian data pasien, keluhan utama, dan tanda vital lalu klik tombol **"Analisis ATS dengan AI"**.
          </p>
        </div>
      </div>
    );
  }

  const baseLevel = prediction.atsLevel as 1 | 2 | 3 | 4 | 5;
  const currentLevel = (overrideLevel !== "" ? Number(overrideLevel) : baseLevel) as 1 | 2 | 3 | 4 | 5;
  const levelDetails = ATS_LEVEL_DETAILS[currentLevel];

  const handleTriggerSave = () => {
    if (!namaPetugas.trim()) {
      alert("Harap isi Nama Tenaga Kesehatan terlebih dahulu.");
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

  return (
    <div className="space-y-6 animate-fade-in" id="ats-hasil-panel-container">
      {/* Disclaimer Banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3 shadow-3xs">
        <ShieldAlert size={20} className="text-amber-600 shrink-0 mt-0.5" />
        <div>
          <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wide">⚠️ BUKAN REKOMENDASI KLINIS FINAL (BETA VERSION)</h4>
          <p className="text-[11px] text-amber-700 leading-relaxed font-medium mt-0.5">
            Sistem triase ini masih berada dalam tahap beta/research prototype (clinical decision support). Hasil prediksi AI bersifat menunjang dan wajib diverifikasi oleh dokter/perawat triase IGD penanggung jawab.
          </p>
        </div>
      </div>

      {/* Main Color Coded Result Panel */}
      <div className={`rounded-3xl border p-6 transition-all shadow-md ${levelDetails.color}`}>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-wider opacity-90 font-mono flex items-center gap-1.5 flex-wrap">
              <span>PREDIKSI & KLASIFIKASI ATS</span>
              {prediction.providerUsed && (
                <span className="px-1.5 py-0.5 bg-black/30 rounded text-[9px] font-black tracking-widest text-yellow-300">
                  VIA {prediction.providerUsed}
                </span>
              )}
            </span>
            <h2 className="text-2xl font-black leading-tight">
              {levelDetails.name}
            </h2>
            <p className="text-sm font-bold opacity-90">
              {levelDetails.subtitle}
            </p>
          </div>

          <div className="bg-white/15 px-3.5 py-2 rounded-xl border border-white/20 text-center font-mono">
            <span className="text-[9px] uppercase font-bold tracking-wide block leading-none">Confidence</span>
            <span className="text-xl font-black">{prediction.confidenceScore}%</span>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-2 gap-2 text-xs">
          <div className="bg-white/10 p-2.5 rounded-xl border border-white/5">
            <span className="opacity-75 block text-[10px] font-bold">Batas Waktu Penanganan</span>
            <span className="font-extrabold text-sm">{levelDetails.timeLimit}</span>
          </div>
          <div className="bg-white/10 p-2.5 rounded-xl border border-white/5">
            <span className="opacity-75 block text-[10px] font-bold">Indikator Emergency</span>
            <span className="font-extrabold text-sm">{prediction.emergencyIndicator ? "🚨 Gawat Darurat" : "Stabil / Low Risk"}</span>
          </div>
        </div>
      </div>

      {/* Warning List */}
      {prediction.warningConditions && prediction.warningConditions.length > 0 && (
        <div className="bg-rose-50 border border-rose-150 rounded-2xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-rose-800 text-xs font-bold">
            <AlertCircle size={15} className="text-rose-600 animate-pulse" />
            <span>ALARM BAHAYA / RED FLAGS TERDETEKSI:</span>
          </div>
          <ul className="list-disc list-inside text-[11px] text-rose-700 font-medium space-y-1">
            {prediction.warningConditions.map((warn, index) => (
              <li key={index}>{warn}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Detailed clinical reasoning */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-3">
        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b pb-2">
          Analisis Klinis AI Triage
        </h3>
        <p className="text-xs text-slate-600 leading-relaxed font-medium">
          {prediction.alasanKlasifikasi}
        </p>
      </div>

      {/* Early actions */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-3">
        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b pb-2">
          Rekomendasi Tindakan Keperawatan IGD Awal
        </h3>
        <ul className="space-y-1.5 text-xs text-slate-600">
          {prediction.rekomendasiAwal?.map((rec, i) => (
            <li key={i} className="flex items-start gap-2 font-medium">
              <span className="text-emerald-500 font-bold shrink-0 mt-0.5">✔</span>
              <span>{rec}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Override mechanism */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Clinical Manual Override (Dokter/Perawat)
          </h3>
          <button
            id="btn-toggle-override"
            type="button"
            onClick={() => setShowOverride(!showOverride)}
            className="text-[10px] font-bold text-indigo-600 hover:underline cursor-pointer"
          >
            {showOverride ? "Batalkan Override" : "Aktifkan override keputusan"}
          </button>
        </div>

        {showOverride && (
          <div className="p-3 bg-amber-50/50 border border-amber-100 rounded-xl space-y-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Ubah Level ATS Menjadi:
              </label>
              <select
                id="select-override-level"
                value={overrideLevel}
                onChange={(e) => setOverrideLevel(e.target.value !== "" ? Number(e.target.value) : "")}
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-hidden"
              >
                <option value="">-- Pilih Level Baru --</option>
                <option value={1}>ATS 1 — Merah (Resusitasi / Segera)</option>
                <option value={2}>ATS 2 — Orange (≤ 10 menit)</option>
                <option value={3}>ATS 3 — Hijau (≤ 30 menit)</option>
                <option value={4}>ATS 4 — Biru (≤ 60 menit)</option>
                <option value={5}>ATS 5 — Putih (≤ 120 menit)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Alasan override keputusan AI <span className="text-rose-500">*</span>
              </label>
              <textarea
                id="input-override-reason"
                rows={2}
                placeholder="Alasan keprofesian dokter/perawat..."
                value={reasonOverride}
                onChange={(e) => setReasonOverride(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-205 rounded-lg focus:outline-hidden"
              />
            </div>
          </div>
        )}
      </div>

      {/* Clinician Authentication Panel */}
      <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b pb-2">
          Verifikasi Petugas Triase IGD (Dokter/Perawat)
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              Nama Tenaga Kesehatan <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              id="input-clinician-name"
              placeholder="Contoh: Ns. Ayu Lestari, S.Kep"
              value={namaPetugas}
              onChange={(e) => setNamaPetugas(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-hidden"
              required
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              Jabatan / Role Tugas <span className="text-rose-500">*</span>
            </label>
            <select
              id="select-clinician-role"
              value={jabatanPetugas}
              onChange={(e) => setJabatanPetugas(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-hidden"
            >
              <option value="Perawat IGD">Perawat IGD</option>
              <option value="Dokter Jaga PJ">Dokter Jaga PJ</option>
              <option value="Kepala Tim Jaga">Kepala Tim Jaga</option>
              <option value="Dokter Triase Utama">Dokter Triase Utama</option>
              <option value="Residen Senior">Residen Senior</option>
            </select>
          </div>
        </div>
      </div>

      {/* Save & Export PDF actions */}
      <div className="space-y-2.5 pt-2">
        <button
          id="btn-export-pdf-report"
          type="button"
          onClick={() => {
            const tempRecord = {
              ...data,
              atsFinal: {
                ...data.atsFinal,
                namaPetugas: namaPetugas.trim() || data.atsFinal?.namaPetugas || "Belum Ditandatangani",
                jabatanPetugas: jabatanPetugas || data.atsFinal?.jabatanPetugas || "Perawat IGD",
                atsLevelOverride: overrideLevel !== "" ? Number(overrideLevel) as 1 | 2 | 3 | 4 | 5 : undefined,
                alasanOverride: reasonOverride || undefined
              }
            };
            generateIGDReportPDF(tempRecord);
          }}
          className="w-full py-3 text-sm font-black rounded-xl text-center flex items-center justify-center gap-2 transition bg-emerald-600 hover:bg-emerald-700 text-white shadow-md cursor-pointer"
        >
          <FileText size={16} />
          <span>Cetak Laporan PDF Standar IGD</span>
        </button>

        <button
          id="btn-save-triage-record"
          onClick={handleTriggerSave}
          disabled={isSaving || (showOverride && !reasonOverride) || !namaPetugas.trim()}
          className={`w-full py-3 text-sm font-black rounded-xl text-center flex items-center justify-center gap-2 transition shadow-md cursor-pointer ${
            (showOverride && !reasonOverride) || !namaPetugas.trim()
              ? "bg-slate-300 text-slate-500 cursor-not-allowed"
              : "bg-indigo-600 hover:bg-indigo-750 text-white"
          }`}
        >
          <Save size={16} />
          <span>{isSaving ? "Menyimpan Data..." : "Simpan Berkas Triase ke Database"}</span>
        </button>
        {showOverride && !reasonOverride && (
          <p className="text-[10px] text-center text-rose-500 mt-1 font-semibold">
            * Harap isi alasan override klinis untuk mengaktifkan penyimpanan data.
          </p>
        )}
        {!namaPetugas.trim() && (
          <p className="text-[10px] text-center text-rose-500 mt-1 font-semibold">
            * Harap isi Nama Tenaga Kesehatan untuk mengaktifkan penyimpanan data.
          </p>
        )}
      </div>
    </div>
  );
}
