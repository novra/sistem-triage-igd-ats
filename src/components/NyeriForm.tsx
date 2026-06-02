import React, { useState, useEffect } from "react";
import { TriageRecord, PainScale } from "../types";
import { Activity, Flame, ShieldAlert } from "lucide-react";

interface NyeriFormProps {
  data: TriageRecord;
  onChange: (fields: Partial<TriageRecord>) => void;
}

const NYERI_LOKASI_PRESETS = [
  "Dada Kiri",
  "Dada Kanan",
  "Abdomen (Perut Atas / Lambung)",
  "Abdomen (Perut Kanan Bawah)",
  "Kepala / Temporal",
  "Leher / Tenggorokan",
  "Punggung / Belakang Dada",
  "Ekstremitas Atas (Lengan)",
  "Ekstremitas Bawah (Kaki)",
  "Seluruh Tubuh"
];

export default function NyeriForm({ data, onChange }: NyeriFormProps) {
  const [pain, setPain] = useState<PainScale>(() => {
    return data.painScale || {
      skala: 0,
      kategori: "tidak nyeri",
      lokasi: "",
      menjalar: false
    };
  });

  useEffect(() => {
    onChange({ painScale: pain });
  }, [pain]);

  const handleSelectScale = (score: number) => {
    let cat: "tidak nyeri" | "ringan" | "sedang" | "berat" = "tidak nyeri";
    if (score >= 1 && score <= 3) cat = "ringan";
    else if (score >= 4 && score <= 6) cat = "sedang";
    else if (score >= 7) cat = "berat";

    setPain((prev) => ({
      ...prev,
      skala: score,
      kategori: cat
    }));
  };

  const getPillColor = (score: number) => {
    if (score === 0) return "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300";
    if (score >= 1 && score <= 3) return "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-300";
    if (score >= 4 && score <= 6) return "bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-300";
    return "bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-300";
  };

  const getActivePillColor = (score: number) => {
    if (score === 0) return "bg-slate-600 text-white ring-2 ring-slate-400 border-slate-500";
    if (score >= 1 && score <= 3) return "bg-emerald-600 text-white ring-2 ring-emerald-300 border-emerald-700";
    if (score >= 4 && score <= 6) return "bg-amber-500 text-white ring-2 ring-amber-300 border-amber-600";
    return "bg-rose-600 text-white ring-2 ring-rose-300 border-rose-700 animate-pulse";
  };

  return (
    <div className="space-y-6 animate-fade-in" id="nyeri-form-section">
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
        <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
          <div className="p-1.5 bg-rose-50 text-rose-600 rounded-lg">
            <Flame size={18} />
          </div>
          <h2 className="text-md font-semibold text-slate-800">1. Skala Nyeri Pasien</h2>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-500 mb-3">
            Pilih Skala Nyeri (0 - 10):
          </label>
          <div className="grid grid-cols-11 gap-1 md:gap-2 mb-4">
            {Array.from({ length: 11 }).map((_, i) => {
              const active = pain.skala === i;
              return (
                <button
                  id={`btn-pain-${i}`}
                  key={i}
                  type="button"
                  onClick={() => handleSelectScale(i)}
                  className={`py-3 rounded-lg border text-sm font-bold transition-all cursor-pointer ${
                    active ? getActivePillColor(i) : getPillColor(i)
                  }`}
                >
                  {i}
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50/50">
            <div className="flex items-center gap-2">
              <ShieldAlert size={16} className={pain.skala >= 7 ? "text-rose-600 animate-bounce" : "text-slate-500"} />
              <span className="text-xs text-slate-600 font-medium">Kategori Nyeri Terpilih:</span>
            </div>
            <span className={`text-sm font-extrabold uppercase tracking-wide px-3 py-1 rounded-full ${
              pain.skala === 0
                ? "bg-slate-100 text-slate-700"
                : pain.skala <= 3
                ? "bg-emerald-100 text-emerald-800"
                : pain.skala <= 6
                ? "bg-amber-100 text-amber-800"
                : "bg-rose-100 text-rose-800"
            }`}>
              {pain.kategori}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
        <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
          <div className="p-1.5 bg-sky-50 text-sky-600 rounded-lg">
            <Activity size={18} />
          </div>
          <h2 className="text-md font-semibold text-slate-800">2. Lokasi & Penyebaran Nyeri</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-2.5">
              Lokasi Nyeri (Pilih Preset atau Ketik Sendiri)
            </label>
            <div className="space-y-2">
              <div className="flex flex-wrap gap-1.5 mb-2">
                {NYERI_LOKASI_PRESETS.slice(0, 5).map((loc) => (
                  <button
                    id={`btn-nyeri-loc-${loc.replace(/\s+/g, '-').toLowerCase()}`}
                    key={loc}
                    type="button"
                    onClick={() => setPain(prev => ({ ...prev, lokasi: loc }))}
                    className={`text-[10px] px-2 py-1 rounded-md border font-medium transition cursor-pointer ${
                      pain.lokasi === loc
                        ? "bg-sky-600 border-sky-500 text-white"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {loc}
                  </button>
                ))}
              </div>
              <input
                id="input-lokasi-nyeri"
                type="text"
                placeholder="Spesifikasikan lokasi nyeri..."
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-sky-500 focus:bg-white transition"
                value={pain.lokasi || ""}
                onChange={(e) => setPain((prev) => ({ ...prev, lokasi: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-2">
              Nyeri Menjalar Ke Area Lain?
            </label>
            <div className="flex gap-2 h-[42px] items-center">
              <button
                id="btn-menjalar-ya"
                type="button"
                onClick={() => setPain(prev => ({ ...prev, menjalar: true }))}
                className={`flex-1 flex items-center justify-center gap-1.5 h-full border rounded-xl cursor-pointer transition text-xs font-bold ${
                  pain.menjalar
                    ? "border-amber-500 bg-amber-50 text-amber-800 ring-2 ring-amber-200"
                    : "border-slate-200 hover:bg-slate-50 text-slate-600"
                }`}
              >
                <span>Ya, Menjalar</span>
              </button>
              <button
                id="btn-menjalar-tidak"
                type="button"
                onClick={() => setPain(prev => ({ ...prev, menjalar: false }))}
                className={`flex-1 flex items-center justify-center gap-1.5 h-full border rounded-xl cursor-pointer transition text-xs font-bold ${
                  !pain.menjalar
                    ? "border-emerald-500 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-200"
                    : "border-slate-200 hover:bg-slate-50 text-slate-600"
                }`}
              >
                <span>Tidak Menjalar</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
