import React, { useEffect } from "react";
import { Gender, CaraDatang, TriageRecord } from "../types";
import { User, ClipboardList, Calendar, Clock, Truck } from "lucide-react";

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

export default function IdentitasForm({ data, onChange }: IdentitasFormProps) {
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
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              Nomor Rekam Medis (RM) <span className="text-rose-500">*</span>
            </label>
            <input
              id="input-nomor-rm"
              type="text"
              placeholder="Contoh: RM-109282"
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-sky-500 focus:bg-white transition"
              value={data.nomorRM || ""}
              onChange={(e) => onChange({ nomorRM: e.target.value })}
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
