import React from "react";
import { motion } from "motion/react";
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Cpu,
  Database,
  FileText,
  HeartPulse,
  Network,
  ShieldAlert,
  SlidersHorizontal,
  Sparkles,
  Stethoscope,
  UserRound,
} from "lucide-react";
import { Card } from "./ui/Card";
import { Button } from "./ui/Button";
import { Accordion, AccordionItem } from "./ui/Accordion";
import { staggerContainer, staggerItem } from "../lib/motion";
import type { ViewId } from "../lib/navigation";

interface ATSGuidePageProps {
  onStart: () => void;
  onSkip: () => void;
  onNavigate: (view: ViewId) => void;
}

const phases = [
  {
    number: "01",
    title: "Pengumpulan Data Pasien",
    subtitle: "Diisi petugas atau perawat triase",
    icon: ClipboardList,
    steps: [
      {
        title: "Identitas dan Riwayat Penyakit",
        icon: UserRound,
        summary: "Kenali pasien, konteks kedatangan, dan kondisi penyertanya.",
        details: ["Nomor rekam medis dan identitas", "Waktu dan cara kedatangan", "Riwayat penyakit, komorbid, dan alergi"],
      },
      {
        title: "Keluhan dan Gejala Tambahan",
        icon: FileText,
        summary: "Catat masalah utama dan gejala penyerta pasien.",
        details: ["Kategori keluhan utama", "Narasi atau detail keluhan klinis", "Gejala tambahan yang dirasakan atau diamati"],
      },
      {
        title: "Tanda Vital dan Tingkat Kesadaran",
        icon: HeartPulse,
        summary: "Ukur kondisi fisiologis dan respons pasien.",
        details: ["Tekanan darah, nadi, napas, suhu, dan SpO2", "Penilaian cepat AVPU", "Glasgow Coma Scale (GCS)"],
      },
      {
        title: "Skala Nyeri dan CPPT",
        icon: SlidersHorizontal,
        summary: "Lengkapi gambaran nyeri dan pemeriksaan terintegrasi.",
        details: ["Skala nyeri 0-10 dan kategorinya", "Lokasi serta penjalaran nyeri", "Catatan Perkembangan Pasien Terintegrasi (CPPT)"],
      },
    ],
  },
  {
    number: "02",
    title: "Analisis Sistem",
    subtitle: "Dijalankan otomatis setelah data lengkap",
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

const quickActions = [
  { view: "triage" as ViewId, icon: ClipboardList, label: "Form Utama", description: "Isi triase langkah demi langkah" },
  { view: "narrative" as ViewId, icon: FileText, label: "Pengurai Narasi", description: "Ubah catatan bebas jadi data terstruktur" },
  { view: "records" as ViewId, icon: Database, label: "Daftar Rekam", description: "Lihat dan kelola riwayat triase" },
];

export default function ATSGuidePage({ onStart, onSkip, onNavigate }: ATSGuidePageProps) {
  return (
    <div className="space-y-6">
      {/* Hero */}
      <Card padding="lg" className="relative overflow-hidden">
        <div className="pointer-events-none absolute -right-20 -top-20 size-64 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 size-64 rounded-full bg-accent/10 blur-3xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="max-w-2xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-secondary/10 px-3.5 py-1.5 text-sm font-bold text-secondary">
              <Activity size={16} aria-hidden />
              Asisten Penggunaan Aplikasi
            </div>
            <h2 className="text-2xl font-black tracking-tight text-text sm:text-3xl">Alur Keputusan Triase ATS</h2>
            <p className="mt-3 text-base font-medium text-text-muted">
              Data pasien diproses menjadi rekomendasi ATS yang kemudian divalidasi oleh tenaga kesehatan — sistem membantu, keputusan akhir tetap klinis.
            </p>
            <div className="mt-5 flex flex-wrap gap-2.5">
              <Button variant="primary" onClick={onStart} rightIcon={<ArrowRight className="size-4" />}>Mulai Triase</Button>
              <Button variant="ghost" onClick={onSkip}>Lewati panduan</Button>
            </div>
          </motion.div>
        </div>
      </Card>

      {/* Quick Action Cards */}
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 gap-3.5 sm:grid-cols-3"
      >
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <motion.button
              key={action.view}
              variants={staggerItem}
              type="button"
              onClick={() => onNavigate(action.view)}
              className="group flex items-center gap-3 rounded-2xl border border-border/70 bg-surface p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary/15">
                <Icon className="size-5.5" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-black text-text">{action.label}</span>
                <span className="block truncate text-xs font-medium text-text-muted">{action.description}</span>
              </span>
            </motion.button>
          );
        })}
      </motion.div>

      {/* Educational content — progressive disclosure via accordion instead of a wall of always-open cards */}
      <div className="space-y-3">
        <p className="px-1 text-xs font-black uppercase tracking-wider text-text-muted">Bagaimana sistem bekerja</p>
        <Accordion type="single" collapsible defaultValue="01" className="space-y-3">
          {phases.map((phase) => {
            const PhaseIcon = phase.icon;
            return (
              <AccordionItem
                key={phase.number}
                value={phase.number}
                title={
                  <span className="flex items-center gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <PhaseIcon className="size-4.5" />
                    </span>
                    <span>
                      <span className="block text-sm font-black text-text">Tahap {phase.number} &middot; {phase.title}</span>
                      <span className="block text-xs font-medium text-text-muted">{phase.subtitle}</span>
                    </span>
                  </span>
                }
              >
                <div className={`grid gap-3 ${phase.steps.length >= 3 ? "sm:grid-cols-2 xl:grid-cols-3" : "grid-cols-1"}`}>
                  {phase.steps.map((step, stepIndex) => {
                    const StepIcon = step.icon;
                    return (
                      <div key={step.title} className="rounded-xl border border-border/70 bg-bg p-4">
                        <div className="mb-2.5 flex items-start justify-between gap-2">
                          <span className="rounded-lg bg-primary/10 p-2 text-primary">
                            <StepIcon className="size-4.5" />
                          </span>
                          <span className="font-mono text-xs font-black text-text-muted">{phase.number}.{stepIndex + 1}</span>
                        </div>
                        <h4 className="text-sm font-black text-text">{step.title}</h4>
                        <p className="mt-1 text-xs font-medium text-text-muted">{step.summary}</p>
                        <ul className="mt-3 space-y-1.5 border-t border-border/60 pt-3">
                          {step.details.map((detail) => (
                            <li key={detail} className="flex items-start gap-2 text-xs font-semibold text-text">
                              <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                              <span>{detail}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              </AccordionItem>
            );
          })}
        </Accordion>
      </div>

      {/* Closing CTA */}
      <Card padding="lg" className="bg-linear-to-br from-slate-900 to-slate-800 text-white sm:flex sm:items-center sm:justify-between sm:gap-6 dark:from-slate-950 dark:to-slate-900">
        <div>
          <h3 className="text-xl font-black">Siap memulai skrining triase?</h3>
          <p className="mt-2 text-sm font-medium text-slate-300">
            Sistem membantu proses keputusan, tetapi penilaian dan keputusan klinis akhir tetap menjadi tanggung jawab tenaga kesehatan.
          </p>
        </div>
        <Button variant="secondary" size="lg" onClick={onStart} rightIcon={<ArrowRight className="size-5" />} className="mt-5 w-full sm:mt-0 sm:w-auto">
          Mulai Triase
        </Button>
      </Card>
    </div>
  );
}
