import React, { useState } from "react";
import { TriageRecord, ATS_LEVEL_DETAILS } from "../types";
import { Search, Download, Trash2, Edit3, Calendar, FileJson, Clock, Check } from "lucide-react";

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

  const filtered = records.filter((r) => {
    const term = searchTerm.toLowerCase();
    return (
      r.namaPasien.toLowerCase().includes(term) ||
      r.nomorRM.toLowerCase().includes(term) ||
      (r.chiefComplaint || "").toLowerCase().includes(term)
    );
  });

  const formatDate = (isoStr?: string) => {
    if (!isoStr) return "-";
    const date = new Date(isoStr);
    return date.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }) + " " + date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-4" id="records-history-section">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-md font-bold text-slate-800">Daftar Rekam Triage IGD</h2>
          <p className="text-xs text-slate-400">Log pendaftaran pasien dan evaluasi ATS terstandardisasi</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <button
            id="btn-export-csv"
            onClick={() => {
              if (records.length === 0) {
                alert("Belum ada data rekam triase untuk diekspor.");
                return;
              }
              
              // Indonesian human-readable headers
              const headers = [
                "ID Rekam",
                "Tanggal & Waktu",
                "No. RM",
                "Nama Pasien",
                "Umur",
                "Gender",
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
                "Skala Nyeri",
                "Lokasi Nyeri",
                "Nyeri Menjalar",
                "Level ATS Prediksi AI",
                "Level ATS Final",
                "Skor Keyakinan AI (%)",
                "Petugas Triage",
                "Jabatan Petugas"
              ];

              const rows = records.map((r) => {
                const gcsTotal = (r.vitalSign?.gcs?.eye ?? 4) + (r.vitalSign?.gcs?.verbal ?? 5) + (r.vitalSign?.gcs?.motor ?? 6);
                return [
                  r.id || "",
                  r.timestamp ? new Date(r.timestamp).toLocaleString("id-ID") : "",
                  r.nomorRM,
                  r.namaPasien,
                  r.umur,
                  r.gender,
                  r.caraDatang,
                  r.chiefComplaint,
                  r.chiefComplaintCustom || "",
                  r.gejalaTambahan ? r.gejalaTambahan.join(" | ") : "",
                  r.riwayatPenyakit ? r.riwayatPenyakit.join(" | ") : "",
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
                  r.painScale?.skala ?? "",
                  r.painScale?.lokasi || "",
                  r.painScale?.menjalar ? "Ya" : "Tidak",
                  r.atsPrediction?.atsLevel || "",
                  r.atsFinal?.atsLevelFinal || r.atsPrediction?.atsLevel || "",
                  r.atsPrediction?.confidenceScore || "",
                  r.atsFinal?.namaPetugas || "",
                  r.atsFinal?.jabatanPetugas || ""
                ];
              });

              // Generate CSV string with proper escaping and carriage returns
              const csvContent = [
                headers.join(","),
                ...rows.map((row) =>
                  row
                    .map((val) => {
                      const strValue = String(val === null || val === undefined ? "" : val);
                      if (strValue.includes(",") || strValue.includes('"') || strValue.includes("\n") || strValue.includes("\r")) {
                        return `"${strValue.replace(/"/g, '""')}"`;
                      }
                      return strValue;
                    })
                    .join(",")
                )
              ].join("\n");

              // Add UTF-8 Byte Order Mark (BOM) to force Excel to open it correctly
              const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: "text/csv;charset=utf-8;" });
              const url = URL.createObjectURL(blob);
              const link = document.createElement("a");
              link.href = url;
              link.setAttribute("download", `Data_Ekspor_Triage_ATS_${new Date().toISOString().split("T")[0]}.csv`);
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }}
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
          placeholder="Cari berdasarkan No RM, Nama Pasien, atau Keluhan..."
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
              <th className="px-4 py-3">Waktu Triage</th>
              <th className="px-4 py-3">No. RM</th>
              <th className="px-4 py-3">Nama Pasien / Umur / Sex</th>
              <th className="px-4 py-3">Keluhan Utama</th>
              <th className="px-4 py-3 text-center">Hasil Klasifikasi ATS</th>
              <th className="px-4 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-slate-400">
                  Tidak ada rekam triage yang cocok. Silakan daftarkan pasien baru.
                </td>
              </tr>
            ) : (
              filtered.map((record) => {
                const finalLevel = record.atsFinal?.atsLevelFinal || record.atsPrediction?.atsLevel || 5;
                const details = ATS_LEVEL_DETAILS[finalLevel as 1 | 2 | 3 | 4 | 5];
                
                return (
                  <tr key={record.id} className="hover:bg-slate-50/50 transition">
                    <td className="px-4 py-3 whitespace-nowrap font-medium text-slate-500 font-mono">
                      {formatDate(record.timestamp)}
                    </td>
                    <td className="px-4 py-3 font-bold font-mono text-slate-800">
                      {record.nomorRM}
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <span className="font-semibold text-slate-800">{record.namaPasien}</span>
                        <span className="block text-[10px] text-slate-400">
                          {record.umur} Thn · {record.gender}
                        </span>
                        {record.atsFinal?.namaPetugas && (
                          <span className="block text-[9px] text-indigo-600 dark:text-indigo-400 font-medium mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis max-w-[170px]" title={`${record.atsFinal.namaPetugas} (${record.atsFinal.jabatanPetugas})`}>
                            🩺 {record.atsFinal.namaPetugas} ({record.atsFinal.jabatanPetugas})
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[10px] font-medium font-mono">
                        {record.chiefComplaint}
                      </span>
                      {record.chiefComplaintCustom && (
                        <span className="block text-[10px] text-slate-400 truncate max-w-[150px] mt-0.5">
                          {record.chiefComplaintCustom}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="inline-flex flex-col items-center">
                        <span className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border shadow-3xs ${details.badgeColor}`}>
                          {details.name}
                        </span>
                        {record.atsFinal?.atsLevelOverride && (
                          <span className="text-[9px] text-amber-600 font-semibold mt-0.5">
                            *Overridden
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          id={`btn-edit-rec-${record.id}`}
                          onClick={() => onSelectRecord(record)}
                          className="p-1 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                          title="Edit / Lihat Detail"
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
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
