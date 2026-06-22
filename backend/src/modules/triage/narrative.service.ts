export function parseNarrativeHeuristic(narrative: string) {
  const text = narrative.toLowerCase();
  const result: any = {
    nomorRM: "RM-99001",
    namaPasien: "Pasien Baru",
    umur: 30,
    gender: "Laki-laki",
    caraDatang: "Jalan sendiri",
    riwayatPenyakit: [],
    riwayatPenyakitLainnya: "",
    chiefComplaint: "Lain-lain",
    chiefComplaintCustom: narrative.length > 150 ? `${narrative.slice(0, 147)}...` : narrative,
    gejalaTambahan: [],
    vitalSign: {
      tekananDarahSistolik: 120,
      tekananDarahDiastolik: 80,
      heartRate: 80,
      respiratoryRate: 18,
      suhuTubuh: 36.5,
      saturasiOksigen: 98,
      gcs: { eye: 4, verbal: 5, motor: 6 },
      polaNapas: "reguler",
      ototBantuNapas: false,
      retraksi: false,
      stridor: false,
      wheezing: false,
      apnea: false,
      takipnea: false,
      bradipnea: false,
      avpu: "Alert",
    },
    painScale: { skala: 0, kategori: "tidak nyeri", lokasi: "Tidak ada", menjalar: false },
    pemeriksaanFisik: {
      kepala: { perdarahan: false, deformitas: false, pupilAnisokor: false, pupilIsokor: true, traumaKepala: false, kejang: false, sianosis: false, penurunanKesadaran: false },
      leher: { deviasiTrakea: false, distensiVenaJugularis: false, kakuKuduk: false, traumaLeher: false, pembesaranKelenjar: false, stridor: false },
      dada: { retraksi: false, wheezing: false, ronki: false, suaraNapasMenurun: false, nyeriDada: false, penggunaanOtotBantuNapas: false, asimetriDindingDada: false, distressRespirasi: false },
      perut: { distensiAbdomen: false, nyeriTekan: false, defenseMuscular: false, muntah: false, perdarahan: false, ascites: false, nyeriKuadranKananBawah: false, rigidAbdomen: false },
      ekstremitasAtas: { kelemahanMotorik: false, deformitas: false, edema: false, sianosis: false, tremor: false, perfusiBuruk: false, perdarahanAktif: false },
      ekstremitasBawah: { edema: false, deformitas: false, kelemahanMotorik: false, sianosis: false, perfusiBuruk: false, trauma: false, perdarahanAktif: false },
    },
  };

  const ageMatch = text.match(/(\d{1,3})\s*(tahun|th|yo|y\/o)/);
  if (ageMatch) result.umur = parseInt(ageMatch[1], 10);
  if (text.includes("wanita") || text.includes("perempuan") || text.includes("ibu") || text.includes("ny.")) result.gender = "Perempuan";
  if (text.includes("ambulans")) result.caraDatang = "Ambulans";
  else if (text.includes("stretcher")) result.caraDatang = "Stretcher";
  else if (text.includes("kursi roda")) result.caraDatang = "Kursi roda";

  const rmMatch = text.match(/(rm|no_rm|rekam medis|nomor rm)\s*[:-]?\s*([a-zA-Z\d-]+)/);
  if (rmMatch) result.nomorRM = rmMatch[2].toUpperCase().trim();
  const bpMatch = text.match(/(\d{2,3})\s*\/\s*(\d{2,3})/);
  if (bpMatch) {
    result.vitalSign.tekananDarahSistolik = parseInt(bpMatch[1], 10);
    result.vitalSign.tekananDarahDiastolik = parseInt(bpMatch[2], 10);
  }
  const hrMatch = text.match(/(hr|nadi|pulse|heart rate)\s*[:-]?\s*(\d+)/) || text.match(/nadi\s+(\d+)/);
  if (hrMatch) result.vitalSign.heartRate = parseInt(hrMatch[2] || hrMatch[1], 10);
  const rrMatch = text.match(/(rr|napas|nafas|respiratory)\s*[:-]?\s*(\d+)/) || text.match(/nafas\s+(\d+)/);
  if (rrMatch) result.vitalSign.respiratoryRate = parseInt(rrMatch[2] || rrMatch[1], 10);
  const spo2Match = text.match(/(spo2|saturasi|oxygen|oksigen)\s*[:-]?\s*(\d+)/);
  if (spo2Match) result.vitalSign.saturasiOksigen = parseInt(spo2Match[2] || spo2Match[1], 10);

  if (text.includes("sesak")) result.chiefComplaint = "Sesak napas";
  else if (text.includes("nyeri dada")) result.chiefComplaint = "Nyeri dada";
  else if (text.includes("trauma") || text.includes("kecelakaan")) result.chiefComplaint = "Trauma";
  else if (text.includes("demam")) result.chiefComplaint = "Demam";
  else if (text.includes("pingsan") || text.includes("penurunan kesadaran")) result.chiefComplaint = "Penurunan kesadaran";

  if (text.includes("sianosis")) result.gejalaTambahan.push("Sianosis");
  if (text.includes("perdarahan")) result.gejalaTambahan.push("Perdarahan aktif");
  if (text.includes("distress")) result.gejalaTambahan.push("Distress pernapasan");
  if (text.includes("nyeri menjalar")) result.gejalaTambahan.push("Nyeri menjalar");

  return result;
}
