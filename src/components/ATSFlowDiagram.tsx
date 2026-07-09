import React, { useState } from "react";
import {
  ArrowRight,
  ArrowDown,
  ChevronDown,
  ChevronUp,
  User,
  FileText,
  Activity,
  Sliders,
  Wand2,
  ShieldAlert,
  UserCheck,
  Network,
  ClipboardList,
  Cpu,
  Stethoscope
} from "lucide-react";

interface FlowStep {
  id: number;
  title: string;
  icon: typeof User;
  desc: string;
  details: string[];
}

interface FlowLane {
  id: string;
  label: string;
  actor: string;
  icon: typeof User;
  color: string;
  steps: FlowStep[];
}

export default function ATSFlowDiagram() {
  const [isOpen, setIsOpen] = useState(true);
  const [activeStep, setActiveStep] = useState<number | null>(null);

  // Tiga tahap nyata di backend classifyTriage(): kumpulkan data -> mesin
  // keputusan otomatis (rule guard-rail + AI + merge) -> validasi klinisi.
  // Dikelompokkan begini spesifik supaya pembaca langsung tahu bagian mana
  // yang otomatis dan mana yang tetap keputusan manusia.
  const lanes: FlowLane[] = [
    {
      id: "input",
      label: "Tahap 1 — Pengumpulan Data",
      actor: "Dikerjakan petugas/perawat di formulir",
      icon: ClipboardList,
      color: "sky",
      steps: [
        {
          id: 1,
          title: "Registrasi & Identitas",
          icon: User,
          desc: "Petugas mendaftarkan identitas dasar pasien.",
          details: [
            "Nomor Rekam Medis (RM) unik",
            "Kalkulasi umur dari tanggal lahir",
            "Metode kedatangan (ambulans, jalan sendiri, dll.)"
          ]
        },
        {
          id: 2,
          title: "Keluhan & Riwayat",
          icon: FileText,
          desc: "Investigasi keluhan utama & penyerta pasien.",
          details: [
            "Chief complaint dari kategori standar",
            "Narasi bebas klinis (opsional, bisa dipilah otomatis)",
            "Gejala tambahan & riwayat penyakit/komorbiditas"
          ]
        },
        {
          id: 3,
          title: "Tanda Vital & Saraf",
          icon: Activity,
          desc: "Pemeriksaan vitalitas objektif & status kesadaran.",
          details: [
            "Fisiologis: tekanan darah, HR, RR, suhu, SpO2",
            "Status neurologis: skala AVPU cepat (A, V, P, U)",
            "Klasifikasi detail Glasgow Coma Scale (GCS)"
          ]
        },
        {
          id: 4,
          title: "Skala Nyeri & SOAP",
          icon: Sliders,
          desc: "Peta intensitas nyeri & pemeriksaan organ tubuh.",
          details: [
            "Skala intensitas nyeri (0-10) & kategori",
            "Lokasi anatomis nyeri & penjalaran",
            "Pemeriksaan fisik objektif terfokus (SOAP)"
          ]
        }
      ]
    },
    {
      id: "engine",
      label: "Tahap 2 — Mesin Keputusan",
      actor: "Berjalan otomatis di server, tanpa input manual",
      icon: Cpu,
      color: "violet",
      steps: [
        {
          id: 5,
          title: "Safety Rules (Guard Rail)",
          icon: ShieldAlert,
          desc: "Cek red flag fisiologis lebih dulu, sebelum AI dipanggil.",
          details: [
            "AVPU Unresponsive atau GCS ≤ 8 → dorong ke ATS 1",
            "Apnea atau RR < 10x/menit → dorong ke ATS 1",
            "Nadi tak teraba, atau syok (perfusi buruk + sistolik < 90) → ATS 1",
            "Hasil rule ini jadi batas bawah keamanan di Tahap Penggabungan"
          ]
        },
        {
          id: 6,
          title: "Model AI ATS",
          icon: Wand2,
          desc: "Estimasi triase dari AI, hanya bila provider AI aktif dipilih.",
          details: [
            "Provider aktif saat ini: Model Mandiri (RunPod) atau Hugging Face",
            "Google Gemini nonaktif (di-off manual dari pengaturan)",
            "Mode \"Pure Rule Based\" melewati tahap ini sepenuhnya",
            "Menghasilkan confidence %, alasan klinis, dan rekomendasi awal"
          ]
        },
        {
          id: 7,
          title: "Penggabungan Keputusan",
          icon: Network,
          desc: "Rule guard-rail dan hasil AI digabung jadi satu level ATS final.",
          details: [
            "AI tidak bisa menurunkan urgensi di bawah batas rule Tahap 5",
            "Rule override berlaku hanya jika levelnya gawat (≤3) & lebih ketat dari AI",
            "Bila AI tidak dipakai/gagal merespons, hasil rule dipakai langsung",
            "Semua alasan & red flag yang dipakai dicatat untuk ditinjau klinisi"
          ]
        }
      ]
    },
    {
      id: "review",
      label: "Tahap 3 — Validasi Klinis",
      actor: "Keputusan akhir tetap di tangan dokter/perawat",
      icon: Stethoscope,
      color: "rose",
      steps: [
        {
          id: 8,
          title: "Override & Simpan",
          icon: UserCheck,
          desc: "Dokter/perawat meninjau lalu mengunci keputusan final.",
          details: [
            "Boleh override manual bila penilaian klinis berbeda",
            "Nama & jabatan petugas penanggung jawab tercatat",
            "Tersimpan ke database & dataset ekspor untuk pelatihan model"
          ]
        }
      ]
    }
  ];

  const colorClasses: Record<string, { chip: string; ring: string; laneIcon: string; laneText: string }> = {
    sky: {
      chip: "border-sky-150 bg-sky-50 text-sky-700 dark:border-sky-900/40 dark:bg-sky-950/20 dark:text-sky-400",
      ring: "ring-sky-400 dark:ring-sky-700",
      laneIcon: "bg-sky-100 text-sky-600 dark:bg-sky-950 dark:text-sky-400",
      laneText: "text-sky-600 dark:text-sky-400"
    },
    violet: {
      chip: "border-violet-150 bg-violet-50 text-violet-700 dark:border-violet-900/40 dark:bg-violet-950/20 dark:text-violet-400",
      ring: "ring-violet-400 dark:ring-violet-700",
      laneIcon: "bg-violet-100 text-violet-600 dark:bg-violet-950 dark:text-violet-400",
      laneText: "text-violet-600 dark:text-violet-400"
    },
    rose: {
      chip: "border-rose-150 bg-rose-50 text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-400",
      ring: "ring-rose-400 dark:ring-rose-700",
      laneIcon: "bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400",
      laneText: "text-rose-600 dark:text-rose-400"
    }
  };

  // Warna per-langkah di dalam Tahap 2 dipertahankan berbeda (amber/violet/emerald)
  // karena rule vs AI vs merge memang tiga jenis proses yang berbeda secara nyata.
  const stepAccent: Record<number, string> = {
    5: "border-amber-150 bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-400",
    6: "border-violet-150 bg-violet-50 text-violet-700 dark:border-violet-900/40 dark:bg-violet-950/20 dark:text-violet-400",
    7: "border-emerald-150 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-400"
  };

  const allSteps = lanes.flatMap((lane) => lane.steps);
  const activeStepData = activeStep !== null ? allSteps.find((s) => s.id === activeStep) : null;

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
              Alur Keputusan Triase ATS
            </h3>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
              3 tahap: petugas mengisi data → sistem menghitung otomatis → klinisi memvalidasi
            </p>
          </div>
        </div>
        {isOpen ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
      </button>

      {isOpen && (
        <div className="p-6 space-y-5 animate-fade-in">
          {lanes.map((lane, laneIdx) => {
            const LaneIcon = lane.icon;
            const palette = colorClasses[lane.color];
            return (
              <div key={lane.id}>
                {/* Lane header names the phase AND who performs it, so automated
                    vs. human-owned steps are never ambiguous at a glance. */}
                <div className="flex items-center gap-2.5 mb-3">
                  <div className={`p-1.5 rounded-lg shrink-0 ${palette.laneIcon}`}>
                    <LaneIcon size={14} />
                  </div>
                  <div className="min-w-0">
                    <span className={`text-[10px] font-black uppercase tracking-widest ${palette.laneText}`}>
                      {lane.label}
                    </span>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium truncate">
                      {lane.actor}
                    </p>
                  </div>
                </div>

                <div
                  className="grid gap-3"
                  style={{ gridTemplateColumns: `repeat(${lane.steps.length}, minmax(0, 1fr))` }}
                >
                  {lane.steps.map((step, idx) => {
                    const IconComp = step.icon;
                    const isSelected = activeStep === step.id;
                    const accent = stepAccent[step.id] || palette.chip;

                    return (
                      <div key={step.id} className="relative flex flex-col justify-between">
                        <button
                          type="button"
                          onClick={() => setActiveStep(isSelected ? null : step.id)}
                          className={`w-full p-3.5 rounded-2xl border text-left cursor-pointer transition-all hover:scale-[1.01] hover:shadow-2xs h-full flex flex-col justify-between ${
                            isSelected
                              ? `${accent} ring-2 ${palette.ring} scale-[1.01]`
                              : "border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-700 dark:text-slate-300"
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <div className={`p-1.5 rounded-lg shrink-0 ${isSelected ? "bg-white/45 dark:bg-white/10" : "bg-slate-200/50 dark:bg-slate-800"}`}>
                              <IconComp size={14} />
                            </div>
                            <span className="text-[10px] uppercase font-bold tracking-wider opacity-90 truncate">
                              {step.title}
                            </span>
                          </div>

                          <p className="text-[10px] leading-relaxed font-medium opacity-80 min-h-[30px]">
                            {step.desc}
                          </p>

                          <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[9px] font-bold text-indigo-600 dark:text-indigo-400">
                            <span>Lihat rincian</span>
                            <ChevronDown size={10} className={`transform transition-transform ${isSelected ? "rotate-180" : ""}`} />
                          </div>
                        </button>

                        {/* Connector to the next card in the same lane only — every lane's
                            column count matches its step count, so no wrap ever hides an arrow. */}
                        {idx < lane.steps.length - 1 && (
                          <div className="hidden md:flex absolute top-1/2 -right-2 transform -translate-y-1/2 z-10 text-slate-300 dark:text-slate-700 pointer-events-none">
                            <ArrowRight size={12} className="stroke-2" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {laneIdx < lanes.length - 1 && (
                  <div className="flex items-center justify-center py-2 text-slate-300 dark:text-slate-700">
                    <ArrowDown size={16} className="stroke-2" />
                  </div>
                )}
              </div>
            );
          })}

          {/* Active Node Detail Expansion Card */}
          {activeStepData ? (
            <div className="p-4 rounded-2xl bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-100/50 dark:border-indigo-900/40 animate-fade-in">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-1.5 h-3 bg-indigo-600 rounded-full" />
                <h4 className="text-[11px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-widest">
                  {activeStepData.title}
                </h4>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-3">
                {activeStepData.desc}
              </p>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {activeStepData.details.map((detail, index) => (
                  <li key={index} className="flex items-center gap-2 text-[10px] font-semibold text-slate-700 dark:text-slate-300">
                    <span className="text-indigo-500 font-black">✓</span>
                    <span>{detail}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="text-center py-2.5 bg-slate-50/50 dark:bg-slate-900/30 rounded-2xl border border-dashed border-slate-150 dark:border-slate-800 text-[10px] text-slate-400 font-medium">
              💡 Klik salah satu langkah di atas untuk melihat rincian kriteria & data yang dipakai.
            </div>
          )}

          {/* Pipeline Summary Text Block for Instant Visualization */}
          <div className="p-4 bg-slate-50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800 rounded-2xl grid grid-cols-1 md:grid-cols-12 gap-4 text-xs font-medium">
            <div className="md:col-span-4 flex flex-col justify-center border-b md:border-b-0 md:border-r border-slate-100 dark:border-slate-800 pb-3 md:pb-0 md:pr-4">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Prinsip Keselamatan</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold text-sm leading-snug mt-1 flex items-center gap-1">
                🛡️ Rule + AI + Klinisi
              </span>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium mt-1">
                Rule guard-rail selalu jadi batas bawah keamanan sebelum AI atau klinisi menetapkan keputusan akhir.
              </p>
            </div>

            <div className="md:col-span-8 space-y-2">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Cara Tahap 2 & 3 Saling Menjaga</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] leading-relaxed">
                <div className="p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                  <span className="font-extrabold text-slate-800 dark:text-slate-200">1. AI tidak bisa menurunkan urgensi</span>
                  <p className="text-slate-400 dark:text-slate-500 font-medium mt-0.5">Bila AI menilai lebih ringan dari red flag rule (mis. henti napas/syok), sistem tetap memaksa level gawat sesuai Tahap 5.</p>
                </div>
                <div className="p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                  <span className="font-extrabold text-slate-800 dark:text-slate-200">2. Klinisi tetap punya kata akhir</span>
                  <p className="text-slate-400 dark:text-slate-500 font-medium mt-0.5">Dokter/perawat berhak override hasil sistem secara akuntabel, tercatat lengkap dengan nama & alasan di database.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
