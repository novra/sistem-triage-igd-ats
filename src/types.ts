export enum Gender {
  LAKI_LAKI = "Laki-laki",
  PEREMPUAN = "Perempuan",
}

export enum CaraDatang {
  JALAN_SENDIRI = "Jalan sendiri",
  KURSI_RODA = "Kursi roda",
  STRETCHER = "Stretcher",
  AMBULANS = "Ambulans",
}

export interface GcsScore {
  eye: number; // 1-4
  verbal: number; // 1-5
  motor: number; // 1-6
}

export interface VitalSign {
  tekananDarahSistolik: number;
  tekananDarahDiastolik: number;
  heartRate: number;
  respiratoryRate: number;
  suhuTubuh: number;
  saturasiOksigen: number;
  gcs: GcsScore;
  polaNapas: "reguler" | "irreguler";
  ototBantuNapas: boolean;
  retraksi: boolean;
  stridor: boolean;
  wheezing: boolean;
  apnea: boolean;
  takipnea: boolean;
  bradipnea: boolean;
  avpu?: "Alert" | "Verbal" | "Pain" | "Unresponsive";
}

export interface PainScale {
  skala: number; // 0-10
  kategori: "tidak nyeri" | "ringan" | "sedang" | "berat";
  lokasi: string;
  menjalar: boolean;
}

export interface PemeriksaanFisik {
  kepala: {
    perdarahan: boolean;
    deformitas: boolean;
    pupilAnisokor: boolean;
    pupilIsokor: boolean;
    traumaKepala: boolean;
    kejang: boolean;
    sianosis: boolean;
    penurunanKesadaran: boolean;
  };
  leher: {
    deviasiTrakea: boolean;
    distensiVenaJugularis: boolean;
    kakuKuduk: boolean;
    traumaLeher: boolean;
    pembesaranKelenjar: boolean;
    stridor: boolean;
  };
  dada: {
    retraksi: boolean;
    wheezing: boolean;
    ronki: boolean;
    suaraNapasMenurun: boolean;
    nyeriDada: boolean;
    penggunaanOtotBantuNapas: boolean;
    asimetriDindingDada: boolean;
    distressRespirasi: boolean;
  };
  perut: {
    distensiAbdomen: boolean;
    nyeriTekan: boolean;
    defenseMuscular: boolean;
    muntah: boolean;
    perdarahan: boolean;
    ascites: boolean;
    nyeriKuadranKananBawah: boolean;
    rigidAbdomen: boolean;
  };
  ekstremitasAtas: {
    kelemahanMotorik: boolean;
    deformitas: boolean;
    edema: boolean;
    sianosis: boolean;
    tremor: boolean;
    perfusiBuruk: boolean;
    perdarahanAktif: boolean;
  };
  ekstremitasBawah: {
    edema: boolean;
    deformitas: boolean;
    kelemahanMotorik: boolean;
    sianosis: boolean;
    perfusiBuruk: boolean;
    trauma: boolean;
    perdarahanAktif: boolean;
  };
}

export interface TriageRecord {
  id?: string;
  nomorRM: string;
  namaPasien: string;
  tanggalLahir: string;
  umur: number;
  gender: Gender;
  
  tanggalKunjungan: string;
  jamKunjungan: string;
  caraDatang: CaraDatang;
  
  riwayatPenyakit: string[]; // e.g. ["hipertensi", "diabetes melitus", "lainnya"]
  riwayatPenyakitLainnya: string;
  
  chiefComplaint: string; // Kategori keluhan utama, e.g. "nyeri dada"
  chiefComplaintCustom: string; // Text bebas opsional untuk keluhan
  gejalaTambahan: string[]; // e.g. ["sesak berat", "sianosis"]
  
  vitalSign: VitalSign;
  painScale: PainScale;
  pemeriksaanFisik: PemeriksaanFisik;
  
  atsPrediction?: {
    atsLevel: 1 | 2 | 3 | 4 | 5;
    confidenceScore: number; // 0-100
    warningConditions: string[];
    emergencyIndicator: boolean;
    alasanKlasifikasi: string;
    rekomendasiAwal: string[];
    providerUsed?: string;
  };
  
  atsFinal?: {
    atsLevelOverride?: 1 | 2 | 3 | 4 | 5;
    alasanOverride?: string;
    atsLevelFinal: 1 | 2 | 3 | 4 | 5;
    namaPetugas?: string;
    jabatanPetugas?: string;
  };
  
  timestamp?: string;
  auditLogs?: {
    action: string;
    timestamp: string;
    user: string;
  }[];
}

export const ATS_LEVEL_DETAILS = {
  1: {
    name: "ATS 1 — Merah",
    subtitle: "Resusitasi / Segera",
    color: "bg-red-600 text-white border-red-800",
    badgeColor: "bg-red-100 text-red-800 border-red-300",
    timeLimit: "Segera (Immediate)",
  },
  2: {
    name: "ATS 2 — Orange",
    subtitle: "Gawat Darurat / High Alert",
    color: "bg-orange-500 text-white border-orange-700",
    badgeColor: "bg-orange-100 text-orange-800 border-orange-300",
    timeLimit: "≤ 10 menit",
  },
  3: {
    name: "ATS 3 — Hijau",
    subtitle: "Darurat / Urgent",
    color: "bg-green-600 text-white border-green-800",
    badgeColor: "bg-green-100 text-green-800 border-green-300",
    timeLimit: "≤ 30 menit",
  },
  4: {
    name: "ATS 4 — Biru",
    subtitle: "Semi-Darurat / Non-Urgent",
    color: "bg-blue-600 text-white border-blue-800",
    badgeColor: "bg-blue-100 text-blue-800 border-blue-300",
    timeLimit: "≤ 60 menit",
  },
  5: {
    name: "ATS 5 — Putih",
    subtitle: "Tidak Darurat / False Emergency",
    color: "bg-white text-gray-900 border-gray-300 shadow",
    badgeColor: "bg-gray-100 text-gray-800 border-gray-300",
    timeLimit: "≤ 120 menit",
  },
};
