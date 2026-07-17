import React, { useEffect, useState } from "react";
import { Gender, CaraDatang, TriageRecord } from "../types";
import { User, ClipboardList, Calendar, Clock, Truck, Search, UserPlus, Users, RefreshCw, CheckCircle2 } from "lucide-react";
import { apiFetch } from "../lib/api";

interface IdentitasFormProps {
  data: TriageRecord;
  onChange: (fields: Partial<TriageRecord>) => void;
}

const HISTORIC_DISEASES = [
  "Hipertensi",
  "Diabetes Melitus",
  "Penyakit Jantung",
  "Stroke",
  "Asma",
  "PPOK",
  "Gagal Ginjal",
  "Epilepsi",
  "Kanker",
  "Kehamilan",
  "Alergi Obat",
  "Tidak ada riwayat penyakit"
];

interface PatientSummary {
  nomorRM: string;
  namaPasien: string;
  tanggalLahir: string;
  umur: number;
  gender: Gender;
  riwayatPenyakit: string[];
  riwayatPenyakitLainnya: string;
  terakhirDiperbarui?: string;
}

export default function IdentitasForm({ data, onChange }: IdentitasFormProps) {
  const isEditingSavedRecord = Boolean(data.id);
  const [patientMode, setPatientMode] = useState<"new" | "existing">(
    data.patientType || (data.nomorRM ? "existing" : "new")
  );
  const [patientSearch, setPatientSearch] = useState("");
  const [patients, setPatients] = useState<PatientSummary[]>([]);
  const [isPatientSelected, setIsPatientSelected] = useState(
    patientMode === "existing" && Boolean(data.nomorRM)
  );
  const [isSearchingPatients, setIsSearchingPatients] = useState(false);
  const [isGeneratingRm, setIsGeneratingRm] = useState(false);
  const [identityError, setIdentityError] = useState("");

  const generateRm = async () => {
    setIsGeneratingRm(true);
    setIdentityError("");
    try {
      const response = await apiFetch("/api/triage/patients/generate-rm", { method: "POST" });
      if (!response.ok) throw new Error("Nomor RM otomatis gagal dibuat.");
      const result = await response.json();
      onChange({ nomorRM: result.nomorRM, patientType: "new" });
    } catch (error) {
      setIdentityError(error instanceof Error ? error.message : "Nomor RM otomatis gagal dibuat.");
    } finally {
      setIsGeneratingRm(false);
    }
  };

  useEffect(() => {
    if (patientMode === "new" && !data.nomorRM && !isEditingSavedRecord) {
      generateRm();
    }
    // Generate only when the identity form first opens for a new patient.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (patientMode !== "existing" || isEditingSavedRecord || isPatientSelected) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setIsSearchingPatients(true);
      setIdentityError("");
      try {
        const query = patientSearch.trim() ? `?search=${encodeURIComponent(patientSearch.trim())}` : "";
        const response = await apiFetch(`/api/triage/patients${query}`, { signal: controller.signal });
        if (!response.ok) throw new Error("Daftar pasien lama gagal dimuat.");
        setPatients(await response.json());
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setIdentityError(error instanceof Error ? error.message : "Daftar pasien lama gagal dimuat.");
        }
      } finally {
        setIsSearchingPatients(false);
      }
    }, 300);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [patientMode, patientSearch, isEditingSavedRecord, isPatientSelected]);

  const changePatientMode = (mode: "new" | "existing") => {
    setPatientMode(mode);
    setIdentityError("");
    setPatientSearch("");
    setPatients([]);
    setIsPatientSelected(false);
    onChange({
      patientType: mode,
      nomorRM: "",
      namaPasien: "",
      tanggalLahir: "",
      umur: 0,
      gender: Gender.LAKI_LAKI,
      riwayatPenyakit: [],
      riwayatPenyakitLainnya: "",
    });
    if (mode === "new" && !data.nomorRM) {
      window.setTimeout(generateRm, 0);
    }
  };

  const selectExistingPatient = (patient: PatientSummary) => {
    onChange({
      id: undefined,
      patientType: "existing",
      nomorRM: patient.nomorRM,
      namaPasien: patient.namaPasien,
      tanggalLahir: patient.tanggalLahir,
      umur: patient.umur,
      gender: patient.gender,
      riwayatPenyakit: patient.riwayatPenyakit,
      riwayatPenyakitLainnya: patient.riwayatPenyakitLainnya,
      atsPrediction: undefined,
      atsFinal: undefined,
    });
    setPatientSearch(`${patient.namaPasien} — ${patient.nomorRM}`);
    setPatients([]);
    setIsPatientSelected(true);
  };
  // Automatically calculate age from Date of Birth
  useEffect(() => {
    if (data.tanggalLahir) {
      const birth = new Date(data.tanggalLahir);
      if (!isNaN(birth.getTime())) {
        const today = new Date();
        let age = today.getFullYear() - birth.getFullYear();
        const m = today.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
          age--;
        }
        onChange({ umur: Math.max(0, age) });
      }
    }
  }, [data.tanggalLahir]);

  // Set default visit date and time if not yet populated
  useEffect(() => {
    const todayStr = new Date().toISOString().split("T")[0];
    const hourStr = new Date().toTimeString().split(" ")[0].substring(0, 5);
    
    const updates: Partial<TriageRecord> = {};
    if (!data.tanggalKunjungan) updates.tanggalKunjungan = todayStr;
    if (!data.jamKunjungan) updates.jamKunjungan = hourStr;
    
    if (Object.keys(updates).length > 0) {
      onChange(updates);
    }
  }, []);

  const handleDiseaseToggle = (disease: string) => {
    let list = [...(data.riwayatPenyakit || [])];
    
    if (disease === "Tidak ada riwayat penyakit") {
      // If none selected, clear others
      list = ["Tidak ada riwayat penyakit"];
    } else {
      // Remove "Tidak ada riwayat" if selecting something else
      list = list.filter(item => item !== "Tidak ada riwayat penyakit");
      
      if (list.includes(disease)) {
        list = list.filter(item => item !== disease);
      } else {
        list.push(disease);
      }
    }
    onChange({ riwayatPenyakit: list });
  };

  return (
    <div className="space-y-6 animate-fade-in" id="identitas-form-section">
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
        <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
          <div className="p-1.5 bg-sky-50 text-sky-600 rounded-lg">
            <User size={18} />
          </div>
          <h2 className="text-md font-semibold text-slate-800">1. Identitas Pasien IGD</h2>
        </div>

        {isEditingSavedRecord ? (
          <div className="mb-5 flex items-start gap-3 rounded-2xl border border-indigo-200 bg-indigo-50 p-4 text-indigo-900 dark:border-indigo-900 dark:bg-indigo-950/30 dark:text-indigo-200">
            <CheckCircle2 size={22} className="mt-0.5 shrink-0" />
            <div>
              <strong className="block text-base">Mode edit rekam triase</strong>
              <p className="mt-1 text-sm font-medium">Identitas tetap terhubung dengan rekam yang dipilih. Gunakan tombol Data Pasien Baru / Reset jika ingin membuat kunjungan baru.</p>
            </div>
          </div>
        ) : (
          <div className="mb-5 space-y-4">
            <div>
              <span className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-200">Pilih status pasien</span>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button type="button" onClick={() => changePatientMode("new")} className={`flex min-h-20 items-center gap-3 rounded-2xl border-2 p-4 text-left transition ${patientMode === "new" ? "border-emerald-500 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-200 dark:ring-emerald-950" : "border-slate-200 bg-white text-slate-600 hover:border-emerald-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"}`}>
                  <span className={`rounded-xl p-2.5 ${patientMode === "new" ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-500 dark:bg-slate-800"}`}><UserPlus size={24} /></span>
                  <span><strong className="block text-base">Pasien Baru</strong><span className="mt-1 block text-sm font-medium opacity-75">Nomor RM dibuat otomatis</span></span>
                </button>
                <button type="button" onClick={() => changePatientMode("existing")} className={`flex min-h-20 items-center gap-3 rounded-2xl border-2 p-4 text-left transition ${patientMode === "existing" ? "border-indigo-500 bg-indigo-50 text-indigo-900 ring-2 ring-indigo-100 dark:bg-indigo-950/30 dark:text-indigo-200 dark:ring-indigo-950" : "border-slate-200 bg-white text-slate-600 hover:border-indigo-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"}`}>
                  <span className={`rounded-xl p-2.5 ${patientMode === "existing" ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500 dark:bg-slate-800"}`}><Users size={24} /></span>
                  <span><strong className="block text-base">Pasien Lama</strong><span className="mt-1 block text-sm font-medium opacity-75">Cari dari data yang terdaftar</span></span>
                </button>
              </div>
            </div>

            {patientMode === "existing" && (
              <div className="relative rounded-2xl border border-indigo-200 bg-indigo-50/60 p-4 dark:border-indigo-900 dark:bg-indigo-950/20">
                {isPatientSelected && data.nomorRM ? (
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3">
                      <span className="rounded-xl bg-indigo-600 p-2.5 text-white"><CheckCircle2 size={22} /></span>
                      <div><span className="text-sm font-bold text-indigo-700 dark:text-indigo-300">Pasien lama terpilih</span><strong className="mt-1 block text-lg text-slate-950 dark:text-white">{data.namaPasien}</strong><span className="font-mono text-sm font-bold text-indigo-700 dark:text-indigo-300">{data.nomorRM}</span></div>
                    </div>
                    <button type="button" onClick={() => { setIsPatientSelected(false); setPatientSearch(""); }} className="rounded-xl border border-indigo-200 bg-white px-4 py-2 text-sm font-bold text-indigo-700 hover:bg-indigo-50 dark:border-indigo-800 dark:bg-slate-900 dark:text-indigo-300">Cari pasien lain</button>
                  </div>
                ) : (
                  <>
                    <label className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-200">Cari pasien lama berdasarkan nama atau nomor RM</label>
                    <div className="relative">
                      <Search size={20} className="pointer-events-none absolute left-4 top-3.5 text-slate-500" />
                      <input type="search" value={patientSearch} onChange={(event) => setPatientSearch(event.target.value)} placeholder="Contoh: Siti Aminah atau RM-2026..." className="w-full rounded-xl border-2 border-slate-200 bg-white py-3 pl-12 pr-12 text-base focus:border-indigo-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-950" />
                      {isSearchingPatients && <RefreshCw size={20} className="absolute right-4 top-3.5 animate-spin text-indigo-600" />}
                    </div>
                    {patients.length > 0 && (
                      <div className="mt-3 max-h-72 space-y-2 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 shadow-lg dark:border-slate-700 dark:bg-slate-900">
                        {patients.map((patient) => (
                          <button key={patient.nomorRM} type="button" onClick={() => selectExistingPatient(patient)} className="flex w-full items-center justify-between gap-4 rounded-xl border border-transparent p-3 text-left hover:border-indigo-200 hover:bg-indigo-50 dark:hover:border-indigo-800 dark:hover:bg-indigo-950/30">
                            <span className="min-w-0"><strong className="block truncate text-base text-slate-900 dark:text-white">{patient.namaPasien}</strong><span className="mt-1 block font-mono text-sm font-bold text-indigo-700 dark:text-indigo-300">{patient.nomorRM}</span></span>
                            <span className="shrink-0 text-right text-sm font-medium text-slate-500"><span className="block">{patient.umur} tahun · {patient.gender}</span><span className="block">{patient.tanggalLahir || "Tanggal lahir belum tercatat"}</span></span>
                          </button>
                        ))}
                      </div>
                    )}
                    {!isSearchingPatients && patientSearch.trim() && patients.length === 0 && !data.nomorRM && (
                      <p className="mt-3 rounded-xl bg-white p-3 text-sm font-semibold text-slate-600 dark:bg-slate-900 dark:text-slate-300">Pasien tidak ditemukan. Pilih Pasien Baru untuk membuat identitas baru.</p>
                    )}
                  </>
                )}
              </div>
            )}

            {identityError && <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">{identityError}</div>}
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              Nomor Rekam Medis (RM) <span className="text-rose-500">*</span>
            </label>
            <input
              id="input-nomor-rm"
              type="text"
              placeholder={isGeneratingRm ? "Sedang membuat nomor RM..." : "Nomor RM otomatis"}
              className="w-full px-3 py-2 text-sm font-bold font-mono bg-slate-200/70 border border-slate-200 rounded-xl text-slate-700 cursor-not-allowed"
              value={data.nomorRM || ""}
              readOnly
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              Nama Pasien <span className="text-rose-500">*</span>
            </label>
            <input
              id="input-nama-pasien"
              type="text"
              placeholder="Nama lengkap pasien"
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-sky-500 focus:bg-white transition"
              value={data.namaPasien || ""}
              onChange={(e) => onChange({ namaPasien: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              Tanggal Lahir
            </label>
            <div className="relative">
              <input
                id="input-tanggal-lahir"
                type="date"
                className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-sky-500 focus:bg-white transition"
                value={data.tanggalLahir || ""}
                onChange={(e) => onChange({ tanggalLahir: e.target.value })}
              />
              <Calendar size={14} className="absolute left-3 top-3 text-slate-400" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                Umur (Tahun)
              </label>
              <input
                id="input-umur"
                type="number"
                min="0"
                className="w-full px-3 py-2 text-sm bg-slate-200/60 border border-slate-200 rounded-xl font-medium text-slate-700 cursor-not-allowed"
                value={data.umur ?? ""}
                readOnly
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                Jenis Kelamin
              </label>
              <div className="flex gap-2 h-[38px] items-center">
                <label className="flex-1 flex items-center justify-center gap-1.5 h-full border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition px-2">
                  <input
                    id="radio-gender-laki"
                    type="radio"
                    name="gender"
                    value={Gender.LAKI_LAKI}
                    checked={data.gender === Gender.LAKI_LAKI}
                    onChange={() => onChange({ gender: Gender.LAKI_LAKI })}
                    className="accent-sky-500"
                  />
                  <span className="text-xs text-slate-700 select-none">Laki-Laki</span>
                </label>
                <label className="flex-1 flex items-center justify-center gap-1.5 h-full border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition px-2">
                  <input
                    id="radio-gender-perempuan"
                    type="radio"
                    name="gender"
                    value={Gender.PEREMPUAN}
                    checked={data.gender === Gender.PEREMPUAN}
                    onChange={() => onChange({ gender: Gender.PEREMPUAN })}
                    className="accent-sky-500"
                  />
                  <span className="text-xs text-slate-700 select-none">Perempuan</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
        <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
          <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
            <Clock size={18} />
          </div>
          <h2 className="text-md font-semibold text-slate-800">2. Informasi Kedatangan IGD</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              Tanggal Kunjungan
            </label>
            <input
              id="input-tanggal-kunjungan"
              type="date"
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-sky-500 focus:bg-white transition"
              value={data.tanggalKunjungan || ""}
              onChange={(e) => onChange({ tanggalKunjungan: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              Jam Kunjungan
            </label>
            <input
              id="input-jam-kunjungan"
              type="time"
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-sky-500 focus:bg-white transition"
              value={data.jamKunjungan || ""}
              onChange={(e) => onChange({ jamKunjungan: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              Cara Kedatangan Pasien
            </label>
            <div className="relative">
              <select
                id="select-cara-datang"
                value={data.caraDatang || CaraDatang.JALAN_SENDIRI}
                onChange={(e) => onChange({ caraDatang: e.target.value as CaraDatang })}
                className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-sky-500 focus:bg-white appearance-none transition"
              >
                {Object.values(CaraDatang).map((cara) => (
                  <option key={cara} value={cara}>
                    {cara}
                  </option>
                ))}
              </select>
              <Truck size={14} className="absolute left-3 top-3 text-slate-400 pointer-events-none" />
              <div className="absolute right-3 top-3 pointer-events-none">
                <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
        <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
          <div className="p-1.5 bg-violet-50 text-violet-600 rounded-lg">
            <ClipboardList size={18} />
          </div>
          <h2 className="text-md font-semibold text-slate-800">3. Riwayat Penyakit Dahulu</h2>
        </div>

        <div>
          <span className="block text-xs font-medium text-slate-500 mb-3">
            Pilih Riwayat Penyakit (Bisa Multi-select):
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {HISTORIC_DISEASES.map((disease) => {
              const isChecked = (data.riwayatPenyakit || []).includes(disease);
              return (
                <label
                  key={disease}
                  id={`label-disease-${disease.replace(/\s+/g, '-').toLowerCase()}`}
                  className={`flex items-start gap-2 p-2.5 rounded-xl border text-left cursor-pointer transition select-none ${
                    isChecked
                      ? "border-sky-500 bg-sky-50/50 text-sky-900"
                      : "border-slate-100 hover:bg-slate-50 text-slate-600"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => handleDiseaseToggle(disease)}
                    className="mt-0.5 accent-sky-500"
                  />
                  <span className="text-[11px] font-medium leading-tight">{disease}</span>
                </label>
              );
            })}
          </div>

          <div className="mt-4">
            <label className="block text-xs font-medium text-slate-500 mb-1">
              Riwayat Penyakit Lainnya / Alergi Makanan / Catatan Tambahan
            </label>
            <input
              id="input-riwayat-lainnya"
              type="text"
              placeholder="Sebutkan jika ada..."
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-sky-500 focus:bg-white transition"
              value={data.riwayatPenyakitLainnya || ""}
              onChange={(e) => onChange({ riwayatPenyakitLainnya: e.target.value })}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
