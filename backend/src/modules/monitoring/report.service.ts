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

const UNKNOWN_USER_LABEL = "(sistem/tidak teridentifikasi)";

function buildPerUserSummary(events: any[]) {
  type UserStats = {
    classifications: number;
    narrativeParses: number;
    emergency: number;
    errors: number;
    loginSuccess: number;
    loginFailed: number;
    durationTotal: number;
    durationCount: number;
  };
  const users = new Map<string, UserStats>();
  const ensure = (email: string | null) => {
    const key = email || UNKNOWN_USER_LABEL;
    if (!users.has(key)) {
      users.set(key, {
        classifications: 0,
        narrativeParses: 0,
        emergency: 0,
        errors: 0,
        loginSuccess: 0,
        loginFailed: 0,
        durationTotal: 0,
        durationCount: 0,
      });
    }
    return users.get(key)!;
  };
  for (const e of events) {
    const stats = ensure(e.user_email);
    if (e.event_type === "ats_classification") {
      stats.classifications += 1;
      if (e.detail_json?.emergencyIndicator) stats.emergency += 1;
      if (e.duration_ms != null) {
        stats.durationTotal += e.duration_ms;
        stats.durationCount += 1;
      }
    } else if (e.event_type === "narrative_parse") {
      stats.narrativeParses += 1;
    } else if (e.event_type === "login_success") {
      stats.loginSuccess += 1;
    } else if (e.event_type === "login_failed") {
      stats.loginFailed += 1;
    }
    if (e.level === "error") stats.errors += 1;
  }
  return Array.from(users.entries()).sort(
    (a, b) => b[1].classifications + b[1].narrativeParses - (a[1].classifications + a[1].narrativeParses),
  );
}

type TimeBucket = { time: Date; count: number; distinctUsers: number; avgDurationMs: number };

// Kelompokkan event ke jendela waktu tetap (mis. per jam / per 5 menit) untuk melihat
// tren volume & jumlah user berbeda yang aktif di jendela itu — dipakai untuk tren
// pemakaian dan estimasi kepadatan/concurrency.
function bucketEventsByMinutes(events: any[], granularityMinutes: number): TimeBucket[] {
  const ms = granularityMinutes * 60 * 1000;
  const buckets = new Map<number, { count: number; users: Set<string>; durationTotal: number; durationCount: number }>();
  for (const e of events) {
    const t = Math.floor(new Date(e.created_at).getTime() / ms) * ms;
    if (!buckets.has(t)) buckets.set(t, { count: 0, users: new Set(), durationTotal: 0, durationCount: 0 });
    const b = buckets.get(t)!;
    b.count += 1;
    if (e.user_email) b.users.add(e.user_email);
    if (e.duration_ms != null) {
      b.durationTotal += e.duration_ms;
      b.durationCount += 1;
    }
  }
  return Array.from(buckets.entries())
    .map(([t, v]) => ({
      time: new Date(t),
      count: v.count,
      distinctUsers: v.users.size,
      avgDurationMs: v.durationCount ? Math.round(v.durationTotal / v.durationCount) : 0,
    }))
    .sort((a, b) => a.time.getTime() - b.time.getTime());
}

function bucketEventsByDay(events: any[]) {
  const buckets = new Map<string, { count: number; users: Set<string> }>();
  for (const e of events) {
    const day = new Date(e.created_at).toISOString().slice(0, 10);
    if (!buckets.has(day)) buckets.set(day, { count: 0, users: new Set() });
    const b = buckets.get(day)!;
    b.count += 1;
    if (e.user_email) b.users.add(e.user_email);
  }
  return Array.from(buckets.entries())
    .map(([date, v]) => ({ date, count: v.count, distinctUsers: v.users.size }))
    .sort((a, b) => a.date.localeCompare(b.date));
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

  const hourlyBuckets = bucketEventsByMinutes(events, 60);
  const dailyBuckets = bucketEventsByDay(events);
  const concurrencyBuckets = bucketEventsByMinutes(events, 5);
  const busiestHour = [...hourlyBuckets].sort((a, b) => b.count - a.count)[0];
  const peakConcurrency = [...concurrencyBuckets].sort((a, b) => b.distinctUsers - a.distinctUsers)[0];

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
    {
      metric: "Jam tersibuk (total event terbanyak)",
      value: busiestHour ? `${busiestHour.time.toLocaleString("id-ID")} — ${busiestHour.count} event` : "-",
    },
    {
      metric: "Estimasi puncak user bersamaan (jendela 5 menit)",
      value: peakConcurrency
        ? `${peakConcurrency.distinctUsers} user pada ${peakConcurrency.time.toLocaleString("id-ID")}`
        : "-",
    },
  ]);
  summarySheet.addRow({
    metric: "  (estimasi dari log aktivitas, bukan pengukuran sesi aktif — lihat sheet Kepadatan (Estimasi))",
    value: "",
  });

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
    { header: "Pengguna", key: "user", width: 26 },
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
      user: row.user_email || UNKNOWN_USER_LABEL,
    });
  }
  activitySheet.getRow(1).font = { bold: true };

  const perUserSheet = workbook.addWorksheet("Per Pengguna");
  perUserSheet.columns = [
    { header: "Pengguna", key: "user", width: 28 },
    { header: "Total Klasifikasi ATS", key: "classifications", width: 18 },
    { header: "Total Parsing Narasi", key: "narrativeParses", width: 18 },
    { header: "Kegawatdaruratan", key: "emergency", width: 16 },
    { header: "Rata-rata Latensi Klasifikasi (ms)", key: "avgDuration", width: 22 },
    { header: "Login Sukses", key: "loginSuccess", width: 14 },
    { header: "Login Gagal", key: "loginFailed", width: 14 },
    { header: "Total Error/Kegagalan", key: "errors", width: 18 },
  ];
  for (const [user, stats] of buildPerUserSummary(events)) {
    perUserSheet.addRow({
      user,
      classifications: stats.classifications,
      narrativeParses: stats.narrativeParses,
      emergency: stats.emergency,
      avgDuration: stats.durationCount ? Math.round(stats.durationTotal / stats.durationCount) : "",
      loginSuccess: stats.loginSuccess,
      loginFailed: stats.loginFailed,
      errors: stats.errors,
    });
  }
  perUserSheet.getRow(1).font = { bold: true };

  const hourlySheet = workbook.addWorksheet("Tren per Jam");
  hourlySheet.columns = [
    { header: "Waktu (awal jam)", key: "time", width: 22 },
    { header: "Total Event", key: "count", width: 14 },
    { header: "User Aktif Berbeda", key: "users", width: 18 },
    { header: "Rata-rata Latensi (ms)", key: "avgDuration", width: 20 },
  ];
  for (const b of hourlyBuckets) {
    hourlySheet.addRow({
      time: b.time.toLocaleString("id-ID"),
      count: b.count,
      users: b.distinctUsers,
      avgDuration: b.avgDurationMs || "",
    });
  }
  hourlySheet.getRow(1).font = { bold: true };

  const dailySheet = workbook.addWorksheet("Tren per Hari");
  dailySheet.columns = [
    { header: "Tanggal", key: "date", width: 16 },
    { header: "Total Event", key: "count", width: 14 },
    { header: "User Aktif Berbeda", key: "users", width: 18 },
  ];
  for (const b of dailyBuckets) {
    dailySheet.addRow({ date: b.date, count: b.count, users: b.distinctUsers });
  }
  dailySheet.getRow(1).font = { bold: true };

  const concurrencySheet = workbook.addWorksheet("Kepadatan (Estimasi)");
  concurrencySheet.getColumn(1).width = 26;
  concurrencySheet.getColumn(2).width = 14;
  concurrencySheet.getColumn(3).width = 22;
  concurrencySheet.mergeCells("A1:C1");
  concurrencySheet.getCell("A1").value =
    "Estimasi jumlah user berbeda yang beraktivitas dalam jendela 5 menit yang sama — proxy dari log aktivitas, bukan pengukuran sesi aktif sungguhan.";
  concurrencySheet.getCell("A1").font = { italic: true, size: 9 };
  const concurrencyHeaderRow = concurrencySheet.addRow([
    "Waktu (awal jendela 5 menit)",
    "Total Event",
    "Estimasi User Bersamaan",
  ]);
  concurrencyHeaderRow.font = { bold: true };
  for (const b of concurrencyBuckets) {
    concurrencySheet.addRow([b.time.toLocaleString("id-ID"), b.count, b.distinctUsers]);
  }

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
