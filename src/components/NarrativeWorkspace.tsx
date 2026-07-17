import React, { useState } from "react";
import { CheckCircle2, ClipboardList, RotateCcw } from "lucide-react";
import { TriageRecord } from "../types";
import IdentitasForm from "./IdentitasForm";
import KeluhanAwalForm from "./KeluhanAwalForm";
import VitalSignForm from "./VitalSignForm";
import NyeriForm from "./NyeriForm";
import SOAPFormView from "./SOAPFormView";
import ImportTriageRecords from "./ImportTriageRecords";

interface NarrativeWorkspaceProps {
  initialRecord: TriageRecord;
  aiProvider: string;
  aiModel: string;
  setErrorMsg: (message: string | null) => void;
  setSuccessMsg: (message: string | null) => void;
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
}: NarrativeWorkspaceProps) {
  const [injectedRecord, setInjectedRecord] = useState<TriageRecord>(() => cloneRecord(initialRecord));
  const [activeSection, setActiveSection] = useState(0);
  const [hasInjectedData, setHasInjectedData] = useState(false);

  const updateRecord = (updates: Partial<TriageRecord>) => {
    setInjectedRecord((current) => ({ ...current, ...updates }));
  };

  const handleApplyRecord = (record: TriageRecord) => {
    setInjectedRecord(cloneRecord(record));
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

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-indigo-200 bg-indigo-50/70 p-5 dark:border-indigo-900 dark:bg-indigo-950/20">
        <h2 className="text-2xl font-black text-slate-900 dark:text-white">Pengurai dan Pemilah Narasi Klinis</h2>
        <p className="mt-2 text-base font-medium text-slate-600 dark:text-slate-300">
          Urai narasi bebas menjadi data terstruktur, lalu periksa dan koreksi hasilnya langsung pada formulir di halaman ini.
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
          {activeSection === 0 && <IdentitasForm data={injectedRecord} onChange={updateRecord} />}
          {activeSection === 1 && <KeluhanAwalForm data={injectedRecord} onChange={updateRecord} />}
          {activeSection === 2 && <VitalSignForm data={injectedRecord} onChange={updateRecord} />}
          {activeSection === 3 && <NyeriForm data={injectedRecord} onChange={updateRecord} />}
          {activeSection === 4 && <SOAPFormView data={injectedRecord} onChange={updateRecord} />}
        </div>
      </section>
    </div>
  );
}
