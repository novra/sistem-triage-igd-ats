import React from "react";
import { TriageRecord } from "../types";
import { AlertTriangle, Activity } from "lucide-react";

interface KeluhanAwalFormProps {
  data: TriageRecord;
  onChange: (fields: Partial<TriageRecord>) => void;
}

const KATEGORI_KELUHAN = [
  "Sesak napas",
  "Nyeri dada",
  "Trauma",
  "Demam",
  "Penurunan kesadaran",
  "Kejang",
  "Nyeri perut",
  "Muntah/diare",
  "Stroke",
  "Luka/perdarahan",
  "Lain-lain"
];

const GEJALA_TAMBAHAN = [
  "Sesak berat",
  "Sianosis",
  "Muntah",
  "Perdarahan aktif",
  "Penurunan kesadaran",
  "Kelemahan anggota gerak",
  "Kejang aktif",
  "Nyeri menjalar",
  "Demam tinggi",
  "Diaforesis (Keringat dingin)",
  "Distress pernapasan"
];

export default function KeluhanAwalForm({ data, onChange }: KeluhanAwalFormProps) {
  const handleGejalaToggle = (gejala: string) => {
    let list = [...(data.gejalaTambahan || [])];
    if (list.includes(gejala)) {
      list = list.filter(item => item !== gejala);
    } else {
      list.push(gejala);
    }
    onChange({ gejalaTambahan: list });
  };

  return (
    <div className="space-y-6 animate-fade-in" id="keluhan-awal-section">
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
        <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
          <div className="p-1.5 bg-rose-50 text-rose-600 rounded-lg">
            <AlertTriangle size={18} />
          </div>
          <h2 className="text-md font-semibold text-slate-800">1. Keluhan Utama (Chief Complaint)</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-2">
              Kategori Keluhan Utama <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {KATEGORI_KELUHAN.map((kategori) => {
                const isSelected = data.chiefComplaint === kategori;
                return (
                  <button
                    key={kategori}
                    id={`btn-complaint-${kategori.replace(/\s+/g, '-').toLowerCase()}`}
                    type="button"
                    onClick={() => onChange({ chiefComplaint: kategori })}
                    className={`p-2.5 rounded-xl border text-xs font-medium transition cursor-pointer text-left select-none ${
                      isSelected
                        ? "border-rose-500 bg-rose-50/50 text-rose-800 ring-2 ring-rose-300"
                        : "border-slate-100 hover:bg-slate-50 text-slate-600"
                    }`}
                  >
                    <span>{kategori}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-2">
            <label className="block text-xs font-medium text-slate-500 mb-1">
              Detail / Deskripsi Keluhan (Ketik Bebas Jika Diperlukan)
            </label>
            <textarea
              id="input-keluhan-custom"
              value={data.chiefComplaintCustom || ""}
              onChange={(e) => onChange({ chiefComplaintCustom: e.target.value })}
              placeholder="Contoh: Nyeri dada sebelah kiri tembus ke punggung belakang sejak 2 jam lalu..."
              rows={3}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-hidden focus:border-rose-500 focus:bg-white transition"
            />
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
        <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
          <div className="p-1.5 bg-sky-50 text-sky-600 rounded-lg">
            <Activity size={18} />
          </div>
          <h2 className="text-md font-semibold text-slate-800">2. Gejala Tambahan Penyerta</h2>
        </div>

        <div>
          <span className="block text-xs font-medium text-slate-500 mb-3">
            Pilih gejala tambahan yang teramati (Bisa Multi-select):
          </span>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {GEJALA_TAMBAHAN.map((gejala) => {
              const isChecked = (data.gejalaTambahan || []).includes(gejala);
              return (
                <label
                  key={gejala}
                  id={`label-gejala-${gejala.replace(/\s+/g, '-').toLowerCase()}`}
                  className={`flex items-start gap-2 p-3 rounded-xl border text-left cursor-pointer transition select-none ${
                    isChecked
                      ? "border-sky-500 bg-sky-50/50 text-sky-800"
                      : "border-slate-100 hover:bg-slate-50 text-slate-600"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => handleGejalaToggle(gejala)}
                    className="mt-0.5 accent-sky-500"
                  />
                  <span className="text-[11px] font-medium leading-tight">{gejala}</span>
                </label>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
