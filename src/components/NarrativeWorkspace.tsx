import React, { useState } from "react";
import { CheckCircle2, ClipboardList, RefreshCw, RotateCcw, Wand2 } from "lucide-react";
import { TriageRecord } from "../types";
import { apiFetch } from "../lib/api";
import IdentitasForm from "./IdentitasForm";
import KeluhanAwalForm from "./KeluhanAwalForm";
import VitalSignForm from "./VitalSignForm";
import NyeriForm from "./NyeriForm";
import SOAPFormView from "./SOAPFormView";
import ImportTriageRecords from "./ImportTriageRecords";
import ATSHasilPanel from "./ATSHasilPanel";

interface NarrativeWorkspaceProps {
  initialRecord: TriageRecord;
  aiProvider: string;
  aiModel: string;
  setErrorMsg: (message: string | null) => void;
  setSuccessMsg: (message: string | null) => void;
  onRecordsChanged: () => Promise<void> | void;
}

const FORM_SECTIONS = [
  "Identitas",
  "Keluhan dan Riwayat Penyakit",
  "Tanda Vital dan Tingkat Kesadaran",
  "Skala Nyeri",
  "CPPT",
];

const cloneRecord = (record: TriageRecord): TriageRecord => structuredClone(record);

export default function NarrativeWorkspace({
  initialRecord,
  aiProvider,
  aiModel,
  setErrorMsg,
  setSuccessMsg,
  onRecordsChanged,
}: NarrativeWorkspaceProps) {
  const [injectedRecord, setInjectedRecord] = useState<TriageRecord>(() => cloneRecord(initialRecord));
  const [activeSection, setActiveSection] = useState(0);
  const [hasInjectedData, setHasInjectedData] = useState(false);
  const [isClassifying, setIsClassifying] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const updateRecord = (updates: Partial<TriageRecord>) => {
    if (injectedRecord.atsPrediction) {
      setSuccessMsg("Data klinis berubah. Hasil ATS sebelumnya dibatalkan agar tidak memakai data yang sudah lama.");
    }
    setInjectedRecord((current) => ({
      ...current,
      ...updates,
      atsPrediction: undefined,
      atsFinal: undefined,
    }));
  };

  const handleApplyRecord = (record: TriageRecord) => {
    setInjectedRecord({ ...cloneRecord(record), atsPrediction: undefined, atsFinal: undefined });
    setHasInjectedData(true);
    setActiveSection(0);
    requestAnimationFrame(() => {
      document.getElementById("narrative-injected-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const handleReset = () => {
    if (!confirm("Kosongkan data hasil penguraian dan mulai narasi baru?")) return;
    setInjectedRecord(cloneRecord(initialRecord));
    setHasInjectedData(false);
    setActiveSection(0);
    setSuccessMsg(null);
    setErrorMsg(null);
  };

  const handleAnalyze = async () => {
    if (!hasInjectedData) {
      setErrorMsg("Urai narasi dan suntikkan hasilnya ke formulir terlebih dahulu.");
      return;
    }
    if (!injectedRecord.nomorRM || !injectedRecord.namaPasien) {
      setErrorMsg("Nomor RM dan Nama Pasien wajib dilengkapi sebelum analisis ATS.");
      setActiveSection(0);
      return;
    }

    setIsClassifying(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const response = await apiFetch("/api/triage/classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...injectedRecord, aiProvider, aiModel }),
      });
      if (!response.ok) throw new Error("Respon analisis ATS tidak berhasil.");
      const prediction = await response.json();
      setInjectedRecord((current) => ({ ...current, atsPrediction: prediction, atsFinal: undefined }));
      setSuccessMsg("Analisis ATS berhasil. Tinjau hasil dan validasi klinis sebelum menyimpan.");
      requestAnimationFrame(() => {
        document.getElementById("narrative-analysis-result")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : "Gagal melakukan analisis ATS.");
    } finally {
      setIsClassifying(false);
    }
  };

  const handleSave = async (overrideData?: {
    atsLevelOverride?: 1 | 2 | 3 | 4 | 5;
    alasanOverride?: string;
    namaPetugas?: string;
    jabatanPetugas?: string;
  }) => {
    if (!injectedRecord.atsPrediction) return;
    setIsSaving(true);
    setErrorMsg(null);
    try {
      const finalPayload: TriageRecord = {
        ...injectedRecord,
        atsFinal: {
          atsLevelOverride: overrideData?.atsLevelOverride,
          alasanOverride: overrideData?.alasanOverride,
          atsLevelFinal: overrideData?.atsLevelOverride || injectedRecord.atsPrediction.atsLevel,
          namaPetugas: overrideData?.namaPetugas,
          jabatanPetugas: overrideData?.jabatanPetugas,
        },
      };
      const response = await apiFetch("/api/triage/records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(finalPayload),
      });
      if (!response.ok) throw new Error("Gagal menyimpan hasil triase ke database.");
      const saved = await response.json();
      await onRecordsChanged();
      setInjectedRecord(cloneRecord(initialRecord));
      setHasInjectedData(false);
      setActiveSection(0);
      setSuccessMsg(`Triase dari narasi berhasil disimpan dengan Kode Transaksi: ${saved.id}`);
      document.getElementById("narrative-ai-parser-widget")?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : "Gagal menyimpan hasil triase.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-indigo-200 bg-indigo-50/70 p-5 dark:border-indigo-900 dark:bg-indigo-950/20">
        <h2 className="text-2xl font-black text-slate-900 dark:text-white">Pengurai dan Pemilah Narasi Klinis</h2>
        <p className="mt-2 text-base font-medium text-slate-600 dark:text-slate-300">
          Urai narasi bebas menjadi data terstruktur, periksa hasilnya, lalu lakukan analisis ATS dan simpan tanpa berpindah halaman.
        </p>
      </div>

      <ImportTriageRecords
        onApplyRecord={handleApplyRecord}
        setErrorMsg={setErrorMsg}
        setSuccessMsg={setSuccessMsg}
        aiProvider={aiProvider}
        aiModel={aiModel}
      />

      <section id="narrative-injected-form" className="scroll-mt-28 rounded-3xl border-2 border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-6">
        <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-indigo-100 p-3 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
              <ClipboardList size={26} />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white">Formulir Hasil Suntikan Data</h3>
              <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
                {hasInjectedData
                  ? "Data hasil penguraian sudah dimasukkan. Periksa setiap bagian dan lakukan koreksi bila diperlukan."
                  : "Hasil penguraian akan muncul di sini tanpa berpindah ke Form Utama."}
              </p>
            </div>
          </div>
          <button type="button" onClick={handleReset} className="flex min-h-12 items-center justify-center gap-2 rounded-xl border-2 border-rose-200 px-4 py-2 text-sm font-bold text-rose-700 transition hover:bg-rose-50 dark:border-rose-900 dark:text-rose-300 dark:hover:bg-rose-950/30">
            <RotateCcw size={19} />
            Reset Hasil
          </button>
        </div>

        {hasInjectedData && (
          <div className="mt-5 flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 font-bold text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300">
            <CheckCircle2 size={21} className="shrink-0" />
            Data berhasil disuntikkan ke formulir halaman ini.
          </div>
        )}

        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {FORM_SECTIONS.map((label, index) => (
            <button key={label} type="button" onClick={() => setActiveSection(index)} className={`min-h-16 rounded-2xl border-2 p-3 text-left text-sm font-black transition ${activeSection === index ? "border-indigo-500 bg-indigo-50 text-indigo-800 ring-2 ring-indigo-200 dark:bg-indigo-950/30 dark:text-indigo-300 dark:ring-indigo-900" : "border-slate-200 bg-white text-slate-600 hover:border-indigo-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"}`}>
              <span className="mb-1 block font-mono text-sm opacity-60">Bagian {index + 1}</span>
              {label}
            </button>
          ))}
        </div>

        <div className="mt-6">
          {activeSection === 0 && (
            <div key={injectedRecord.id || injectedRecord.nomorRM || "new-patient"}>
              <IdentitasForm data={injectedRecord} onChange={updateRecord} />
            </div>
          )}
          {activeSection === 1 && <KeluhanAwalForm data={injectedRecord} onChange={updateRecord} />}
          {activeSection === 2 && <VitalSignForm data={injectedRecord} onChange={updateRecord} />}
          {activeSection === 3 && <NyeriForm data={injectedRecord} onChange={updateRecord} />}
          {activeSection === 4 && <SOAPFormView data={injectedRecord} onChange={updateRecord} />}
        </div>

        <div className="mt-6 flex flex-col gap-3 border-t border-slate-200 pt-6 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-2xl text-sm font-medium text-slate-600 dark:text-slate-300">
            Setelah seluruh data hasil pilahan diperiksa, jalankan analisis ATS. Hasil tetap wajib divalidasi oleh dokter atau perawat.
          </p>
          {!injectedRecord.atsPrediction && (
            <button
              type="button"
              onClick={handleAnalyze}
              disabled={isClassifying || !hasInjectedData}
              className="flex min-h-14 shrink-0 items-center justify-center gap-2 rounded-xl bg-linear-to-r from-emerald-600 to-teal-600 px-6 py-3 text-base font-extrabold text-white shadow-lg shadow-emerald-200 transition hover:from-emerald-700 hover:to-teal-700 disabled:cursor-not-allowed disabled:opacity-50 dark:shadow-none"
            >
              {isClassifying ? <RefreshCw size={22} className="animate-spin" /> : <Wand2 size={22} />}
              {isClassifying ? "Menganalisis..." : "Analisis ATS dengan AI"}
            </button>
          )}
        </div>
      </section>

      {injectedRecord.atsPrediction && (
        <section id="narrative-analysis-result" className="scroll-mt-28">
          <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-900 dark:bg-emerald-950/25">
            <h3 className="text-xl font-extrabold text-emerald-900 dark:text-emerald-200">Hasil Analisis ATS dari Narasi</h3>
            <p className="mt-1 text-sm font-medium text-emerald-800 dark:text-emerald-300">
              Periksa rekomendasi, isi validator, lalu simpan hasil ke database dari panel berikut.
            </p>
          </div>
          <ATSHasilPanel data={injectedRecord} onSave={handleSave} isSaving={isSaving} />
        </section>
      )}
    </div>
  );
}
