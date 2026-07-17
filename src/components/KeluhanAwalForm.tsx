import React from "react";
import { TriageRecord } from "../types";
import { AlertTriangle, Activity } from "lucide-react";
import { Card } from "./ui/Card";
import { Chip } from "./ui/Badge";
import { TextareaField } from "./ui/Input";

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
    <div className="space-y-4" id="keluhan-awal-section">
      <Card padding="md">
        <div className="mb-4 flex items-center gap-2.5 border-b border-border/70 pb-3">
          <div className="rounded-lg bg-danger/10 p-1.5 text-danger">
            <AlertTriangle size={18} />
          </div>
          <h2 className="text-sm font-bold text-text">1. Keluhan Utama (Chief Complaint)</h2>
        </div>

        <div className="space-y-4">
          <div>
            <span className="mb-2 block text-xs font-bold text-text-muted">Kategori Keluhan Utama *</span>
            <div className="flex flex-wrap gap-1.5">
              {KATEGORI_KELUHAN.map((kategori) => (
                <Chip
                  key={kategori}
                  id={`btn-complaint-${kategori.replace(/\s+/g, "-").toLowerCase()}`}
                  selected={data.chiefComplaint === kategori}
                  onClick={() => onChange({ chiefComplaint: kategori })}
                >
                  {kategori}
                </Chip>
              ))}
            </div>
          </div>

          <TextareaField
            id="input-keluhan-custom"
            label="Detail / Deskripsi Keluhan (Ketik Bebas Jika Diperlukan)"
            value={data.chiefComplaintCustom || ""}
            onChange={(e) => onChange({ chiefComplaintCustom: e.target.value })}
            placeholder="Contoh: Nyeri dada sebelah kiri tembus ke punggung belakang sejak 2 jam lalu..."
            rows={3}
          />
        </div>
      </Card>

      <Card padding="md">
        <div className="mb-4 flex items-center gap-2.5 border-b border-border/70 pb-3">
          <div className="rounded-lg bg-primary/10 p-1.5 text-primary">
            <Activity size={18} />
          </div>
          <h2 className="text-sm font-bold text-text">2. Gejala Tambahan Penyerta</h2>
        </div>

        <span className="mb-3 block text-xs font-bold text-text-muted">Pilih gejala tambahan yang teramati (Bisa Multi-select):</span>
        <div className="flex flex-wrap gap-1.5">
          {GEJALA_TAMBAHAN.map((gejala) => (
            <Chip
              key={gejala}
              id={`label-gejala-${gejala.replace(/\s+/g, "-").toLowerCase()}`}
              selected={(data.gejalaTambahan || []).includes(gejala)}
              onClick={() => handleGejalaToggle(gejala)}
            >
              {gejala}
            </Chip>
          ))}
        </div>
      </Card>
    </div>
  );
}
