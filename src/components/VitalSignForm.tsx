import React, { useEffect, useRef, useState } from "react";
import { TriageRecord, GcsScore, VitalSign } from "../types";
import { BrainCircuit, Heart, Info, Wind } from "lucide-react";
import { Card } from "./ui/Card";
import { Input, SelectField } from "./ui/Input";
import { Chip } from "./ui/Badge";

interface VitalSignFormProps {
  data: TriageRecord;
  onChange: (fields: Partial<TriageRecord>) => void;
}

const AVPU_OPTIONS = [
  { value: "Alert", label: "Alert (A)", desc: "Sadar penuh & lingkungan", tone: "text-secondary border-secondary/30 bg-secondary/10" },
  { value: "Verbal", label: "Verbal (V)", desc: "Merespon terhadap suara", tone: "text-primary border-primary/30 bg-primary/10" },
  { value: "Pain", label: "Pain (P)", desc: "Hanya merespon nyeri fisik", tone: "text-amber-700 dark:text-amber-400 border-warning/40 bg-warning/10 animate-pulse" },
  { value: "Unresponsive", label: "Unresponsive (U)", desc: "Tidak merespon sama sekali", tone: "text-danger border-danger/30 bg-danger/10 animate-pulse" },
] as const;

const RESPIRATORY_FLAGS: Array<{ id: keyof VitalSign; label: string }> = [
  { id: "ototBantuNapas", label: "Penggunaan Otot Bantu Napas" },
  { id: "retraksi", label: "Retraksi Dinding Dada" },
  { id: "stridor", label: "Stridor (Sumbatan Atas)" },
  { id: "wheezing", label: "Wheezing (Penyempitan Bronkus)" },
  { id: "apnea", label: "Apnea / Henti Napas Sementara" },
  { id: "takipnea", label: "Takipnea (Napas Sangat Cepat)" },
  { id: "bradipnea", label: "Bradipnea (Napas Sangat Lambat)" },
];

export default function VitalSignForm({ data, onChange }: VitalSignFormProps) {
  // Ensure vitalSign is initialized
  const [vitals, setVitals] = useState<VitalSign>(() => {
    return data.vitalSign || {
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
    };
  });

  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    onChange({ vitalSign: vitals });
  }, [vitals]);

  const updateVitalField = (field: keyof VitalSign, value: any) => {
    setVitals((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const updateGcsField = (field: keyof GcsScore, value: number) => {
    setVitals((prev) => ({
      ...prev,
      gcs: {
        ...(prev.gcs || { eye: 4, verbal: 5, motor: 6 }),
        [field]: value,
      },
    }));
  };

  const gcsEye = vitals.gcs?.eye ?? 4;
  const gcsVerbal = vitals.gcs?.verbal ?? 5;
  const gcsMotor = vitals.gcs?.motor ?? 6;
  const totalGcs = gcsEye + gcsVerbal + gcsMotor;

  // Real-time clinical warning detections
  const getFisiologisWarning = () => {
    const msgs: string[] = [];
    if (vitals.saturasiOksigen > 0 && vitals.saturasiOksigen < 85) {
      msgs.push("Saturasi Oksigen Kritis (< 85%): Indikasi Hipoksia Ekstrem/Gagal Napas.");
    } else if (vitals.saturasiOksigen >= 85 && vitals.saturasiOksigen < 92) {
      msgs.push("Saturasi Oksigen Rendah (85 - 91%): Butuh suplemen oksigen segera.");
    }

    if (vitals.respiratoryRate > 0 && (vitals.respiratoryRate < 8 || vitals.respiratoryRate > 35)) {
      msgs.push("Frekuensi Napas Kritis (RR <8 atau >35 x/mnt): Resiko henti napas.");
    }

    if (vitals.heartRate > 0 && (vitals.heartRate < 42 || vitals.heartRate > 140)) {
      msgs.push("Frekuensi Jantung Ekstrem (HR <42 atau >140 x/mnt): Ancaman syok kardiogenik.");
    }

    if (totalGcs <= 8) {
      msgs.push(`Penurunan Kesadaran Berat (GCS ${totalGcs} ≤ 8): Amankan jalan napas (intubasi/airway management).`);
    }

    const avVal = vitals.avpu || "Alert";
    if (avVal === "Unresponsive") {
      msgs.push("Skala AVPU - UNRESPONSIVE: Pasien tidak memberikan respon. Amankan jalan napas segera!");
    } else if (avVal === "Pain") {
      msgs.push("Skala AVPU - PAIN: Pasien hanya merespon perintah nyeri.");
    } else if (avVal === "Verbal") {
      msgs.push("Skala AVPU - VERBAL: Pasien hanya merespon stimulus suara.");
    }

    return msgs;
  };

  const warnings = getFisiologisWarning();

  return (
    <div className="space-y-4" id="vitals-form-section">
      <Card padding="md">
        <div className="mb-4 flex items-center gap-2.5 border-b border-border/70 pb-3">
          <div className="rounded-lg bg-danger/10 p-1.5 text-danger">
            <Heart size={18} />
          </div>
          <h2 className="text-sm font-bold text-text">1. Vital Signs (Tanda-Tanda Vital)</h2>
        </div>

        {/* Real-time Triage Alerts */}
        {warnings.length > 0 && (
          <div className="mb-4 space-y-1.5 rounded-xl border border-danger/30 bg-danger/5 p-4">
            <div className="flex items-center gap-2 text-xs font-bold text-danger">
              <Info size={14} className="animate-bounce" />
              <span>PERINGATAN KLINIS (RULE-BASED RED FLAGS):</span>
            </div>
            <ul className="list-inside list-disc space-y-1 text-xs font-medium text-danger">
              {warnings.map((msg, i) => (
                <li key={i}>{msg}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
          <Input
            id="input-sys-bp"
            type="number"
            label="Sistolik (mmHg)"
            value={vitals.tekananDarahSistolik || ""}
            onChange={(e) => updateVitalField("tekananDarahSistolik", Number(e.target.value))}
          />
          <Input
            id="input-dia-bp"
            type="number"
            label="Diastolik (mmHg)"
            value={vitals.tekananDarahDiastolik || ""}
            onChange={(e) => updateVitalField("tekananDarahDiastolik", Number(e.target.value))}
          />
          <Input
            id="input-heart-rate"
            type="number"
            label="Heart Rate (kali/mnt)"
            value={vitals.heartRate || ""}
            onChange={(e) => updateVitalField("heartRate", Number(e.target.value))}
          />
          <Input
            id="input-resp-rate"
            type="number"
            label="Resp Rate (kali/mnt)"
            value={vitals.respiratoryRate || ""}
            onChange={(e) => updateVitalField("respiratoryRate", Number(e.target.value))}
          />
          <Input
            id="input-temp"
            type="number"
            step="0.1"
            label="Suhu Tubuh (°C)"
            value={vitals.suhuTubuh || ""}
            onChange={(e) => updateVitalField("suhuTubuh", Number(e.target.value))}
          />
          <Input
            id="input-spo2"
            type="number"
            max="100"
            label="Saturasi O2 (%)"
            value={vitals.saturasiOksigen || ""}
            onChange={(e) => updateVitalField("saturasiOksigen", Number(e.target.value))}
          />
        </div>
      </Card>

      <Card padding="md">
        <div className="mb-4 flex items-center gap-2.5 border-b border-border/70 pb-3">
          <div className="rounded-lg bg-accent/10 p-1.5 text-accent">
            <BrainCircuit size={18} />
          </div>
          <h2 className="text-sm font-bold text-text">2. Status Neurologis (GCS & Kesadaran AVPU)</h2>
        </div>

        {/* AVPU Scale Selection */}
        <div className="mb-6 space-y-3 rounded-2xl border border-border/70 bg-bg p-4">
          <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-text">Skala Status Kesadaran AVPU</span>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-4">
            {AVPU_OPTIONS.map((item) => {
              const active = (vitals.avpu || "Alert") === item.value;
              return (
                <button
                  key={item.value}
                  type="button"
                  id={`btn-avpu-${item.value.toLowerCase()}`}
                  onClick={() => updateVitalField("avpu", item.value)}
                  className={`flex min-h-16 flex-col justify-between rounded-xl border p-2.5 text-left transition ${
                    active ? `${item.tone} ring-2 ring-primary/40 font-bold` : "border-border bg-surface text-text-muted hover:bg-bg"
                  }`}
                >
                  <span className="flex w-full items-center justify-between text-xs font-bold">
                    <span>{item.label}</span>
                    {active && (item.value === "Pain" || item.value === "Unresponsive") && (
                      <span className={`pulse-indicator ${item.value === "Pain" ? "text-amber-500" : "text-danger"}`} />
                    )}
                  </span>
                  <span className="mt-0.5 text-xs leading-tight opacity-85">{item.desc}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 items-end gap-4 md:grid-cols-4">
          <SelectField id="select-gcs-eye" label="Eye Response (E)" value={gcsEye} onChange={(e) => updateGcsField("eye", Number(e.target.value))}>
            <option value={4}>4 = Spontan</option>
            <option value={3}>3 = Terhadap suara</option>
            <option value={2}>2 = Terhadap nyeri</option>
            <option value={1}>1 = Tidak ada respon</option>
          </SelectField>

          <SelectField id="select-gcs-verbal" label="Verbal Response (V)" value={gcsVerbal} onChange={(e) => updateGcsField("verbal", Number(e.target.value))}>
            <option value={5}>5 = Orientasi baik</option>
            <option value={4}>4 = Bingung (Confused)</option>
            <option value={3}>3 = Kata-kata tidak sesuai</option>
            <option value={2}>2 = Suara tidak terkonstruksi (Incomprehensible)</option>
            <option value={1}>1 = Tidak ada suara</option>
          </SelectField>

          <SelectField id="select-gcs-motor" label="Motor Response (M)" value={gcsMotor} onChange={(e) => updateGcsField("motor", Number(e.target.value))}>
            <option value={6}>6 = Mengikuti perintah</option>
            <option value={5}>5 = Melokalisir nyeri</option>
            <option value={4}>4 = Withdraw (Menarik dari nyeri)</option>
            <option value={3}>3 = Fleksi abnormal (Dekortikasi)</option>
            <option value={2}>2 = Ekstensi abnormal (Deserebrasi)</option>
            <option value={1}>1 = Tidak ada gerakan</option>
          </SelectField>

          <div className="flex min-h-14.5 flex-col items-center justify-center rounded-xl border border-accent/20 bg-accent/5 p-4">
            <span className="text-xs font-bold uppercase tracking-wider text-accent">Total GCS Score</span>
            <span className={`text-2xl font-black ${totalGcs <= 8 ? "animate-pulse text-danger" : "text-accent"}`}>
              E{gcsEye} V{gcsVerbal} M{gcsMotor} = {totalGcs}
            </span>
          </div>
        </div>
      </Card>

      <Card padding="md">
        <div className="mb-4 flex items-center gap-2.5 border-b border-border/70 pb-3">
          <div className="rounded-lg bg-primary/10 p-1.5 text-primary">
            <Wind size={18} />
          </div>
          <h2 className="text-sm font-bold text-text">3. Pola & Tambahan Pernapasan</h2>
        </div>

        <div className="mb-4 grid grid-cols-1 gap-4 border-b border-border/70 pb-4 md:grid-cols-3">
          <SelectField id="select-pola-napas" label="Pola Pernapasan" value={vitals.polaNapas} onChange={(e) => updateVitalField("polaNapas", e.target.value)}>
            <option value="reguler">Reguler / Teratur</option>
            <option value="irreguler">Irreguler / Tidak Teratur</option>
          </SelectField>
        </div>

        <span className="mb-3 block text-xs font-bold text-text-muted">Otot Bantu & Kejadian Tambahan Atas Pernapasan:</span>
        <div className="flex flex-wrap gap-1.5">
          {RESPIRATORY_FLAGS.map((item) => (
            <Chip
              key={item.id}
              id={`label-napas-${item.id}`}
              selected={Boolean((vitals as any)[item.id])}
              onClick={() => updateVitalField(item.id, !(vitals as any)[item.id])}
            >
              {item.label}
            </Chip>
          ))}
        </div>
      </Card>
    </div>
  );
}
