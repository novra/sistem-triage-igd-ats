import assert from "node:assert/strict";
import test from "node:test";
import { classifyByRules } from "./atsRuleEngine";

function adultRecord(overrides: Record<string, unknown> = {}) {
  return {
    umur: 40,
    chiefComplaint: "kontrol",
    vitalSign: {
      respiratoryRate: 18,
      heartRate: 80,
      saturasiOksigen: 98,
      tekananDarahSistolik: 120,
      tekananDarahDiastolik: 80,
      gcs: { eye: 4, verbal: 5, motor: 6 },
      avpu: "Alert",
    },
    painScale: { skala: 0 },
    ...overrides,
  };
}

test("data vital yang tidak dikirim tidak dianggap henti napas atau henti jantung", () => {
  const result = classifyByRules({ chiefComplaint: "kontrol" });
  assert.equal(result.overrideLevel, 5);
  assert.equal(result.emergency, false);
  assert.doesNotMatch(result.warnings.join(" "), /henti napas|henti jantung/i);
  assert.match(result.warnings.join(" "), /usia\/tanggal lahir belum tercatat/i);
});

test("apnea eksplisit dengan RR nol tetap menjadi ATS 1", () => {
  const result = classifyByRules(adultRecord({
    vitalSign: { respiratoryRate: 0, heartRate: 80, apnea: true, gcs: { eye: 4, verbal: 5, motor: 6 } },
  }));
  assert.equal(result.overrideLevel, 1);
});

test("syok berat dewasa dengan SBP di bawah 80 menjadi ATS 1", () => {
  const result = classifyByRules(adultRecord({
    vitalSign: { respiratoryRate: 18, heartRate: 110, tekananDarahSistolik: 75, gcs: { eye: 4, verbal: 5, motor: 6 } },
    pemeriksaanFisik: { ekstremitasAtas: { perfusiBuruk: true } },
  }));
  assert.equal(result.overrideLevel, 1);
});

test("hipotensi dengan perfusi buruk tetapi SBP 80-89 menjadi ATS 2", () => {
  const result = classifyByRules(adultRecord({
    vitalSign: { respiratoryRate: 18, heartRate: 110, tekananDarahSistolik: 85, gcs: { eye: 4, verbal: 5, motor: 6 } },
    pemeriksaanFisik: { ekstremitasAtas: { perfusiBuruk: true } },
  }));
  assert.equal(result.overrideLevel, 2);
});

test("HR dewasa di atas 150 menjadi ATS 2", () => {
  const result = classifyByRules(adultRecord({
    vitalSign: { respiratoryRate: 20, heartRate: 160, tekananDarahSistolik: 110, gcs: { eye: 4, verbal: 5, motor: 6 } },
  }));
  assert.equal(result.overrideLevel, 2);
});

test("SpO2 terukur di bawah 90 persen menjadi ATS 2", () => {
  const result = classifyByRules(adultRecord({
    vitalSign: { respiratoryRate: 22, heartRate: 100, saturasiOksigen: 88, gcs: { eye: 4, verbal: 5, motor: 6 } },
  }));
  assert.equal(result.overrideLevel, 2);
});

test("perdarahan aktif berat menjadi ATS 2 walaupun bukan trauma", () => {
  const result = classifyByRules(adultRecord({
    pemeriksaanFisik: { perut: { perdarahan: true } },
  }));
  assert.equal(result.overrideLevel, 2);
});

test("dugaan sepsis stabil menjadi ATS 3 dan sepsis tidak stabil menjadi ATS 2", () => {
  const stable = classifyByRules(adultRecord({ chiefComplaint: "dugaan sepsis" }));
  const unstable = classifyByRules(adultRecord({
    chiefComplaint: "dugaan sepsis",
    vitalSign: { respiratoryRate: 34, heartRate: 160, saturasiOksigen: 88, tekananDarahSistolik: 85, gcs: { eye: 4, verbal: 4, motor: 6 } },
  }));
  assert.equal(stable.overrideLevel, 3);
  assert.equal(unstable.overrideLevel, 2);
});

test("distress napas pada pasien anak menjadi ATS 2", () => {
  const result = classifyByRules({
    umur: 5,
    chiefComplaint: "sesak berat",
    vitalSign: { respiratoryRate: 28, heartRate: 110, saturasiOksigen: 92, gcs: { eye: 4, verbal: 5, motor: 6 }, avpu: "Alert" },
  });
  assert.equal(result.overrideLevel, 2);
});

test("bayi berumur nol dengan tanggal lahir tetap memakai jalur pediatrik", () => {
  const result = classifyByRules({
    umur: 0,
    tanggalLahir: "2026-07-01",
    vitalSign: { respiratoryRate: 81, heartRate: 150, gcs: { eye: 4, verbal: 5, motor: 6 }, avpu: "Alert" },
  });
  assert.equal(result.overrideLevel, 2);
  assert.match(result.warnings.join(" "), /usia anak/i);
});

test("keracunan dan perdarahan aktif pada anak tidak melewati guard rail", () => {
  const poisoning = classifyByRules({
    umur: 5,
    chiefComplaint: "dugaan keracunan obat",
    vitalSign: { respiratoryRate: 20, heartRate: 90, gcs: { eye: 4, verbal: 5, motor: 6 }, avpu: "Alert" },
  });
  const bleeding = classifyByRules({
    umur: 5,
    chiefComplaint: "perdarahan",
    vitalSign: { respiratoryRate: 20, heartRate: 90, gcs: { eye: 4, verbal: 5, motor: 6 }, avpu: "Alert" },
    pemeriksaanFisik: { perut: { perdarahan: true } },
  });
  assert.equal(poisoning.overrideLevel, 2);
  assert.equal(bleeding.overrideLevel, 2);
});

test("fitur paling mendesak selalu menentukan kategori akhir", () => {
  const result = classifyByRules(adultRecord({
    painScale: { skala: 9 },
    vitalSign: { respiratoryRate: 0, heartRate: 0, apnea: true, gcs: { eye: 1, verbal: 1, motor: 1 }, avpu: "Unresponsive" },
  }));
  assert.equal(result.overrideLevel, 1);
  assert.equal(result.emergency, true);
});

test("dewasa dengan GCS 15/AVPU Alert dan tanda vital normal tidak lagi menghasilkan ATS 4", () => {
  const result = classifyByRules(adultRecord());
  assert.equal(result.overrideLevel, 5);
  assert.doesNotMatch(result.warnings.join(" "), /ATS 4/);
});

test("nyeri sedang (4-6/10) sendirian tidak lagi memicu ATS 3 pada dewasa", () => {
  const result = classifyByRules(adultRecord({ painScale: { skala: 5 } }));
  assert.equal(result.overrideLevel, 5);
  assert.doesNotMatch(result.warnings.join(" "), /ATS 3/);
});

test("nyeri berat (>=7/10) tanpa gejala lain tetap memicu ATS 2 pada dewasa", () => {
  const result = classifyByRules(adultRecord({ painScale: { skala: 8 } }));
  assert.equal(result.overrideLevel, 2);
});

test("keluhan ringan seperti luka kecil tidak lagi memicu rule ATS 5 tersendiri pada dewasa", () => {
  const result = classifyByRules(adultRecord({ chiefComplaint: "luka kecil" }));
  assert.equal(result.overrideLevel, 5);
  assert.match(result.warnings.join(" "), /tidak ditemukan red flag/i);
});

test("anak dengan GCS 15/AVPU Alert dan tanda vital normal usia tidak lagi menghasilkan ATS 4", () => {
  const result = classifyByRules({
    umur: 5,
    chiefComplaint: "kontrol",
    vitalSign: { respiratoryRate: 20, heartRate: 90, saturasiOksigen: 98, gcs: { eye: 4, verbal: 5, motor: 6 }, avpu: "Alert" },
  });
  assert.equal(result.overrideLevel, 5);
  assert.doesNotMatch(result.warnings.join(" "), /ATS 4/);
});

test("skala nyeri (VAS) pada anak tidak lagi dipakai sebagai kriteria ATS, termasuk nyeri berat", () => {
  const result = classifyByRules({
    umur: 5,
    chiefComplaint: "kontrol",
    vitalSign: { respiratoryRate: 20, heartRate: 90, saturasiOksigen: 98, gcs: { eye: 4, verbal: 5, motor: 6 }, avpu: "Alert" },
    painScale: { skala: 9 },
  });
  assert.equal(result.overrideLevel, 5);
});
