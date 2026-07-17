import React, { useState } from "react";
import { TriageRecord, ATS_LEVEL_DETAILS } from "../types";
import {
  Activity,
  AlertOctagon,
  Database,
  Download,
  Edit3,
  Eye,
  FileJson,
  Printer,
  Scale,
  Search,
  Trash2,
} from "lucide-react";
import { apiFetch } from "../lib/api";
import { Card } from "./ui/Card";
import { StatCard } from "./ui/StatCard";
import { Input, SelectField } from "./ui/Input";
import { Button } from "./ui/Button";
import { Badge } from "./ui/Badge";
import { EmptyState } from "./ui/EmptyState";
import { useToast } from "./ui/Toast";
import { useConfirm } from "./ui/ConfirmDialog";
import RecordDetailDialog from "./RecordDetailDialog";
import RecordEditDialog from "./RecordEditDialog";
import { formatDate, joinList } from "../utils/triageRecordFormat";

interface RecordHistoryListProps {
  records: TriageRecord[];
  onDeleteRecord: (id: string) => void;
  onExportDataset: () => void;
  onRecordsChanged: () => void | Promise<void>;
  aiProvider: string;
  aiModel: string;
  isAdmin: boolean;
  currentUserId?: string;
}

export default function RecordHistoryList({
  records,
  onDeleteRecord,
  onExportDataset,
  onRecordsChanged,
  aiProvider,
  aiModel,
  isAdmin,
  currentUserId,
}: RecordHistoryListProps) {
  const toast = useToast();
  const confirm = useConfirm();
  const [searchTerm, setSearchTerm] = useState("");
  const [atsFilter, setAtsFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [isDownloadingLog, setIsDownloadingLog] = useState(false);
  const [printingRecordId, setPrintingRecordId] = useState<string | null>(null);
  const [viewingRecord, setViewingRecord] = useState<TriageRecord | null>(null);
  const [editingRecord, setEditingRecord] = useState<TriageRecord | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const filtered = records
    .filter((r) => {
      const term = searchTerm.trim().toLowerCase();
      const finalLevel = r.atsFinal?.atsLevelFinal || r.atsPrediction?.atsLevel || 5;
      const matchesSearch =
        !term ||
        r.namaPasien.toLowerCase().includes(term) ||
        r.nomorRM.toLowerCase().includes(term) ||
        (r.chiefComplaint || "").toLowerCase().includes(term) ||
        (r.atsFinal?.namaPetugas || "").toLowerCase().includes(term);
      const matchesAts = atsFilter === "all" || String(finalLevel) === atsFilter;
      return matchesSearch && matchesAts;
    })
    .sort((a, b) => {
      const aTime = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const bTime = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return sortOrder === "newest" ? bTime - aTime : aTime - bTime;
    });

  const urgentCount = records.filter((record) => {
    const level = record.atsFinal?.atsLevelFinal || record.atsPrediction?.atsLevel || 5;
    return level <= 2;
  }).length;
  const overriddenCount = records.filter((record) => Boolean(record.atsFinal?.atsLevelOverride)).length;

  const exportCsv = () => {
    if (records.length === 0) {
      toast.error("Belum ada data rekam triase untuk diekspor.");
      return;
    }

    const headers = [
      "ID Rekam",
      "Tanggal & Waktu",
      "No. RM",
      "Nama Pasien",
      "Tanggal Lahir",
      "Umur",
      "Gender",
      "Tanggal Kunjungan",
      "Jam Kunjungan",
      "Cara Datang",
      "Keluhan Utama",
      "Detail Keluhan",
      "Gejala Tambahan",
      "Riwayat Penyakit (Komorbid)",
      "Riwayat Lain",
      "TD Sistolik (mmHg)",
      "TD Diastolik (mmHg)",
      "Nadi/HR (x/menit)",
      "Napas/RR (x/menit)",
      "Suhu (C)",
      "SpO2 (%)",
      "GCS Eye",
      "GCS Verbal",
      "GCS Motor",
      "GCS Total",
      "AVPU",
      "Pola Napas",
      "Otot Bantu Napas",
      "Retraksi",
      "Stridor",
      "Wheezing",
      "Apnea",
      "Takipnea",
      "Bradipnea",
      "Skala Nyeri",
      "Kategori Nyeri",
      "Lokasi Nyeri",
      "Nyeri Menjalar",
      "Level ATS Prediksi AI",
      "Skor Keyakinan AI (%)",
      "Penyedia Analisis",
      "Jenis Model AI",
      "Indikator Kegawatdaruratan",
      "Tanda Bahaya",
      "Alasan Klasifikasi AI",
      "Rekomendasi Awal",
      "Level ATS Final",
      "Status Override",
      "Level Override",
      "Alasan Override",
      "Validator",
      "Jabatan Validator",
    ];

    const rows = records.map((r) => {
      const gcsTotal =
        (r.vitalSign?.gcs?.eye ?? 4) +
        (r.vitalSign?.gcs?.verbal ?? 5) +
        (r.vitalSign?.gcs?.motor ?? 6);
      const hasOverride = Boolean(r.atsFinal?.atsLevelOverride);

      return [
        r.id || "",
        r.timestamp ? new Date(r.timestamp).toLocaleString("id-ID") : "",
        r.nomorRM,
        r.namaPasien,
        r.tanggalLahir,
        r.umur,
        r.gender,
        r.tanggalKunjungan,
        r.jamKunjungan,
        r.caraDatang,
        r.chiefComplaint,
        r.chiefComplaintCustom || "",
        joinList(r.gejalaTambahan),
        joinList(r.riwayatPenyakit),
        r.riwayatPenyakitLainnya || "",
        r.vitalSign?.tekananDarahSistolik || "",
        r.vitalSign?.tekananDarahDiastolik || "",
        r.vitalSign?.heartRate || "",
        r.vitalSign?.respiratoryRate || "",
        r.vitalSign?.suhuTubuh || "",
        r.vitalSign?.saturasiOksigen || "",
        r.vitalSign?.gcs?.eye || "",
        r.vitalSign?.gcs?.verbal || "",
        r.vitalSign?.gcs?.motor || "",
        gcsTotal,
        r.vitalSign?.avpu || "Alert",
        r.vitalSign?.polaNapas || "",
        r.vitalSign?.ototBantuNapas ? "Ya" : "Tidak",
        r.vitalSign?.retraksi ? "Ya" : "Tidak",
        r.vitalSign?.stridor ? "Ya" : "Tidak",
        r.vitalSign?.wheezing ? "Ya" : "Tidak",
        r.vitalSign?.apnea ? "Ya" : "Tidak",
        r.vitalSign?.takipnea ? "Ya" : "Tidak",
        r.vitalSign?.bradipnea ? "Ya" : "Tidak",
        r.painScale?.skala ?? "",
        r.painScale?.kategori || "",
        r.painScale?.lokasi || "",
        r.painScale?.menjalar ? "Ya" : "Tidak",
        r.atsPrediction?.atsLevel || "",
        r.atsPrediction?.confidenceScore || "",
        r.atsPrediction?.providerUsed || "",
        r.atsPrediction?.modelUsed || "",
        r.atsPrediction?.emergencyIndicator ? "Ya" : "Tidak",
        joinList(r.atsPrediction?.warningConditions),
        r.atsPrediction?.alasanKlasifikasi || "",
        joinList(r.atsPrediction?.rekomendasiAwal),
        r.atsFinal?.atsLevelFinal || r.atsPrediction?.atsLevel || "",
        hasOverride ? "Aktif" : "Tidak",
        r.atsFinal?.atsLevelOverride || "",
        r.atsFinal?.alasanOverride || "",
        r.atsFinal?.namaPetugas || "",
        r.atsFinal?.jabatanPetugas || "",
      ];
    });

    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row
          .map((val) => {
            const strValue = String(val === null || val === undefined ? "" : val);
            if (
              strValue.includes(",") ||
              strValue.includes('"') ||
              strValue.includes("\n") ||
              strValue.includes("\r")
            ) {
              return `"${strValue.replace(/"/g, '""')}"`;
            }
            return strValue;
          })
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob([new Uint8Array([0xef, 0xbb, 0xbf]), csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Data_Ekspor_Triase_ATS_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadMonitoringLog = async () => {
    setIsDownloadingLog(true);
    try {
      const res = await apiFetch("/api/monitoring/export");
      if (!res.ok) throw new Error(`Gagal mengunduh log monitoring (status ${res.status})`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Log_Monitoring_ATS_${new Date().toISOString().split("T")[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal mengunduh log monitoring.");
    } finally {
      setIsDownloadingLog(false);
    }
  };

  const printPdf = async (record: TriageRecord) => {
    setPrintingRecordId(record.id || "active");
    try {
      const { generateIGDReportPDF } = await import("../utils/pdfGenerator");
      generateIGDReportPDF(record);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Laporan PDF gagal dibuat.");
    } finally {
      setPrintingRecordId(null);
    }
  };

  const handleDelete = async (record: TriageRecord) => {
    const confirmed = await confirm({
      title: "Hapus rekam triase?",
      description: `Rekam ${record.namaPasien} (${record.nomorRM}) akan dihapus permanen dan tidak dapat dikembalikan.`,
      confirmLabel: "Ya, hapus",
      cancelLabel: "Batal",
      tone: "danger",
    });
    if (confirmed) onDeleteRecord(record.id!);
  };

  const openEdit = (record: TriageRecord) => {
    setEditingRecord(record);
    setIsEditOpen(true);
  };

  return (
    <div className="space-y-6" id="records-history-section">
      <Card padding="lg" className="relative overflow-hidden">
        <div className="pointer-events-none absolute -right-12 -top-16 size-40 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-wider text-primary">Database Klinis</p>
            <h2 className="mt-1 text-2xl font-extrabold text-text">Daftar Rekam Triase IGD</h2>
            <p className="mt-2 max-w-2xl text-base font-medium text-text-muted">
              Cari pasien, lihat hasil ATS lewat popup detail, atau edit rekam langsung dari popup tanpa berpindah halaman.
            </p>
          </div>

          {isAdmin && (
            <div className="flex flex-wrap items-center gap-2 xl:max-w-xl xl:justify-end">
              <Button variant="secondary" size="sm" onClick={exportCsv} leftIcon={<Download size={16} />}>Ekspor CSV</Button>
              <Button variant="outline" size="sm" onClick={onExportDataset} leftIcon={<FileJson size={16} />}>Ekspor JSON</Button>
              <Button variant="primary" size="sm" onClick={downloadMonitoringLog} disabled={isDownloadingLog} loading={isDownloadingLog} leftIcon={!isDownloadingLog ? <Activity size={16} /> : undefined}>
                {isDownloadingLog ? "Menyiapkan..." : "Log Monitoring"}
              </Button>
            </div>
          )}
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard icon={Database} label="Total rekam tersimpan" value={records.length} tone="primary" />
        <StatCard icon={AlertOctagon} label="Prioritas tinggi ATS 1-2" value={urgentCount} tone="danger" />
        <StatCard icon={Scale} label="Dengan override klinis" value={overriddenCount} tone="warning" />
      </div>

      <Card padding="md">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(280px,1fr)_220px_220px]">
          <Input
            id="input-search-records"
            type="search"
            placeholder="Cari No. RM, nama, keluhan, atau validator..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            leftIcon={<Search className="size-4" />}
          />
          <SelectField value={atsFilter} onChange={(event) => setAtsFilter(event.target.value)}>
            <option value="all">Semua level ATS</option>
            {[1, 2, 3, 4, 5].map((level) => <option key={level} value={level}>ATS {level}</option>)}
          </SelectField>
          <SelectField value={sortOrder} onChange={(event) => setSortOrder(event.target.value as "newest" | "oldest")}>
            <option value="newest">Terbaru lebih dulu</option>
            <option value="oldest">Terlama lebih dulu</option>
          </SelectField>
        </div>
        <div className="mt-3 flex items-center justify-between text-sm font-medium text-text-muted">
          <span>Menampilkan {filtered.length} dari {records.length} rekam</span>
          {(searchTerm || atsFilter !== "all") && (
            <button type="button" onClick={() => { setSearchTerm(""); setAtsFilter("all"); }} className="font-bold text-primary hover:underline">Hapus filter</button>
          )}
        </div>
      </Card>

      {filtered.length === 0 ? (
        <EmptyState icon={Search} title="Tidak ada rekam yang cocok" description="Coba ubah kata kunci pencarian atau filter level ATS, atau daftarkan pasien baru." />
      ) : (
        <div className="space-y-3">
          {filtered.map((record) => {
            const finalLevel = record.atsFinal?.atsLevelFinal || record.atsPrediction?.atsLevel || 5;
            const predictionLevel = record.atsPrediction?.atsLevel;
            const details = ATS_LEVEL_DETAILS[finalLevel as 1 | 2 | 3 | 4 | 5];
            const canEdit = isAdmin || record.createdByUserId === currentUserId;

            return (
              <Card key={record.id} padding="none" className="overflow-hidden">
                <div className="p-4 sm:p-5">
                  <div className="grid grid-cols-1 items-start gap-x-4 gap-y-3 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1.2fr)_minmax(0,1fr)_auto] lg:items-center">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-base font-extrabold text-text">{record.namaPasien}</h3>
                        <Badge tone="neutral" className={details.badgeColor}>{details.name}</Badge>
                        {predictionLevel && predictionLevel !== finalLevel && (
                          <span className="text-xs text-text-muted">AI: ATS {predictionLevel}</span>
                        )}
                      </div>
                      <p className="mt-0.5 font-mono text-xs font-bold text-primary">{record.nomorRM} &middot; {record.umur} th &middot; {record.gender}</p>
                    </div>
                    <div className="min-w-0 text-xs font-medium text-text-muted">
                      <span className="block truncate font-semibold text-text">{record.chiefComplaint || "Keluhan tidak tercatat"}</span>
                      <span className="block">{formatDate(record.timestamp)}</span>
                    </div>
                    <div className="min-w-0 text-xs font-medium text-text-muted">
                      <span className="block font-bold uppercase tracking-wider">Validator</span>
                      <span className="block truncate font-semibold text-text">{record.atsFinal?.namaPetugas || "-"}</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      <Button variant="outline" size="sm" onClick={() => setViewingRecord(record)} leftIcon={<Eye size={16} />}>
                        Detail
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => printPdf(record)} disabled={printingRecordId === record.id} loading={printingRecordId === record.id} leftIcon={printingRecordId !== record.id ? <Printer size={16} /> : undefined}>
                        {printingRecordId === record.id ? "Membuat..." : "PDF"}
                      </Button>
                      {canEdit && (
                        <Button variant="primary" size="sm" onClick={() => openEdit(record)} leftIcon={<Edit3 size={16} />}>
                          Edit
                        </Button>
                      )}
                      {isAdmin && (
                        <Button variant="ghost" size="sm" className="text-danger hover:bg-danger/10" onClick={() => handleDelete(record)} leftIcon={<Trash2 size={16} />}>
                          Hapus
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <RecordDetailDialog record={viewingRecord} open={Boolean(viewingRecord)} onClose={() => setViewingRecord(null)} />

      <RecordEditDialog
        key={editingRecord?.id || "edit-dialog-empty"}
        record={editingRecord}
        open={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        aiProvider={aiProvider}
        aiModel={aiModel}
        onSaved={async () => {
          setIsEditOpen(false);
          await onRecordsChanged();
        }}
      />
    </div>
  );
}
