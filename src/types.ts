export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: "admin" | "user";
  mustChangePassword: boolean;
}

export interface UserSummary {
  id: string;
  email: string;
  name: string;
  role: "admin" | "user";
  is_active: boolean;
  must_change_password: boolean;
  created_at: string;
  last_login_at: string | null;
}

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
  patientType?: "new" | "existing";
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
    atsCategory?: string;
    confidenceScore: number; // 0-100
    warningConditions: string[];
    emergencyIndicator: boolean;
    alasanKlasifikasi: string;
    informasiKlinisDigunakan?: string[];
    informasiTambahanDiperlukan?: string[];
    rekomendasiAwal: string[];
    providerUsed?: string;
    modelUsed?: string;
    decisionSupport?: {
      aiRecommendation: {
        atsLevel: 1 | 2 | 3 | 4 | 5;
        atsCategory: string;
        confidenceScore: number;
        alasanKlasifikasi: string;
      };
      guardRailRecommendation: {
        atsLevel: 1 | 2 | 3 | 4 | 5;
        atsCategory: string;
        reasons: string[];
      };
      recommendationsDiffer: boolean;
      guardRailApplied: boolean;
    };
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

  createdByUserId?: string | null;
  createdByUserName?: string | null;
  createdByUserEmail?: string | null;
}

// Warna di sini memakai token --color-ats-1..5 (lihat src/index.css) — namespace
// klinis terpisah dari palet UI generik, supaya hue (1=merah..5=netral) tidak
// pernah ikut bergeser saat token brand/UI diubah. Hanya shade yang diselaraskan
// di sini, bukan makna warnanya. ATS 5 punya varian dark mode (lihat .dark di
// index.css) alih-alih putih solid seperti versi sebelumnya.
export const ATS_LEVEL_DETAILS = {
  1: {
    name: "ATS 1 — Merah",
    subtitle: "Resusitasi / Segera",
    color: "bg-ats-1 text-ats-1-foreground border-white/15",
    badgeColor: "bg-ats-1/10 text-ats-1 border-ats-1/30",
    timeLimit: "Segera (Immediate)",
  },
  2: {
    name: "ATS 2 — Orange",
    subtitle: "Gawat Darurat / High Alert",
    color: "bg-ats-2 text-ats-2-foreground border-white/15",
    badgeColor: "bg-ats-2/10 text-ats-2 border-ats-2/30",
    timeLimit: "≤ 10 menit",
  },
  3: {
    name: "ATS 3 — Hijau",
    subtitle: "Darurat / Urgent",
    color: "bg-ats-3 text-ats-3-foreground border-white/15",
    badgeColor: "bg-ats-3/10 text-ats-3 border-ats-3/30",
    timeLimit: "≤ 30 menit",
  },
  4: {
    name: "ATS 4 — Biru",
    subtitle: "Semi-Darurat / Non-Urgent",
    color: "bg-ats-4 text-ats-4-foreground border-white/15",
    badgeColor: "bg-ats-4/10 text-ats-4 border-ats-4/30",
    timeLimit: "≤ 60 menit",
  },
  5: {
    name: "ATS 5 — Putih",
    subtitle: "Tidak Darurat / False Emergency",
    color: "bg-ats-5 text-ats-5-foreground border-border",
    badgeColor: "bg-black/5 text-text border-border dark:bg-white/10",
    timeLimit: "≤ 120 menit",
  },
};
