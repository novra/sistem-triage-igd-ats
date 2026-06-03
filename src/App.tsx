import React, { useState, useEffect } from "react";
import { TriageRecord, Gender, CaraDatang, ATS_LEVEL_DETAILS } from "./types";
import IdentitasForm from "./components/IdentitasForm";
import KeluhanAwalForm from "./components/KeluhanAwalForm";
import VitalSignForm from "./components/VitalSignForm";
import NyeriForm from "./components/NyeriForm";
import SOAPFormView from "./components/SOAPFormView";
import ATSHasilPanel from "./components/ATSHasilPanel";
import RecordHistoryList from "./components/RecordHistoryList";
import ATSFlowDiagram from "./components/ATSFlowDiagram";
import ImportTriageRecords from "./components/ImportTriageRecords";
import {
  Activity,
  HeartHandshake,
  ArrowRight,
  ArrowLeft,
  Wand2,
  RefreshCw,
  Sun,
  Moon,
  Database,
  Search,
  CheckCircle2,
  AlertOctagon,
  Microscope,
  RotateCcw,
  Clock,
  Cpu
} from "lucide-react";

const INITIAL_FORM: TriageRecord = {
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
  { label: "Keluhan Utama", desc: "Kategori keluhan & gejala" },
  { label: "Tanda-Tanda Vital", desc: "Parameter fisiologis / GCS" },
  { label: "Skala Nyeri", desc: "Intensitas, lokasi & radiasi" },
  { label: "Pemeriksaan Fisik (SOAP)", desc: "Status lokal tubuh pasien" },
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

export default function App() {
  const [activeStep, setActiveStep] = useState(0);
  const [form, setForm] = useState<TriageRecord>({ ...INITIAL_FORM });
  const [records, setRecords] = useState<TriageRecord[]>([]);
  const [isClassifying, setIsClassifying] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(false);
  const [aiProvider, setAiProvider] = useState<string>(() => {
    return localStorage.getItem("ats_ai_provider") || "gemini";
  });
  const [aiModel, setAiModel] = useState<string>(() => {
    return localStorage.getItem("ats_ai_model") || "openai-oss";
  });

  const handleSetAiProvider = (provider: string) => {
    setAiProvider(provider);
    localStorage.setItem("ats_ai_provider", provider);
  };

  const handleSetAiModel = (model: string) => {
    setAiModel(model);
    localStorage.setItem("ats_ai_model", model);
  };

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

  // Fetch all database records
  const fetchRecords = async () => {
    try {
      const res = await fetch("/api/triage/records");
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
  const handleResetForm = () => {
    if (confirm("Kosongkan seluruh isian form triage yang sedang aktif?")) {
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
      const response = await fetch("/api/triage/classify", {
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

      const response = await fetch("/api/triage/records", {
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
      const res = await fetch(`/api/triage/records/${id}`, { method: "DELETE" });
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
      const res = await fetch("/api/triage/export");
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

  // Pre-load an existing record to continue checking or editing
  const handleLoadExistingRecord = (rec: TriageRecord) => {
    setForm({ ...rec });
    setSuccessMsg(`Rekam triase ${rec.nomorRM} terpilih untuk diedit.`);
    setActiveStep(0);
    setTimeout(() => setSuccessMsg(null), 3500);
  };

  // Critical warnings indicators shown on absolute sticky header for instant ER navigation
  const sbp = Number(form.vitalSign?.tekananDarahSistolik) || 0;
  const rr = Number(form.vitalSign?.respiratoryRate) || 0;
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

  return (
    <div className={`min-h-screen transition-colors ${darkMode ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900"}`}>
      
      {/* Upper header */}
      <header className={`sticky top-0 z-40 border-b transition-all ${darkMode ? "bg-slate-900/95 border-slate-800" : "bg-white/95 border-slate-200"} backdrop-blur-md`}>
        <div className="max-w-7xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-rose-600 text-white rounded-2xl shadow-md flex items-center justify-center animate-pulse">
              <Activity size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-md font-bold tracking-tight">E-Triase IGD ATS</h1>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 rounded-full select-none">
                  BETA PROTOOTYPE
                </span>
              </div>
              <p className="text-[10px] text-slate-400">Clinical Decision Support System - IGD Rumah Sakit Indonesia</p>
            </div>
          </div>

          {/* Quick Real-Time Status Rails */}
          <div className="hidden md:flex items-center gap-4">
            <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50 rounded-lg text-slate-500 dark:text-slate-400 font-bold text-[10px]">
              <span className="pulse-indicator text-emerald-500"></span>
              <span>SISTEM AKTIF</span>
            </div>

            {isHypoxic && (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-rose-100 border border-rose-300 text-rose-800 text-[10px] font-extrabold rounded-lg animate-bounce animate-duration-1000">
                <AlertOctagon size={12} />
                <span>HIPOKSIA DARURAT SpO2 &lt; 90%</span>
              </div>
            )}
            {isComa && (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-red-100 border border-red-300 text-red-800 text-[10px] font-extrabold rounded-lg animate-bounce">
                <AlertOctagon size={12} />
                <span>PENURUNAN KESADARAN BERAT GCS ≤ 8</span>
              </div>
            )}
            
            <div className="flex items-center gap-1 h-[34px] bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 border border-slate-200 dark:border-slate-705">
              <button
                id="btn-light-theme"
                onClick={() => setDarkMode(false)}
                className={`p-1.5 rounded-md cursor-pointer ${!darkMode ? "bg-white text-sky-600 shadow-2xs" : "text-slate-400 hover:text-white"}`}
                title="Mode Terang"
              >
                <Sun size={15} />
              </button>
              <button
                id="btn-dark-theme"
                onClick={() => setDarkMode(true)}
                className={`p-1.5 rounded-md cursor-pointer ${darkMode ? "bg-slate-900 text-amber-400 shadow-2xs" : "text-slate-500 hover:text-black"}`}
                title="Mode Gelap"
              >
                <Moon size={15} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6 pb-24">
        
        {/* Banner triggers & ATS Decision Pipeline Flowchart */}
        <div className="lg:col-span-12 space-y-4">
          {successMsg && (
            <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 px-4 py-3 rounded-xl text-xs font-semibold flex items-center gap-2 animate-fade-in">
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}
          {errorMsg && (
            <div className="bg-rose-50 border border-rose-300 text-rose-800 px-4 py-3 rounded-xl text-xs font-semibold flex items-center gap-2 animate-fade-in">
              <AlertOctagon size={16} className="text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* AI Engine Selection Panel */}
          <div className={`p-5 rounded-2xl border transition-all ${darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"} shadow-xs`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse shrink-0" />
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                    Pilih Penyedia Kecerdasan Buatan (AI Engine Selection)
                  </h3>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                  Silakan pilih penyedia layanan kecerdasan buatan (AI) yang ingin Anda gunakan untuk menganalisis data triase klinis. Apabila sambungan API dari penyedia mengalami kendala atau kunci API belum terpasang, sistem akan beralih secara dinamis dan aman ke kriteria standar berbasis aturan klinis objektif (Rule-Based Clinical Fallback).
                </p>
              </div>
              
              <div className="flex bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700 shrink-0 self-start sm:self-center flex-wrap gap-1 md:gap-0 font-sans">
                <button
                  id="provider-gemini"
                  type="button"
                  onClick={() => handleSetAiProvider("gemini")}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                    aiProvider === "gemini"
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                  }`}
                >
                  <Wand2 size={13} />
                  <span>Google Gemini 3.5</span>
                </button>
                <button
                  id="provider-huggingface"
                  type="button"
                  onClick={() => handleSetAiProvider("huggingface")}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                    aiProvider === "huggingface"
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                  }`}
                >
                  <Activity size={13} />
                  <span>Hugging Face</span>
                </button>
                <button
                  id="provider-custom"
                  type="button"
                  onClick={() => handleSetAiProvider("custom")}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                    aiProvider === "custom"
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                  }`}
                >
                  <Cpu size={13} />
                  <span>Model Mandiri</span>
                </button>
              </div>
            </div>
            {aiProvider === "huggingface" && (
              <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Model HF Router
                </span>
                <div className="flex bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700 w-fit flex-wrap gap-1 font-sans">
                  <button
                    id="hf-model-openai"
                    type="button"
                    onClick={() => handleSetAiModel("openai-oss")}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                      aiModel === "openai-oss"
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400"
                    }`}
                  >
                    <Wand2 size={13} />
                    <span>OpenAI OSS</span>
                  </button>
                  <button
                    id="hf-model-deepseek"
                    type="button"
                    onClick={() => handleSetAiModel("deepseek")}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                      aiModel === "deepseek"
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400"
                    }`}
                  >
                    <Activity size={13} />
                    <span>DeepSeek</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          <ATSFlowDiagram />
        </div>

        {/* Column Left: Pre-loaded Demo presets & step forms (span 8) */}
        <div className="lg:col-span-8 space-y-6" id="clinical-form-container">
          
          {/* Preset Buttons for demonstration */}
          <div className={`p-4 rounded-2xl border ${darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"} shadow-2xs`}>
            <div className="flex items-center gap-1.5 mb-2.5">
              <Microscope size={14} className="text-indigo-500" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Kasus Simulasi Triase (Uji Coba Cepat)</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {MOCK_PRESETS.map((p, index) => (
                <button
                  id={`btn-preset-${index}`}
                  key={index}
                  type="button"
                  onClick={() => handleAutoFillPreset(p)}
                  className="px-2.5 py-1.5 text-[10px] font-extrabold bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/60 dark:text-indigo-300 text-indigo-800 rounded-xl border border-indigo-200/40 cursor-pointer transition select-none"
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          {/* Clinician Form Progress Header Stepper */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {STEPS.map((step, idx) => {
              const active = idx === activeStep;
              const passed = idx < activeStep;
              return (
                <button
                  id={`btn-step-nav-${idx}`}
                  key={idx}
                  onClick={() => setActiveStep(idx)}
                  className={`p-2.5 rounded-xl border text-left transition cursor-pointer select-none h-full ${
                    active
                      ? "border-indigo-500 bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 dark:border-indigo-400 ring-2 ring-indigo-300 dark:ring-indigo-900"
                      : passed
                      ? "border-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-400"
                      : darkMode
                      ? "border-slate-800 bg-slate-900/40 text-slate-500 hover:bg-slate-900"
                      : "border-slate-100 bg-white text-slate-400 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] font-extrabold font-mono opacity-60">Langkah {idx + 1}</span>
                    {passed && <span className="text-[9px] text-emerald-500 font-bold">✔</span>}
                  </div>
                  <h4 className="text-[11px] font-extrabold leading-tight mt-0.5 truncate">{step.label}</h4>
                </button>
              );
            })}
          </div>

          {/* Nested step rendering */}
          <div className="space-y-4">
            {activeStep === 0 && (
              <IdentitasForm data={form} onChange={updateFormState} />
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
          </div>

          {/* Stepper Footer Action Controls */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              id="btn-stepper-back"
              type="button"
              disabled={activeStep === 0}
              onClick={() => setActiveStep((prev) => Math.max(0, prev - 1))}
              className={`flex items-center gap-1 px-4 py-2 text-xs font-bold rounded-xl border justify-center transition cursor-pointer disabled:opacity-30 disabled:pointer-events-none ${
                darkMode ? "border-slate-800 hover:bg-slate-900" : "border-slate-200 hover:bg-slate-50"
              }`}
            >
              <ArrowLeft size={14} />
              <span>Kembali</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                id="btn-reset-current-form"
                type="button"
                onClick={handleResetForm}
                className={`p-2 rounded-xl border transition cursor-pointer hover:bg-rose-50 hover:text-rose-600 ${
                  darkMode ? "border-slate-800 text-slate-400" : "border-slate-200 text-slate-500"
                }`}
                title="Kosongkan Form"
              >
                <RotateCcw size={15} />
              </button>

              {activeStep < 5 ? (
                <button
                  id="btn-stepper-next"
                  type="button"
                  onClick={() => setActiveStep((prev) => Math.min(STEPS.length - 1, prev + 1))}
                  className="flex items-center gap-1 px-4 py-2 text-xs font-bold rounded-xl bg-slate-800 dark:bg-slate-100 dark:text-slate-900 text-white justify-center transition cursor-pointer"
                >
                  <span>Selanjutnya</span>
                  <ArrowRight size={14} />
                </button>
              ) : null}

              {/* Central Trigger Action Button that invokes the AI analysis schema */}
              <button
                id="btn-action-ai-compute"
                type="button"
                disabled={isClassifying}
                onClick={handleTriggerAISystem}
                className="flex items-center gap-1.5 px-4.5 py-2 text-xs font-black rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-md justify-center transition cursor-pointer disabled:opacity-50"
              >
                {isClassifying ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Menganalisis...</span>
                  </>
                ) : (
                  <>
                    <Wand2 size={14} />
                    <span>Analisis ATS dengan AI</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Dynamic Mass Batch Import (CSV/Excel/JSON formats) */}
          <ImportTriageRecords
            onApplyRecord={(rec) => {
              setForm(rec);
              setActiveStep(0);
            }}
            setErrorMsg={setErrorMsg}
            setSuccessMsg={setSuccessMsg}
          />

          {/* Historical Logs List */}
          <RecordHistoryList
            records={records}
            onSelectRecord={handleLoadExistingRecord}
            onDeleteRecord={handleDeleteTriageLog}
            onExportDataset={handleExportJsonDataset}
          />
        </div>

        {/* Column Right: Sticky Info Panels & Quick Clinical Help (span 4) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Quick interactive clinician view about patient progress */}
          <div className={`p-4 rounded-2xl border sticky top-24 ${darkMode ? "bg-slate-900/90 border-slate-800" : "bg-white border-slate-100"} shadow-sm space-y-4`}>
            <div>
              <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider">Identitas Live-View</h3>
              <div className="mt-2 text-xs space-y-2.5 font-semibold">
                <div className="flex justify-between border-b pb-1 dark:border-slate-800">
                  <span className="text-slate-400">Kode RM</span>
                  <span className="font-mono text-indigo-500">{form.nomorRM || "Ketik Nomor RM..."}</span>
                </div>
                <div className="flex justify-between border-b pb-1 dark:border-slate-800">
                  <span className="text-slate-400">Nama Pasien</span>
                  <span className="truncate max-w-[140px] text-slate-800 dark:text-slate-200">{form.namaPasien || "Ketik Nama..."}</span>
                </div>
                <div className="flex justify-between border-b pb-1 dark:border-slate-800">
                  <span className="text-slate-400">Cara Kedatangan</span>
                  <span className="text-slate-700 dark:text-slate-300">{form.caraDatang}</span>
                </div>
                <div className="flex justify-between border-b pb-1 dark:border-slate-800">
                  <span className="text-slate-400">Keluhan</span>
                  <span className="text-rose-600 font-bold truncate max-w-[150px] text-right">
                    {form.chiefComplaintCustom || form.chiefComplaint || "Belum diisi"}
                  </span>
                </div>
              </div>
            </div>

            <div className={`p-3 rounded-xl border space-y-3 ${
              liveLevelDetails
                ? "bg-indigo-50/70 border-indigo-100 dark:bg-indigo-950/20 dark:border-indigo-900/40"
                : "bg-slate-50 border-slate-200 dark:bg-slate-950/40 dark:border-slate-800"
            }`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                    Kondisi Pasien & ATS
                  </span>
                  <p className="mt-1 text-sm font-black text-slate-800 dark:text-slate-100">
                    {liveLevelDetails ? liveLevelDetails.name : "ATS belum tersedia"}
                  </p>
                  <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    {liveLevelDetails ? liveLevelDetails.timeLimit : "Klik Analisis ATS dengan AI"}
                  </p>
                </div>
                <span className={`px-2 py-1 rounded-lg text-[9px] font-black border shrink-0 ${
                  liveHasOverride
                    ? "bg-amber-50 text-amber-700 border-amber-200"
                    : "bg-emerald-50 text-emerald-700 border-emerald-200"
                }`}>
                  {liveHasOverride ? "OVERRIDE" : liveProvider}
                </span>
              </div>
              <div className="rounded-lg bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-2.5">
                <span className="text-[9px] block text-slate-400 font-bold uppercase tracking-wider">Gambaran Kondisi</span>
                <p className="text-[11px] leading-relaxed font-semibold text-slate-700 dark:text-slate-200">
                  {liveCondition}
                </p>
              </div>
              {form.atsFinal?.namaPetugas && (
                <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                  Validator: <strong className="text-slate-700 dark:text-slate-200">{form.atsFinal.namaPetugas}</strong>
                  {form.atsFinal.jabatanPetugas ? ` (${form.atsFinal.jabatanPetugas})` : ""}
                </div>
              )}
            </div>

            {/* Quick GCS reference summary */}
            <div className="bg-slate-50 dark:bg-slate-950/40 p-3 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">GCS & Vitals Live-State</span>
              <div className="grid grid-cols-2 gap-2 text-center text-xs text-slate-700 dark:text-slate-200">
                <div className="p-1.5 bg-white dark:bg-slate-900 rounded-lg shadow-3xs">
                  <span className="text-[9px] block text-slate-400 font-bold">Respirasi Rate</span>
                  <span className={`font-black ${rr > 30 || (rr > 0 && rr < 8) ? "text-rose-600" : "text-emerald-500"}`}>{form.vitalSign?.respiratoryRate || "N/A"}/m</span>
                </div>
                <div className="p-1.5 bg-white dark:bg-slate-900 rounded-lg shadow-3xs">
                  <span className="text-[9px] block text-slate-400 font-bold">Saturasi</span>
                  <span className={`font-black ${spo2 < 90 && spo2 > 0 ? "text-rose-600" : "text-emerald-500"}`}>{form.vitalSign?.saturasiOksigen || "N/A"}%</span>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Rekomendasi Tindakan</span>
              <ul className="space-y-1.5">
                {liveRecommendations.map((rec, index) => (
                  <li key={index} className="flex items-start gap-2 text-[11px] font-semibold leading-relaxed text-slate-700 dark:text-slate-200">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* System Guideline quick reference sheet */}
            <div className="p-4 bg-slate-50/85 dark:bg-slate-950/20 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3">
              <div className="inline-flex items-center gap-1.5">
                <Clock size={13} className="text-slate-400" />
                <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider">Arah Standar Triase Australasia (ATS)</span>
              </div>
              
              <div className="space-y-2 text-[10px] font-medium leading-relaxed">
                <div className="flex gap-2 items-center">
                  <span className="w-2.5 h-2.5 bg-red-600 rounded-full shrink-0"></span>
                  <span className="text-slate-600 dark:text-slate-350"><strong className="text-slate-800 dark:text-slate-100">ATS 1 (Merah):</strong> Resusitasi total / segera</span>
                </div>
                <div className="flex gap-2 items-center">
                  <span className="w-2.5 h-2.5 bg-orange-500 rounded-full shrink-0"></span>
                  <span className="text-slate-600 dark:text-slate-350"><strong className="text-slate-800 dark:text-slate-100">ATS 2 (Orange):</strong> Gawat darurat ≤ 10 menit</span>
                </div>
                <div className="flex gap-2 items-center">
                  <span className="w-2.5 h-2.5 bg-green-600 rounded-full shrink-0"></span>
                  <span className="text-slate-600 dark:text-slate-350"><strong className="text-slate-800 dark:text-slate-100">ATS 3 (Hijau):</strong> Darurat ≤ 30 menit</span>
                </div>
                <div className="flex gap-2 items-center">
                  <span className="w-2.5 h-2.5 bg-blue-600 rounded-full shrink-0"></span>
                  <span className="text-slate-600 dark:text-slate-350"><strong className="text-slate-800 dark:text-slate-100">ATS 4 (Biru):</strong> Ringan ≤ 60 menit</span>
                </div>
                <div className="flex gap-2 items-center">
                  <span className="w-2.5 h-2.5 bg-slate-400 rounded-full shrink-0"></span>
                  <span className="text-slate-600 dark:text-slate-350"><strong className="text-slate-800 dark:text-slate-100">ATS 5 (Putih):</strong> Non-emergency ≤ 120 menit</span>
                </div>
              </div>
            </div>
          </div>
          
        </div>

      </main>

      {/* Floating Status Bar Footer */}
      <footer className={`fixed bottom-0 left-0 right-0 z-45 border-t py-2 px-4 transition-all text-center text-[10px] ${
        darkMode ? "bg-slate-900 text-slate-400 border-slate-800" : "bg-white text-slate-500 border-slate-200"
      }`}>
        <span>© 2026 E-Triase IGD ATS. Buatan untuk Sistem Pendukung Keputusan Triage Medis Darurat.</span>
      </footer>

    </div>
  );
}
