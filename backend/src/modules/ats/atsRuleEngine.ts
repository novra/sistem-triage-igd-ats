import { getPediatricVitalRange } from "./pediatricVitals";

export type AtsLevel = 1 | 2 | 3 | 4 | 5;

function isOutsideRange(value: number, range: number[]) {
  return value > 0 && (value < range[0] || value > range[1]);
}

function isWithinRange(value: number, range: number[]) {
  return value > 0 && value >= range[0] && value <= range[1];
}

export function classifyByRules(record: any) {
  const vitalSign = record.vitalSign || {};
  const painScale = record.painScale || {};
  const exam = record.pemeriksaanFisik || {};
  const warnings: string[] = [];
  let overrideLevel: AtsLevel | null = null;

  const rr = Number(vitalSign.respiratoryRate) || 0;
  const hr = Number(vitalSign.heartRate) || 0;
  const spo2 = Number(vitalSign.saturasiOksigen) || 0;
  const sbp = Number(vitalSign.tekananDarahSistolik) || 0;
  const dbp = Number(vitalSign.tekananDarahDiastolik) || 0;
  const ageYears = Number(record.umur) || 0;
  const isPediatric = ageYears > 0 && ageYears <= 10;
  const gcsTotal = (Number(vitalSign.gcs?.eye) || 4) + (Number(vitalSign.gcs?.verbal) || 5) + (Number(vitalSign.gcs?.motor) || 6);
  const avpu = vitalSign.avpu || "Alert";
  const text = `${record.chiefComplaint || ""} ${record.chiefComplaintCustom || ""} ${(record.gejalaTambahan || []).join(" ")} ${(record.riwayatPenyakit || []).join(" ")} ${record.riwayatPenyakitLainnya || ""}`.toLowerCase();

  const addRule = (level: AtsLevel, reason: string) => {
    warnings.push(`Rule-Based ATS ${level}: ${reason}`);
    if (!overrideLevel || level < overrideLevel) overrideLevel = level;
  };
  const hasAnyText = (...needles: string[]) => needles.some((needle) => text.includes(needle));
  const hasSevereBleeding = Boolean(exam.kepala?.perdarahan || exam.perut?.perdarahan || exam.ekstremitasAtas?.perdarahanAktif || exam.ekstremitasBawah?.perdarahanAktif || text.includes("perdarahan aktif"));
  const hasTrauma = Boolean(hasAnyText("trauma") || exam.kepala?.traumaKepala || exam.leher?.traumaLeher || exam.ekstremitasBawah?.trauma || exam.kepala?.deformitas || exam.ekstremitasAtas?.deformitas || exam.ekstremitasBawah?.deformitas);
  const hasRespiratoryDistress = Boolean(vitalSign.ototBantuNapas || vitalSign.retraksi || vitalSign.stridor || vitalSign.apnea || vitalSign.polaNapas === "irreguler" || exam.dada?.distressRespirasi || exam.dada?.retraksi || exam.dada?.penggunaanOtotBantuNapas || exam.leher?.stridor || text.includes("distress pernapasan") || text.includes("sesak berat"));
  const hasPoorPerfusion = Boolean(exam.kepala?.sianosis || exam.ekstremitasAtas?.sianosis || exam.ekstremitasBawah?.sianosis || exam.ekstremitasAtas?.perfusiBuruk || exam.ekstremitasBawah?.perfusiBuruk || text.includes("sianosis") || text.includes("keringat dingin"));
  const painScore = Number(painScale.skala) || 0;

  if (isPediatric) {
    const range = getPediatricVitalRange(ageYears);
    if (avpu === "Unresponsive" || gcsTotal <= 8) addRule(1, `Anak tidak sadar atau GCS ${gcsTotal}.`);
    if (vitalSign.apnea || rr === 0) addRule(1, "Gagal napas atau henti napas pada pasien anak.");
    if (hr === 0 || (hasPoorPerfusion && sbp > 0 && sbp < 80)) addRule(1, "Henti jantung/syok dengan sianosis pada pasien anak.");
    if (isOutsideRange(rr, range.rr2)) addRule(2, `RR ${rr} di luar rentang +/- 2 SD usia anak.`);
    else if (isOutsideRange(rr, range.rr1)) addRule(3, `RR ${rr} di luar rentang +/- 1 SD usia anak.`);
    else if (isWithinRange(rr, range.rrNormal)) addRule(4, "Laju napas normal sesuai usia anak.");
    if (isOutsideRange(hr, range.hr2)) addRule(2, `HR ${hr} di luar rentang +/- 2 SD usia anak.`);
    else if (isOutsideRange(hr, range.hr1)) addRule(3, `HR ${hr} di luar rentang +/- 1 SD usia anak.`);
    else if (isWithinRange(hr, range.hrNormal)) addRule(4, "Laju nadi normal sesuai usia anak.");
    if (avpu === "Pain" || avpu === "Verbal" || (gcsTotal >= 9 && gcsTotal <= 12)) addRule(2, "Penurunan kesadaran/lethargis pada pasien anak.");
    else if (gcsTotal >= 13 && gcsTotal < 15) addRule(3, `Perubahan perilaku atau GCS ${gcsTotal} pada pasien anak.`);
    else if (gcsTotal === 15) addRule(4, "Kesadaran baik/konsolabel dengan GCS 15.");
    if (vitalSign.stridor || exam.leher?.stridor || hasRespiratoryDistress) addRule(vitalSign.stridor || exam.leher?.stridor ? 2 : 3, "Stridor atau distress napas pada pasien anak.");
  } else {
    if (avpu === "Unresponsive" || gcsTotal < 9) addRule(1, `Kesadaran kategori resusitasi: AVPU ${avpu}, GCS ${gcsTotal}.`);
    else if (gcsTotal >= 9 && gcsTotal <= 12) addRule(2, `GCS ${gcsTotal} sesuai kategori emergensi.`);
    else if (gcsTotal > 12 && gcsTotal < 15) addRule(3, `GCS ${gcsTotal} dengan perubahan kesadaran ringan/somnolen.`);
    else if (gcsTotal === 15) addRule(4, "GCS 15 dan sadar penuh.");
    if (vitalSign.apnea || rr === 0 || (rr > 0 && rr < 10)) addRule(1, `Henti napas atau RR ${rr} kurang dari 10 x/menit.`);
    else if (hasRespiratoryDistress || vitalSign.stridor || exam.leher?.stridor) addRule(2, "Distress pernapasan atau sumbatan jalan napas parsial.");
    else if (hasAnyText("sesak") || (spo2 >= 90 && spo2 <= 95)) addRule(3, `Sesak napas atau SpO2 ${spo2}% pada rentang 90-95%.`);
    if (hr === 0 || (hasPoorPerfusion && sbp > 0 && sbp < 90)) addRule(1, "Henti jantung/syok dengan perfusi buruk.");
    else if ((hr > 0 && hr < 50) || hasPoorPerfusion) addRule(2, `Nadi lemah/bradikardia atau perfusi buruk (HR ${hr}).`);
    else if ((hr > 120 && hr <= 140) || sbp > 180 || dbp > 120 || hasSevereBleeding) addRule(3, `Gangguan sirkulasi: HR ${hr}, TD ${sbp}/${dbp}, atau perdarahan.`);
    else if ((hr >= 50 && hr <= 120) && (sbp >= 100 && sbp <= 120) && (dbp >= 70 && dbp <= 90)) addRule(4, "Frekuensi nadi dan tekanan darah dalam rentang stabil tabel dewasa.");
    if (hasAnyText("nyeri dada", "sepsis", "keracunan", "racun", "obat risiko tinggi") || painScore >= 7 || (hasTrauma && hasSevereBleeding)) addRule(2, `Gejala spesifik emergensi dengan nyeri ${painScore}/10.`);
    else if (hasAnyText("demam") && hasAnyText("imunosupresi")) addRule(3, "Demam pada pasien imunosupresi.");
    else if (painScore >= 4 || hasAnyText("muntah", "diare", "nyeri perut") || hasTrauma) addRule(3, `Gejala gawat kategori 30 menit: nyeri ${painScore}/10, muntah/diare, nyeri perut, atau trauma.`);
    else if (painScore >= 1 || hasAnyText("luka kecil", "kontrol", "imunisasi", "psikiatri kronis")) addRule(5, "Keluhan ringan/tidak gawat sesuai kategori 120 menit.");
  }

  if (!overrideLevel) addRule(5, "Tidak ditemukan red flag fisiologis atau gejala spesifik pada rule guard rail.");
  return { overrideLevel, warnings, emergency: Boolean(overrideLevel && overrideLevel <= 3) };
}
