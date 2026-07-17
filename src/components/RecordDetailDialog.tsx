import React from "react";
import { ATS_LEVEL_DETAILS, TriageRecord } from "../types";
import { Dialog } from "./ui/Dialog";
import { Badge } from "./ui/Badge";
import { formatDate, joinList, getTrueFindings, getModelUsed } from "../utils/triageRecordFormat";

const DetailItem = ({ label, value }: { label: string; value: React.ReactNode }) => {
  const shown = value === null || value === undefined || value === "" ? "-" : value;
  return (
    <div className="min-w-0">
      <dt className="break-words text-xs font-bold uppercase tracking-wider text-text-muted">{label}</dt>
      <dd className="mt-0.5 break-words text-xs font-medium text-text">{shown}</dd>
    </div>
  );
};

const DetailSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="space-y-3">
    <h4 className="border-b border-border/70 pb-1 text-xs font-black uppercase tracking-wider text-text-muted">{title}</h4>
    {children}
  </section>
);

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
  const gcsTotal =
    (record.vitalSign?.gcs?.eye ?? 4) +
    (record.vitalSign?.gcs?.verbal ?? 5) +
    (record.vitalSign?.gcs?.motor ?? 6);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => { if (!next) onClose(); }}
      variant="sheet"
      size="2xl"
      title={record.namaPasien}
      description={`${record.nomorRM} · ${formatDate(record.timestamp)}`}
    >
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Badge tone="neutral" className={details.badgeColor}>{details.name}</Badge>
        {hasOverride && <Badge tone="warning">Override Klinis</Badge>}
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <DetailSection title="Identitas dan Kunjungan">
          <dl className="grid grid-cols-2 gap-3 md:grid-cols-3">
            <DetailItem label="ID Rekam" value={record.id} />
            <DetailItem label="No. RM" value={record.nomorRM} />
            <DetailItem label="Nama Pasien" value={record.namaPasien} />
            <DetailItem label="Tanggal Lahir" value={record.tanggalLahir} />
            <DetailItem label="Umur" value={`${record.umur} tahun`} />
            <DetailItem label="Gender" value={record.gender} />
            <DetailItem label="Tanggal Kunjungan" value={record.tanggalKunjungan} />
            <DetailItem label="Jam Kunjungan" value={record.jamKunjungan} />
            <DetailItem label="Cara Datang" value={record.caraDatang} />
          </dl>
        </DetailSection>

        <DetailSection title="Subjektif">
          <dl className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <DetailItem label="Keluhan Utama" value={record.chiefComplaint} />
            <DetailItem label="Detail Keluhan" value={record.chiefComplaintCustom} />
            <DetailItem label="Gejala Tambahan" value={joinList(record.gejalaTambahan)} />
            <DetailItem label="Riwayat Penyakit" value={joinList(record.riwayatPenyakit)} />
            <DetailItem label="Riwayat Lain / Catatan" value={record.riwayatPenyakitLainnya} />
          </dl>
        </DetailSection>

        <DetailSection title="Vital Sign dan Nyeri">
          <dl className="grid grid-cols-2 gap-3 md:grid-cols-3">
            <DetailItem label="Tekanan Darah" value={`${record.vitalSign?.tekananDarahSistolik || "-"} / ${record.vitalSign?.tekananDarahDiastolik || "-"} mmHg`} />
            <DetailItem label="Nadi / HR" value={`${record.vitalSign?.heartRate || "-"} x/menit`} />
            <DetailItem label="Respirasi / RR" value={`${record.vitalSign?.respiratoryRate || "-"} x/menit`} />
            <DetailItem label="Suhu" value={`${record.vitalSign?.suhuTubuh || "-"} C`} />
            <DetailItem label="SpO2" value={`${record.vitalSign?.saturasiOksigen || "-"}%`} />
            <DetailItem label="GCS" value={`E${record.vitalSign?.gcs?.eye || "-"} V${record.vitalSign?.gcs?.verbal || "-"} M${record.vitalSign?.gcs?.motor || "-"} = ${gcsTotal}`} />
            <DetailItem label="AVPU" value={record.vitalSign?.avpu || "Alert"} />
            <DetailItem label="Pola Napas" value={record.vitalSign?.polaNapas} />
            <DetailItem label="Otot Bantu Napas" value={record.vitalSign?.ototBantuNapas ? "Ya" : "Tidak"} />
            <DetailItem label="Retraksi" value={record.vitalSign?.retraksi ? "Ya" : "Tidak"} />
            <DetailItem label="Stridor" value={record.vitalSign?.stridor ? "Ya" : "Tidak"} />
            <DetailItem label="Wheezing" value={record.vitalSign?.wheezing ? "Ya" : "Tidak"} />
            <DetailItem label="Apnea" value={record.vitalSign?.apnea ? "Ya" : "Tidak"} />
            <DetailItem label="Takipnea" value={record.vitalSign?.takipnea ? "Ya" : "Tidak"} />
            <DetailItem label="Bradipnea" value={record.vitalSign?.bradipnea ? "Ya" : "Tidak"} />
            <DetailItem label="Nyeri" value={`${record.painScale?.skala ?? "-"} / 10 (${record.painScale?.kategori || "-"})`} />
            <DetailItem label="Lokasi Nyeri" value={record.painScale?.lokasi} />
            <DetailItem label="Nyeri Menjalar" value={record.painScale?.menjalar ? "Ya" : "Tidak"} />
          </dl>
        </DetailSection>

        <DetailSection title="Pemeriksaan Fisik">
          <dl className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <DetailItem label="Kepala" value={getTrueFindings(record.pemeriksaanFisik?.kepala)} />
            <DetailItem label="Leher" value={getTrueFindings(record.pemeriksaanFisik?.leher)} />
            <DetailItem label="Dada / Paru / Jantung" value={getTrueFindings(record.pemeriksaanFisik?.dada)} />
            <DetailItem label="Abdomen" value={getTrueFindings(record.pemeriksaanFisik?.perut)} />
            <DetailItem label="Ekstremitas Atas" value={getTrueFindings(record.pemeriksaanFisik?.ekstremitasAtas)} />
            <DetailItem label="Ekstremitas Bawah" value={getTrueFindings(record.pemeriksaanFisik?.ekstremitasBawah)} />
          </dl>
        </DetailSection>

        <DetailSection title="Analisis ATS AI">
          <dl className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <DetailItem label="ATS Prediksi" value={record.atsPrediction?.atsLevel ? `ATS ${record.atsPrediction.atsLevel}` : "-"} />
            <DetailItem label="Rekomendasi Model Mandiri" value={record.atsPrediction?.decisionSupport?.aiRecommendation ? `ATS ${record.atsPrediction.decisionSupport.aiRecommendation.atsLevel} — ${record.atsPrediction.decisionSupport.aiRecommendation.alasanKlasifikasi}` : "-"} />
            <DetailItem label="Saran Guard Rail" value={record.atsPrediction?.decisionSupport?.guardRailRecommendation ? `ATS ${record.atsPrediction.decisionSupport.guardRailRecommendation.atsLevel} — ${joinList(record.atsPrediction.decisionSupport.guardRailRecommendation.reasons)}` : "-"} />
            <DetailItem label="Status Perbandingan" value={record.atsPrediction?.decisionSupport?.recommendationsDiffer ? "Berbeda — memerlukan validasi nakes" : "Sama / tidak ada perbandingan"} />
            <DetailItem label="Skor Keyakinan" value={record.atsPrediction?.confidenceScore !== undefined ? `${record.atsPrediction.confidenceScore}%` : "-"} />
            <DetailItem label="Penyedia Analisis" value={record.atsPrediction?.providerUsed} />
            <DetailItem label="Jenis Model" value={getModelUsed(record)} />
            <DetailItem label="Indikator Kegawatdaruratan" value={record.atsPrediction?.emergencyIndicator ? "Ya" : "Tidak"} />
            <DetailItem label="Tanda Bahaya" value={joinList(record.atsPrediction?.warningConditions)} />
            <DetailItem label="Alasan Klasifikasi" value={record.atsPrediction?.alasanKlasifikasi} />
            <DetailItem label="Rekomendasi Awal" value={joinList(record.atsPrediction?.rekomendasiAwal)} />
          </dl>
        </DetailSection>

        <DetailSection title="Keputusan Final, Override, dan Validator">
          <dl className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <DetailItem label="ATS Final" value={`ATS ${finalLevel} - ${details.subtitle}`} />
            <DetailItem label="Status Override" value={hasOverride ? "Aktif" : "Tidak aktif"} />
            <DetailItem label="Level Override" value={record.atsFinal?.atsLevelOverride ? `ATS ${record.atsFinal.atsLevelOverride}` : "-"} />
            <DetailItem label="Alasan Override" value={record.atsFinal?.alasanOverride} />
            <DetailItem label="Validator" value={record.atsFinal?.namaPetugas} />
            <DetailItem label="Jabatan Validator" value={record.atsFinal?.jabatanPetugas} />
          </dl>
        </DetailSection>

        <DetailSection title="Audit Log Database">
          {record.auditLogs && record.auditLogs.length > 0 ? (
            <div className="space-y-2">
              {record.auditLogs.map((log, index) => (
                <div key={`${record.id}-audit-${index}`} className="rounded-lg border border-border/70 bg-bg px-3 py-2">
                  <div className="text-xs font-semibold text-text">{log.action}</div>
                  <div className="text-xs text-text-muted">{formatDate(log.timestamp)} - {log.user}</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-text-muted">Belum ada audit log tersimpan.</p>
          )}
        </DetailSection>
      </div>
    </Dialog>
  );
}
