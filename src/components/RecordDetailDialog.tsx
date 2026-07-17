import React from "react";
import {
  Activity,
  AlertTriangle,
  ClipboardList,
  Clock3,
  FileHeart,
  History,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { ATS_LEVEL_DETAILS, TriageRecord } from "../types";
import { Dialog } from "./ui/Dialog";
import { Badge } from "./ui/Badge";
import { formatDate, joinList, getTrueFindings, getModelUsed } from "../utils/triageRecordFormat";

const DetailItem = ({
  label,
  value,
  className = "",
}: {
  label: string;
  value: React.ReactNode;
  className?: string;
}) => {
  const shown = value === null || value === undefined || value === "" ? "-" : value;
  return (
    <div className={`min-w-0 rounded-xl border border-border/60 bg-bg/70 px-3.5 py-3 ${className}`}>
      <dt className="break-words text-[11px] font-bold uppercase leading-relaxed tracking-wider text-text-muted">{label}</dt>
      <dd className="mt-1 break-words text-sm font-semibold leading-relaxed text-text [overflow-wrap:anywhere]">{shown}</dd>
    </div>
  );
};

type SectionTone = "blue" | "teal" | "violet" | "amber" | "rose" | "slate";

const SECTION_TONES: Record<SectionTone, { icon: string; header: string }> = {
  blue: { icon: "bg-primary/12 text-primary", header: "bg-primary/[0.045]" },
  teal: { icon: "bg-secondary/12 text-secondary", header: "bg-secondary/[0.05]" },
  violet: { icon: "bg-violet-500/12 text-violet-700 dark:text-violet-300", header: "bg-violet-500/[0.045]" },
  amber: { icon: "bg-warning/15 text-amber-700 dark:text-amber-300", header: "bg-warning/[0.06]" },
  rose: { icon: "bg-danger/12 text-danger", header: "bg-danger/[0.045]" },
  slate: { icon: "bg-black/5 text-text-muted dark:bg-white/10", header: "bg-black/[0.025] dark:bg-white/[0.025]" },
};

const DetailSection = ({
  icon: Icon,
  title,
  description,
  tone = "blue",
  children,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  tone?: SectionTone;
  children: React.ReactNode;
}) => {
  const colors = SECTION_TONES[tone];
  return (
    <section className="overflow-hidden rounded-2xl border border-border/70 bg-surface shadow-sm">
      <header className={`flex items-start gap-3 border-b border-border/60 px-4 py-3.5 sm:px-5 ${colors.header}`}>
        <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${colors.icon}`} aria-hidden="true">
          <Icon size={20} strokeWidth={2.2} />
        </span>
        <div className="min-w-0">
          <h3 className="text-base font-bold leading-snug text-text">{title}</h3>
          <p className="mt-0.5 text-sm leading-relaxed text-text-muted">{description}</p>
        </div>
      </header>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
};

interface RecordDetailDialogProps {
  record: TriageRecord | null;
  open: boolean;
  onClose: () => void;
}

/** Read-only detail view for a saved triage record, shown as a popup instead of an inline expand. */
export default function RecordDetailDialog({ record, open, onClose }: RecordDetailDialogProps) {
  if (!record) return null;

  const finalLevel = record.atsFinal?.atsLevelFinal || record.atsPrediction?.atsLevel || 5;
  const details = ATS_LEVEL_DETAILS[finalLevel as 1 | 2 | 3 | 4 | 5];
  const hasOverride = Boolean(record.atsFinal?.atsLevelOverride);
  const isFinalized = Boolean(record.atsFinal?.atsLevelFinal);
  const gcsTotal =
    (record.vitalSign?.gcs?.eye ?? 4) +
    (record.vitalSign?.gcs?.verbal ?? 5) +
    (record.vitalSign?.gcs?.motor ?? 6);
  const respiratoryFindings = [
    record.vitalSign?.ototBantuNapas && "Penggunaan otot bantu napas",
    record.vitalSign?.retraksi && "Retraksi",
    record.vitalSign?.stridor && "Stridor",
    record.vitalSign?.wheezing && "Wheezing",
    record.vitalSign?.apnea && "Apnea",
    record.vitalSign?.takipnea && "Takipnea",
    record.vitalSign?.bradipnea && "Bradipnea",
  ].filter(Boolean) as string[];

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => { if (!next) onClose(); }}
      variant="sheet"
      size="2xl"
      title={record.namaPasien}
      description={`${record.nomorRM} • ${formatDate(record.timestamp)}`}
    >
      <div className="space-y-4 pb-1">
        <section className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/[0.09] via-surface to-secondary/[0.08] p-4 shadow-sm sm:p-5">
          <div className="pointer-events-none absolute -right-12 -top-16 size-44 rounded-full bg-primary/10 blur-3xl" aria-hidden="true" />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className={`flex size-20 shrink-0 flex-col items-center justify-center rounded-2xl border shadow-lg ${details.color}`}>
              <span className="text-xs font-bold uppercase tracking-wider opacity-85">ATS</span>
              <span className="text-4xl font-black leading-none">{finalLevel}</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-black text-text sm:text-xl">Keputusan Triase Final</h2>
                {hasOverride && <Badge tone="warning">Override Klinis</Badge>}
              </div>
              <p className="mt-1 text-base font-bold text-text">{details.subtitle}</p>
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-text-muted">
                <span className="inline-flex items-center gap-1.5">
                  <Clock3 size={16} className="text-primary" />
                  Target respons: <strong className="text-text">{details.timeLimit}</strong>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <ShieldCheck size={16} className="text-secondary" />
                  Status: <strong className="text-text">{isFinalized ? "Tervalidasi nakes" : "Hasil analisis"}</strong>
                </span>
              </div>
            </div>
          </div>
        </section>

        <DetailSection
          icon={UserRound}
          title="Identitas dan Kunjungan"
          description="Data pasien dan informasi kedatangan ke IGD."
          tone="blue"
        >
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <DetailItem label="ID Rekam" value={record.id} />
            <DetailItem label="Nomor Rekam Medis" value={record.nomorRM} />
            <DetailItem label="Nama Pasien" value={record.namaPasien} />
            <DetailItem label="Tanggal Lahir" value={record.tanggalLahir} />
            <DetailItem label="Umur" value={`${record.umur} tahun`} />
            <DetailItem label="Jenis Kelamin" value={record.gender} />
            <DetailItem label="Tanggal Kunjungan" value={record.tanggalKunjungan} />
            <DetailItem label="Jam Kunjungan" value={record.jamKunjungan} />
            <DetailItem label="Cara Datang" value={record.caraDatang} />
          </dl>
        </DetailSection>

        <DetailSection
          icon={ClipboardList}
          title="Keluhan dan Riwayat Penyakit"
          description="Informasi subjektif yang disampaikan pasien atau pengantar."
          tone="violet"
        >
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <DetailItem label="Keluhan Utama" value={record.chiefComplaint} />
            <DetailItem label="Detail Keluhan" value={record.chiefComplaintCustom} />
            <DetailItem label="Gejala Tambahan" value={joinList(record.gejalaTambahan)} />
            <DetailItem label="Riwayat Penyakit" value={joinList(record.riwayatPenyakit)} />
            <DetailItem label="Riwayat Lain atau Catatan" value={record.riwayatPenyakitLainnya} className="sm:col-span-2" />
          </dl>
        </DetailSection>

        <DetailSection
          icon={Activity}
          title="Tanda Vital dan Tingkat Kesadaran"
          description="Parameter fisiologis utama untuk penilaian kondisi pasien."
          tone="teal"
        >
          <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <DetailItem label="Tekanan Darah" value={`${record.vitalSign?.tekananDarahSistolik || "-"} / ${record.vitalSign?.tekananDarahDiastolik || "-"} mmHg`} />
            <DetailItem label="Nadi / Heart Rate" value={`${record.vitalSign?.heartRate || "-"} x/menit`} />
            <DetailItem label="Laju Napas" value={`${record.vitalSign?.respiratoryRate || "-"} x/menit`} />
            <DetailItem label="Suhu Tubuh" value={`${record.vitalSign?.suhuTubuh || "-"} °C`} />
            <DetailItem label="Saturasi Oksigen" value={`${record.vitalSign?.saturasiOksigen || "-"}%`} />
            <DetailItem label="GCS" value={`E${record.vitalSign?.gcs?.eye || "-"} V${record.vitalSign?.gcs?.verbal || "-"} M${record.vitalSign?.gcs?.motor || "-"} = ${gcsTotal}`} />
            <DetailItem label="AVPU" value={record.vitalSign?.avpu || "Alert"} />
            <DetailItem label="Pola Napas" value={record.vitalSign?.polaNapas} />
            <DetailItem
              label="Temuan Gangguan Pernapasan"
              value={respiratoryFindings.length > 0 ? joinList(respiratoryFindings) : "Tidak ada temuan khusus"}
              className="col-span-2 lg:col-span-4"
            />
          </dl>
        </DetailSection>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <DetailSection
            icon={FileHeart}
            title="Skala Nyeri"
            description="Intensitas, kategori, dan lokasi nyeri pasien."
            tone="amber"
          >
            <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <DetailItem label="Skala dan Kategori" value={`${record.painScale?.skala ?? "-"} / 10 (${record.painScale?.kategori || "-"})`} />
              <DetailItem label="Lokasi Nyeri" value={record.painScale?.lokasi} />
              <DetailItem label="Nyeri Menjalar" value={record.painScale?.menjalar ? "Ya" : "Tidak"} className="sm:col-span-2" />
            </dl>
          </DetailSection>

          <DetailSection
            icon={Stethoscope}
            title="Pemeriksaan Fisik"
            description="Temuan objektif berdasarkan area pemeriksaan."
            tone="rose"
          >
            <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <DetailItem label="Kepala" value={getTrueFindings(record.pemeriksaanFisik?.kepala)} />
              <DetailItem label="Leher" value={getTrueFindings(record.pemeriksaanFisik?.leher)} />
              <DetailItem label="Dada / Paru / Jantung" value={getTrueFindings(record.pemeriksaanFisik?.dada)} />
              <DetailItem label="Abdomen" value={getTrueFindings(record.pemeriksaanFisik?.perut)} />
              <DetailItem label="Ekstremitas Atas" value={getTrueFindings(record.pemeriksaanFisik?.ekstremitasAtas)} />
              <DetailItem label="Ekstremitas Bawah" value={getTrueFindings(record.pemeriksaanFisik?.ekstremitasBawah)} />
            </dl>
          </DetailSection>
        </div>

        <DetailSection
          icon={Sparkles}
          title="Analisis dan Pendukung Keputusan ATS"
          description="Perbandingan rekomendasi AI, guard rail, dan indikator kegawatdaruratan."
          tone="violet"
        >
          {record.atsPrediction?.decisionSupport?.recommendationsDiffer && (
            <div className="mb-4 flex items-start gap-3 rounded-xl border border-warning/30 bg-warning/10 p-3.5 text-sm text-amber-900 dark:text-amber-200">
              <AlertTriangle size={19} className="mt-0.5 shrink-0" />
              <div>
                <p className="font-bold">Rekomendasi AI dan guard rail berbeda</p>
                <p className="mt-0.5 leading-relaxed">Perbedaan ini memerlukan validasi klinis dari tenaga kesehatan.</p>
              </div>
            </div>
          )}
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <DetailItem label="ATS Prediksi" value={record.atsPrediction?.atsLevel ? `ATS ${record.atsPrediction.atsLevel}` : "-"} />
            <DetailItem label="Skor Keyakinan" value={record.atsPrediction?.confidenceScore !== undefined ? `${record.atsPrediction.confidenceScore}%` : "-"} />
            <DetailItem label="Indikator Kegawatdaruratan" value={record.atsPrediction?.emergencyIndicator ? "Ya" : "Tidak"} />
            <DetailItem
              label="Rekomendasi Model Mandiri"
              value={record.atsPrediction?.decisionSupport?.aiRecommendation ? `ATS ${record.atsPrediction.decisionSupport.aiRecommendation.atsLevel} — ${record.atsPrediction.decisionSupport.aiRecommendation.alasanKlasifikasi}` : "-"}
              className="sm:col-span-2"
            />
            <DetailItem
              label="Saran Guard Rail"
              value={record.atsPrediction?.decisionSupport?.guardRailRecommendation ? `ATS ${record.atsPrediction.decisionSupport.guardRailRecommendation.atsLevel} — ${joinList(record.atsPrediction.decisionSupport.guardRailRecommendation.reasons)}` : "-"}
              className="sm:col-span-2 xl:col-span-1"
            />
            <DetailItem label="Penyedia Analisis" value={record.atsPrediction?.providerUsed} />
            <DetailItem label="Jenis Model" value={getModelUsed(record)} />
            <DetailItem label="Status Perbandingan" value={record.atsPrediction?.decisionSupport?.recommendationsDiffer ? "Berbeda — memerlukan validasi nakes" : "Sama / tidak ada perbandingan"} />
            <DetailItem label="Tanda Bahaya" value={joinList(record.atsPrediction?.warningConditions)} className="sm:col-span-2 xl:col-span-3" />
            <DetailItem label="Alasan Klasifikasi" value={record.atsPrediction?.alasanKlasifikasi} className="sm:col-span-2 xl:col-span-3" />
            <DetailItem label="Rekomendasi Awal" value={joinList(record.atsPrediction?.rekomendasiAwal)} className="sm:col-span-2 xl:col-span-3" />
          </dl>
        </DetailSection>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <DetailSection
            icon={ShieldCheck}
            title="Keputusan Final dan Validator"
            description="Keputusan nakes, termasuk perubahan dari rekomendasi awal."
            tone="blue"
          >
            <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <DetailItem label="ATS Final" value={`ATS ${finalLevel} — ${details.subtitle}`} />
              <DetailItem label="Status Override" value={hasOverride ? "Aktif" : "Tidak aktif"} />
              <DetailItem label="Level Override" value={record.atsFinal?.atsLevelOverride ? `ATS ${record.atsFinal.atsLevelOverride}` : "-"} />
              <DetailItem label="Alasan Override" value={record.atsFinal?.alasanOverride} />
              <DetailItem label="Validator" value={record.atsFinal?.namaPetugas} />
              <DetailItem label="Jabatan Validator" value={record.atsFinal?.jabatanPetugas} />
            </dl>
          </DetailSection>

          <DetailSection
            icon={History}
            title="Riwayat Aktivitas Database"
            description="Jejak perubahan yang tersimpan untuk rekam triase ini."
            tone="slate"
          >
            {record.auditLogs && record.auditLogs.length > 0 ? (
              <ol className="relative ml-2 space-y-4 border-l-2 border-border pl-5">
                {record.auditLogs.map((log, index) => (
                  <li key={`${record.id}-audit-${index}`} className="relative">
                    <span className="absolute -left-[1.68rem] top-1.5 size-3 rounded-full border-2 border-surface bg-primary" aria-hidden="true" />
                    <p className="text-sm font-bold leading-relaxed text-text">{log.action}</p>
                    <p className="mt-0.5 text-sm leading-relaxed text-text-muted">{formatDate(log.timestamp)} • {log.user}</p>
                  </li>
                ))}
              </ol>
            ) : (
              <div className="flex items-center gap-3 rounded-xl border border-dashed border-border bg-bg/60 p-4 text-sm text-text-muted">
                <History size={18} className="shrink-0" />
                Belum ada riwayat aktivitas yang tersimpan.
              </div>
            )}
          </DetailSection>
        </div>
      </div>
    </Dialog>
  );
}
