import React, { useEffect, useState } from "react";
import { TriageRecord, GcsScore, VitalSign } from "../types";
import { Gauge, CheckCircle, BrainCircuit, Heart, Info, Wind } from "lucide-react";

interface VitalSignFormProps {
  data: TriageRecord;
  onChange: (fields: Partial<TriageRecord>) => void;
}

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

  useEffect(() => {
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
    <div className="space-y-6 animate-fade-in" id="vitals-form-section">
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
        <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
          <div className="p-1.5 bg-rose-50 text-rose-600 rounded-lg">
            <Heart size={18} />
          </div>
          <h2 className="text-md font-semibold text-slate-800">1. Vital Signs (Tanda-Tanda Vital)</h2>
        </div>

        {/* Real-time Triage Alerts */}
        {warnings.length > 0 && (
          <div className="mb-4 bg-rose-50 border border-rose-200 p-4 rounded-xl space-y-1.5">
            <div className="flex items-center gap-2 text-rose-700 font-semibold text-xs">
              <Info size={14} className="animate-bounce" />
              <span>PERINGATAN KLINIS (RULE-BASED RED FLAGS):</span>
            </div>
            <ul className="list-disc list-inside text-[11px] text-rose-600 space-y-1 font-medium">
              {warnings.map((msg, i) => (
                <li key={i}>{msg}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">
              Sistolik (mmHg)
            </label>
            <input
              id="input-sys-bp"
              type="number"
              placeholder="120"
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-rose-500 transition"
              value={vitals.tekananDarahSistolik || ""}
              onChange={(e) => updateVitalField("tekananDarahSistolik", Number(e.target.value))}
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">
              Diastolik (mmHg)
            </label>
            <input
              id="input-dia-bp"
              type="number"
              placeholder="80"
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-rose-500 transition"
              value={vitals.tekananDarahDiastolik || ""}
              onChange={(e) => updateVitalField("tekananDarahDiastolik", Number(e.target.value))}
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">
              Heart Rate (kali/mnt)
            </label>
            <input
              id="input-heart-rate"
              type="number"
              placeholder="80"
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-rose-500 transition"
              value={vitals.heartRate || ""}
              onChange={(e) => updateVitalField("heartRate", Number(e.target.value))}
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">
              Resp Rate (kali/mnt)
            </label>
            <input
              id="input-resp-rate"
              type="number"
              placeholder="18"
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-rose-500 transition"
              value={vitals.respiratoryRate || ""}
              onChange={(e) => updateVitalField("respiratoryRate", Number(e.target.value))}
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">
              Suhu Tubuh (°C)
            </label>
            <input
              id="input-temp"
              type="number"
              step="0.1"
              placeholder="36.5"
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-rose-500 transition"
              value={vitals.suhuTubuh || ""}
              onChange={(e) => updateVitalField("suhuTubuh", Number(e.target.value))}
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">
              Saturasi O2 (%)
            </label>
            <input
              id="input-spo2"
              type="number"
              max="100"
              placeholder="98"
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-rose-500 transition"
              value={vitals.saturasiOksigen || ""}
              onChange={(e) => updateVitalField("saturasiOksigen", Number(e.target.value))}
            />
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
        <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
          <div className="p-1.5 bg-violet-50 text-violet-600 rounded-lg">
            <BrainCircuit size={18} />
          </div>
          <h2 className="text-md font-semibold text-slate-800">2. Status Neurologis (GCS & Kesadaran AVPU)</h2>
        </div>

        {/* AVPU Scale Selection */}
        <div className="mb-6 p-4 bg-slate-50/50 border border-slate-200/60 rounded-2xl space-y-3">
          <div>
            <span className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Skala Status Kesadaran AVPU
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              {[
                { value: "Alert", label: "Alert (A)", desc: "Sadar penuh & lingkungan", color: "border-emerald-200 bg-emerald-50/80 text-emerald-800" },
                { value: "Verbal", label: "Verbal (V)", desc: "Merespon terhadap suara", color: "border-sky-200 bg-sky-50/80 text-sky-800" },
                { value: "Pain", label: "Pain (P)", desc: "Hanya merespon nyeri fisik", color: "border-amber-250 bg-amber-50/80 text-amber-800 animate-pulse" },
                { value: "Unresponsive", label: "Unresponsive (U)", desc: "Tidak merespon sama sekali", color: "border-rose-200 bg-rose-50/80 text-rose-800 animate-pulse" }
              ].map((item) => {
                const active = (vitals.avpu || "Alert") === item.value;
                return (
                  <button
                    key={item.value}
                    type="button"
                    id={`btn-avpu-${item.value.toLowerCase()}`}
                    onClick={() => updateVitalField("avpu", item.value)}
                    className={`p-2.5 rounded-xl border text-left cursor-pointer transition select-none flex flex-col justify-between h-full min-h-[64px] ${
                      active
                        ? `${item.color} ring-2 ring-indigo-400 font-bold border-indigo-400`
                        : "border-slate-100 bg-white hover:bg-slate-50 text-slate-600"
                    }`}
                  >
                    <span className="text-xs font-bold flex items-center justify-between w-full">
                      <span>{item.label}</span>
                      {active && (item.value === "Pain" || item.value === "Unresponsive") && (
                        <span className={`pulse-indicator ${item.value === "Pain" ? "text-amber-500" : "text-rose-600"}`} />
                      )}
                    </span>
                    <span className="text-[10px] opacity-85 mt-0.5 leading-tight">{item.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              Eye Response (E)
            </label>
            <select
              id="select-gcs-eye"
              value={gcsEye}
              onChange={(e) => updateGcsField("eye", Number(e.target.value))}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-violet-500"
            >
              <option value={4}>4 = Spontan</option>
              <option value={3}>3 = Terhadap suara</option>
              <option value={2}>2 = Terhadap nyeri</option>
              <option value={1}>1 = Tidak ada respon</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              Verbal Response (V)
            </label>
            <select
              id="select-gcs-verbal"
              value={gcsVerbal}
              onChange={(e) => updateGcsField("verbal", Number(e.target.value))}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-violet-500"
            >
              <option value={5}>5 = Orientasi baik</option>
              <option value={4}>4 = Bingung (Confused)</option>
              <option value={3}>3 = Kata-kata tidak sesuai</option>
              <option value={2}>2 = Suara tidak terkonstruksi (Incomprehensible)</option>
              <option value={1}>1 = Tidak ada suara</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              Motor Response (M)
            </label>
            <select
              id="select-gcs-motor"
              value={gcsMotor}
              onChange={(e) => updateGcsField("motor", Number(e.target.value))}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-violet-500"
            >
              <option value={6}>6 = Mengikuti perintah</option>
              <option value={5}>5 = Melokalisir nyeri</option>
              <option value={4}>4 = Withdraw (Menarik dari nyeri)</option>
              <option value={3}>3 = Fleksi abnormal (Dekortikasi)</option>
              <option value={2}>2 = Ekstensi abnormal (Deserebrasi)</option>
              <option value={1}>1 = Tidak ada gerakan</option>
            </select>
          </div>

          <div className="bg-violet-50/50 p-4 rounded-xl border border-violet-100 flex flex-col items-center justify-center min-h-[58px]">
            <span className="text-[10px] uppercase font-bold text-violet-600 tracking-wider">Total GCS Score</span>
            <span className={`text-2xl font-black ${totalGcs <= 8 ? 'text-rose-600 animate-pulse' : 'text-violet-700'}`}>
              E{gcsEye} V{gcsVerbal} M{gcsMotor} = {totalGcs}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
        <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
          <div className="p-1.5 bg-sky-50 text-sky-600 rounded-lg">
            <Wind size={18} />
          </div>
          <h2 className="text-md font-semibold text-slate-800">3. Pola & Tambahan Pernapasan</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pb-4 border-b border-slate-100 mb-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              Pola Pernapasan
            </label>
            <select
              id="select-pola-napas"
              value={vitals.polaNapas}
              onChange={(e) => updateVitalField("polaNapas", e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
            >
              <option value="reguler">Reguler / Teratur</option>
              <option value="irreguler">Irreguler / Tidak Teratur</option>
            </select>
          </div>
        </div>

        <div>
          <span className="block text-xs font-medium text-slate-500 mb-3">
            Otot Bantu & Kejadian Tambahan Atas Pernapasan:
          </span>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {[
              { id: "ototBantuNapas", label: "Penggunaan Otot Bantu Napas" },
              { id: "retraksi", label: "Retraksi Dinding Dada" },
              { id: "stridor", label: "Stridor (Sumbatan Atas)" },
              { id: "wheezing", label: "Wheezing (Penyempitan Bronkus)" },
              { id: "apnea", label: "Apnea / Henti Napas Sementara" },
              { id: "takipnea", label: "Takipnea (Napas Sangat Cepat)" },
              { id: "bradipnea", label: "Bradipnea (Napas Sangat Lambat)" },
            ].map((item) => {
              const isChecked = !!(vitals as any)[item.id];
              return (
                <label
                  key={item.id}
                  id={`label-napas-${item.id}`}
                  className={`flex items-start gap-2 p-2.5 rounded-xl border text-left cursor-pointer transition select-none ${
                    isChecked
                      ? "border-sky-500 bg-sky-50/50 text-sky-800"
                      : "border-slate-100 hover:bg-slate-50 text-slate-600"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={(e) => updateVitalField(item.id as keyof VitalSign, e.target.checked)}
                    className="mt-0.5 accent-sky-500"
                  />
                  <span className="text-[11px] font-medium leading-tight">{item.label}</span>
                </label>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
