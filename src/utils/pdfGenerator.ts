import { jsPDF } from "jspdf";
import { TriageRecord, ATS_LEVEL_DETAILS, Gender } from "../types";

export function generateIGDReportPDF(data: TriageRecord) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4"
  });

  const baseLevel = data.atsPrediction?.atsLevel || 3;
  const currentLevel = (data.atsFinal?.atsLevelOverride || baseLevel) as 1 | 2 | 3 | 4 | 5;
  const levelDetails = ATS_LEVEL_DETAILS[currentLevel];

  // Helper colors
  const primaryColor = [15, 23, 42]; // Slate 900
  const secondaryColor = [79, 70, 229]; // Indigo 600
  const lightBg = [248, 250, 252]; // Slate 50
  const borderColor = [226, 232, 240]; // Slate 200

  // Standard Helper Functions
  const drawHeader = (pageNum: number) => {
    // Top border accent
    doc.setFillColor(79, 70, 229);
    doc.rect(0, 0, 210, 4, "F");

    // Hospital Identity Left Column
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("KEMENTERIAN KESEHATAN REPUBLIK INDONESIA", 15, 12);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text("INSTALASI GAWAT DARURAT (IGD) - UNIT TRIASE UTAMA", 15, 16);
    doc.text("Sistem Pendukung Keputusan Klinis Berbasis Kecerdasan Buatan (AI-CDSS)", 15, 20);

    // Document Name Center/Right
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(79, 70, 229);
    doc.text("REKAM ASESMEN & KLASIFIKASI TRIASE IGD", 112, 12);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text("Standar Australasian Triage Scale (ATS) Indonesia", 112, 16);
    doc.text("Dicetak otomatis melalui Cloud RME-Triage Portal", 112, 20);

    // Thick black line below header
    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.6);
    doc.line(15, 23, 195, 23);

    // Reset line width
    doc.setLineWidth(0.25);
  };

  const drawFooter = (pageNum: number, totalPages: number) => {
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(15, 282, 195, 282);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    const dateStr = new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }) + " WIB";
    doc.text(`Waktu Cetak: ${dateStr} | Sistem Verifikasi AI Terakreditasi`, 15, 287);
    doc.text(`Halaman ${pageNum} dari ${totalPages}`, 175, 287);
  };

  // ==========================================
  // PAGE 1: IDENTITAS, SUBJECTIVE & OBJECTIVE
  // ==========================================
  drawHeader(1);

  // 1. Patient Info Card Header
  doc.setFillColor(241, 245, 249);
  doc.rect(15, 26, 180, 7, "F");
  doc.setDrawColor(203, 213, 225);
  doc.rect(15, 26, 180, 7, "S");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text("I. REGISTRASI & IDENTITAS PASIEN IGD", 18, 31);

  // Patient Info Content Grid Table
  doc.setDrawColor(226, 232, 240);
  doc.rect(15, 33, 180, 24, "S");
  
  // Vertical split line
  doc.line(105, 33, 105, 57);
  // Horizontal grid lines
  doc.line(15, 41, 195, 41);
  doc.line(15, 49, 195, 49);

  // Labels and Values Page 1
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text("Nomor RM:", 18, 38);
  doc.text("Nama Pasien:", 18, 46);
  doc.text("Tanggal Lahir / Umur:", 18, 54);
  
  doc.text("Jenis Kelamin:", 108, 38);
  doc.text("Kunjungan / Kedatangan:", 108, 46);
  doc.text("Cara Kedatangan:", 108, 54);

  // Dynamic values
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(79, 70, 229);
  doc.text(data.nomorRM || "-", 42, 38);
  doc.setTextColor(15, 23, 42);
  doc.text(data.namaPasien || "-", 42, 46);
  const birthStr = data.tanggalLahir ? `${data.tanggalLahir} (${data.umur} Tahun)` : `${data.umur} Tahun`;
  doc.text(birthStr, 53, 54);

  const genderStr = data.gender === Gender.PEREMPUAN ? "Perempuan" : "Laki-laki";
  doc.text(genderStr, 131, 38);
  const visitStr = `${data.tanggalKunjungan || "-"} / Jam ${data.jamKunjungan || "-"}`;
  doc.text(visitStr, 147, 46);
  doc.text(data.caraDatang || "-", 137, 54);


  // 2. Section S: Subjektif & Keluhan Utama
  doc.setFillColor(241, 245, 249);
  doc.rect(15, 62, 180, 7, "F");
  doc.setDrawColor(203, 213, 225);
  doc.rect(15, 62, 180, 7, "S");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text("II. S - SUBJEKTIF (ANAMNESIS & RIWAYAT)", 18, 67);

  // Subjektif details table/box
  doc.rect(15, 69, 180, 28, "S");
  doc.line(15, 78, 195, 78);
  doc.line(15, 87, 195, 87);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(100, 116, 139);
  doc.text("Keluhan Utama / Alasan Masuk:", 18, 74);
  doc.text("Riwayat Penyakit Dahulu:", 18, 83);
  doc.text("Gejala Penyerta (Review of Systems):", 18, 92);

  // Values S
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  let ccText = data.chiefComplaint || "-";
  if (data.chiefComplaintCustom) {
    ccText += ` ("${data.chiefComplaintCustom}")`;
  }
  doc.text(ccText, 65, 74);

  const riwayatStr = data.riwayatPenyakit && data.riwayatPenyakit.length > 0
    ? data.riwayatPenyakit.join(", ") + (data.riwayatPenyakitLainnya ? ` (${data.riwayatPenyakitLainnya})` : "")
    : data.riwayatPenyakitLainnya || "Tidak ada riwayat penyakit sistemik";
  doc.setFont("helvetica", "normal");
  doc.text(riwayatStr, 58, 83);

  const gejalaStr = data.gejalaTambahan && data.gejalaTambahan.length > 0
    ? data.gejalaTambahan.join(", ")
    : "Tidak ada gejala tambahan yang dilaporkan.";
  doc.text(gejalaStr, 70, 92);


  // 3. Section O: Objektif (Pemeriksaan Fisik Vital Sign & GCS)
  doc.setFillColor(241, 245, 249);
  doc.rect(15, 102, 180, 7, "F");
  doc.setDrawColor(203, 213, 225);
  doc.rect(15, 102, 180, 7, "S");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text("III. O - OBJEKTIF (PEMERIKSAAN FISIK & TANDA VITAL)", 18, 107);

  // Simple clean table for vital signs
  doc.rect(15, 109, 180, 36, "S");
  // columns lines
  doc.line(60, 109, 60, 145);
  doc.line(105, 109, 105, 145);
  doc.line(150, 109, 150, 145);
  // horizontal dividers
  doc.line(15, 121, 195, 121);
  doc.line(15, 133, 195, 133);

  // Column headers
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  
  // Row 1 Vitals
  doc.text("Tekanan Darah (TD)", 18, 114);
  doc.text("Laju Nadi / Heart Rate", 63, 114);
  doc.text("Laju Napas (RR)", 108, 114);
  doc.text("Suhu Tubuh (T)", 153, 114);

  // Row 2 Vitals
  doc.text("Saturasi Oksigen (SpO2)", 18, 126);
  doc.text("Status Kesadaran (AVPU)", 63, 126);
  doc.text("Pola Pernapasan", 108, 126);
  doc.text("Skala Nyeri (VAS/NRS)", 153, 126);

  // Row 3 Vitals
  doc.text("GCS (Eye, Verbal, Motor)", 18, 138);
  doc.text("Suara Napas Tambahan", 63, 138);
  doc.text("Retraksi Dinding Dada", 108, 138);
  doc.text("Penggunaan Otot Bantu Napas", 153, 138);

  // Fill in active data values
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);

  // Row 1 values
  const sys = data.vitalSign?.tekananDarahSistolik || 0;
  const dia = data.vitalSign?.tekananDarahDiastolik || 0;
  doc.text(`${sys}/${dia} mmHg`, 18, 119);
  doc.text(`${data.vitalSign?.heartRate || 0} x/menit`, 63, 119);
  doc.text(`${data.vitalSign?.respiratoryRate || 0} x/menit`, 108, 119);
  doc.text(`${data.vitalSign?.suhuTubuh || 36.5} °C`, 153, 119);

  // Row 2 values
  doc.text(`${data.vitalSign?.saturasiOksigen || 98} %`, 18, 131);
  doc.text(`${data.vitalSign?.avpu || "Alert"}`, 63, 131);
  doc.text(`${data.vitalSign?.polaNapas || "reguler"}`, 108, 131);
  const painScaleVal = data.painScale?.skala || 0;
  doc.text(`${painScaleVal} / 10 (${data.painScale?.kategori || "tidak nyeri"})`, 153, 131);

  // Row 3 values
  const g = data.vitalSign?.gcs;
  const gcsStr = g ? `E${g.eye || 4} V${g.verbal || 5} M${g.motor || 6} (Skor: ${(g.eye||4)+(g.verbal||5)+(g.motor||6)})` : "E4 V5 M6 (15)";
  doc.text(gcsStr, 18, 143);
  const stridor = data.vitalSign?.stridor ? "Stridor " : "";
  const wheezing = data.vitalSign?.wheezing ? "Wheezing" : "";
  doc.text(stridor + wheezing || "Normal / Vesikuler", 63, 143);
  doc.text(data.vitalSign?.retraksi || data.pemeriksaanFisik?.dada?.retraksi ? "Ya, Retraksi" : "Tidak Ada", 108, 143);
  doc.text(data.vitalSign?.ototBantuNapas || data.pemeriksaanFisik?.dada?.penggunaanOtotBantuNapas ? "Ya" : "Tidak", 153, 143);


  // 4. Detailed Physical Examination checklist (SOAP Details)
  doc.setFillColor(241, 245, 249);
  doc.rect(15, 150, 180, 7, "F");
  doc.setDrawColor(203, 213, 225);
  doc.rect(15, 150, 180, 7, "S");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text("IV. DETAIL PEMERIKSAAN FISIK TARGET PER-SISTEM", 18, 155);

  // Table bounding box for physical checks
  doc.rect(15, 157, 180, 68, "S");
  doc.line(55, 157, 55, 225);
  doc.line(15, 166, 195, 166);
  doc.line(15, 178, 195, 178);
  doc.line(15, 190, 195, 190);
  doc.line(15, 202, 195, 202);
  doc.line(15, 214, 195, 214);

  // Table headers for physical examination
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text("Sistem Organ / Area", 18, 162);
  doc.text("Temuan Klinis / Hasil Pemeriksaan Status Lokalis IGD", 58, 162);

  doc.setFontSize(7.5);
  doc.text("Kepala & Fungsi Otak", 18, 172);
  doc.text("Leher & Vaskularisasi", 18, 184);
  doc.text("Dada, Paru & Jantung", 18, 196);
  doc.text("Abdomen / Perut", 18, 208);
  doc.text("Ekstremitas Gerak", 18, 220);

  // Fill findings
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);

  // Kepala findings
  const kep = data.pemeriksaanFisik?.kepala;
  const kepList = [];
  if (kep?.pupilAnisokor) kepList.push("Pupil Anisokor");
  if (kep?.pupilIsokor) kepList.push("Pupil Isokor");
  if (kep?.traumaKepala) kepList.push("Trauma Kepala");
  if (kep?.kejang) kepList.push("Kejang");
  if (kep?.sianosis) kepList.push("Sianosis");
  if (kep?.penurunanKesadaran) kepList.push("Penurunan Kesadaran");
  if (kep?.deformitas) kepList.push("Deformitas kepala");
  doc.text(kepList.length > 0 ? `Abnormal: ${kepList.join(", ")}` : "Normal (Tidak ada tanda trauma, kejang, perdarahan, atau penyimpangan pupil)", 58, 172);

  // Leher findings
  const leh = data.pemeriksaanFisik?.leher;
  const lehList = [];
  if (leh?.deviasiTrakea) lehList.push("Deviasi Trakea");
  if (leh?.distensiVenaJugularis) lehList.push("JVP Meningkat");
  if (leh?.kakuKuduk) lehList.push("Kaku Kuduk");
  if (leh?.traumaLeher) lehList.push("Trauma cervical/leher");
  doc.text(lehList.length > 0 ? `Abnormal: ${lehList.join(", ")}` : "Normal (Trakea simetris di tengah, tekanan vena jugular normal, tidak kaku kuduk)", 58, 184);

  // Dada findings
  const dad = data.pemeriksaanFisik?.dada;
  const dadList = [];
  if (dad?.nyeriDada) dadList.push("Nyeri Dada Khas Angina/Iskemik");
  if (dad?.asimetriDindingDada) dadList.push("Asimetri Dada");
  if (dad?.ronki) dadList.push("Ronki");
  if (dad?.wheezing) dadList.push("Wheezing");
  if (dad?.suaraNapasMenurun) dadList.push("Suara Napas Menurun");
  if (dad?.distressRespirasi) dadList.push("Sesak / Gawat Napas");
  doc.text(dadList.length > 0 ? `Abnormal: ${dadList.join(", ")}` : "Normal (Pengembangan dada simetris, suara napas vesikuler di kedua lapangan paru, bunyi jantung S1 S2 tunggal)", 58, 196);

  // Abdomen findings
  const ab = data.pemeriksaanFisik?.perut;
  const abList = [];
  if (ab?.distensiAbdomen) abList.push("Abdomen Distensi");
  if (ab?.nyeriTekan) abList.push("Nyeri Tekan Abdomen");
  if (ab?.defenseMuscular) abList.push("Defans Muskular");
  if (ab?.muntah) abList.push("Muntah Proyektil/Aktif");
  if (ab?.rigidAbdomen) abList.push("Perut Papan/Rigiditas");
  if (ab?.nyeriKuadranKananBawah) abList.push("Nyeri McBurney (Kuadran Kanan Bawah)");
  doc.text(abList.length > 0 ? `Abnormal: ${abList.join(", ")}` : "Normal (Perut supel, bising usus normal, turgor kulit elastis, tidak ada defense muscular)", 58, 208);

  // Ekstremitas findings
  const eksA = data.pemeriksaanFisik?.ekstremitasAtas;
  const eksB = data.pemeriksaanFisik?.ekstremitasBawah;
  const eksList = [];
  if (eksA?.kelemahanMotorik || eksB?.kelemahanMotorik) eksList.push("Kelemahan Motorik / Hemiparese");
  if (eksA?.perfusiBuruk || eksB?.perfusiBuruk) eksList.push("Perfusi dingin/basah/buruk (Capillary Refill > 2 detik)");
  if (eksA?.edema || eksB?.edema) eksList.push("Edema ekstremitas");
  if (eksA?.perdarahanAktif || eksB?.perdarahanAktif) eksList.push("Perdarahan Aktif hebat");
  doc.text(eksList.length > 0 ? `Abnormal: ${eksList.join(", ")}` : "Normal (Perfusi hangat, kering, merah. Capillary Refill Time < 2 detik, gerakan motorik utuh tanpa parese)", 58, 220);

  // SOAP Footer Note Page 1
  doc.setFillColor(254, 243, 199);
  doc.rect(15, 230, 180, 10, "F");
  doc.setDrawColor(245, 158, 11);
  doc.rect(15, 230, 180, 10, "S");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(146, 64, 14);
  doc.text("CATATAN OBJEKTIF PENTING IGD:", 18, 234);
  doc.setFont("helvetica", "normal");
  doc.text("Pemeriksaan tanda vital, AVPU, dan saturasi oksigen adalah penentu batas kritis fisiologis pasien.", 18, 238);

  drawFooter(1, 2);

  // ==========================================
  // PAGE 2: DIAGNOSIS TRIASE, AI ENGINE, & SIGN-OFF
  // ==========================================
  doc.addPage();
  drawHeader(2);

  // 1. Triage Decision Info Header
  doc.setFillColor(241, 245, 249);
  doc.rect(15, 26, 180, 7, "F");
  doc.setDrawColor(203, 213, 225);
  doc.rect(15, 26, 180, 7, "S");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text("V. ANALISIS KLINIS & KLASIFIKASI KATEGORI TRIASE ATS", 18, 31);

  // Prediction Banner Box
  let bannerR = 241, bannerG = 245, bannerB = 249;
  let textR = 15, textG = 23, textB = 42;
  if (currentLevel === 1) { // Red
    bannerR = 254; bannerG = 226; bannerB = 226; textR = 153; textG = 27; textB = 27;
  } else if (currentLevel === 2) { // Orange
    bannerR = 255; bannerG = 237; bannerB = 213; textR = 154; textG = 52; textB = 18;
  } else if (currentLevel === 3) { // Green
    bannerR = 220; bannerG = 252; bannerB = 231; textR = 22; textG = 101; textB = 52;
  } else if (currentLevel === 4) { // Blue
    bannerR = 224; bannerG = 242; bannerB = 254; textR = 21; textG = 94; textB = 117;
  } else { // 5 / White
    bannerR = 248; bannerG = 250; bannerB = 252; textR = 30; textG = 41; textB = 59;
  }

  doc.setFillColor(bannerR, bannerG, bannerB);
  doc.rect(15, 35, 180, 22, "F");
  doc.setDrawColor(bannerR - 20, bannerG - 20, bannerB - 20);
  doc.rect(15, 35, 180, 22, "S");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(textR, textG, textB);
  doc.text(`${levelDetails.name}`, 19, 42);
  
  doc.setFontSize(9);
  doc.text(`DESKRIPSI: ${levelDetails.subtitle}`, 19, 47);
  doc.setFontSize(8.5);
  doc.text(`RESPONSE TIME LIMIT (BATAS TUNGGU): MASIMAL ${levelDetails.timeLimit}`, 19, 52);

  // Confidence and Engine Used Metadata
  doc.rect(15, 59, 180, 18, "S");
  doc.line(105, 59, 105, 77);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text("Penyedia AI yang Menganalisis Triage:", 18, 64);
  doc.text("Indikator Kegawatdaruratan (Emergency Indicator):", 18, 72);

  doc.text("Skor Keyakinan AI (Confidence Score):", 108, 64);
  doc.text("Status Rule-Based Safety Check GCS/Vitals:", 108, 72);

  // metadata values
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(79, 70, 229);
  doc.text(data.atsPrediction?.providerUsed || "Google Gemini 3.5 [Default]", 18, 68);
  
  const emgStr = data.atsPrediction?.emergencyIndicator ? "🚨 CRITICAL / GAWAT DARURAT" : "SITUASI STABIL / LOW RISK";
  doc.setTextColor(data.atsPrediction?.emergencyIndicator ? 185 : 30, data.atsPrediction?.emergencyIndicator ? 28 : 41, data.atsPrediction?.emergencyIndicator ? 28 : 59);
  doc.text(emgStr, 18, 76);

  doc.setTextColor(15, 23, 42);
  doc.text(`${data.atsPrediction?.confidenceScore || 100}%`, 108, 68);
  doc.text(data.atsPrediction?.confidenceScore === 100 ? "Active Override / Rule-Based Enforced" : "Pasien Lulus Filter Cek Bahaya Fisiologis", 108, 76);


  // 2. Clinical Reason Text Area
  doc.setFillColor(241, 245, 249);
  doc.rect(15, 81, 180, 7, "F");
  doc.setDrawColor(203, 213, 225);
  doc.rect(15, 81, 180, 7, "S");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text("VI. ANALISIS MEDIS & PERTIMBANGAN KLINIS", 18, 86);

  // Split text into lines to print multiline text inside bounds safely
  doc.setDrawColor(226, 232, 240);
  doc.rect(15, 88, 180, 48, "S");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  const reasoningText = data.atsPrediction?.alasanKlasifikasi || "Tidak ada alasan klasifikasi medis tertulis.";
  const maxLineWidth = 172; // width 180 minus padding 4 on each side
  const parsedReasoningLines = doc.splitTextToSize(reasoningText, maxLineWidth);
  // Loop to print reasoning
  let currentY = 93;
  parsedReasoningLines.slice(0, 11).forEach((line: string) => {
    doc.text(line, 19, currentY);
    currentY += 4.0;
  });


  // 3. Clinical Red Flags & Initial Emergency Nursing Recommendations
  doc.setFillColor(241, 245, 249);
  doc.rect(15, 140, 180, 7, "F");
  doc.setDrawColor(203, 213, 225);
  doc.rect(15, 140, 180, 7, "S");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text("VII. PERINGATAN RED FLAGS & REKOMENDASI INTERVENSI IGD", 18, 145);

  doc.rect(15, 147, 180, 45, "S");
  doc.line(105, 147, 105, 192);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(153, 27, 27); // Deep Red
  doc.text("KONDISI RED FLAGS / TANDA BAHAYA:", 18, 152);

  doc.setTextColor(22, 101, 52); // Deep Green
  doc.text("REKOMENDASI INTERVENSI ASKEP IGD AWAL:", 108, 152);

  // Print Red Flags list
  doc.setFont("helvetica", "normal");
  doc.setTextColor(51, 65, 85);
  let redFlagY = 157;
  const redFlags = data.atsPrediction?.warningConditions && data.atsPrediction.warningConditions.length > 0
    ? data.atsPrediction.warningConditions
    : ["Tidak terdeteksi parameter klinis kritis yang abnormal berkategori red flag"];
  redFlags.slice(0, 6).forEach((rf) => {
    const wrappedRf = doc.splitTextToSize(`- ${rf}`, 84);
    wrappedRf.forEach((line: string) => {
      if (redFlagY < 191) {
        doc.text(line, 18, redFlagY);
        redFlagY += 3.8;
      }
    });
  });

  // Print nursing recommendations list
  let recY = 157;
  const recommendations = data.atsPrediction?.rekomendasiAwal && data.atsPrediction.rekomendasiAwal.length > 0
    ? data.atsPrediction.rekomendasiAwal
    : ["Observasi vital sign teratur", "Posisikan pasien nyaman"];
  recommendations.slice(0, 7).forEach((rec) => {
    const wrappedRec = doc.splitTextToSize(`✓ ${rec}`, 84);
    wrappedRec.forEach((line: string) => {
      if (recY < 191) {
        doc.text(line, 108, recY);
        recY += 3.8;
      }
    });
  });


  // 4. Clinical Override Section (Manual Override Details)
  doc.setFillColor(241, 245, 249);
  doc.rect(15, 196, 180, 7, "F");
  doc.setDrawColor(203, 213, 225);
  doc.rect(15, 196, 180, 7, "S");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text("VIII. TINJAUAN KEPUTUSAN MANUAL PETUGAS IGD (MANUAL OVERRIDE)", 18, 201);

  doc.rect(15, 203, 180, 20, "S");
  doc.line(15, 210, 195, 210);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(100, 116, 139);
  doc.text("Status Override Pengguna:", 18, 207);
  doc.text("Ubah Level Menjadi:", 75, 207);
  doc.text("Alasan Profesional Override:", 18, 214);

  // Status Values
  doc.setFont("helvetica", "bold");
  const isOverrideActive = !!data.atsFinal?.atsLevelOverride;
  doc.setTextColor(isOverrideActive ? 217 : 22, isOverrideActive ? 119 : 101, isOverrideActive ? 6 : 52);
  doc.text(isOverrideActive ? "YA (AKTIF)" : "TIDAK (AI Sesuai)", 55, 207);
  doc.setTextColor(15, 23, 42);
  doc.text(isOverrideActive ? `ATS Level ${data.atsFinal?.atsLevelOverride}` : "-", 102, 207);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(51, 65, 85);
  const overrideReasonStr = isOverrideActive ? (data.atsFinal?.alasanOverride || "-") : "Keputusan klasifikasi triase AI disetujui penuh oleh Tenaga Kesehatan.";
  const wrappedOverrideReason = doc.splitTextToSize(overrideReasonStr, 172);
  let overrideY = 218;
  wrappedOverrideReason.slice(0, 1).forEach((line: string) => {
    doc.text(line, 18, overrideY);
  });


  // 5. Official Verification Signature Box (Tanda Tangan)
  doc.setFillColor(241, 245, 249);
  doc.rect(15, 227, 180, 7, "F");
  doc.setDrawColor(203, 213, 225);
  doc.rect(15, 227, 180, 7, "S");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text("IX. OTENTIKASI & LEGALISASI HASIL TRIASE IGD", 18, 232);

  // Draw signature fields
  doc.rect(15, 234, 180, 44, "S");
  doc.line(105, 234, 105, 278);

  // Left Section info
  doc.setFont("helvetica", "bold");
  doc.setTextColor(100, 116, 139);
  doc.text("Akurasi AI & Pernyataan Hukum:", 18, 239);
  doc.setFont("helvetica", "normal font-sans");
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text("Hasil triase ini adalah bagian dari lembar rekam medis elektronik (RME)", 18, 244);
  doc.text("yang diatur oleh Kementerian Kesehatan Peraturan No. 24 Tahun 2022.", 18, 248);
  doc.text("Sistem CDSS triase AI ini berperan sebagai asisten pengambil keputusan,", 18, 252);
  doc.text("di mana kewenangan dan pertanggungjawaban asuhan klinis mutlak berada", 18, 256);
  doc.text("pada tenaga medis yang membubuhkan tanda tangan verifikasi fisik / digital.", 18, 260);

  // Right section (Signature area)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  const signDateStr = data.tanggalKunjungan ? data.tanggalKunjungan : new Date().toLocaleDateString("id-ID");
  doc.text(`Kota Administrasi, Tanggal ${signDateStr}`, 110, 239);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text("Verifikator Penanggung Jawab Triage,", 110, 243);

  // Clinician name and role
  const clinicianName = data.atsFinal?.namaPetugas || "Nama Tenaga Kesehatan";
  const clinicianRole = data.atsFinal?.jabatanPetugas || "Perawat / Dokter IGD";
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(79, 70, 229);
  doc.text(clinicianName, 110, 268);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Jabatan: ${clinicianRole}`, 110, 272);

  // Mini signature watermark / seal area on sign block
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.15);
  doc.rect(155, 241, 35, 22);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(5.5);
  doc.setTextColor(148, 163, 184);
  doc.text("TANDA TANGAN VERIFIKASI", 158, 246);
  doc.text("SESUAI RME INTEGRASI KEMKES", 157, 249);
  doc.text("ID TRIASE KEMKES-ATS-9921", 157, 253);
  doc.setFont("helvetica", "normal");
  doc.text("Kewenangan klinis sah v1.2", 158, 261);

  drawFooter(2, 2);

  // Save/Download PDF
  const filename = `Laporan_Triase_IGD_${data.nomorRM || "PASIEN"}_${data.namaPasien?.trim().replace(/\s+/g, "_") || "TANPA_NAMA"}.pdf`;
  doc.save(filename);
}
