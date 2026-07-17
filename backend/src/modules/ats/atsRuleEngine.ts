import { getPediatricVitalRange } from "./pediatricVitals";

export type AtsLevel = 1 | 2 | 3 | 4 | 5;

function isOutsideRange(value: number, range: number[]) {
  return value > 0 && (value < range[0] || value > range[1]);
}

function isWithinRange(value: number, range: number[]) {
  return value > 0 && value >= range[0] && value <= range[1];
}

function readNumericMeasurement(value: unknown): number | null {
  if (value === undefined || value === null || value === "") return null;
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
}

export function classifyByRules(record: any) {
  const vitalSign = record.vitalSign || {};
  const painScale = record.painScale || {};
  const exam = record.pemeriksaanFisik || {};
  const warnings: string[] = [];
  let overrideLevel: AtsLevel | null = null;

  const rrMeasurement = readNumericMeasurement(vitalSign.respiratoryRate);
  const hrMeasurement = readNumericMeasurement(vitalSign.heartRate);
  const spo2Measurement = readNumericMeasurement(vitalSign.saturasiOksigen);
  const sbpMeasurement = readNumericMeasurement(vitalSign.tekananDarahSistolik);
  const dbpMeasurement = readNumericMeasurement(vitalSign.tekananDarahDiastolik);
  const rr = rrMeasurement ?? 0;
  const hr = hrMeasurement ?? 0;
  const spo2 = spo2Measurement ?? 0;
  const sbp = sbpMeasurement ?? 0;
  const dbp = dbpMeasurement ?? 0;
  const ageMeasurement = readNumericMeasurement(record.umur);
  const ageYears = ageMeasurement ?? 0;
  const hasKnownAge = (ageMeasurement !== null && ageYears > 0) || Boolean(record.tanggalLahir);
  const isPediatric = hasKnownAge && ageYears >= 0 && ageYears <= 10;
  const gcsEye = readNumericMeasurement(vitalSign.gcs?.eye);
  const gcsVerbal = readNumericMeasurement(vitalSign.gcs?.verbal);
  const gcsMotor = readNumericMeasurement(vitalSign.gcs?.motor);
  const hasCompleteGcs = gcsEye !== null && gcsVerbal !== null && gcsMotor !== null;
  const gcsTotal = (gcsEye ?? 4) + (gcsVerbal ?? 5) + (gcsMotor ?? 6);
  const hasRecordedAvpu = typeof vitalSign.avpu === "string" && vitalSign.avpu.length > 0;
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

  if (!hasKnownAge) {
    warnings.push("Data klinis belum lengkap: usia/tanggal lahir belum tercatat; rentang fisiologis pediatrik tidak dapat diterapkan.");
  }

  if (isPediatric) {
    const range = getPediatricVitalRange(ageYears);
    if ((hasRecordedAvpu && avpu === "Unresponsive") || (hasCompleteGcs && gcsTotal <= 8)) addRule(1, `Anak tidak sadar atau GCS ${gcsTotal}.`);
    if (vitalSign.apnea || (rrMeasurement !== null && rr === 0)) addRule(1, "Gagal napas atau henti napas pada pasien anak.");

    const hasPediatricArrest = hrMeasurement !== null && hr === 0;
    const hasPediatricShock = hasPoorPerfusion && sbp > 0 && sbp < 80;
    if (hasPediatricArrest || hasPediatricShock) {
      const reasons: string[] = [];
      if (hasPediatricArrest) reasons.push("henti jantung (nadi tidak teraba)");
      if (hasPediatricShock) reasons.push(`syok dengan tanda perfusi buruk/sianosis (SBP ${sbp})`);
      addRule(1, `${reasons.join(" dan ")} pada pasien anak.`);
    }

    if (isOutsideRange(rr, range.rr2)) addRule(2, `RR ${rr} di luar rentang +/- 2 SD usia anak.`);
    else if (isOutsideRange(rr, range.rr1)) addRule(3, `RR ${rr} di luar rentang +/- 1 SD usia anak.`);
    else if (isWithinRange(rr, range.rrNormal)) addRule(4, "Laju napas normal sesuai usia anak.");
    if (isOutsideRange(hr, range.hr2)) addRule(2, `HR ${hr} di luar rentang +/- 2 SD usia anak.`);
    else if (isOutsideRange(hr, range.hr1)) addRule(3, `HR ${hr} di luar rentang +/- 1 SD usia anak.`);
    else if (isWithinRange(hr, range.hrNormal)) addRule(4, "Laju nadi normal sesuai usia anak.");
    if ((hasRecordedAvpu && (avpu === "Pain" || avpu === "Verbal")) || (hasCompleteGcs && gcsTotal >= 9 && gcsTotal <= 12)) addRule(2, `Penurunan kesadaran/lethargis pada pasien anak (AVPU ${avpu}, GCS ${gcsTotal}).`);
    else if (hasCompleteGcs && gcsTotal >= 13 && gcsTotal < 15) addRule(3, `Perubahan perilaku atau GCS ${gcsTotal} pada pasien anak.`);
    else if ((hasCompleteGcs && gcsTotal === 15) || (hasRecordedAvpu && avpu === "Alert")) addRule(4, "Kesadaran baik: AVPU Alert dan/atau GCS 15.");
    if (vitalSign.stridor || exam.leher?.stridor) addRule(2, "Stridor terdeteksi pada pasien anak.");
    else if (hasRespiratoryDistress) addRule(2, "Distress napas (retraksi/otot bantu napas) pada pasien anak.");

    const pediatricPhysiologicalInstability = hasRespiratoryDistress
      || hasPoorPerfusion
      || (hasCompleteGcs && gcsTotal < 15)
      || isOutsideRange(rr, range.rr2)
      || isOutsideRange(hr, range.hr2)
      || (spo2Measurement !== null && spo2 > 0 && spo2 < 90);
    const hasPediatricKeywordEmergency = hasAnyText("nyeri dada", "keracunan", "racun", "obat risiko tinggi");
    const hasPediatricSepsis = hasAnyText("sepsis");
    if (hasSevereBleeding || hasPediatricKeywordEmergency || painScore >= 7) {
      const reasons: string[] = [];
      if (hasSevereBleeding) reasons.push("perdarahan aktif/berat");
      if (hasPediatricKeywordEmergency) reasons.push("gejala emergensi spesifik");
      if (painScore >= 7) reasons.push(`nyeri berat ${painScore}/10`);
      addRule(2, `Kondisi emergensi pasien anak: ${reasons.join(", ")}.`);
    } else if (hasPediatricSepsis) {
      addRule(
        pediatricPhysiologicalInstability ? 2 : 3,
        pediatricPhysiologicalInstability ? "Dugaan sepsis anak dengan ketidakstabilan fisiologis." : "Dugaan sepsis anak dengan tanda vital relatif stabil.",
      );
    } else if (hasAnyText("demam") && hasAnyText("imunosupresi")) {
      addRule(2, "Demam pada anak dengan imunosupresi; perlu evaluasi segera untuk neutropenia febril.");
    } else if (painScore >= 4 || hasAnyText("muntah", "diare", "nyeri perut") || hasTrauma) {
      addRule(3, "Gejala gawat pasien anak: nyeri sedang, gejala gastrointestinal persisten, atau trauma.");
    } else if (painScore >= 1 || hasAnyText("luka kecil", "kontrol", "imunisasi", "psikiatri kronis")) {
      addRule(5, "Keluhan ringan/tidak gawat pada pasien anak.");
    }
  } else {
    if ((hasRecordedAvpu && avpu === "Unresponsive") || (hasCompleteGcs && gcsTotal < 9)) addRule(1, `Kesadaran kategori resusitasi: AVPU ${avpu}, GCS ${gcsTotal}.`);
    else if ((hasRecordedAvpu && (avpu === "Pain" || avpu === "Verbal")) || (hasCompleteGcs && gcsTotal >= 9 && gcsTotal <= 12)) addRule(2, `Penurunan kesadaran kategori emergensi: AVPU ${avpu}, GCS ${gcsTotal}.`);
    else if (hasCompleteGcs && gcsTotal > 12 && gcsTotal < 15) addRule(3, `GCS ${gcsTotal} dengan perubahan kesadaran ringan/somnolen.`);
    else if ((hasCompleteGcs && gcsTotal === 15) || (hasRecordedAvpu && avpu === "Alert")) addRule(4, "Kesadaran baik: AVPU Alert dan/atau GCS 15.");

    const hasApnea = Boolean(vitalSign.apnea) || (rrMeasurement !== null && rr === 0);
    const hasLowRr = rr > 0 && rr < 10;
    if (hasApnea || hasLowRr) {
      const reasons: string[] = [];
      if (hasApnea) reasons.push("apnea/henti napas");
      if (hasLowRr) reasons.push(`RR ${rr} kurang dari 10 x/menit`);
      addRule(1, `${reasons.join(" atau ")}.`);
    } else if (hasRespiratoryDistress || vitalSign.stridor || exam.leher?.stridor || (spo2Measurement !== null && spo2 > 0 && spo2 < 90)) {
      const reasons = [
        ...(hasRespiratoryDistress || vitalSign.stridor || exam.leher?.stridor ? ["distress pernapasan atau risiko jalan napas"] : []),
        ...(spo2Measurement !== null && spo2 > 0 && spo2 < 90 ? [`hipoksemia dengan SpO2 ${spo2}%`] : []),
      ];
      addRule(2, `${reasons.join(" dan ")}.`);
    } else {
      const hasSesakKeyword = hasAnyText("sesak");
      const hasBorderlineSpo2 = spo2 >= 90 && spo2 <= 95;
      if (hasSesakKeyword || hasBorderlineSpo2) {
        const reasons: string[] = [];
        if (hasSesakKeyword) reasons.push("keluhan sesak napas");
        if (hasBorderlineSpo2) reasons.push(`SpO2 ${spo2}% pada rentang 90-95%`);
        addRule(3, `${reasons.join(" dan ")}.`);
      }
    }

    const hasCardiacArrest = hrMeasurement !== null && hr === 0;
    const hasProfoundShock = hasPoorPerfusion && sbp > 0 && sbp < 80;
    if (hasCardiacArrest || hasProfoundShock) {
      const reasons: string[] = [];
      if (hasCardiacArrest) reasons.push("henti jantung (nadi tidak teraba)");
      if (hasProfoundShock) reasons.push(`syok berat dengan perfusi buruk (SBP ${sbp})`);
      addRule(1, `${reasons.join(" dan ")}.`);
    } else {
      const hasBradycardia = hr > 0 && hr < 50;
      const hasCriticalTachycardia = hr > 150;
      if (hasBradycardia || hasCriticalTachycardia || hasPoorPerfusion || hasSevereBleeding) {
        const reasons: string[] = [];
        if (hasBradycardia) reasons.push(`bradikardia (HR ${hr})`);
        if (hasCriticalTachycardia) reasons.push(`takikardia berat (HR ${hr})`);
        if (hasPoorPerfusion) reasons.push("tanda perfusi buruk");
        if (hasSevereBleeding) reasons.push("perdarahan aktif/berat");
        addRule(2, `${reasons.join(" dan/atau ")}.`);
      } else {
        const hasTachycardia = hr > 120 && hr <= 150;
        const hasHighBp = sbp > 180 || dbp > 120;
        if (hasTachycardia || hasHighBp) {
          const reasons: string[] = [];
          if (hasTachycardia) reasons.push(`takikardia (HR ${hr})`);
          if (hasHighBp) reasons.push(`hipertensi berat (TD ${sbp}/${dbp})`);
          addRule(3, `Gangguan sirkulasi: ${reasons.join(", ")}.`);
        } else if ((hr >= 50 && hr <= 120) && (sbp >= 100 && sbp <= 120) && (dbp >= 70 && dbp <= 90)) {
          addRule(4, "Frekuensi nadi dan tekanan darah dalam rentang stabil tabel dewasa.");
        }
      }
    }

    const hasKeywordEmergency = hasAnyText("nyeri dada", "keracunan", "racun", "obat risiko tinggi");
    const hasSuspectedSepsis = hasAnyText("sepsis");
    const hasPhysiologicalInstability = hasRespiratoryDistress
      || hasPoorPerfusion
      || (hasCompleteGcs && gcsTotal < 15)
      || (rrMeasurement !== null && (rr < 10 || rr > 30))
      || (hrMeasurement !== null && (hr < 50 || hr > 150))
      || (sbpMeasurement !== null && sbp > 0 && sbp < 90)
      || (spo2Measurement !== null && spo2 > 0 && spo2 < 90);
    const hasSeverePain = painScore >= 7;
    if (hasKeywordEmergency || hasSeverePain) {
      const reasons: string[] = [];
      if (hasKeywordEmergency) reasons.push("gejala emergensi spesifik (nyeri dada/keracunan/obat risiko tinggi)");
      if (hasSeverePain) reasons.push(`nyeri berat ${painScore}/10`);
      addRule(2, `Gejala spesifik emergensi: ${reasons.join(", ")}.`);
    } else if (hasSuspectedSepsis) {
      addRule(
        hasPhysiologicalInstability ? 2 : 3,
        hasPhysiologicalInstability ? "Dugaan sepsis dengan ketidakstabilan fisiologis." : "Dugaan sepsis dengan tanda vital relatif stabil.",
      );
    } else if (hasAnyText("demam") && hasAnyText("imunosupresi")) {
      addRule(2, "Demam pada pasien imunosupresi; perlu evaluasi segera untuk neutropenia febril.");
    } else {
      const hasModeratePain = painScore >= 4;
      const hasGiSymptom = hasAnyText("muntah", "diare", "nyeri perut");
      if (hasModeratePain || hasGiSymptom || hasTrauma) {
        const reasons: string[] = [];
        if (hasModeratePain) reasons.push(`nyeri sedang ${painScore}/10`);
        if (hasGiSymptom) reasons.push("muntah/diare/nyeri perut");
        if (hasTrauma) reasons.push("trauma");
        addRule(3, `Gejala gawat kategori 30 menit: ${reasons.join(", ")}.`);
      } else if (painScore >= 1 || hasAnyText("luka kecil", "kontrol", "imunisasi", "psikiatri kronis")) {
        addRule(5, "Keluhan ringan/tidak gawat sesuai kategori 120 menit.");
      }
    }
  }

  if (!overrideLevel) addRule(5, "Tidak ditemukan red flag fisiologis atau gejala spesifik pada rule guard rail.");
  return { overrideLevel, warnings, emergency: Boolean(overrideLevel && overrideLevel <= 3) };
}
