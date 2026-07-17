import React from "react";
import {
  Activity,
  ArrowDown,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Cpu,
  FileText,
  HeartPulse,
  Network,
  ShieldAlert,
  SlidersHorizontal,
  Sparkles,
  Stethoscope,
  UserRound,
} from "lucide-react";

interface ATSGuidePageProps {
  onStart: () => void;
  onSkip: () => void;
}

const phases = [
  {
    number: "01",
    title: "Pengumpulan Data Pasien",
    subtitle: "Diisi petugas atau perawat triase",
    accent: "sky",
    icon: ClipboardList,
    steps: [
      {
        title: "Registrasi dan Identitas",
        icon: UserRound,
        summary: "Kenali pasien dan konteks kedatangannya.",
        details: ["Nomor rekam medis dan identitas", "Umur serta jenis kelamin", "Waktu dan cara kedatangan"],
      },
      {
        title: "Keluhan dan Riwayat Penyakit",
        icon: FileText,
        summary: "Catat masalah utama dan kondisi penyerta.",
        details: ["Keluhan utama dan narasi klinis", "Gejala tambahan yang dirasakan", "Riwayat penyakit, komorbid, dan alergi"],
      },
      {
        title: "Tanda Vital dan Tingkat Kesadaran",
        icon: HeartPulse,
        summary: "Ukur kondisi fisiologis dan respons pasien.",
        details: ["Tekanan darah, nadi, napas, suhu, dan SpO₂", "Penilaian cepat AVPU", "Glasgow Coma Scale (GCS)"],
      },
      {
        title: "Skala Nyeri dan CPPT",
        icon: SlidersHorizontal,
        summary: "Lengkapi gambaran nyeri dan pemeriksaan terintegrasi.",
        details: ["Skala nyeri 0–10 dan kategorinya", "Lokasi serta penjalaran nyeri", "Catatan Perkembangan Pasien Terintegrasi (CPPT)"],
      },
    ],
  },
  {
    number: "02",
    title: "Analisis Sistem",
    subtitle: "Dijalankan otomatis setelah data lengkap",
    accent: "violet",
    icon: Cpu,
    steps: [
      {
        title: "Pemeriksaan Aturan Keselamatan",
        icon: ShieldAlert,
        summary: "Red flag klinis diperiksa lebih dahulu.",
        details: ["Mendeteksi gangguan jalan napas, syok, atau hipoksia", "Mendeteksi penurunan kesadaran berat", "Menetapkan batas urgensi yang tidak boleh diturunkan"],
      },
      {
        title: "Analisis Model ATS",
        icon: Sparkles,
        summary: "Sistem menyusun estimasi level triase.",
        details: ["Membaca seluruh data klinis yang diisi", "Memberikan level ATS dan tingkat keyakinan", "Menyertakan alasan serta rekomendasi awal"],
      },
      {
        title: "Penggabungan Keputusan",
        icon: Network,
        summary: "Aturan keselamatan dan hasil model disatukan.",
        details: ["Hasil tidak boleh lebih ringan dari red flag", "Fallback aturan tetap bekerja bila AI tidak tersedia", "Alasan keputusan disimpan untuk peninjauan"],
      },
    ],
  },
  {
    number: "03",
    title: "Validasi Klinis",
    subtitle: "Keputusan akhir tetap oleh tenaga kesehatan",
    accent: "rose",
    icon: Stethoscope,
    steps: [
      {
        title: "Tinjau, Sesuaikan, dan Simpan",
        icon: CheckCircle2,
        summary: "Klinisi memastikan hasil sesuai kondisi pasien.",
        details: ["Dokter atau perawat meninjau rekomendasi", "Level dapat disesuaikan berdasarkan penilaian klinis", "Nama validator, alasan, dan hasil akhir tercatat"],
      },
    ],
  },
] as const;

const palettes = {
  sky: {
    badge: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
    border: "border-sky-200 dark:border-sky-900",
    icon: "bg-sky-600 text-white",
    dot: "bg-sky-500",
  },
  violet: {
    badge: "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300",
    border: "border-violet-200 dark:border-violet-900",
    icon: "bg-violet-600 text-white",
    dot: "bg-violet-500",
  },
  rose: {
    badge: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300",
    border: "border-rose-200 dark:border-rose-900",
    icon: "bg-rose-600 text-white",
    dot: "bg-rose-500",
  },
} as const;

export default function ATSGuidePage({ onStart, onSkip }: ATSGuidePageProps) {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-lg dark:border-slate-800 dark:bg-slate-900">
      <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-sky-200/40 blur-3xl dark:bg-sky-900/20" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-violet-200/40 blur-3xl dark:bg-violet-900/20" />

      <div className="relative border-b border-slate-200 px-5 py-8 dark:border-slate-800 sm:px-8 lg:px-10">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-3xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-emerald-100 px-4 py-2 font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              <Activity size={20} aria-hidden="true" />
              Asisten Penggunaan Aplikasi
            </div>
            <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              Alur Keputusan Triase ATS
            </h2>
            <p className="mt-3 max-w-2xl text-base font-medium text-slate-600 dark:text-slate-300">
              Ikuti gambaran singkat ini untuk memahami bagaimana data pasien diproses menjadi rekomendasi ATS yang kemudian divalidasi oleh tenaga kesehatan.
            </p>
          </div>

          <button
            id="btn-skip-ats-guide"
            type="button"
            onClick={onSkip}
            className="shrink-0 rounded-2xl border-2 border-slate-300 bg-white px-5 py-3 text-base font-bold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Lewati panduan
          </button>
        </div>
      </div>

      <div className="relative space-y-5 px-5 py-7 sm:px-8 lg:px-10">
        {phases.map((phase, phaseIndex) => {
          const palette = palettes[phase.accent];
          const PhaseIcon = phase.icon;

          return (
            <React.Fragment key={phase.number}>
              <article className={`rounded-3xl border-2 bg-slate-50/70 p-5 dark:bg-slate-950/30 sm:p-6 ${palette.border}`}>
                <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${palette.icon}`}>
                    <PhaseIcon size={25} aria-hidden="true" />
                  </div>
                  <div>
                    <span className={`inline-flex rounded-full px-3 py-1 text-sm font-black ${palette.badge}`}>
                      TAHAP {phase.number}
                    </span>
                    <h3 className="mt-2 text-xl font-black text-slate-900 dark:text-white">{phase.title}</h3>
                    <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{phase.subtitle}</p>
                  </div>
                </div>

                <div className={`grid gap-4 ${phase.steps.length === 4 ? "md:grid-cols-2 xl:grid-cols-4" : phase.steps.length === 3 ? "md:grid-cols-3" : "grid-cols-1"}`}>
                  {phase.steps.map((step, stepIndex) => {
                    const StepIcon = step.icon;
                    return (
                      <div key={step.title} className="relative rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                        <div className="mb-4 flex items-start justify-between gap-3">
                          <div className={`rounded-xl p-2.5 ${palette.badge}`}>
                            <StepIcon size={22} aria-hidden="true" />
                          </div>
                          <span className="font-mono text-sm font-black text-slate-400">{phase.number}.{stepIndex + 1}</span>
                        </div>
                        <h4 className="text-base font-black text-slate-900 dark:text-white">{step.title}</h4>
                        <p className="mt-2 text-sm font-medium text-slate-600 dark:text-slate-300">{step.summary}</p>
                        <ul className="mt-4 space-y-2 border-t border-slate-100 pt-4 dark:border-slate-800">
                          {step.details.map((detail) => (
                            <li key={detail} className="flex items-start gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                              <span className={`mt-2 h-2 w-2 shrink-0 rounded-full ${palette.dot}`} />
                              <span>{detail}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              </article>

              {phaseIndex < phases.length - 1 && (
                <div className="flex justify-center text-slate-400" aria-hidden="true">
                  <ArrowDown className="sm:hidden" size={30} />
                  <ArrowRight className="hidden sm:block rotate-90" size={30} />
                </div>
              )}
            </React.Fragment>
          );
        })}

        <div className="rounded-3xl bg-slate-900 p-6 text-white dark:bg-slate-800 sm:flex sm:items-center sm:justify-between sm:gap-6">
          <div>
            <h3 className="text-xl font-black">Siap memulai skrining triase?</h3>
            <p className="mt-2 text-sm font-medium text-slate-300">
              Sistem membantu proses keputusan, tetapi penilaian dan keputusan klinis akhir tetap menjadi tanggung jawab tenaga kesehatan.
            </p>
          </div>
          <button
            id="btn-start-triage-from-guide"
            type="button"
            onClick={onStart}
            className="mt-5 flex w-full shrink-0 items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-6 py-4 text-base font-black text-slate-950 transition hover:bg-emerald-400 sm:mt-0 sm:w-auto"
          >
            Mulai Triase
            <ArrowRight size={22} aria-hidden="true" />
          </button>
        </div>
      </div>
    </section>
  );
}
