import React, { useState, useEffect, useRef } from "react";
import { TriageRecord, PainScale } from "../types";
import { Activity, Flame, ShieldAlert } from "lucide-react";
import { Card } from "./ui/Card";
import { Input } from "./ui/Input";
import { Chip } from "./ui/Badge";

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

  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
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
    if (score === 0) return "bg-black/5 hover:bg-black/10 text-text-muted border-border dark:bg-white/5 dark:hover:bg-white/10";
    if (score >= 1 && score <= 3) return "bg-secondary/10 hover:bg-secondary/15 text-secondary border-secondary/30";
    if (score >= 4 && score <= 6) return "bg-warning/10 hover:bg-warning/15 text-amber-700 dark:text-amber-400 border-warning/30";
    return "bg-danger/10 hover:bg-danger/15 text-danger border-danger/30";
  };

  const getActivePillColor = (score: number) => {
    if (score === 0) return "bg-slate-600 text-white ring-2 ring-slate-400 border-slate-500";
    if (score >= 1 && score <= 3) return "bg-secondary text-secondary-foreground ring-2 ring-secondary/30 border-secondary";
    if (score >= 4 && score <= 6) return "bg-warning text-amber-950 ring-2 ring-warning/40 border-warning";
    return "bg-danger text-danger-foreground ring-2 ring-danger/30 border-danger animate-pulse";
  };

  return (
    <div className="space-y-4" id="nyeri-form-section">
      <Card padding="md">
        <div className="mb-4 flex items-center gap-2.5 border-b border-border/70 pb-3">
          <div className="rounded-lg bg-danger/10 p-1.5 text-danger">
            <Flame size={18} />
          </div>
          <h2 className="text-sm font-bold text-text">1. Skala Nyeri Pasien</h2>
        </div>

        <div>
          <span className="mb-3 block text-xs font-bold text-text-muted">Pilih Skala Nyeri (0 - 10):</span>
          <div className="mb-4 grid grid-cols-11 gap-1 md:gap-2">
            {Array.from({ length: 11 }).map((_, i) => {
              const active = pain.skala === i;
              return (
                <button
                  id={`btn-pain-${i}`}
                  key={i}
                  type="button"
                  onClick={() => handleSelectScale(i)}
                  className={`rounded-lg border py-3 text-sm font-bold transition-all ${active ? getActivePillColor(i) : getPillColor(i)}`}
                >
                  {i}
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between rounded-xl border border-border/70 bg-bg p-3.5">
            <div className="flex items-center gap-2">
              <ShieldAlert size={16} className={pain.skala >= 7 ? "animate-bounce text-danger" : "text-text-muted"} />
              <span className="text-xs font-medium text-text-muted">Kategori Nyeri Terpilih:</span>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-sm font-extrabold uppercase tracking-wide ${
                pain.skala === 0
                  ? "bg-black/5 text-text dark:bg-white/10"
                  : pain.skala <= 3
                    ? "bg-secondary/10 text-secondary"
                    : pain.skala <= 6
                      ? "bg-warning/15 text-amber-700 dark:text-amber-400"
                      : "bg-danger/10 text-danger"
              }`}
            >
              {pain.kategori}
            </span>
          </div>
        </div>
      </Card>

      <Card padding="md">
        <div className="mb-4 flex items-center gap-2.5 border-b border-border/70 pb-3">
          <div className="rounded-lg bg-primary/10 p-1.5 text-primary">
            <Activity size={18} />
          </div>
          <h2 className="text-sm font-bold text-text">2. Lokasi & Penyebaran Nyeri</h2>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <span className="mb-2.5 block text-xs font-bold text-text-muted">Lokasi Nyeri (Pilih Preset atau Ketik Sendiri)</span>
            <div className="mb-2 flex flex-wrap gap-1.5">
              {NYERI_LOKASI_PRESETS.slice(0, 5).map((loc) => (
                <Chip
                  key={loc}
                  id={`btn-nyeri-loc-${loc.replace(/\s+/g, "-").toLowerCase()}`}
                  selected={pain.lokasi === loc}
                  onClick={() => setPain((prev) => ({ ...prev, lokasi: loc }))}
                >
                  {loc}
                </Chip>
              ))}
            </div>
            <Input
              id="input-lokasi-nyeri"
              type="text"
              placeholder="Spesifikasikan lokasi nyeri..."
              value={pain.lokasi || ""}
              onChange={(e) => setPain((prev) => ({ ...prev, lokasi: e.target.value }))}
            />
          </div>

          <div>
            <span className="mb-2 block text-xs font-bold text-text-muted">Nyeri Menjalar Ke Area Lain?</span>
            <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2">
              <button
                id="btn-menjalar-ya"
                type="button"
                onClick={() => setPain((prev) => ({ ...prev, menjalar: true }))}
                className={`flex min-h-12 items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition ${
                  pain.menjalar ? "border-warning bg-warning/10 text-amber-700 ring-2 ring-warning/30 dark:text-amber-400" : "border-border text-text-muted hover:bg-bg"
                }`}
              >
                Ya, Menjalar
              </button>
              <button
                id="btn-menjalar-tidak"
                type="button"
                onClick={() => setPain((prev) => ({ ...prev, menjalar: false }))}
                className={`flex min-h-12 items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition ${
                  !pain.menjalar ? "border-secondary bg-secondary/10 text-secondary ring-2 ring-secondary/30" : "border-border text-text-muted hover:bg-bg"
                }`}
              >
                Tidak Menjalar
              </button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
