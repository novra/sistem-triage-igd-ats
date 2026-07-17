import React, { useEffect, useState } from "react";
import { Gender, CaraDatang, TriageRecord } from "../types";
import { User, ClipboardList, Calendar, Clock, Truck, Search, UserPlus, Users, RefreshCw, CheckCircle2 } from "lucide-react";
import { apiFetch } from "../lib/api";
import { Card } from "./ui/Card";
import { Input, SelectField } from "./ui/Input";
import { Button } from "./ui/Button";
import { Chip } from "./ui/Badge";

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

function SectionCard({ icon: Icon, tone, title, children }: { icon: React.ComponentType<{ size?: number }>; tone: string; title: string; children: React.ReactNode }) {
  return (
    <Card padding="md">
      <div className="mb-4 flex items-center gap-2.5 border-b border-border/70 pb-3">
        <div className={`rounded-lg p-1.5 ${tone}`}>
          <Icon size={18} />
        </div>
        <h2 className="text-sm font-bold text-text">{title}</h2>
      </div>
      {children}
    </Card>
  );
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
    <div className="space-y-4" id="identitas-form-section">
      <SectionCard icon={User} tone="bg-primary/10 text-primary" title="1. Identitas Pasien IGD">
        {isEditingSavedRecord ? (
          <div className="mb-5 flex items-start gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4 text-text">
            <CheckCircle2 size={22} className="mt-0.5 shrink-0 text-primary" />
            <div>
              <strong className="block text-base">Mode edit rekam triase</strong>
              <p className="mt-1 text-sm font-medium text-text-muted">Identitas tetap terhubung dengan rekam yang dipilih. Gunakan tombol Data Pasien Baru / Reset jika ingin membuat kunjungan baru.</p>
            </div>
          </div>
        ) : (
          <div className="mb-5 space-y-4">
            <div>
              <span className="mb-2 block text-sm font-bold text-text">Pilih status pasien</span>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button type="button" onClick={() => changePatientMode("new")} className={`flex min-h-20 items-center gap-3 rounded-2xl border-2 p-4 text-left transition ${patientMode === "new" ? "border-secondary bg-secondary/10 text-text ring-2 ring-secondary/20" : "border-border bg-surface text-text-muted hover:border-secondary/40"}`}>
                  <span className={`rounded-xl p-2.5 ${patientMode === "new" ? "bg-secondary text-secondary-foreground" : "bg-black/5 text-text-muted dark:bg-white/10"}`}><UserPlus size={24} /></span>
                  <span><strong className="block text-base text-text">Pasien Baru</strong><span className="mt-1 block text-sm font-medium opacity-75">Nomor RM dibuat otomatis</span></span>
                </button>
                <button type="button" onClick={() => changePatientMode("existing")} className={`flex min-h-20 items-center gap-3 rounded-2xl border-2 p-4 text-left transition ${patientMode === "existing" ? "border-primary bg-primary/10 text-text ring-2 ring-primary/20" : "border-border bg-surface text-text-muted hover:border-primary/40"}`}>
                  <span className={`rounded-xl p-2.5 ${patientMode === "existing" ? "bg-primary text-primary-foreground" : "bg-black/5 text-text-muted dark:bg-white/10"}`}><Users size={24} /></span>
                  <span><strong className="block text-base text-text">Pasien Lama</strong><span className="mt-1 block text-sm font-medium opacity-75">Cari dari data yang terdaftar</span></span>
                </button>
              </div>
            </div>

            {patientMode === "existing" && (
              <div className="relative rounded-2xl border border-primary/20 bg-primary/5 p-4">
                {isPatientSelected && data.nomorRM ? (
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3">
                      <span className="rounded-xl bg-primary p-2.5 text-primary-foreground"><CheckCircle2 size={22} /></span>
                      <div><span className="text-sm font-bold text-primary">Pasien lama terpilih</span><strong className="mt-1 block text-lg text-text">{data.namaPasien}</strong><span className="font-mono text-sm font-bold text-primary">{data.nomorRM}</span></div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => { setIsPatientSelected(false); setPatientSearch(""); }}>Cari pasien lain</Button>
                  </div>
                ) : (
                  <>
                    <Input
                      type="search"
                      label="Cari pasien lama berdasarkan nama atau nomor RM"
                      value={patientSearch}
                      onChange={(event) => setPatientSearch(event.target.value)}
                      placeholder=" "
                      leftIcon={<Search className="size-4" />}
                    />
                    {isSearchingPatients && (
                      <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-primary">
                        <RefreshCw className="size-3.5 animate-spin" /> Mencari pasien...
                      </p>
                    )}
                    {patients.length > 0 && (
                      <div className="mt-3 max-h-72 space-y-2 overflow-y-auto rounded-xl border border-border bg-surface p-2 shadow-lg">
                        {patients.map((patient) => (
                          <button key={patient.nomorRM} type="button" onClick={() => selectExistingPatient(patient)} className="flex w-full items-center justify-between gap-4 rounded-xl border border-transparent p-3 text-left hover:border-primary/30 hover:bg-primary/5">
                            <span className="min-w-0"><strong className="block truncate text-base text-text">{patient.namaPasien}</strong><span className="mt-1 block font-mono text-sm font-bold text-primary">{patient.nomorRM}</span></span>
                            <span className="shrink-0 text-right text-sm font-medium text-text-muted"><span className="block">{patient.umur} tahun &middot; {patient.gender}</span><span className="block">{patient.tanggalLahir || "Tanggal lahir belum tercatat"}</span></span>
                          </button>
                        ))}
                      </div>
                    )}
                    {!isSearchingPatients && patientSearch.trim() && patients.length === 0 && !data.nomorRM && (
                      <p className="mt-3 rounded-xl bg-surface p-3 text-sm font-semibold text-text-muted">Pasien tidak ditemukan. Pilih Pasien Baru untuk membuat identitas baru.</p>
                    )}
                  </>
                )}
              </div>
            )}

            {identityError && <div className="rounded-xl border border-danger/30 bg-danger/5 p-3 text-sm font-semibold text-danger">{identityError}</div>}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input
            id="input-nomor-rm"
            label="Nomor Rekam Medis (RM) *"
            placeholder={isGeneratingRm ? "Sedang membuat nomor RM..." : " "}
            className="font-mono font-bold"
            value={data.nomorRM || ""}
            readOnly
          />

          <Input
            id="input-nama-pasien"
            label="Nama Pasien *"
            value={data.namaPasien || ""}
            onChange={(e) => onChange({ namaPasien: e.target.value })}
          />

          <Input
            id="input-tanggal-lahir"
            type="date"
            label="Tanggal Lahir"
            leftIcon={<Calendar className="size-4" />}
            value={data.tanggalLahir || ""}
            onChange={(e) => onChange({ tanggalLahir: e.target.value })}
          />

          <div className="grid grid-cols-2 gap-2">
            <Input id="input-umur" type="number" min="0" label="Umur (Tahun)" value={data.umur ?? ""} readOnly />
            <div>
              <span className="mb-1.5 block text-xs font-bold text-text-muted">Jenis Kelamin</span>
              <div className="flex h-10.5 gap-1.5">
                <Chip selected={data.gender === Gender.LAKI_LAKI} onClick={() => onChange({ gender: Gender.LAKI_LAKI })} className="flex-1 justify-center">
                  Laki-Laki
                </Chip>
                <Chip selected={data.gender === Gender.PEREMPUAN} onClick={() => onChange({ gender: Gender.PEREMPUAN })} className="flex-1 justify-center">
                  Perempuan
                </Chip>
              </div>
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard icon={Clock} tone="bg-secondary/10 text-secondary" title="2. Informasi Kedatangan IGD">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Input
            id="input-tanggal-kunjungan"
            type="date"
            label="Tanggal Kunjungan"
            value={data.tanggalKunjungan || ""}
            onChange={(e) => onChange({ tanggalKunjungan: e.target.value })}
          />
          <Input
            id="input-jam-kunjungan"
            type="time"
            label="Jam Kunjungan"
            value={data.jamKunjungan || ""}
            onChange={(e) => onChange({ jamKunjungan: e.target.value })}
          />
          <SelectField
            id="select-cara-datang"
            label="Cara Kedatangan Pasien"
            leftIcon={<Truck className="size-4" />}
            value={data.caraDatang || CaraDatang.JALAN_SENDIRI}
            onChange={(e) => onChange({ caraDatang: e.target.value as CaraDatang })}
          >
            {Object.values(CaraDatang).map((cara) => (
              <option key={cara} value={cara}>
                {cara}
              </option>
            ))}
          </SelectField>
        </div>
      </SectionCard>

      <SectionCard icon={ClipboardList} tone="bg-accent/10 text-accent" title="3. Riwayat Penyakit Dahulu">
        <span className="mb-3 block text-xs font-bold text-text-muted">Pilih Riwayat Penyakit (Bisa Multi-select):</span>
        <div className="flex flex-wrap gap-1.5">
          {HISTORIC_DISEASES.map((disease) => (
            <Chip
              key={disease}
              id={`label-disease-${disease.replace(/\s+/g, "-").toLowerCase()}`}
              selected={(data.riwayatPenyakit || []).includes(disease)}
              onClick={() => handleDiseaseToggle(disease)}
            >
              {disease}
            </Chip>
          ))}
        </div>

        <div className="mt-4">
          <Input
            id="input-riwayat-lainnya"
            label="Riwayat Penyakit Lainnya / Alergi Makanan / Catatan Tambahan"
            placeholder=" "
            value={data.riwayatPenyakitLainnya || ""}
            onChange={(e) => onChange({ riwayatPenyakitLainnya: e.target.value })}
          />
        </div>
      </SectionCard>
    </div>
  );
}
