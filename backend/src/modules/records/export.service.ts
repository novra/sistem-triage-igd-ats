export function toTrainingDataset(records: any[]) {
  const resolveModelUsed = (r: any) => {
    if (r.atsPrediction?.modelUsed) return r.atsPrediction.modelUsed;
    switch (r.atsPrediction?.providerUsed) {
      case "Gemini":
        return "gemini-3.5-flash";
      case "Hugging Face":
        return "openai/gpt-oss-20b:fastest";
      case "Model Mandiri (RunPod)":
        return "triage-qwen3-lora";
      case "Model Mandiri (Custom Endpoint)":
        return "Custom Endpoint";
      case "Rule-Based":
        return "Clinical Safety Rules v2";
      default:
        return "";
    }
  };

  return records.map((r) => ({
    record_id: r.id,
    timestamp: r.timestamp,
    patient_rm: r.nomorRM,
    age: r.umur,
    gender: r.gender,
    cara_datang: r.caraDatang,
    riwayat_penyakit: r.riwayatPenyakit ? r.riwayatPenyakit.join(" | ") : "",
    riwayat_lainnya: r.riwayatPenyakitLainnya || "",
    keluhan_utama: r.chiefComplaint,
    keluhan_kustom: r.chiefComplaintCustom || "",
    gejala_tambahan: r.gejalaTambahan ? r.gejalaTambahan.join(" | ") : "",
    systolic_bp: r.vitalSign?.tekananDarahSistolik || 0,
    diastolic_bp: r.vitalSign?.tekananDarahDiastolik || 0,
    heart_rate: r.vitalSign?.heartRate || 0,
    respiratory_rate: r.vitalSign?.respiratoryRate || 0,
    body_temp: r.vitalSign?.suhuTubuh || 0,
    spo2: r.vitalSign?.saturasiOksigen || 100,
    gcs_total: (r.vitalSign?.gcs?.eye || 4) + (r.vitalSign?.gcs?.verbal || 5) + (r.vitalSign?.gcs?.motor || 6),
    avpu: r.vitalSign?.avpu || "Alert",
    pain_score: r.painScale?.skala || 0,
    pain_category: r.painScale?.kategori || "tidak nyeri",
    predicted_ats: r.atsPrediction?.atsLevel || 3,
    final_ats: r.atsFinal?.atsLevelFinal || r.atsPrediction?.atsLevel || 3,
    ai_confidence: r.atsPrediction?.confidenceScore || 0,
    ai_provider_used: r.atsPrediction?.providerUsed || "",
    ai_model_used: resolveModelUsed(r),
    is_emergency: r.atsPrediction?.emergencyIndicator ? 1 : 0,
    classification_reasoning: r.atsPrediction?.alasanKlasifikasi || "",
    nama_petugas: r.atsFinal?.namaPetugas || "",
    jabatan_petugas: r.atsFinal?.jabatanPetugas || "",
    override_reason: r.atsFinal?.alasanOverride || "",
    nlp_concatenated_clinical_text: `SUBJECTIVE: Keluhan ${r.chiefComplaint}. ${r.chiefComplaintCustom ? `Kustom: ${r.chiefComplaintCustom}` : ""}. Riwayat: ${r.riwayatPenyakit ? r.riwayatPenyakit.join(", ") : "Tidak ada"}. Gejala tambahan: ${r.gejalaTambahan ? r.gejalaTambahan.join(", ") : "Tidak ada"}. Nyeri pada ${r.painScale?.lokasi || "N/A"} skala ${r.painScale?.skala}/10. OBJECTIVE: TD: ${r.vitalSign?.tekananDarahSistolik}/${r.vitalSign?.tekananDarahDiastolik} mmHg, HR: ${r.vitalSign?.heartRate}x, RR: ${r.vitalSign?.respiratoryRate}x, Temp: ${r.vitalSign?.suhuTubuh}C, SpO2: ${r.vitalSign?.saturasiOksigen}%, GCS E${r.vitalSign?.gcs?.eye || 4}V${r.vitalSign?.gcs?.verbal || 5}M${r.vitalSign?.gcs?.motor || 6}, AVPU: ${r.vitalSign?.avpu || "Alert"}.`,
  }));
}
