import React, { useState, useEffect } from "react";
import { TriageRecord, PemeriksaanFisik } from "../types";
import { BookOpen, Activity, FileText } from "lucide-react";
import { Card } from "./ui/Card";
import { Badge } from "./ui/Badge";

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

const EXAM_REGIONS: Array<{ key: keyof PemeriksaanFisik; label: string; idPrefix: string }> = [
  { key: "kepala", label: "Kepala", idPrefix: "kepala" },
  { key: "leher", label: "Leher", idPrefix: "leher" },
  { key: "dada", label: "Dada / Paru / Jantung", idPrefix: "dada" },
  { key: "perut", label: "Abdomen (Perut)", idPrefix: "perut" },
  { key: "ekstremitasAtas", label: "Ekstremitas Atas", idPrefix: "atas" },
  { key: "ekstremitasBawah", label: "Ekstremitas Bawah", idPrefix: "bawah" },
];

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
    <div className="space-y-4" id="soap-view-section">
      <Card padding="md">
        <div className="mb-4 flex items-center gap-2.5 border-b border-border/70 pb-3">
          <div className="rounded-lg bg-primary/10 p-1.5 text-primary">
            <FileText size={18} />
          </div>
          <h2 className="text-sm font-bold text-text">1. S — Subjective (Ringkasan Pengisian Medis S)</h2>
        </div>

        <div className="grid grid-cols-1 gap-4 text-xs font-medium md:grid-cols-3">
          <div className="space-y-1 rounded-xl border border-border/70 bg-bg p-3">
            <span className="block text-xs font-bold uppercase tracking-wider text-text-muted">Keluhan Utama</span>
            <span className="text-sm font-semibold text-text">{data.chiefComplaint || "Belum dipilih"}</span>
            {data.chiefComplaintCustom && (
              <p className="mt-1 rounded-lg border border-border/60 bg-surface p-1.5 text-xs italic text-text-muted">"{data.chiefComplaintCustom}"</p>
            )}
          </div>

          <div className="space-y-1 rounded-xl border border-border/70 bg-bg p-3">
            <span className="block text-xs font-bold uppercase tracking-wider text-text-muted">Riwayat Penyakit</span>
            <div className="flex flex-wrap gap-1 pt-1">
              {data.riwayatPenyakit && data.riwayatPenyakit.length > 0 ? (
                data.riwayatPenyakit.map((h, i) => (
                  <Badge key={i} tone="primary" className="rounded-md px-1.5 py-0.5 text-xs">
                    {h}
                  </Badge>
                ))
              ) : (
                <span className="text-text-muted">Tidak ada riwayat.</span>
              )}
              {data.riwayatPenyakitLainnya && (
                <span className="mt-1 block w-full text-xs text-text-muted">Ket: {data.riwayatPenyakitLainnya}</span>
              )}
            </div>
          </div>

          <div className="space-y-1 rounded-xl border border-border/70 bg-bg p-3">
            <span className="block text-xs font-bold uppercase tracking-wider text-text-muted">Gejala Tambahan</span>
            <div className="flex flex-wrap gap-1 pt-1">
              {data.gejalaTambahan && data.gejalaTambahan.length > 0 ? (
                data.gejalaTambahan.map((g, i) => (
                  <Badge key={i} tone="danger" className="rounded-md px-1.5 py-0.5 text-xs">
                    {g}
                  </Badge>
                ))
              ) : (
                <span className="text-text-muted">Tidak terdeteksi gejala penyerta.</span>
              )}
            </div>
          </div>
        </div>
      </Card>

      <Card padding="md">
        <div className="mb-4 flex items-center gap-2.5 border-b border-border/70 pb-3">
          <div className="rounded-lg bg-secondary/10 p-1.5 text-secondary">
            <Activity size={18} />
          </div>
          <h2 className="text-sm font-bold text-text">2. O — Objective: A. Vital Sign Summary</h2>
        </div>

        <div className="grid grid-cols-2 gap-3 text-center sm:grid-cols-3 md:grid-cols-6">
          {[
            { label: "Tekanan Darah", value: `${data.vitalSign?.tekananDarahSistolik || 120}/${data.vitalSign?.tekananDarahDiastolik || 80}`, unit: "mmHg" },
            { label: "Nadi (HR)", value: data.vitalSign?.heartRate || 80, unit: "x/m" },
            { label: "Respirasi (RR)", value: data.vitalSign?.respiratoryRate || 18, unit: "x/m" },
            { label: "Suhu Tubuh", value: data.vitalSign?.suhuTubuh || 36.5, unit: "°C" },
            { label: "Saturasi O2", value: data.vitalSign?.saturasiOksigen || 98, unit: "%" },
            { label: "GCS Total", value: (data.vitalSign?.gcs?.eye || 4) + (data.vitalSign?.gcs?.verbal || 5) + (data.vitalSign?.gcs?.motor || 6), unit: "" },
          ].map((item) => (
            <div key={item.label} className="rounded-xl border border-border/70 bg-bg p-2">
              <span className="block text-xs font-bold uppercase text-text-muted">{item.label}</span>
              <span className="text-sm font-black text-text">
                {item.value} <span className="text-xs font-normal">{item.unit}</span>
              </span>
            </div>
          ))}
        </div>
      </Card>

      <Card padding="md">
        <div className="mb-4 flex items-center gap-2.5 border-b border-border/70 pb-3">
          <div className="rounded-lg bg-accent/10 p-1.5 text-accent">
            <BookOpen size={18} />
          </div>
          <h2 className="text-sm font-bold text-text">3. O — Objective: B. Pemeriksaan Fisik Terstruktur</h2>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {EXAM_REGIONS.map((region) => {
            const activeCount = getActiveCount(region.key);
            return (
              <div key={region.key} className="space-y-2.5 rounded-xl border border-border/70 p-3.5">
                <div className="flex items-center justify-between border-b border-border/60 pb-1.5">
                  <span className="text-xs font-bold uppercase text-text">{region.label}</span>
                  <Badge tone={activeCount > 0 ? "danger" : "neutral"} className="px-2 py-0.5 text-xs">
                    {activeCount} Temuan
                  </Badge>
                </div>
                <div className="grid grid-cols-1 gap-1">
                  {Object.keys(INITIAL_PHYSICAL_EXAM[region.key]).map((field) => {
                    const active = (exam[region.key] as any)[field];
                    return (
                      <button
                        id={`btn-exam-${region.idPrefix}-${field}`}
                        key={field}
                        type="button"
                        onClick={() => toggleCheck(region.key, field)}
                        aria-pressed={active}
                        className={`flex items-center justify-between rounded-lg border px-2.5 py-1.5 text-left transition ${
                          active ? "border-danger/40 bg-danger/10 text-danger" : "border-border/60 bg-surface text-text-muted hover:bg-bg"
                        }`}
                      >
                        <span className="text-xs font-medium leading-none">{formatCamelKey(field)}</span>
                        <span className={`size-3.5 shrink-0 rounded-sm border-2 ${active ? "border-danger bg-danger" : "border-border"}`} />
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
