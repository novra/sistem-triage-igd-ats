import React, { useState } from "react";
import { TriageRecord, ATS_LEVEL_DETAILS } from "../types";
import {
  Activity,
  ChevronUp,
  Download,
  Edit3,
  Eye,
  FileJson,
  Search,
  Trash2,
} from "lucide-react";
import { apiFetch } from "../lib/api";

interface RecordHistoryListProps {
  records: TriageRecord[];
  onSelectRecord: (record: TriageRecord) => void;
  onDeleteRecord: (id: string) => void;
  onExportDataset: () => void;
  isAdmin: boolean;
  currentUserId?: string;
}

export default function RecordHistoryList({
  records,
  onSelectRecord,
  onDeleteRecord,
  onExportDataset,
  isAdmin,
  currentUserId,
}: RecordHistoryListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [atsFilter, setAtsFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isDownloadingLog, setIsDownloadingLog] = useState(false);

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

  const formatDate = (isoStr?: string) => {
    if (!isoStr) return "-";
    const date = new Date(isoStr);
    return (
      date.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }) +
      " " +
      date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
    );
  };

  const joinList = (values?: string[]) => {
    if (!values || values.length === 0) return "-";
    return values.join(", ");
  };

  const showValue = (value: React.ReactNode) => {
    if (value === null || value === undefined || value === "") return "-";
    return value;
  };

  const getTrueFindings = (group?: Record<string, boolean>) => {
    if (!group) return "-";
    const findings = Object.entries(group)
      .filter(([, value]) => value)
      .map(([key]) =>
        key
          .replace(/([A-Z])/g, " $1")
          .replace(/^./, (char) => char.toUpperCase())
      );
    return findings.length > 0 ? findings.join(", ") : "Tidak ada temuan positif";
  };

  const getModelUsed = (record: TriageRecord) => {
    if (record.atsPrediction?.modelUsed) return record.atsPrediction.modelUsed;
    switch (record.atsPrediction?.providerUsed) {
      case "Gemini":
        return "gemini-3.5-flash";
      case "Hugging Face":
        return "mistralai/Mistral-7B-Instruct-v0.3";
      case "Model Mandiri (RunPod)":
        return "triage-qwen3-lora";
      case "Model Mandiri (Custom Endpoint)":
        return "Custom Endpoint";
      case "Rule-Based":
        return "Clinical Safety Rules v1";
      default:
        return "-";
    }
  };

  const DetailItem = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="min-w-0">
      <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</dt>
      <dd className="mt-0.5 text-xs font-medium text-slate-700 break-words">{showValue(value)}</dd>
    </div>
  );

  const DetailSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <section className="space-y-3">
      <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-500 border-b border-slate-200 pb-1">
        {title}
      </h4>
      {children}
    </section>
  );

  const exportCsv = () => {
    if (records.length === 0) {
      alert("Belum ada data rekam triase untuk diekspor.");
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
        getModelUsed(r),
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
      alert(error instanceof Error ? error.message : "Gagal mengunduh log monitoring.");
    } finally {
      setIsDownloadingLog(false);
    }
  };

  return (
    <div className="space-y-6" id="records-history-section">
      <div className="relative overflow-hidden rounded-3xl border border-indigo-100 bg-linear-to-r from-white via-indigo-50 to-sky-50 p-6 shadow-sm dark:border-slate-800 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950/40">
        <div className="absolute -right-12 -top-16 h-40 w-40 rounded-full bg-indigo-200/40 blur-3xl dark:bg-indigo-800/20" />
        <div className="relative flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">Database Klinis</p>
          <h2 className="mt-1 text-2xl font-extrabold text-slate-950 dark:text-white">Daftar Rekam Triase IGD</h2>
          <p className="mt-2 max-w-2xl text-base font-medium text-slate-600 dark:text-slate-300">
            Cari pasien, lihat hasil ATS, buka rincian klinis, atau muat data ke Form Utama untuk diedit.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 xl:max-w-xl xl:justify-end">
          {isAdmin && (
            <button
              id="btn-export-csv"
              onClick={exportCsv}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-sm"
            >
              <Download size={18} />
              <span>Ekspor CSV</span>
            </button>
          )}

          {isAdmin && (
            <button
              id="btn-export-dataset"
              onClick={onExportDataset}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-150 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
            >
              <FileJson size={18} />
              <span>Ekspor JSON</span>
            </button>
          )}

          {isAdmin && (
            <button
              id="btn-download-monitoring-log"
              onClick={downloadMonitoringLog}
              disabled={isDownloadingLog}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-sm"
            >
              <Activity size={18} />
              <span>{isDownloadingLog ? "Menyiapkan..." : "Log Monitoring"}</span>
            </button>
          )}
        </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">Total rekam tersimpan</span>
          <strong className="mt-1 block text-2xl font-extrabold text-slate-950 dark:text-white">{records.length}</strong>
        </div>
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 shadow-sm dark:border-rose-900 dark:bg-rose-950/25">
          <span className="text-sm font-semibold text-rose-700 dark:text-rose-300">Prioritas tinggi ATS 1–2</span>
          <strong className="mt-1 block text-2xl font-extrabold text-rose-800 dark:text-rose-200">{urgentCount}</strong>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm dark:border-amber-900 dark:bg-amber-950/25">
          <span className="text-sm font-semibold text-amber-700 dark:text-amber-300">Dengan override klinis</span>
          <strong className="mt-1 block text-2xl font-extrabold text-amber-800 dark:text-amber-200">{overriddenCount}</strong>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(280px,1fr)_220px_220px]">
          <div className="flex items-center gap-2 relative">
            <input
              id="input-search-records"
              type="search"
              placeholder="Cari No. RM, nama, keluhan, atau validator..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 text-base bg-slate-50 dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:border-indigo-500 transition"
            />
            <Search size={20} className="absolute left-4 text-slate-500" />
          </div>
          <select value={atsFilter} onChange={(event) => setAtsFilter(event.target.value)} className="rounded-xl border-2 border-slate-200 bg-slate-50 px-4 py-3 text-base font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">
            <option value="all">Semua level ATS</option>
            {[1, 2, 3, 4, 5].map((level) => <option key={level} value={level}>ATS {level}</option>)}
          </select>
          <select value={sortOrder} onChange={(event) => setSortOrder(event.target.value as "newest" | "oldest")} className="rounded-xl border-2 border-slate-200 bg-slate-50 px-4 py-3 text-base font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">
            <option value="newest">Terbaru lebih dulu</option>
            <option value="oldest">Terlama lebih dulu</option>
          </select>
        </div>
        <div className="mt-3 flex items-center justify-between text-sm font-medium text-slate-500 dark:text-slate-400">
          <span>Menampilkan {filtered.length} dari {records.length} rekam</span>
          {(searchTerm || atsFilter !== "all") && (
            <button type="button" onClick={() => { setSearchTerm(""); setAtsFilter("all"); }} className="font-bold text-indigo-700 hover:text-indigo-800 dark:text-indigo-300">Hapus filter</button>
          )}
        </div>
      </div>

      <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 xl:block">
        <table className="w-full table-fixed text-left text-sm text-slate-600 dark:text-slate-300">
          <thead className="sticky top-0 z-10 bg-slate-100 text-sm text-slate-600 uppercase font-bold border-b border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
            <tr>
              <th className="w-[16%] px-4 py-4">Waktu</th>
              <th className="w-[22%] px-4 py-4">Pasien / No. RM</th>
              <th className="w-[20%] px-4 py-4">Keluhan</th>
              <th className="w-[14%] px-4 py-4 text-center">ATS Final</th>
              <th className="w-[14%] px-4 py-4">Validator</th>
              <th className="w-[14%] px-4 py-4 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-slate-500">
                  Tidak ada rekam triage yang cocok. Silakan daftarkan pasien baru.
                </td>
              </tr>
            ) : (
              filtered.map((record) => {
                const finalLevel = record.atsFinal?.atsLevelFinal || record.atsPrediction?.atsLevel || 5;
                const predictionLevel = record.atsPrediction?.atsLevel;
                const details = ATS_LEVEL_DETAILS[finalLevel as 1 | 2 | 3 | 4 | 5];
                const hasOverride = Boolean(record.atsFinal?.atsLevelOverride);
                const isExpanded = expandedId === record.id;
                const gcsTotal =
                  (record.vitalSign?.gcs?.eye ?? 4) +
                  (record.vitalSign?.gcs?.verbal ?? 5) +
                  (record.vitalSign?.gcs?.motor ?? 6);

                return (
                  <React.Fragment key={record.id}>
                    <tr className="hover:bg-slate-50/50 transition align-top">
                      <td className="px-4 py-3 whitespace-nowrap font-medium text-slate-500 font-mono">
                        {formatDate(record.timestamp)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-slate-800">{record.namaPasien}</span>
                        <span className="block text-sm font-mono font-semibold text-indigo-700 dark:text-indigo-300">{record.nomorRM}</span>
                        <span className="block text-sm text-slate-500">
                          {record.umur} tahun · {record.gender}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[10px] font-medium font-mono">
                          {record.chiefComplaint}
                        </span>
                        {record.chiefComplaintCustom && (
                          <span className="block text-[10px] text-slate-400 truncate max-w-[180px] mt-0.5">
                            {record.chiefComplaintCustom}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="inline-flex flex-col items-center gap-1">
                          <span className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border shadow-3xs ${details.badgeColor}`}>
                            {details.name}
                          </span>
                          {predictionLevel && predictionLevel !== finalLevel && (
                            <span className="text-[9px] text-slate-400">AI: ATS {predictionLevel}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="block max-w-[180px] truncate font-semibold text-slate-700" title={record.atsFinal?.namaPetugas}>
                          {record.atsFinal?.namaPetugas || "-"}
                        </span>
                        <span className="block max-w-[180px] truncate text-[10px] text-slate-400" title={record.atsFinal?.jabatanPetugas}>
                          {record.atsFinal?.jabatanPetugas || "-"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="flex flex-col items-stretch gap-2">
                          <button
                            type="button"
                            onClick={() => setExpandedId(isExpanded ? null : record.id || null)}
                            className="flex items-center justify-center gap-2 rounded-lg bg-sky-50 px-3 py-2 font-bold text-sky-800 hover:bg-sky-100 dark:bg-sky-950/30 dark:text-sky-300"
                            title={isExpanded ? "Tutup Detail" : "Lihat Detail Database"}
                          >
                            {isExpanded ? <ChevronUp size={18} /> : <Eye size={18} />}
                            <span>{isExpanded ? "Tutup" : "Lihat"}</span>
                          </button>
                          {(isAdmin || record.createdByUserId === currentUserId) && (
                            <button
                              id={`btn-edit-rec-${record.id}`}
                              onClick={() => onSelectRecord(record)}
                              className="flex items-center justify-center gap-2 rounded-lg bg-indigo-50 px-3 py-2 font-bold text-indigo-800 hover:bg-indigo-100 dark:bg-indigo-950/30 dark:text-indigo-300"
                              title="Edit / Muat ke Form"
                            >
                              <Edit3 size={18} />
                              <span>Edit</span>
                            </button>
                          )}
                          {isAdmin && (
                            <button
                              id={`btn-delete-rec-${record.id}`}
                              onClick={() => {
                                if (confirm("Apakah Anda yakin ingin menghapus rekam triage ini?")) {
                                  onDeleteRecord(record.id!);
                                }
                              }}
                              className="flex items-center justify-center gap-2 rounded-lg px-3 py-2 font-bold text-rose-700 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-950/30"
                              title="Hapus"
                            >
                              <Trash2 size={18} />
                              <span>Hapus</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>

                    {isExpanded && (
                      <tr className="bg-slate-50/70">
                        <td colSpan={6} className="px-4 py-4">
                          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 rounded-xl border border-slate-200 bg-white p-4">
                            <DetailSection title="Identitas dan Kunjungan">
                              <dl className="grid grid-cols-2 md:grid-cols-3 gap-3">
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
                              <dl className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <DetailItem label="Keluhan Utama" value={record.chiefComplaint} />
                                <DetailItem label="Detail Keluhan" value={record.chiefComplaintCustom} />
                                <DetailItem label="Gejala Tambahan" value={joinList(record.gejalaTambahan)} />
                                <DetailItem label="Riwayat Penyakit" value={joinList(record.riwayatPenyakit)} />
                                <DetailItem label="Riwayat Lain / Catatan" value={record.riwayatPenyakitLainnya} />
                              </dl>
                            </DetailSection>

                            <DetailSection title="Vital Sign dan Nyeri">
                              <dl className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <DetailItem
                                  label="Tekanan Darah"
                                  value={`${record.vitalSign?.tekananDarahSistolik || "-"} / ${record.vitalSign?.tekananDarahDiastolik || "-"} mmHg`}
                                />
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
                                <DetailItem
                                  label="Nyeri"
                                  value={`${record.painScale?.skala ?? "-"} / 10 (${record.painScale?.kategori || "-"})`}
                                />
                                <DetailItem label="Lokasi Nyeri" value={record.painScale?.lokasi} />
                                <DetailItem label="Nyeri Menjalar" value={record.painScale?.menjalar ? "Ya" : "Tidak"} />
                              </dl>
                            </DetailSection>

                            <DetailSection title="Pemeriksaan Fisik">
                              <dl className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <DetailItem label="Kepala" value={getTrueFindings(record.pemeriksaanFisik?.kepala)} />
                                <DetailItem label="Leher" value={getTrueFindings(record.pemeriksaanFisik?.leher)} />
                                <DetailItem label="Dada / Paru / Jantung" value={getTrueFindings(record.pemeriksaanFisik?.dada)} />
                                <DetailItem label="Abdomen" value={getTrueFindings(record.pemeriksaanFisik?.perut)} />
                                <DetailItem label="Ekstremitas Atas" value={getTrueFindings(record.pemeriksaanFisik?.ekstremitasAtas)} />
                                <DetailItem label="Ekstremitas Bawah" value={getTrueFindings(record.pemeriksaanFisik?.ekstremitasBawah)} />
                              </dl>
                            </DetailSection>

                            <DetailSection title="Analisis ATS AI">
                              <dl className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <DetailItem label="ATS Prediksi" value={record.atsPrediction?.atsLevel ? `ATS ${record.atsPrediction.atsLevel}` : "-"} />
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
                              <dl className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <DetailItem label="ATS Final" value={`ATS ${finalLevel} - ${details.subtitle}`} />
                                <DetailItem label="Status Override" value={hasOverride ? "Aktif" : "Tidak aktif"} />
                                <DetailItem
                                  label="Level Override"
                                  value={record.atsFinal?.atsLevelOverride ? `ATS ${record.atsFinal.atsLevelOverride}` : "-"}
                                />
                                <DetailItem label="Alasan Override" value={record.atsFinal?.alasanOverride} />
                                <DetailItem label="Validator" value={record.atsFinal?.namaPetugas} />
                                <DetailItem label="Jabatan Validator" value={record.atsFinal?.jabatanPetugas} />
                              </dl>
                            </DetailSection>

                            <DetailSection title="Audit Log Database">
                              {record.auditLogs && record.auditLogs.length > 0 ? (
                                <div className="space-y-2">
                                  {record.auditLogs.map((log, index) => (
                                    <div key={`${record.id}-audit-${index}`} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                                      <div className="text-xs font-semibold text-slate-700">{log.action}</div>
                                      <div className="text-[10px] text-slate-400">
                                        {formatDate(log.timestamp)} - {log.user}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-xs text-slate-400">Belum ada audit log tersimpan.</p>
                              )}
                            </DetailSection>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:hidden">
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center font-medium text-slate-500 dark:border-slate-700 dark:bg-slate-900">
            Tidak ada rekam triase yang sesuai dengan pencarian atau filter.
          </div>
        ) : filtered.map((record) => {
          const finalLevel = record.atsFinal?.atsLevelFinal || record.atsPrediction?.atsLevel || 5;
          const details = ATS_LEVEL_DETAILS[finalLevel as 1 | 2 | 3 | 4 | 5];
          const isExpanded = expandedId === record.id;
          const canEdit = isAdmin || record.createdByUserId === currentUserId;
          const gcsTotal =
            (record.vitalSign?.gcs?.eye ?? 4) +
            (record.vitalSign?.gcs?.verbal ?? 5) +
            (record.vitalSign?.gcs?.motor ?? 6);

          return (
            <article key={record.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-extrabold text-slate-950 dark:text-white">{record.namaPasien}</h3>
                      <span className={`rounded-lg border px-2.5 py-1 text-sm font-bold ${details.badgeColor}`}>{details.name}</span>
                    </div>
                    <p className="mt-1 font-mono text-sm font-bold text-indigo-700 dark:text-indigo-300">{record.nomorRM}</p>
                    <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">{formatDate(record.timestamp)}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                    {record.chiefComplaint || "Keluhan tidak tercatat"}
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-950/60">
                  <div>
                    <span className="block text-sm font-semibold text-slate-500">Umur / Gender</span>
                    <strong className="text-sm text-slate-800 dark:text-slate-100">{record.umur} tahun · {record.gender}</strong>
                  </div>
                  <div>
                    <span className="block text-sm font-semibold text-slate-500">Validator</span>
                    <strong className="text-sm text-slate-800 dark:text-slate-100">{record.atsFinal?.namaPetugas || "-"}</strong>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <button type="button" onClick={() => setExpandedId(isExpanded ? null : record.id || null)} className="flex items-center justify-center gap-2 rounded-xl bg-sky-50 px-4 py-3 font-bold text-sky-800 hover:bg-sky-100 dark:bg-sky-950/30 dark:text-sky-300">
                    {isExpanded ? <ChevronUp size={20} /> : <Eye size={20} />}
                    {isExpanded ? "Tutup Detail" : "Lihat Detail"}
                  </button>
                  {canEdit && (
                    <button type="button" onClick={() => onSelectRecord(record)} className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 font-bold text-white hover:bg-indigo-700">
                      <Edit3 size={20} />
                      Edit di Form Utama
                    </button>
                  )}
                  {isAdmin && (
                    <button type="button" onClick={() => { if (confirm("Apakah Anda yakin ingin menghapus rekam triase ini?")) onDeleteRecord(record.id!); }} className="flex items-center justify-center gap-2 rounded-xl border border-rose-200 px-4 py-3 font-bold text-rose-700 hover:bg-rose-50 dark:border-rose-900 dark:text-rose-300">
                      <Trash2 size={20} />
                      Hapus
                    </button>
                  )}
                </div>
              </div>

              {isExpanded && (
                <div className="border-t border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950/50">
                  <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <DetailItem label="Keluhan dan detail" value={`${record.chiefComplaint || "-"}${record.chiefComplaintCustom ? ` — ${record.chiefComplaintCustom}` : ""}`} />
                    <DetailItem label="Tanda vital" value={`TD ${record.vitalSign?.tekananDarahSistolik || "-"}/${record.vitalSign?.tekananDarahDiastolik || "-"}, HR ${record.vitalSign?.heartRate || "-"}, RR ${record.vitalSign?.respiratoryRate || "-"}, SpO₂ ${record.vitalSign?.saturasiOksigen || "-"}%`} />
                    <DetailItem label="Kesadaran" value={`GCS ${gcsTotal}, AVPU ${record.vitalSign?.avpu || "Alert"}`} />
                    <DetailItem label="Skala nyeri" value={`${record.painScale?.skala ?? "-"}/10 — ${record.painScale?.lokasi || "Lokasi tidak tercatat"}`} />
                    <DetailItem label="Riwayat penyakit" value={joinList(record.riwayatPenyakit)} />
                    <DetailItem label="Keputusan final" value={`ATS ${finalLevel} — ${details.subtitle}`} />
                    <DetailItem label="Alasan klasifikasi" value={record.atsPrediction?.alasanKlasifikasi} />
                    <DetailItem label="Override klinis" value={record.atsFinal?.atsLevelOverride ? `ATS ${record.atsFinal.atsLevelOverride}: ${record.atsFinal.alasanOverride || "Tanpa alasan"}` : "Tidak ada override"} />
                    <DetailItem label="Validator" value={`${record.atsFinal?.namaPetugas || "-"} · ${record.atsFinal?.jabatanPetugas || "-"}`} />
                  </dl>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
