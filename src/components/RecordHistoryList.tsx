import React, { useState } from "react";
import { TriageRecord, ATS_LEVEL_DETAILS } from "../types";
import {
  ChevronUp,
  Download,
  Edit3,
  Eye,
  FileText,
  FileJson,
  Search,
  Trash2,
} from "lucide-react";
import { generateIGDReportPDF } from "../utils/pdfGenerator";

interface RecordHistoryListProps {
  records: TriageRecord[];
  onSelectRecord: (record: TriageRecord) => void;
  onDeleteRecord: (id: string) => void;
  onExportDataset: () => void;
}

export default function RecordHistoryList({
  records,
  onSelectRecord,
  onDeleteRecord,
  onExportDataset,
}: RecordHistoryListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = records.filter((r) => {
    const term = searchTerm.toLowerCase();
    return (
      r.namaPasien.toLowerCase().includes(term) ||
      r.nomorRM.toLowerCase().includes(term) ||
      (r.chiefComplaint || "").toLowerCase().includes(term) ||
      (r.atsFinal?.namaPetugas || "").toLowerCase().includes(term)
    );
  });

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

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-4" id="records-history-section">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-md font-bold text-slate-800">Daftar Rekam Triase IGD</h2>
          <p className="text-xs text-slate-400">
            Log database pasien, hasil ATS, override klinis, validator, dan audit penyimpanan
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            id="btn-export-csv"
            onClick={exportCsv}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-sm"
          >
            <Download size={14} />
            <span>Ekspor ke CSV/Excel</span>
          </button>

          <button
            id="btn-export-dataset"
            onClick={onExportDataset}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-150 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
          >
            <FileJson size={14} />
            <span>Ekspor JSON (NLP Dataset)</span>
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 relative">
        <input
          id="input-search-records"
          type="text"
          placeholder="Cari No RM, nama pasien, keluhan, atau validator..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-indigo-500 transition"
        />
        <Search size={14} className="absolute left-3 text-slate-400" />
      </div>

      <div className="overflow-x-auto border border-slate-100 rounded-xl">
        <table className="w-full text-left text-xs text-slate-600">
          <thead className="bg-slate-50 text-[10px] text-slate-400 uppercase font-bold border-b border-slate-100">
            <tr>
              <th className="px-4 py-3">Waktu Triase</th>
              <th className="px-4 py-3">No. RM</th>
              <th className="px-4 py-3">Pasien</th>
              <th className="px-4 py-3">Keluhan Utama</th>
              <th className="px-4 py-3 text-center">ATS Final</th>
              <th className="px-4 py-3">Override</th>
              <th className="px-4 py-3">Validator</th>
              <th className="px-4 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-8 text-slate-400">
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
                      <td className="px-4 py-3 font-bold font-mono text-slate-800">{record.nomorRM}</td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-slate-800">{record.namaPasien}</span>
                        <span className="block text-[10px] text-slate-400">
                          {record.umur} Thn - {record.gender}
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
                        {hasOverride ? (
                          <div className="space-y-1">
                            <span className="inline-flex px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-bold">
                              Aktif - ATS {record.atsFinal?.atsLevelOverride}
                            </span>
                            <p className="max-w-[220px] truncate text-[10px] text-slate-500" title={record.atsFinal?.alasanOverride}>
                              {record.atsFinal?.alasanOverride || "Tanpa alasan tercatat"}
                            </p>
                          </div>
                        ) : (
                          <span className="inline-flex px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 text-[10px] font-bold">
                            Tidak
                          </span>
                        )}
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
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setExpandedId(isExpanded ? null : record.id || null)}
                            className="p-1 text-slate-500 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition"
                            title={isExpanded ? "Tutup Detail" : "Lihat Detail Database"}
                          >
                            {isExpanded ? <ChevronUp size={15} /> : <Eye size={15} />}
                          </button>
                          <button
                            id={`btn-pdf-rec-${record.id}`}
                            type="button"
                            onClick={() => generateIGDReportPDF(record)}
                            className="p-1 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                            title="Cetak PDF"
                          >
                            <FileText size={15} />
                          </button>
                          <button
                            id={`btn-edit-rec-${record.id}`}
                            onClick={() => onSelectRecord(record)}
                            className="p-1 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                            title="Edit / Muat ke Form"
                          >
                            <Edit3 size={15} />
                          </button>
                          <button
                            id={`btn-delete-rec-${record.id}`}
                            onClick={() => {
                              if (confirm("Apakah Anda yakin ingin menghapus rekam triage ini?")) {
                                onDeleteRecord(record.id!);
                              }
                            }}
                            className="p-1 text-slate-400 hover:text-rose-650 hover:bg-rose-50 rounded-lg transition"
                            title="Hapus"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {isExpanded && (
                      <tr className="bg-slate-50/70">
                        <td colSpan={8} className="px-4 py-4">
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
    </div>
  );
}
