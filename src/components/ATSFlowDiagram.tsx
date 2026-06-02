import React, { useState } from "react";
import { 
  ArrowRight, 
  ChevronDown, 
  ChevronUp, 
  User, 
  FileText, 
  Activity, 
  Sliders, 
  Wand2, 
  ShieldAlert, 
  UserCheck, 
  Database, 
  GitCommit,
  Network
} from "lucide-react";

export default function ATSFlowDiagram() {
  const [isOpen, setIsOpen] = useState(true);
  const [activeStep, setActiveStep] = useState<number | null>(null);

  const steps = [
    {
      id: 1,
      title: "1. Registrasi & Identitas",
      icon: User,
      desc: "Petugas mendaftarkan identitas dasar pasien.",
      details: [
        "Nomor Rekam Medis (RM) unik",
        "Kalkulasi Umur dari Tanggal Lahir",
        "Metode Kedatangan (Ambulans, Jalan Sendiri, dll.)"
      ],
      color: "border-indigo-150 bg-indigo-50 text-indigo-700 dark:border-indigo-900/40 dark:bg-indigo-950/20 dark:text-indigo-400"
    },
    {
      id: 2,
      title: "2. Keluhan & Riwayat",
      icon: FileText,
      desc: "Investigasi keluhan utama & penyerta pasien.",
      details: [
        "Chief Complaint (kategori standar)",
        "Narasi deskripsi bebas klinis",
        "Gejala tambahan & riwayat komorbiditas"
      ],
      color: "border-violet-150 bg-violet-50 text-violet-700 dark:border-violet-900/40 dark:bg-violet-950/20 dark:text-violet-400"
    },
    {
      id: 3,
      title: "3. Tanda Vital & Saraf",
      icon: Activity,
      desc: "Pemeriksaan vitalitas objektif & status kesadaran.",
      details: [
        "Fisiologis: Tekanan Darah, HR, RR, Suhu, SpO2",
        "Status Neurologis: Skala AVPU cepat (A, V, P, U)",
        "Klasifikasi detail Glasglow Coma Scale (GCS)"
      ],
      color: "border-emerald-150 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-400"
    },
    {
      id: 4,
      title: "4. Skala Nyeri & SOAP",
      icon: Sliders,
      desc: "Peta intensitas nyeri & pemeriksaan organ tubuh.",
      details: [
        "Kategori intensitas skala nyeri (0 - 10)",
        "Lokasi anatomis nyeri & penjalaran",
        "Status pemeriksaan fisik objektif terfokus (SOAP)"
      ],
      color: "border-sky-150 bg-sky-50 text-sky-700 dark:border-sky-900/40 dark:bg-sky-950/20 dark:text-sky-400"
    },
    {
      id: 5,
      title: "5. Safety Overrides (Rules)",
      icon: ShieldAlert,
      desc: "Mengevaluasi parameter gawat darurat kritis.",
      details: [
        "Mendeteksi tanda bahaya fatal (SpO2 < 85%, GCS ≤ 8, Apnea)",
        "AVPU Unresponsive langsung memaksa level ATS 1",
        "Memproteksi keputusan agar tidak berkurang di bawah batas aman"
      ],
      color: "border-amber-150 bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-400"
    },
    {
      id: 6,
      title: "6. Model AI ATS",
      icon: Wand2,
      desc: "Komputasi estimasi triase dengan kognisi AI.",
      details: [
        "Saat ini diproses oleh model Gemini 3.5-flash",
        "Mempertimbangkan gejala multi-dimensi secara holistik",
        "Menghasilkan bobot confidence % & rekomendasi awal"
      ],
      color: "border-fuchsia-150 bg-fuchsia-50 text-fuchsia-700 dark:border-fuchsia-900/40 dark:bg-fuchsia-950/20 dark:text-fuchsia-400"
    },
    {
      id: 7,
      title: "7. Pasukan Merger (Uji)",
      icon: Network,
      desc: "Menggabungkan output AI dengan aturan keselamatan.",
      details: [
        "Mengadopsi nilai prediktif paling sensitif & aman",
        "Memastikan perlindungan penuh malpraktik sistem",
        "Menampilkan rincian justifikasi red-flags"
      ],
      color: "border-cyan-150 bg-cyan-50 text-cyan-700 dark:border-cyan-900/40 dark:bg-cyan-950/20 dark:text-cyan-400"
    },
    {
      id: 8,
      title: "8. Override & Simpan",
      icon: UserCheck,
      desc: "Dokter/perawat memvalidasi keputusan final.",
      details: [
        "Mempersilakan manual override bila dianggap perlu",
        "Pencatatan Nama & Jabatan petugas Penanggung jawab Jawab",
        "Penyimpanan ke berkas database & ekspor dataset ML"
      ],
      color: "border-rose-150 bg-rose-50 text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-400"
    }
  ];

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm" id="ats-pipeline-flowchart">
      {/* Header section with toggle expandable */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-6 py-4 border-b border-slate-50 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition text-left cursor-pointer rounded-t-3xl"
      >
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-xl">
            <Network size={16} />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">
              Diagram Alur Proses Keputusan Triase ATS
            </h3>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
              Siklus penyaringan data klinis pasien lewat Mesin Aturan & AI Model
            </p>
          </div>
        </div>
        {isOpen ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
      </button>

      {isOpen && (
        <div className="p-6 space-y-6 animate-fade-in">
          {/* Main Pipeline Nodes */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 relative">
            {steps.map((step, idx) => {
              const IconComp = step.icon;
              const isSelected = activeStep === step.id;
              
              return (
                <div key={step.id} className="relative flex flex-col justify-between">
                  <button
                    type="button"
                    onClick={() => setActiveStep(isSelected ? null : step.id)}
                    className={`w-full p-3.5 rounded-2xl border text-left cursor-pointer transition-all hover:scale-[1.01] hover:shadow-2xs h-full flex flex-col justify-between ${
                      isSelected 
                        ? `${step.color} ring-2 ring-indigo-400 dark:ring-indigo-700 scale-[1.01]` 
                        : "border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`p-1.5 rounded-lg shrink-0 ${isSelected ? 'bg-white/45 dark:bg-white/10' : 'bg-slate-200/50 dark:bg-slate-800'}`}>
                        <IconComp size={14} />
                      </div>
                      <span className="text-[10px] uppercase font-bold tracking-wider opacity-90 truncate">
                        {step.title.split(". ")[1]}
                      </span>
                    </div>

                    <p className="text-[10px] leading-relaxed font-medium opacity-80 min-h-[30px]">
                      {step.desc}
                    </p>

                    <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[9px] font-bold text-indigo-600 dark:text-indigo-400">
                      <span>Detail Saringan</span>
                      <ChevronDown size={10} className={`transform transition-transform ${isSelected ? 'rotate-180' : ''}`} />
                    </div>
                  </button>

                  {/* Connect arrow indicators for large screens */}
                  {idx < steps.length - 1 && (
                    <div className="hidden lg:flex absolute top-1/2 -right-2 transform -translate-y-1/2 z-10 text-slate-300 pointer-events-none">
                      {(idx + 1) % 4 !== 0 ? <ArrowRight size={10} className="stroke-2" /> : null}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Active Node Detail Expansion Card */}
          {activeStep !== null ? (
            <div className="p-4 rounded-2xl bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-100/50 dark:border-indigo-900/40 animate-fade-in">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-1.5 h-3 bg-indigo-600 rounded-full" />
                <h4 className="text-[11px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-widest">
                  Glosarium Alur: {steps[activeStep - 1].title}
                </h4>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-3">
                {steps[activeStep - 1].desc} Bagian proses ini bertanggung jawab atas penyusunan dan pengamanan kriteria:
              </p>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {steps[activeStep - 1].details.map((detail, index) => (
                  <li key={index} className="flex items-center gap-2 text-[10px] font-semibold text-slate-700 dark:text-slate-300">
                    <span className="text-indigo-500 font-black">✓</span>
                    <span>{detail}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="text-center py-2.5 bg-slate-50/50 dark:bg-slate-900/30 rounded-2xl border border-dashed border-slate-150 dark:border-slate-800 text-[10px] text-slate-400 font-medium">
              💡 Tip: Klik salah satu langkah alur triage di atas untuk mengecek rincian kondisi penyaringan & instrumen data yang dikumpulkan.
            </div>
          )}

          {/* Pipeline Summary Text Block for Instant Visualization */}
          <div className="p-4 bg-slate-50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800 rounded-2xl grid grid-cols-1 md:grid-cols-12 gap-4 text-xs font-medium">
            <div className="md:col-span-4 flex flex-col justify-center border-b md:border-b-0 md:border-r border-slate-100 dark:border-slate-800 pb-3 md:pb-0 md:pr-4">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Hukum Perlindungan Keamanan</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold text-sm leading-snug mt-1 flex items-center gap-1">
                🛡️ AI + Clinician Safeguard
              </span>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium mt-1">
                Sistem secara cerdas menyaring data dengan rule-safety sebelum model AI atau petugas melakukan penegakan keputusan final.
              </p>
            </div>
            
            <div className="md:col-span-8 space-y-2">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Aturan Penggabungan Keamanan (Safety Merger)</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] leading-relaxed">
                <div className="p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                  <span className="font-extrabold text-slate-800 dark:text-slate-200">1. Prioritas Keamanan (Safety Priority)</span>
                  <p className="text-slate-400 dark:text-slate-500 font-medium mt-0.5">Bila AI salah menentukan prioritas ringan pada kondisi henti napas/syok, filter sistem melipatgandakan bobot untuk memaksa status gawat darurat (ATS 1).</p>
                </div>
                <div className="p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                  <span className="font-extrabold text-slate-800 dark:text-slate-200">2. Tanggung Jawab Keprofesian</span>
                  <p className="text-slate-400 dark:text-slate-500 font-medium mt-0.5">Dokter/perawat berhak melakukan overrule klinis secara akuntabel, terekam lengkap pada database logs bersama nama & rincian alasan.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
