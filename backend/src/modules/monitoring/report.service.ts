import ExcelJS from "exceljs";
import { listEvents } from "./events.repository";

function tally(rows: any[], key: (row: any) => string) {
  const counts: Record<string, number> = {};
  for (const row of rows) {
    const k = key(row) || "(tidak diketahui)";
    counts[k] = (counts[k] || 0) + 1;
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1]);
}

export async function buildMonitoringWorkbook(from?: string, to?: string) {
  const events = await listEvents(from, to);
  const classifications = events.filter((e) => e.event_type === "ats_classification");
  const healthEvents = events.filter((e) => e.event_type !== "ats_classification");

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Sistem Triage IGD ATS";
  workbook.created = new Date();

  const summarySheet = workbook.addWorksheet("Ringkasan");
  summarySheet.columns = [
    { header: "Metrik", key: "metric", width: 40 },
    { header: "Nilai", key: "value", width: 30 },
  ];
  const totalClassifications = classifications.length;
  const aiFailedCount = classifications.filter((c) => c.detail_json?.aiFailed).length;
  const ruleOverrideCount = classifications.filter((c) => c.detail_json?.ruleOverrode).length;
  const emergencyCount = classifications.filter((c) => c.detail_json?.emergencyIndicator).length;
  const errorCount = healthEvents.filter((e) => e.level === "error").length;
  const avgDuration = totalClassifications
    ? Math.round(classifications.reduce((sum, c) => sum + (c.duration_ms || 0), 0) / totalClassifications)
    : 0;

  summarySheet.addRows([
    { metric: "Periode laporan", value: `${from || "awal data"} s/d ${to || "sekarang"}` },
    { metric: "Total klasifikasi triase", value: totalClassifications },
    { metric: "Klasifikasi dengan AI gagal (fallback rule)", value: aiFailedCount },
    { metric: "Klasifikasi di-override rule safety-net", value: ruleOverrideCount },
    { metric: "Klasifikasi indikator kegawatdaruratan", value: emergencyCount },
    { metric: "Rata-rata durasi klasifikasi (ms)", value: avgDuration },
    { metric: "Total event error/kegagalan sistem", value: errorCount },
  ]);
  summarySheet.addRow({});
  summarySheet.addRow({ metric: "Distribusi provider AI dipakai", value: "" });
  for (const [provider, count] of tally(classifications, (c) => c.provider)) {
    summarySheet.addRow({ metric: `  ${provider}`, value: count });
  }
  summarySheet.addRow({});
  summarySheet.addRow({ metric: "Distribusi level ATS final", value: "" });
  for (const [level, count] of tally(classifications, (c) => `ATS ${c.ats_level ?? "-"}`)) {
    summarySheet.addRow({ metric: `  ${level}`, value: count });
  }
  summarySheet.addRow({});
  summarySheet.addRow({ metric: "Distribusi tipe event sistem/error", value: "" });
  for (const [type, count] of tally(healthEvents, (e) => e.event_type)) {
    summarySheet.addRow({ metric: `  ${type}`, value: count });
  }
  summarySheet.getRow(1).font = { bold: true };

  const activitySheet = workbook.addWorksheet("Aktivitas Triase");
  activitySheet.columns = [
    { header: "Waktu", key: "time", width: 22 },
    { header: "Provider AI Diminta", key: "requested", width: 20 },
    { header: "Provider Dipakai", key: "used", width: 22 },
    { header: "Model", key: "model", width: 28 },
    { header: "Level ATS Final", key: "ats", width: 14 },
    { header: "AI Gagal (Fallback)", key: "aiFailed", width: 16 },
    { header: "Di-override Rule", key: "override", width: 16 },
    { header: "Kegawatdaruratan", key: "emergency", width: 16 },
    { header: "Durasi (ms)", key: "duration", width: 12 },
  ];
  for (const c of classifications) {
    activitySheet.addRow({
      time: new Date(c.created_at).toLocaleString("id-ID"),
      requested: c.detail_json?.aiProviderRequested || "",
      used: c.provider || "",
      model: c.model || "",
      ats: c.ats_level ?? "",
      aiFailed: c.detail_json?.aiFailed ? "Ya" : "Tidak",
      override: c.detail_json?.ruleOverrode ? "Ya" : "Tidak",
      emergency: c.detail_json?.emergencyIndicator ? "Ya" : "Tidak",
      duration: c.duration_ms ?? "",
    });
  }
  activitySheet.getRow(1).font = { bold: true };

  const healthSheet = workbook.addWorksheet("Kesehatan Sistem");
  healthSheet.columns = [
    { header: "Waktu", key: "time", width: 22 },
    { header: "Tipe Event", key: "type", width: 18 },
    { header: "Level", key: "level", width: 10 },
    { header: "Provider", key: "provider", width: 20 },
    { header: "Pesan", key: "message", width: 60 },
    { header: "Konteks", key: "context", width: 20 },
  ];
  for (const e of healthEvents) {
    healthSheet.addRow({
      time: new Date(e.created_at).toLocaleString("id-ID"),
      type: e.event_type,
      level: e.level,
      provider: e.provider || "",
      message: e.message || "",
      context: e.detail_json?.context || e.detail_json?.path || "",
    });
  }
  healthSheet.getRow(1).font = { bold: true };

  return workbook;
}
