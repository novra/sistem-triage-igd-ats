import React, { useState, useEffect, Suspense, lazy } from "react";
import { AnimatePresence, motion } from "motion/react";
import { TriageRecord, Gender, CaraDatang, ATS_LEVEL_DETAILS } from "./types";
import IdentitasForm from "./components/IdentitasForm";
import KeluhanAwalForm from "./components/KeluhanAwalForm";
import VitalSignForm from "./components/VitalSignForm";
import NyeriForm from "./components/NyeriForm";
import SOAPFormView from "./components/SOAPFormView";
import ATSHasilPanel from "./components/ATSHasilPanel";
import ATSGuidePage from "./components/ATSGuidePage";
import ATSResultHighlightDialog from "./components/ATSResultHighlightDialog";
import ChangePasswordModal from "./components/ChangePasswordModal";
import { SkeletonList } from "./components/ui/Skeleton";

// Code-split secondary views so the core triage wizard stays a lean initial bundle.
const NarrativeWorkspace = lazy(() => import("./components/NarrativeWorkspace"));
const RecordHistoryList = lazy(() => import("./components/RecordHistoryList"));
const UserManagementPage = lazy(() => import("./components/UserManagementPage"));
import { useAuth } from "./context/AuthContext";
import { apiFetch } from "./lib/api";
import { MAIN_NAV_ITEMS } from "./lib/navigation";
import { pageTransition } from "./lib/motion";
import { useToast } from "./components/ui/Toast";
import { useConfirm } from "./components/ui/ConfirmDialog";
import { Button } from "./components/ui/Button";
import { Card } from "./components/ui/Card";
import { Badge, Chip } from "./components/ui/Badge";
import { Stepper } from "./components/ui/Stepper";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel } from "./components/ui/DropdownMenu";
import { CommandPalette } from "./components/ui/CommandPalette";
import {
  Activity,
  ArrowRight,
  ArrowLeft,
  Wand2,
  Sun,
  Moon,
  CheckCircle2,
  AlertOctagon,
  Microscope,
  RotateCcw,
  Clock,
  Cpu,
  LogOut,
  KeyRound,
  UserCircle2,
  ClipboardList,
  Accessibility,
  Plus,
  ChevronDown
} from "lucide-react";

const INITIAL_FORM: TriageRecord = {
  patientType: "new",
  nomorRM: "",
  namaPasien: "",
  tanggalLahir: "",
  umur: 0,
  gender: Gender.LAKI_LAKI,
  tanggalKunjungan: "",
  jamKunjungan: "",
  caraDatang: CaraDatang.JALAN_SENDIRI,
  riwayatPenyakit: [],
  riwayatPenyakitLainnya: "",
  chiefComplaint: "Demam",
  chiefComplaintCustom: "",
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
    avpu: "Alert"
  },
  painScale: {
    skala: 0,
    kategori: "tidak nyeri",
    lokasi: "",
    menjalar: false
  },
  pemeriksaanFisik: {
    kepala: {
      perdarahan: false,
      deformitas: false,
      pupilAnisokor: false,
      pupilIsokor: false,
      traumaKepala: false,
      kejang: false,
      sianosis: false,
      penurunanKesadaran: false
    },
    leher: {
      deviasiTrakea: false,
      distensiVenaJugularis: false,
      kakuKuduk: false,
      traumaLeher: false,
      pembesaranKelenjar: false,
      stridor: false
    },
    dada: {
      retraksi: false,
      wheezing: false,
      ronki: false,
      suaraNapasMenurun: false,
      nyeriDada: false,
      penggunaanOtotBantuNapas: false,
      asimetriDindingDada: false,
      distressRespirasi: false
    },
    perut: {
      distensiAbdomen: false,
      nyeriTekan: false,
      defenseMuscular: false,
      muntah: false,
      perdarahan: false,
      ascites: false,
      nyeriKuadranKananBawah: false,
      rigidAbdomen: false
    },
    ekstremitasAtas: {
      kelemahanMotorik: false,
      deformitas: false,
      edema: false,
      sianosis: false,
      tremor: false,
      perfusiBuruk: false,
      perdarahanAktif: false
    },
    ekstremitasBawah: {
      edema: false,
      deformitas: false,
      kelemahanMotorik: false,
      sianosis: false,
      perfusiBuruk: false,
      trauma: false,
      perdarahanAktif: false
    }
  }
};

const STEPS = [
  { label: "Identitas GD", desc: "No RM, umur & asal datang" },
  { label: "Keluhan dan Riwayat Penyakit", desc: "Keluhan, gejala, dan komorbid" },
  { label: "Tanda Vital dan Tingkat Kesadaran", desc: "Parameter fisiologis, AVPU, dan GCS" },
  { label: "Skala Nyeri", desc: "Intensitas, lokasi & radiasi" },
  { label: "CPPT", desc: "Catatan perkembangan terintegrasi" },
  { label: "Analisis ATS AI", desc: "Rekomendasi triase & output final" }
];

// Clinic Presets for instant training tests or fast evaluations
const MOCK_PRESETS = [
  {
    name: "Kritis: Henti Jantung (ATS 1)",
    data: {
      nomorRM: "RM-99002",
      namaPasien: "Bpk. Hermawan Kartajaya",
      tanggalLahir: "1971-08-12",
      umur: 54,
      gender: Gender.LAKI_LAKI,
      caraDatang: CaraDatang.AMBULANS,
      riwayatPenyakit: ["Hipertensi", "Penyakit Jantung"],
      chiefComplaint: "Nyeri dada",
      chiefComplaintCustom: "Pasien tidak sadar secara mendadak di ambulan, henti napas, pupil anisokor.",
      gejalaTambahan: ["Penurunan kesadaran", "Sesak berat"],
      vitalSign: {
        tekananDarahSistolik: 0,
        tekananDarahDiastolik: 0,
        heartRate: 0,
        respiratoryRate: 0,
        suhuTubuh: 35.1,
        saturasiOksigen: 40,
        gcs: { eye: 1, verbal: 1, motor: 1 },
        polaNapas: "irreguler",
        ototBantuNapas: true,
        retraksi: true,
        stridor: false,
        wheezing: false,
        apnea: true,
        takipnea: false,
        bradipnea: true,
        avpu: "Unresponsive"
      },
      painScale: { skala: 10, kategori: "berat", lokasi: "Dada Kiri", menjalar: true },
      pemeriksaanFisik: {
        kepala: { perdarahan: false, deformitas: false, pupilAnisokor: true, pupilIsokor: false, traumaKepala: false, kejang: false, sianosis: true, penurunanKesadaran: true },
        leher: { deviasiTrakea: false, distensiVenaJugularis: true, kakuKuduk: false, traumaLeher: false, pembesaranKelenjar: false, stridor: false },
        dada: { retraksi: true, wheezing: false, ronki: false, suaraNapasMenurun: true, nyeriDada: true, penggunaanOtotBantuNapas: true, asimetriDindingDada: false, distressRespirasi: true },
        perut: { distensiAbdomen: false, nyeriTekan: false, defenseMuscular: false, muntah: false, perdarahan: false, ascites: false, nyeriKuadranKananBawah: false, rigidAbdomen: false },
        ekstremitasAtas: { kelemahanMotorik: true, deformitas: false, edema: false, sianosis: true, tremor: false, perfusiBuruk: true, perdarahanAktif: false },
        ekstremitasBawah: { edema: false, deformitas: false, kelemahanMotorik: true, sianosis: true, perfusiBuruk: true, trauma: false, perdarahanAktif: false }
      }
    }
  },
  {
    name: "Akut: Kecurigaan Stroke (ATS 2)",
    data: {
      nomorRM: "RM-81109",
      namaPasien: "Ibu Nurul Aini",
      tanggalLahir: "1965-02-23",
      umur: 61,
      gender: Gender.PEREMPUAN,
      caraDatang: CaraDatang.STRETCHER,
      riwayatPenyakit: ["Hipertensi", "Diabetes Melitus"],
      chiefComplaint: "Stroke",
      chiefComplaintCustom: "Hemiparesis kiri mendadak sejak 40 menit lalu saat bangun tidur, pelo berat.",
      gejalaTambahan: ["Kelemahan anggota gerak", "Penurunan kesadaran"],
      vitalSign: {
        tekananDarahSistolik: 190,
        tekananDarahDiastolik: 110,
        heartRate: 102,
        respiratoryRate: 22,
        suhuTubuh: 36.8,
        saturasiOksigen: 94,
        gcs: { eye: 3, verbal: 4, motor: 5 },
        polaNapas: "reguler",
        ototBantuNapas: false,
        retraksi: false,
        stridor: false,
        wheezing: false,
        apnea: false,
        takipnea: false,
        bradipnea: false,
        avpu: "Alert"
      },
      painScale: { skala: 3, kategori: "ringan", lokasi: "Kepala / Temporal", menjalar: false },
      pemeriksaanFisik: {
        kepala: { perdarahan: false, deformitas: false, pupilAnisokor: false, pupilIsokor: true, traumaKepala: false, kejang: false, sianosis: false, penurunanKesadaran: true },
        leher: { deviasiTrakea: false, distensiVenaJugularis: false, kakuKuduk: false, traumaLeher: false, pembesaranKelenjar: false, stridor: false },
        dada: { retraksi: false, wheezing: false, ronki: false, suaraNapasMenurun: false, nyeriDada: false, penggunaanOtotBantuNapas: false, asimetriDindingDada: false, distressRespirasi: false },
        perut: { distensiAbdomen: false, nyeriTekan: false, defenseMuscular: false, muntah: false, perdarahan: false, ascites: false, nyeriKuadranKananBawah: false, rigidAbdomen: false },
        ekstremitasAtas: { kelemahanMotorik: true, deformitas: false, edema: false, sianosis: false, tremor: false, perfusiBuruk: false, perdarahanAktif: false },
        ekstremitasBawah: { edema: false, deformitas: false, kelemahanMotorik: true, sianosis: false, perfusiBuruk: false, trauma: false, perdarahanAktif: false }
      }
    }
  },
  {
    name: "Stabil: Demam Ringan (ATS 4/5)",
    data: {
      nomorRM: "RM-40502",
      namaPasien: "An. Dimas Saputra",
      tanggalLahir: "2018-11-20",
      umur: 7,
      gender: Gender.LAKI_LAKI,
      caraDatang: CaraDatang.JALAN_SENDIRI,
      riwayatPenyakit: ["Tidak ada riwayat penyakit"],
      chiefComplaint: "Demam",
      chiefComplaintCustom: "Suhu tubuh terasa agak panas sejak kemarin sore, makan minum aktif dan tidak ada sesak.",
      gejalaTambahan: [],
      vitalSign: {
        tekananDarahSistolik: 110,
        tekananDarahDiastolik: 70,
        heartRate: 88,
        respiratoryRate: 19,
        suhuTubuh: 37.8,
        saturasiOksigen: 99,
        gcs: { eye: 4, verbal: 5, motor: 6 },
        polaNapas: "reguler",
        ototBantuNapas: false,
        retraksi: false,
        stridor: false,
        wheezing: false,
        apnea: false,
        takipnea: false,
        bradipnea: false,
        avpu: "Alert"
      },
      painScale: { skala: 1, kategori: "ringan", lokasi: "Leher / Tenggorokan", menjalar: false },
      pemeriksaanFisik: {
        kepala: { perdarahan: false, deformitas: false, pupilAnisokor: false, pupilIsokor: true, traumaKepala: false, kejang: false, sianosis: false, penurunanKesadaran: false },
        leher: { deviasiTrakea: false, distensiVenaJugularis: false, kakuKuduk: false, traumaLeher: false, pembesaranKelenjar: false, stridor: false },
        dada: { retraksi: false, wheezing: false, ronki: false, suaraNapasMenurun: false, nyeriDada: false, penggunaanOtotBantuNapas: false, asimetriDindingDada: false, distressRespirasi: false },
        perut: { distensiAbdomen: false, nyeriTekan: false, defenseMuscular: false, muntah: false, perdarahan: false, ascites: false, nyeriKuadranKananBawah: false, rigidAbdomen: false },
        ekstremitasAtas: { kelemahanMotorik: false, deformitas: false, edema: false, sianosis: false, tremor: false, perfusiBuruk: false, perdarahanAktif: false },
        ekstremitasBawah: { edema: false, deformitas: false, kelemahanMotorik: false, sianosis: false, perfusiBuruk: false, trauma: false, perdarahanAktif: false }
      }
    }
  }
];

const ATS_QUICK_REFERENCE: Array<{ level: 1 | 2 | 3 | 4 | 5; label: string; limit: string }> = [
  { level: 1, label: "Resusitasi total / segera", limit: "Segera" },
  { level: 2, label: "Gawat darurat", limit: "≤ 10 menit" },
  { level: 3, label: "Darurat", limit: "≤ 30 menit" },
  { level: 4, label: "Ringan", limit: "≤ 60 menit" },
  { level: 5, label: "Non-emergency", limit: "≤ 120 menit" },
];

export default function App() {
  const { user, logout } = useAuth();
  const isAdmin = user?.role === "admin";
  const toast = useToast();
  const confirm = useConfirm();
  const [view, setView] = useState<"guide" | "triage" | "narrative" | "records" | "users">(() =>
    localStorage.getItem("ats_guide_dismissed") === "true" ? "triage" : "guide"
  );
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [form, setForm] = useState<TriageRecord>({ ...INITIAL_FORM });
  const [records, setRecords] = useState<TriageRecord[]>([]);
  const [isClassifying, setIsClassifying] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showAtsHighlight, setShowAtsHighlight] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [displayMode, setDisplayMode] = useState<"standard" | "accessible">(() =>
    localStorage.getItem("ats_display_mode") === "accessible" ? "accessible" : "standard"
  );
  const [aiProvider, setAiProvider] = useState<string>(() => {
    const savedProvider = localStorage.getItem("ats_ai_provider");
    if (savedProvider === "custom") return "runpod";
    if (savedProvider === "gemini") return "rulebased";
    return savedProvider || "rulebased";
  });
  const [aiModel, setAiModel] = useState<string>(() => {
    return localStorage.getItem("ats_ai_model") || "openai-oss";
  });

  // Bridges legacy setErrorMsg/setSuccessMsg(message | null) call sites — used
  // throughout this file and passed down to NarrativeWorkspace/ImportTriageRecords
  // unchanged — onto the new toast system. Passing null is a no-op (toasts
  // auto-dismiss on their own); this keeps every existing call site working
  // without touching child components until their own restyle pass.
  const setErrorMsg = (message: string | null) => { if (message) toast.error(message); };
  const setSuccessMsg = (message: string | null) => { if (message) toast.success(message); };

  const handleSetAiProvider = (provider: string) => {
    setAiProvider(provider);
    localStorage.setItem("ats_ai_provider", provider);
  };

  const handleSetAiModel = (model: string) => {
    setAiModel(model);
    localStorage.setItem("ats_ai_model", model);
  };

  const closeGuide = () => {
    localStorage.setItem("ats_guide_dismissed", "true");
    setView("triage");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // User biasa cuma boleh pakai Pure Rule Based / Model Mandiri. Provider lain (mis.
  // Hugging Face) mungkin tersimpan di localStorage dari sebelum pembatasan ini ada
  // atau dari sesi admin sebelumnya di perangkat yang sama — reset ke rulebased.
  useEffect(() => {
    if (!isAdmin && (aiProvider === "huggingface" || aiProvider === "gemini")) {
      handleSetAiProvider("rulebased");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, aiProvider]);

  // Load cache on start
  useEffect(() => {
    const cachedForm = localStorage.getItem("ats_cached_form");
    if (cachedForm) {
      try {
        setForm(JSON.parse(cachedForm));
      } catch (e) {
        console.error("Failed to parse cached form", e);
      }
    }

    // Load theme setting
    const cachedTheme = localStorage.getItem("ats_dark_theme");
    if (cachedTheme === "true") {
      setDarkMode(true);
    }

    fetchRecords();
  }, []);

  // Save cache on edit
  const updateFormState = (updates: Partial<TriageRecord>) => {
    setForm((prev) => {
      const next = { ...prev, ...updates };
      localStorage.setItem("ats_cached_form", JSON.stringify(next));
      return next;
    });
  };

  // Switch dark/light modes
  useEffect(() => {
    const html = document.documentElement;
    if (darkMode) {
      html.classList.add("dark");
    } else {
      html.classList.remove("dark");
    }
    localStorage.setItem("ats_dark_theme", String(darkMode));
  }, [darkMode]);

  useEffect(() => {
    const html = document.documentElement;
    html.classList.toggle("accessibility-mode", displayMode === "accessible");
    html.classList.toggle("standard-mode", displayMode === "standard");
    localStorage.setItem("ats_display_mode", displayMode);
  }, [displayMode]);

  // Fetch all database records
  const fetchRecords = async () => {
    try {
      const res = await apiFetch("/api/triage/records");
      if (res.ok) {
        const data = await res.json();
        setRecords(data);
      }
    } catch (err) {
      console.error("Failed to fetch triage records:", err);
    }
  };

  // Auto-fill template tests for demonstration
  const handleAutoFillPreset = (preset: any) => {
    const freshRecord = {
      ...INITIAL_FORM,
      ...preset.data,
      tanggalKunjungan: new Date().toISOString().split("T")[0],
      jamKunjungan: new Date().toTimeString().split(" ")[0].substring(0, 5),
    };
    setForm(freshRecord);
    localStorage.setItem("ats_cached_form", JSON.stringify(freshRecord));
    setActiveStep(2); // Jump to vital sign/complaint checking
    setSuccessMsg(`Berhasil memuat preset kasus: ${preset.name}`);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  // Reset current form to empty defaults
  const handleResetForm = async () => {
    const confirmed = await confirm({
      title: "Kosongkan formulir?",
      description: "Seluruh isian form triase yang sedang aktif akan dihapus dan tidak dapat dikembalikan.",
      confirmLabel: "Ya, kosongkan",
      cancelLabel: "Batal",
      tone: "danger",
    });
    if (confirmed) {
      setForm({ ...INITIAL_FORM });
      localStorage.removeItem("ats_cached_form");
      setActiveStep(0);
    }
  };

  // AI supported ATS determination Call
  const handleTriggerAISystem = async () => {
    if (!form.nomorRM || !form.namaPasien) {
      setErrorMsg("Harap melengkapi Nomor RM & Nama Pasien terlebih dahulu di langkah pertama.");
      setActiveStep(0);
      setTimeout(() => setErrorMsg(null), 5000);
      return;
    }

    setIsClassifying(true);
    setErrorMsg(null);
    try {
      const response = await apiFetch("/api/triage/classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          aiProvider,
          aiModel
        })
      });

      if (!response.ok) {
        throw new Error("Respon server triase tidak berhasil.");
      }

      const classificationOutput = await response.json();
      updateFormState({ atsPrediction: classificationOutput });

      // Jump to step 5 (Analisis ATS) immediately to inspect output
      setActiveStep(5);
      setShowAtsHighlight(true);
    } catch (err: any) {
      setErrorMsg("Gagal melakukan klasifikasi ATS melalui AI. Layanan atau API Key sedang sibuk.");
      setTimeout(() => setErrorMsg(null), 5000);
    } finally {
      setIsClassifying(false);
    }
  };

  // Perform permanent server save
  const handleSaveTriageLog = async (overrideData?: {
    atsLevelOverride?: 1 | 2 | 3 | 4 | 5;
    alasanOverride?: string;
    namaPetugas?: string;
    jabatanPetugas?: string;
  }) => {
    setIsSaving(true);
    setErrorMsg(null);
    try {
      const finalPayload: TriageRecord = {
        ...form,
        atsFinal: overrideData
          ? {
              atsLevelOverride: overrideData.atsLevelOverride,
              alasanOverride: overrideData.alasanOverride,
              atsLevelFinal: overrideData.atsLevelOverride || form.atsPrediction?.atsLevel || 3,
              namaPetugas: overrideData.namaPetugas,
              jabatanPetugas: overrideData.jabatanPetugas
            }
          : {
              atsLevelFinal: form.atsPrediction?.atsLevel || 3
            }
      };

      const response = await apiFetch("/api/triage/records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(finalPayload),
      });

      if (!response.ok) {
        throw new Error("Gagal mentransfer rekam klinis ke database.");
      }

      const saved = await response.json();

      // Reset form, fetch records, alert user
      setForm({ ...INITIAL_FORM });
      localStorage.removeItem("ats_cached_form");
      setActiveStep(0);
      await fetchRecords();
      setSuccessMsg(`Triage berhasil tersimpan dengan Kode Transaksi: ${saved.id}`);
      setTimeout(() => setSuccessMsg(null), 6000);
    } catch (error: any) {
      setErrorMsg("Gagal menyimpan data rekam triase.");
      setTimeout(() => setErrorMsg(null), 4000);
    } finally {
      setIsSaving(false);
    }
  };

  // Delete triage record
  const handleDeleteTriageLog = async (id: string) => {
    try {
      const res = await apiFetch(`/api/triage/records/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchRecords();
        setSuccessMsg(`Rekam triase ${id} terhapus secara permanen.`);
        setTimeout(() => setSuccessMsg(null), 4000);
      }
    } catch (err) {
      setErrorMsg("Gagal menghapus rekam triase.");
    }
  };

  // NLP dataset download
  const handleExportJsonDataset = async () => {
    try {
      const res = await apiFetch("/api/triage/export");
      if (res.ok) {
        const payload = await res.json();
        const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
          JSON.stringify(payload, null, 2)
        )}`;
        const downloadAnchor = document.createElement("a");
        downloadAnchor.setAttribute("href", jsonString);
        downloadAnchor.setAttribute("download", `ats_triage_ml_dataset_${new Date().toISOString().split("T")[0]}.json`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
      }
    } catch (err) {
      setErrorMsg("Gagal mengunduh berkas training dataset.");
    }
  };

  // Critical warnings indicators shown on absolute sticky header for instant ER navigation
  const sbp = Number(form.vitalSign?.tekananDarahSistolik) || 0;
  const spo2 = Number(form.vitalSign?.saturasiOksigen) || 0;
  const gcsVal = ((form.vitalSign?.gcs?.eye ?? 4) + (form.vitalSign?.gcs?.verbal ?? 5) + (form.vitalSign?.gcs?.motor ?? 6));
  const isHypoxic = spo2 > 0 && spo2 < 90;
  const isComa = gcsVal <= 8;
  const livePrediction = form.atsPrediction;
  const liveFinalLevel = (form.atsFinal?.atsLevelFinal || form.atsFinal?.atsLevelOverride || livePrediction?.atsLevel) as 1 | 2 | 3 | 4 | 5 | undefined;
  const liveLevelDetails = liveFinalLevel ? ATS_LEVEL_DETAILS[liveFinalLevel] : null;
  const liveHasOverride = Boolean(form.atsFinal?.atsLevelOverride);
  const liveProvider = livePrediction?.providerUsed || (livePrediction ? "Rule-Based" : "Belum dianalisis");
  const liveCondition = livePrediction
    ? livePrediction.emergencyIndicator
      ? "Gawat darurat / perlu prioritas segera"
      : "Stabil relatif, tetap monitor berkala"
    : "Menunggu analisis ATS";
  const liveRecommendations = livePrediction?.rekomendasiAwal?.length
    ? livePrediction.rekomendasiAwal.slice(0, 3)
    : ["Lengkapi keluhan, tanda vital, dan pemeriksaan fisik untuk menjalankan analisis ATS."];
  const rrValue = form.vitalSign?.respiratoryRate;
  const rrDisplay = typeof rrValue === "number" ? `${rrValue}/m` : "Belum diisi";
  const isRrCritical = typeof rrValue === "number" && (rrValue === 0 || rrValue < 8 || rrValue > 30);
  const spo2Value = form.vitalSign?.saturasiOksigen;
  const spo2Display = typeof spo2Value === "number" ? `${spo2Value}%` : "Belum diisi";

  const showFab = view !== "triage";

  return (
    <div className="min-h-screen bg-bg text-text transition-colors">

      <CommandPalette
        isAdmin={isAdmin}
        onNavigate={(nextView) => { setView(nextView); window.scrollTo({ top: 0, behavior: "smooth" }); }}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode((prev) => !prev)}
        onToggleAccessibility={() => setDisplayMode((current) => (current === "standard" ? "accessible" : "standard"))}
      />

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border/70 bg-surface/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-2.5 sm:gap-3.5">
            <div className="app-brand-logo flex items-center justify-center rounded-2xl bg-linear-to-br from-primary to-accent p-3 text-white shadow-lg shadow-primary/25">
              <Activity size={24} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="app-brand-title truncate text-lg font-extrabold tracking-tight text-text">E-Triase IGD ATS</h1>
                <Badge tone="danger" className="hidden sm:inline-flex">BETA</Badge>
              </div>
              <p className="hidden text-sm font-medium text-text-muted sm:block">Sistem Pendukung Keputusan Klinis IGD</p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            {isHypoxic && (
              <Badge tone="danger" className="hidden animate-pulse sm:inline-flex" icon={<AlertOctagon className="size-3.5" />}>
                SpO2 &lt; 90%
              </Badge>
            )}
            {isComa && (
              <Badge tone="danger" className="hidden animate-pulse sm:inline-flex" icon={<AlertOctagon className="size-3.5" />}>
                GCS &le; 8
              </Badge>
            )}
            <Badge tone="secondary" className="hidden md:inline-flex" icon={<span className="pulse-indicator" />}>
              SISTEM AKTIF
            </Badge>

            <Button
              variant={displayMode === "accessible" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setDisplayMode((current) => (current === "standard" ? "accessible" : "standard"))}
              aria-pressed={displayMode === "accessible"}
              aria-label={displayMode === "accessible" ? "Nonaktifkan Aksesibilitas Lanjut" : "Aktifkan Aksesibilitas Lanjut"}
              leftIcon={<Accessibility className="size-4.5" />}
              title="Aksesibilitas Lanjut"
            >
              <span className="hidden sm:inline">{displayMode === "accessible" ? "Aksesibilitas Aktif" : "Aksesibilitas"}</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDarkMode((prev) => !prev)}
              aria-label={darkMode ? "Aktifkan mode terang" : "Aktifkan mode gelap"}
              title={darkMode ? "Mode Terang" : "Mode Gelap"}
            >
              {darkMode ? <Sun className="size-4.5" /> : <Moon className="size-4.5" />}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex min-h-11 items-center gap-2 rounded-xl border border-border bg-surface px-2.5 py-1.5 text-sm font-semibold text-text transition hover:border-primary/40"
                  aria-label="Menu akun"
                >
                  <UserCircle2 className="size-5 text-text-muted" />
                  <span className="hidden max-w-24 truncate lg:inline">{user?.name}</span>
                  <ChevronDown className="size-3.5 text-text-muted" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>{isAdmin ? "Admin" : "User"} &middot; {user?.name}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => setShowChangePassword(true)}>
                  <KeyRound className="size-4" /> Ganti Password
                </DropdownMenuItem>
                <DropdownMenuItem danger onSelect={() => logout()}>
                  <LogOut className="size-4" /> Keluar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {showChangePassword && (
        <ChangePasswordModal blocking={false} onSuccess={() => setShowChangePassword(false)} onClose={() => setShowChangePassword(false)} />
      )}

      <ATSResultHighlightDialog open={showAtsHighlight} onClose={() => setShowAtsHighlight(false)} prediction={form.atsPrediction ?? null} />

      <div className="mx-auto grid max-w-[1600px] grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="hidden border-b border-border/70 px-4 py-6 lg:block lg:min-h-[calc(100vh-76px)] lg:border-b-0 lg:border-r">
          <div className="lg:sticky lg:top-24">
            <div className="mb-4 px-2">
              <p className="text-sm font-extrabold uppercase tracking-wider text-primary">Menu Utama</p>
              <p className="mt-1 text-sm font-medium text-text-muted">Pilih halaman yang ingin digunakan.</p>
            </div>
            <nav className="grid grid-cols-1 gap-2.5" aria-label="Navigasi utama aplikasi">
              {MAIN_NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin).map((item) => {
                const MenuIcon = item.icon;
                const active = view === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setView(item.id)}
                    className={`group flex min-h-18 items-center gap-3 rounded-2xl border p-3.5 text-left transition-all ${
                      active
                        ? "border-transparent bg-linear-to-r from-primary to-accent text-white shadow-lg shadow-primary/25"
                        : "border-border/70 bg-surface text-text hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
                    }`}
                    aria-current={active ? "page" : undefined}
                  >
                    <span className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${active ? "bg-white/20 text-white" : "bg-primary/10 text-primary group-hover:bg-primary/15"}`}>
                      <MenuIcon size={21} />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-black">{item.label}</span>
                      <span className={`mt-0.5 block truncate text-xs font-medium ${active ? "text-white/80" : "text-text-muted"}`}>{item.description}</span>
                    </span>
                  </button>
                );
              })}
            </nav>
          </div>
        </aside>

      {/* Main Container */}
      <main className="min-w-0 px-4 py-5 sm:px-6 sm:py-7">
        <AnimatePresence mode="wait">
          <motion.div
            key={view}
            variants={pageTransition}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="grid grid-cols-1 gap-6 pb-36 lg:grid-cols-12 lg:pb-24"
          >
        {view === "guide" ? (
          <div className="lg:col-span-12">
            <ATSGuidePage onStart={closeGuide} onSkip={closeGuide} onNavigate={setView} />
          </div>
        ) : view === "narrative" ? (
          <div className="lg:col-span-12">
            <Suspense fallback={<SkeletonList rows={3} />}>
              <NarrativeWorkspace
                initialRecord={INITIAL_FORM}
                aiProvider={aiProvider}
                aiModel={aiModel}
                setErrorMsg={setErrorMsg}
                setSuccessMsg={setSuccessMsg}
                onRecordsChanged={fetchRecords}
              />
            </Suspense>
          </div>
        ) : view === "records" ? (
          <div className="lg:col-span-12">
            <Suspense fallback={<SkeletonList rows={5} />}>
              <RecordHistoryList
                records={records}
                onDeleteRecord={handleDeleteTriageLog}
                onExportDataset={handleExportJsonDataset}
                onRecordsChanged={fetchRecords}
                aiProvider={aiProvider}
                aiModel={aiModel}
                isAdmin={isAdmin}
                currentUserId={user?.id}
              />
            </Suspense>
          </div>
        ) : view === "users" && isAdmin ? (
          <div className="lg:col-span-12">
            <Suspense fallback={<SkeletonList rows={3} />}>
              <UserManagementPage />
            </Suspense>
          </div>
        ) : (
        <>
        <div className="lg:col-span-12">
          <Card padding="lg" className="relative overflow-hidden">
            <div className="pointer-events-none absolute -right-12 -top-16 size-40 rounded-full bg-primary/10 blur-3xl" />
            <div className="relative flex items-start gap-4">
              <div className="rounded-2xl bg-primary p-3 text-primary-foreground shadow-lg shadow-primary/25">
                <ClipboardList size={26} />
              </div>
              <div>
                <p className="text-sm font-bold uppercase tracking-wider text-primary">Ruang Kerja Klinis</p>
                <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-text">Form Utama Triase ATS</h2>
                <p className="mt-2 max-w-3xl text-base font-medium text-text-muted">
                  Lengkapi data secara bertahap, tinjau kondisi pasien, lalu jalankan analisis ATS. Setiap langkah dapat dibuka kembali sebelum hasil disimpan.
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* AI Engine Selection Panel */}
        <div className="lg:col-span-12">
          <Card padding="md">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="size-2.5 shrink-0 animate-pulse rounded-full bg-primary" />
                  <h3 className="text-xs font-black uppercase tracking-wider text-text">Pilih Penyedia Kecerdasan Buatan</h3>
                </div>
                <p className="text-xs font-medium leading-relaxed text-text-muted">
                  Bila sambungan API penyedia bermasalah atau kunci API belum terpasang, sistem otomatis beralih ke kriteria standar berbasis aturan klinis objektif.
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Chip selected={false} disabled title="Gemini 3.5 dinonaktifkan. Gunakan Model Mandiri, Hugging Face, atau Pure Rule Based." className="cursor-not-allowed opacity-50">
                  <Wand2 className="size-3.5" /> Gemini 3.5
                </Chip>
                <Chip selected={aiProvider === "rulebased"} onClick={() => handleSetAiProvider("rulebased")}>
                  <CheckCircle2 className="size-3.5" /> Pure Rule Based
                </Chip>
                {isAdmin && (
                  <Chip selected={aiProvider === "huggingface"} onClick={() => handleSetAiProvider("huggingface")}>
                    <Activity className="size-3.5" /> Hugging Face
                  </Chip>
                )}
                <Chip selected={aiProvider === "runpod"} onClick={() => handleSetAiProvider("runpod")}>
                  <Cpu className="size-3.5" /> Model Mandiri
                </Chip>
              </div>
            </div>
            {aiProvider === "huggingface" && (
              <div className="mt-4 flex flex-col gap-2 border-t border-border/60 pt-4 sm:flex-row sm:items-center">
                <span className="text-xs font-black uppercase tracking-wider text-text-muted">Model HF Router</span>
                <div className="flex flex-wrap gap-1.5">
                  <Chip selected={aiModel === "openai-oss"} onClick={() => handleSetAiModel("openai-oss")}>
                    <Wand2 className="size-3.5" /> OpenAI OSS
                  </Chip>
                  <Chip selected={aiModel === "deepseek"} onClick={() => handleSetAiModel("deepseek")}>
                    <Activity className="size-3.5" /> DeepSeek
                  </Chip>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Column Left: Pre-loaded Demo presets & step forms (span 8) */}
        <div className="space-y-6 lg:col-span-8" id="clinical-form-container">

          <Card data-density="secondary" padding="sm">
            <div className="mb-2.5 flex items-center gap-1.5">
              <Microscope size={14} className="text-primary" />
              <span className="text-xs font-bold uppercase tracking-wider text-text-muted">Kasus Simulasi Triase (Uji Coba Cepat)</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {MOCK_PRESETS.map((preset, index) => (
                <Chip key={index} selected={false} onClick={() => handleAutoFillPreset(preset)}>
                  {preset.name}
                </Chip>
              ))}
            </div>
          </Card>

          <Stepper steps={STEPS} activeStep={activeStep} onStepClick={setActiveStep} accessible={displayMode === "accessible"} />

          {/* Nested step rendering */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeStep}
              variants={pageTransition}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="space-y-4"
            >
              {activeStep === 0 && (
                <div key={form.id || form.nomorRM || "new-patient"}>
                  <IdentitasForm data={form} onChange={updateFormState} />
                </div>
              )}
              {activeStep === 1 && (
                <KeluhanAwalForm data={form} onChange={updateFormState} />
              )}
              {activeStep === 2 && (
                <VitalSignForm data={form} onChange={updateFormState} />
              )}
              {activeStep === 3 && (
                <NyeriForm data={form} onChange={updateFormState} />
              )}
              {activeStep === 4 && (
                <SOAPFormView data={form} onChange={updateFormState} />
              )}
              {activeStep === 5 && (
                <ATSHasilPanel data={form} onSave={handleSaveTriageLog} isSaving={isSaving} />
              )}
            </motion.div>
          </AnimatePresence>

          {/* Stepper Footer Action Controls */}
          <div className="flex flex-col gap-3 border-t border-border/70 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <Button variant="outline" size="sm" disabled={activeStep === 0} onClick={() => setActiveStep((prev) => Math.max(0, prev - 1))} leftIcon={<ArrowLeft className="size-3.5" />}>
              Kembali
            </Button>

            <div className="flex flex-wrap items-center gap-2">
              <Button variant="ghost" size="sm" onClick={handleResetForm} leftIcon={<RotateCcw className="size-4" />} title="Kosongkan formulir dan masukkan pasien baru">
                Data Pasien Baru / Reset
              </Button>

              {activeStep < 5 && (
                <Button variant="primary" size="sm" onClick={() => setActiveStep((prev) => Math.min(STEPS.length - 1, prev + 1))} rightIcon={<ArrowRight className="size-3.5" />}>
                  Selanjutnya
                </Button>
              )}

              {!form.atsPrediction && (
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={isClassifying}
                  loading={isClassifying}
                  onClick={handleTriggerAISystem}
                  leftIcon={!isClassifying ? <Wand2 className="size-4" /> : undefined}
                >
                  {isClassifying ? "Menganalisis..." : "Analisis ATS dengan AI"}
                </Button>
              )}
            </div>
          </div>

        </div>

        {/* Column Right: Sticky Info Panels & Quick Clinical Help (span 4) */}
        <div className="hidden lg:col-span-4 lg:block lg:space-y-6">

          <Card padding="sm" className="sticky top-24 space-y-4">
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-text-muted">Identitas Live-View</h3>
              <div className="mt-2 space-y-2.5 text-xs font-semibold">
                <div className="flex justify-between border-b border-border/70 pb-1">
                  <span className="text-text-muted">Kode RM</span>
                  <span className="font-mono text-primary">{form.nomorRM || "Ketik Nomor RM..."}</span>
                </div>
                <div className="flex justify-between border-b border-border/70 pb-1">
                  <span className="text-text-muted">Nama Pasien</span>
                  <span className="max-w-[140px] truncate text-text">{form.namaPasien || "Ketik Nama..."}</span>
                </div>
                <div className="flex justify-between border-b border-border/70 pb-1">
                  <span className="text-text-muted">Cara Kedatangan</span>
                  <span className="text-text">{form.caraDatang}</span>
                </div>
                <div className="flex justify-between border-b border-border/70 pb-1">
                  <span className="text-text-muted">Keluhan</span>
                  <span className="max-w-[150px] truncate text-right font-bold text-danger">
                    {form.chiefComplaintCustom || form.chiefComplaint || "Belum diisi"}
                  </span>
                </div>
              </div>
            </div>

            <div className={`space-y-3 rounded-xl border p-3 ${liveLevelDetails ? "border-primary/20 bg-primary/5" : "border-border bg-bg"}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="block text-xs font-black uppercase tracking-widest text-text-muted">Kondisi Pasien & ATS</span>
                  <p className="mt-1 text-sm font-black text-text">{liveLevelDetails ? liveLevelDetails.name : "ATS belum tersedia"}</p>
                  <p className="text-xs font-semibold text-text-muted">{liveLevelDetails ? liveLevelDetails.timeLimit : "Klik Analisis ATS dengan AI"}</p>
                </div>
                <Badge tone={liveHasOverride ? "warning" : "secondary"} className="shrink-0">
                  {liveHasOverride ? "OVERRIDE" : liveProvider}
                </Badge>
              </div>
              <div className="rounded-lg border border-border/70 bg-surface p-2.5">
                <span className="block text-xs font-bold uppercase tracking-wider text-text-muted">Gambaran Kondisi</span>
                <p className="text-xs font-semibold leading-relaxed text-text">{liveCondition}</p>
              </div>
              {form.atsFinal?.namaPetugas && (
                <div className="text-xs font-semibold text-text-muted">
                  Validator: <strong className="text-text">{form.atsFinal.namaPetugas}</strong>
                  {form.atsFinal.jabatanPetugas ? ` (${form.atsFinal.jabatanPetugas})` : ""}
                </div>
              )}
            </div>

            <div className="space-y-1.5 rounded-xl border border-border/70 bg-bg p-3">
              <span className="block text-xs font-bold uppercase tracking-widest text-text-muted">GCS & Vitals Live-State</span>
              <div className="grid grid-cols-2 gap-2 text-center text-xs">
                <div className="rounded-lg border border-border/60 bg-surface p-1.5">
                  <span className="block text-xs font-bold text-text-muted">Respirasi Rate</span>
                  <span className={`font-black ${isRrCritical ? "text-danger" : "text-secondary"}`}>{rrDisplay}</span>
                </div>
                <div className="rounded-lg border border-border/60 bg-surface p-1.5">
                  <span className="block text-xs font-bold text-text-muted">Saturasi</span>
                  <span className={`font-black ${spo2 < 90 && spo2 > 0 ? "text-danger" : "text-secondary"}`}>{spo2Display}</span>
                </div>
              </div>
            </div>

            <div className="space-y-2 rounded-xl border border-border/70 bg-surface p-3">
              <span className="block text-xs font-bold uppercase tracking-widest text-text-muted">Rekomendasi Tindakan</span>
              <ul className="space-y-1.5">
                {liveRecommendations.map((rec, index) => (
                  <li key={index} className="flex items-start gap-2 text-xs font-semibold leading-relaxed text-text">
                    <span className="mt-1 size-1.5 shrink-0 rounded-full bg-secondary" />
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* System Guideline quick reference sheet */}
            <div data-density="secondary" className="space-y-3 rounded-xl border border-border/70 bg-bg p-4">
              <div className="inline-flex items-center gap-1.5">
                <Clock size={13} className="text-text-muted" />
                <span className="text-xs font-black uppercase tracking-wider text-text-muted">Arah Standar Triase Australasia (ATS)</span>
              </div>
              <div className="space-y-2 text-xs font-medium leading-relaxed">
                {ATS_QUICK_REFERENCE.map((item) => (
                  <div key={item.level} className="flex items-center gap-2">
                    <span className={`size-2.5 shrink-0 rounded-full bg-ats-${item.level}`} />
                    <span className="text-text-muted">
                      <strong className="text-text">{ATS_LEVEL_DETAILS[item.level].name}:</strong> {item.label} ({item.limit})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </Card>

        </div>
        </>
        )}
          </motion.div>
        </AnimatePresence>
      </main>
      </div>

      {/* Mobile Floating Action Button — jump into a new triage from any secondary view */}
      {showFab && (
        <motion.button
          type="button"
          onClick={() => { setView("triage"); window.scrollTo({ top: 0, behavior: "smooth" }); }}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          whileTap={{ scale: 0.92 }}
          className="fixed bottom-22 right-4 z-40 flex size-14 items-center justify-center rounded-2xl bg-linear-to-br from-primary to-accent text-white shadow-xl shadow-primary/30 lg:hidden"
          aria-label="Mulai triase baru"
          title="Mulai triase baru"
        >
          <Plus className="size-6" />
        </motion.button>
      )}

      <nav className={`mobile-primary-nav fixed inset-x-2 bottom-3 z-50 grid ${isAdmin ? "grid-cols-5" : "grid-cols-4"} overflow-hidden rounded-2xl border border-border/70 bg-surface/92 p-1.5 shadow-2xl backdrop-blur-xl sm:inset-x-3 lg:hidden`} aria-label="Navigasi utama mobile">
        {MAIN_NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin).map((item) => {
          const MobileIcon = item.icon;
          const active = view === item.id;
          return (
            <button
              key={`mobile-${item.id}`}
              type="button"
              onClick={() => { setView(item.id); window.scrollTo({ top: 0, behavior: "smooth" }); }}
              className={`flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-xs font-bold transition ${
                active ? "bg-linear-to-br from-primary to-accent text-white shadow-md" : "text-text-muted hover:bg-black/5 dark:hover:bg-white/8"
              }`}
              aria-current={active ? "page" : undefined}
            >
              <MobileIcon size={22} />
              <span>{item.shortLabel}</span>
            </button>
          );
        })}
      </nav>

      {/* Floating Status Bar Footer */}
      <footer className="fixed inset-x-0 bottom-0 z-45 hidden border-t border-border/70 bg-surface px-4 py-2 text-center text-xs text-text-muted lg:block">
        <span>© 2026 E-Triase IGD ATS. Buatan untuk Sistem Pendukung Keputusan Triage Medis Darurat.</span>
      </footer>

    </div>
  );
}
