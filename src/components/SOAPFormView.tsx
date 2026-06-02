import React, { useState, useEffect } from "react";
import { TriageRecord, PemeriksaanFisik } from "../types";
import { BookOpen, Activity, FileText } from "lucide-react";

interface SOAPFormViewProps {
  data: TriageRecord;
  onChange: (fields: Partial<TriageRecord>) => void;
}

const INITIAL_PHYSICAL_EXAM: PemeriksaanFisik = {
  kepala: {
    perdarahan: false,
    deformitas: false,
    pupilAnisokor: false,
    pupilIsokor: false,
    traumaKepala: false,
    kejang: false,
    sianosis: false,
    penurunanKesadaran: false,
  },
  leher: {
    deviasiTrakea: false,
    distensiVenaJugularis: false,
    kakuKuduk: false,
    traumaLeher: false,
    pembesaranKelenjar: false,
    stridor: false,
  },
  dada: {
    retraksi: false,
    wheezing: false,
    ronki: false,
    suaraNapasMenurun: false,
    nyeriDada: false,
    penggunaanOtotBantuNapas: false,
    asimetriDindingDada: false,
    distressRespirasi: false,
  },
  perut: {
    distensiAbdomen: false,
    nyeriTekan: false,
    defenseMuscular: false,
    muntah: false,
    perdarahan: false,
    ascites: false,
    nyeriKuadranKananBawah: false,
    rigidAbdomen: false,
  },
  ekstremitasAtas: {
    kelemahanMotorik: false,
    deformitas: false,
    edema: false,
    sianosis: false,
    tremor: false,
    perfusiBuruk: false,
    perdarahanAktif: false,
  },
  ekstremitasBawah: {
    edema: false,
    deformitas: false,
    kelemahanMotorik: false,
    sianosis: false,
    perfusiBuruk: false,
    trauma: false,
    perdarahanAktif: false,
  },
};

export default function SOAPFormView({ data, onChange }: SOAPFormViewProps) {
  const [exam, setExam] = useState<PemeriksaanFisik>(() => {
    return data.pemeriksaanFisik || INITIAL_PHYSICAL_EXAM;
  });

  useEffect(() => {
    onChange({ pemeriksaanFisik: exam });
  }, [exam]);

  const toggleCheck = (region: keyof PemeriksaanFisik, field: string) => {
    setExam((prev) => {
      const regionData = { ...prev[region] } as any;
      regionData[field] = !regionData[field];
      return {
        ...prev,
        [region]: regionData,
      };
    });
  };

  const getActiveCount = (region: keyof PemeriksaanFisik) => {
    return Object.values(exam[region] || {}).filter(Boolean).length;
  };

  const formatCamelKey = (str: string) => {
    const parted = str.replace(/([A-Z])/g, " $1");
    return parted.charAt(0).toUpperCase() + parted.slice(1);
  };

  return (
    <div className="space-y-6 animate-fade-in" id="soap-view-section">
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
        <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
          <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
            <FileText size={18} />
          </div>
          <h2 className="text-md font-semibold text-slate-800">1. S — Subjective (Ringkasan Pengisian Medis S)</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-medium">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
            <span className="text-slate-500 block uppercase font-bold tracking-wider">Keluhan Utama</span>
            <span className="text-slate-800 text-sm font-semibold">{data.chiefComplaint || "Belum dipilih"}</span>
            {data.chiefComplaintCustom && (
              <p className="text-[11px] text-slate-600 italic bg-white p-1.5 rounded-lg border mt-1">
                "{data.chiefComplaintCustom}"
              </p>
            )}
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
            <span className="text-slate-500 block uppercase font-bold tracking-wider">Riwayat Penyakit</span>
            <div className="flex flex-wrap gap-1 pt-1">
              {data.riwayatPenyakit && data.riwayatPenyakit.length > 0 ? (
                data.riwayatPenyakit.map((h, i) => (
                  <span key={i} className="px-1.5 py-0.5 bg-sky-100 text-sky-800 rounded-md text-[10px] font-semibold">
                    {h}
                  </span>
                ))
              ) : (
                <span className="text-slate-400">Tidak ada riwayat.</span>
              )}
              {data.riwayatPenyakitLainnya && (
                <span className="text-slate-500 text-[10px] block w-full mt-1">Ket: {data.riwayatPenyakitLainnya}</span>
              )}
            </div>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
            <span className="text-slate-500 block uppercase font-bold tracking-wider">Gejala Tambahan</span>
            <div className="flex flex-wrap gap-1 pt-1">
              {data.gejalaTambahan && data.gejalaTambahan.length > 0 ? (
                data.gejalaTambahan.map((g, i) => (
                  <span key={i} className="px-1.5 py-0.5 bg-rose-100 text-rose-800 rounded-md text-[10px] font-semibold">
                    {g}
                  </span>
                ))
              ) : (
                <span className="text-slate-400">Tidak terdeteksi gejala penyerta.</span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
        <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
          <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
            <Activity size={18} />
          </div>
          <h2 className="text-md font-semibold text-slate-800">2. O — Objective: A. Vital Sign Summary</h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 text-center">
          <div className="p-2 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-[10px] font-bold text-slate-400 block uppercase">Tekanan Darah</span>
            <span className="text-sm font-black text-slate-700">
              {data.vitalSign?.tekananDarahSistolik || 120}/{data.vitalSign?.tekananDarahDiastolik || 80} <span className="text-[10px] font-normal">mmHg</span>
            </span>
          </div>

          <div className="p-2 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-[10px] font-bold text-slate-400 block uppercase">Nadi (HR)</span>
            <span className="text-sm font-black text-slate-700">
              {data.vitalSign?.heartRate || 80} <span className="text-[10px] font-normal">x/m</span>
            </span>
          </div>

          <div className="p-2 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-[10px] font-bold text-slate-400 block uppercase">Respirasi (RR)</span>
            <span className="text-sm font-black text-slate-700">
              {data.vitalSign?.respiratoryRate || 18} <span className="text-[10px] font-normal">x/m</span>
            </span>
          </div>

          <div className="p-2 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-[10px] font-bold text-slate-400 block uppercase">Suhu Tubuh</span>
            <span className="text-sm font-black text-slate-700">
              {data.vitalSign?.suhuTubuh || 36.5} <span className="text-[10px] font-normal">°C</span>
            </span>
          </div>

          <div className="p-2 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-[10px] font-bold text-slate-400 block uppercase">Saturasi O2</span>
            <span className="text-sm font-black text-slate-700">
              {data.vitalSign?.saturasiOksigen || 98} <span className="text-[10px] font-normal">%</span>
            </span>
          </div>

          <div className="p-2 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-[10px] font-bold text-slate-400 block uppercase">GCS Total</span>
            <span className="text-sm font-black text-slate-700">
              {(data.vitalSign?.gcs?.eye || 4) + (data.vitalSign?.gcs?.verbal || 5) + (data.vitalSign?.gcs?.motor || 6)}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
        <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
          <div className="p-1.5 bg-violet-50 text-violet-600 rounded-lg">
            <BookOpen size={18} />
          </div>
          <h2 className="text-md font-semibold text-slate-800">3. O — Objective: B. Pemeriksaan Fisik Terstruktur</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* kepala */}
          <div className="border border-slate-200 rounded-xl p-3.5 space-y-2.5 shadow-2xs">
            <div className="flex items-center justify-between border-b pb-1.5">
              <span className="text-xs font-bold text-slate-700 uppercase">Kepala</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getActiveCount("kepala") > 0 ? "bg-rose-150 text-rose-800" : "bg-slate-100 text-slate-500"}`}>
                {getActiveCount("kepala")} Temuan
              </span>
            </div>
            <div className="grid grid-cols-1 gap-1">
              {Object.keys(INITIAL_PHYSICAL_EXAM.kepala).map((field) => {
                const active = (exam.kepala as any)[field];
                return (
                  <button
                    id={`btn-exam-kepala-${field}`}
                    key={field}
                    type="button"
                    onClick={() => toggleCheck("kepala", field)}
                    className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-left cursor-pointer transition select-none ${
                      active
                        ? "bg-rose-50 border-rose-300 text-rose-800"
                        : "bg-white border-slate-100 text-slate-500 hover:bg-slate-50"
                    }`}
                  >
                    <span className="text-[10px] font-medium leading-none">{formatCamelKey(field)}</span>
                    <input
                      type="checkbox"
                      checked={active}
                      readOnly
                      className="accent-rose-500 scale-75"
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* leher */}
          <div className="border border-slate-200 rounded-xl p-3.5 space-y-2.5 shadow-2xs">
            <div className="flex items-center justify-between border-b pb-1.5">
              <span className="text-xs font-bold text-slate-700 uppercase">Leher</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getActiveCount("leher") > 0 ? "bg-rose-150 text-rose-800" : "bg-slate-100 text-slate-500"}`}>
                {getActiveCount("leher")} Temuan
              </span>
            </div>
            <div className="grid grid-cols-1 gap-1">
              {Object.keys(INITIAL_PHYSICAL_EXAM.leher).map((field) => {
                const active = (exam.leher as any)[field];
                return (
                  <button
                    id={`btn-exam-leher-${field}`}
                    key={field}
                    type="button"
                    onClick={() => toggleCheck("leher", field)}
                    className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-left cursor-pointer transition select-none ${
                      active
                        ? "bg-rose-50 border-rose-300 text-rose-800"
                        : "bg-white border-slate-100 text-slate-500 hover:bg-slate-50"
                    }`}
                  >
                    <span className="text-[10px] font-medium leading-none">{formatCamelKey(field)}</span>
                    <input
                      type="checkbox"
                      checked={active}
                      readOnly
                      className="accent-rose-500 scale-75"
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* dada */}
          <div className="border border-slate-200 rounded-xl p-3.5 space-y-2.5 shadow-2xs">
            <div className="flex items-center justify-between border-b pb-1.5">
              <span className="text-xs font-bold text-slate-700 uppercase">Dada / Paru / Jantung</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getActiveCount("dada") > 0 ? "bg-rose-150 text-rose-800" : "bg-slate-100 text-slate-500"}`}>
                {getActiveCount("dada")} Temuan
              </span>
            </div>
            <div className="grid grid-cols-1 gap-1">
              {Object.keys(INITIAL_PHYSICAL_EXAM.dada).map((field) => {
                const active = (exam.dada as any)[field];
                return (
                  <button
                    id={`btn-exam-dada-${field}`}
                    key={field}
                    type="button"
                    onClick={() => toggleCheck("dada", field)}
                    className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-left cursor-pointer transition select-none ${
                      active
                        ? "bg-rose-50 border-rose-300 text-rose-800"
                        : "bg-white border-slate-100 text-slate-500 hover:bg-slate-50"
                    }`}
                  >
                    <span className="text-[10px] font-medium leading-none">{formatCamelKey(field)}</span>
                    <input
                      type="checkbox"
                      checked={active}
                      readOnly
                      className="accent-rose-500 scale-75"
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* perut */}
          <div className="border border-slate-200 rounded-xl p-3.5 space-y-2.5 shadow-2xs">
            <div className="flex items-center justify-between border-b pb-1.5">
              <span className="text-xs font-bold text-slate-700 uppercase">Abdomen (Perut)</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getActiveCount("perut") > 0 ? "bg-rose-150 text-rose-800" : "bg-slate-100 text-slate-500"}`}>
                {getActiveCount("perut")} Temuan
              </span>
            </div>
            <div className="grid grid-cols-1 gap-1">
              {Object.keys(INITIAL_PHYSICAL_EXAM.perut).map((field) => {
                const active = (exam.perut as any)[field];
                return (
                  <button
                    id={`btn-exam-perut-${field}`}
                    key={field}
                    type="button"
                    onClick={() => toggleCheck("perut", field)}
                    className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-left cursor-pointer transition select-none ${
                      active
                        ? "bg-rose-50 border-rose-300 text-rose-800"
                        : "bg-white border-slate-100 text-slate-500 hover:bg-slate-50"
                    }`}
                  >
                    <span className="text-[10px] font-medium leading-none">{formatCamelKey(field)}</span>
                    <input
                      type="checkbox"
                      checked={active}
                      readOnly
                      className="accent-rose-500 scale-75"
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* ekstremitas atas */}
          <div className="border border-slate-200 rounded-xl p-3.5 space-y-2.5 shadow-2xs">
            <div className="flex items-center justify-between border-b pb-1.5">
              <span className="text-xs font-bold text-slate-700 uppercase">Ekstremitas Atas</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getActiveCount("ekstremitasAtas") > 0 ? "bg-rose-150 text-rose-800" : "bg-slate-100 text-slate-500"}`}>
                {getActiveCount("ekstremitasAtas")} Temuan
              </span>
            </div>
            <div className="grid grid-cols-1 gap-1">
              {Object.keys(INITIAL_PHYSICAL_EXAM.ekstremitasAtas).map((field) => {
                const active = (exam.ekstremitasAtas as any)[field];
                return (
                  <button
                    id={`btn-exam-atas-${field}`}
                    key={field}
                    type="button"
                    onClick={() => toggleCheck("ekstremitasAtas", field)}
                    className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-left cursor-pointer transition select-none ${
                      active
                        ? "bg-rose-50 border-rose-300 text-rose-800"
                        : "bg-white border-slate-100 text-slate-500 hover:bg-slate-50"
                    }`}
                  >
                    <span className="text-[10px] font-medium leading-none">{formatCamelKey(field)}</span>
                    <input
                      type="checkbox"
                      checked={active}
                      readOnly
                      className="accent-rose-500 scale-75"
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* ekstremitas bawah */}
          <div className="border border-slate-200 rounded-xl p-3.5 space-y-2.5 shadow-2xs">
            <div className="flex items-center justify-between border-b pb-1.5">
              <span className="text-xs font-bold text-slate-700 uppercase">Ekstremitas Bawah</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getActiveCount("ekstremitasBawah") > 0 ? "bg-rose-150 text-rose-800" : "bg-slate-100 text-slate-500"}`}>
                {getActiveCount("ekstremitasBawah")} Temuan
              </span>
            </div>
            <div className="grid grid-cols-1 gap-1">
              {Object.keys(INITIAL_PHYSICAL_EXAM.ekstremitasBawah).map((field) => {
                const active = (exam.ekstremitasBawah as any)[field];
                return (
                  <button
                    id={`btn-exam-bawah-${field}`}
                    key={field}
                    type="button"
                    onClick={() => toggleCheck("ekstremitasBawah", field)}
                    className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-left cursor-pointer transition select-none ${
                      active
                        ? "bg-rose-50 border-rose-300 text-rose-800"
                        : "bg-white border-slate-100 text-slate-500 hover:bg-slate-50"
                    }`}
                  >
                    <span className="text-[10px] font-medium leading-none">{formatCamelKey(field)}</span>
                    <input
                      type="checkbox"
                      checked={active}
                      readOnly
                      className="accent-rose-500 scale-75"
                    />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
