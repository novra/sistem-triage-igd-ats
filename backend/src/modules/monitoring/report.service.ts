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

function avgDurationByGroup(rows: any[], key: (row: any) => string) {
  const sums: Record<string, { total: number; count: number }> = {};
  for (const row of rows) {
    if (row.duration_ms == null) continue;
    const k = key(row) || "(tidak diketahui)";
    if (!sums[k]) sums[k] = { total: 0, count: 0 };
    sums[k].total += row.duration_ms;
    sums[k].count += 1;
  }
  return Object.entries(sums)
    .map(([k, v]) => [k, Math.round(v.total / v.count), v.count] as [string, number, number])
    .sort((a, b) => b[1] - a[1]);
}

function average(rows: any[]) {
  const withDuration = rows.filter((r) => r.duration_ms != null);
  if (!withDuration.length) return 0;
  return Math.round(withDuration.reduce((sum, r) => sum + r.duration_ms, 0) / withDuration.length);
}

export async function buildMonitoringWorkbook(from?: string, to?: string) {
  const events = await listEvents(from, to);
  const classifications = events.filter((e) => e.event_type === "ats_classification");
  const narrativeParses = events.filter((e) => e.event_type === "narrative_parse");
  const httpEvents = events.filter((e) => e.event_type === "http_request");
  const otherHealthEvents = events.filter(
    (e) => !["ats_classification", "narrative_parse", "http_request"].includes(e.event_type),
  );
  const healthEvents = [...otherHealthEvents, ...httpEvents].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Sistem Triage IGD ATS";
  workbook.created = new Date();

  const summarySheet = workbook.addWorksheet("Ringkasan");
  summarySheet.columns = [
    { header: "Metrik", key: "metric", width: 44 },
    { header: "Nilai", key: "value", width: 30 },
  ];
  const totalClassifications = classifications.length;
  const aiFailedCount = classifications.filter((c) => c.detail_json?.aiFailed).length;
  const ruleOverrideCount = classifications.filter((c) => c.detail_json?.ruleOverrode).length;
  const emergencyCount = classifications.filter((c) => c.detail_json?.emergencyIndicator).length;
  const errorCount = otherHealthEvents.filter((e) => e.level === "error").length;
  const slowRequestCount = httpEvents.filter((e) => e.detail_json?.slow).length;
  const failedRequestCount = httpEvents.filter((e) => (e.detail_json?.statusCode || 0) >= 400).length;

  summarySheet.addRows([
    { metric: "Periode laporan", value: `${from || "awal data"} s/d ${to || "sekarang"}` },
    { metric: "Total klasifikasi triase", value: totalClassifications },
    { metric: "Klasifikasi dengan AI gagal (fallback rule)", value: aiFailedCount },
    { metric: "Klasifikasi di-override rule safety-net", value: ruleOverrideCount },
    { metric: "Klasifikasi indikator kegawatdaruratan", value: emergencyCount },
    { metric: "Rata-rata latensi klasifikasi ATS (ms)", value: average(classifications) },
    { metric: "Rata-rata latensi parsing narasi (ms)", value: average(narrativeParses) },
    { metric: "Total event error/kegagalan sistem", value: errorCount },
    {
      metric: "Request API lambat (>1000ms, hanya yang tercatat)",
      value: slowRequestCount,
    },
    { metric: "Request API gagal (status >=400, hanya yang tercatat)", value: failedRequestCount },
  ]);

  summarySheet.addRow({});
  summarySheet.addRow({ metric: "Rata-rata latensi klasifikasi ATS per provider (ms)", value: "Jumlah sampel" });
  for (const [provider, avgMs, count] of avgDurationByGroup(classifications, (c) => c.provider)) {
    summarySheet.addRow({ metric: `  ${provider}`, value: `${avgMs} ms (n=${count})` });
  }

  summarySheet.addRow({});
  summarySheet.addRow({ metric: "Rata-rata latensi parsing narasi per sumber (ms)", value: "Jumlah sampel" });
  for (const [source, avgMs, count] of avgDurationByGroup(narrativeParses, (n) => n.provider)) {
    summarySheet.addRow({ metric: `  ${source}`, value: `${avgMs} ms (n=${count})` });
  }

  summarySheet.addRow({});
  summarySheet.addRow({ metric: "Distribusi provider AI dipakai (klasifikasi)", value: "" });
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
    { header: "Jenis Aktivitas", key: "activity", width: 18 },
    { header: "Provider AI Diminta", key: "requested", width: 20 },
    { header: "Provider/Sumber Dipakai", key: "used", width: 22 },
    { header: "Model", key: "model", width: 28 },
    { header: "Level ATS Final", key: "ats", width: 14 },
    { header: "AI Gagal (Fallback)", key: "aiFailed", width: 16 },
    { header: "Di-override Rule", key: "override", width: 16 },
    { header: "Kegawatdaruratan", key: "emergency", width: 16 },
    { header: "Durasi (ms)", key: "duration", width: 12 },
  ];
  const activityRows = [...classifications, ...narrativeParses].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
  for (const row of activityRows) {
    const isClassification = row.event_type === "ats_classification";
    activitySheet.addRow({
      time: new Date(row.created_at).toLocaleString("id-ID"),
      activity: isClassification ? "Klasifikasi ATS" : "Parsing Narasi",
      requested: row.detail_json?.aiProviderRequested || "",
      used: row.provider || "",
      model: row.model || "",
      ats: isClassification ? row.ats_level ?? "" : "",
      aiFailed: isClassification ? (row.detail_json?.aiFailed ? "Ya" : "Tidak") : "",
      override: isClassification ? (row.detail_json?.ruleOverrode ? "Ya" : "Tidak") : "",
      emergency: isClassification ? (row.detail_json?.emergencyIndicator ? "Ya" : "Tidak") : "",
      duration: row.duration_ms ?? "",
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
    { header: "Durasi (ms)", key: "duration", width: 12 },
    { header: "Konteks", key: "context", width: 20 },
  ];
  for (const e of healthEvents) {
    healthSheet.addRow({
      time: new Date(e.created_at).toLocaleString("id-ID"),
      type: e.event_type,
      level: e.level,
      provider: e.provider || "",
      message: e.message || "",
      duration: e.duration_ms ?? "",
      context: e.detail_json?.context || e.detail_json?.statusCode || "",
    });
  }
  healthSheet.getRow(1).font = { bold: true };

  return workbook;
}
