import React, { useState } from "react";
import { RefreshCw, Wand2 } from "lucide-react";
import { TriageRecord } from "../types";
import { apiFetch } from "../lib/api";
import IdentitasForm from "./IdentitasForm";
import KeluhanAwalForm from "./KeluhanAwalForm";
import VitalSignForm from "./VitalSignForm";
import NyeriForm from "./NyeriForm";
import SOAPFormView from "./SOAPFormView";
import ATSHasilPanel from "./ATSHasilPanel";
import ATSResultHighlightDialog from "./ATSResultHighlightDialog";
import { Dialog } from "./ui/Dialog";
import { Button } from "./ui/Button";
import { Stepper } from "./ui/Stepper";
import { useToast } from "./ui/Toast";

const FORM_SECTIONS = [
  { label: "Identitas dan Riwayat Penyakit", desc: "Data pasien, kunjungan, dan komorbid" },
  { label: "Keluhan dan Gejala Tambahan", desc: "Keluhan utama dan gejala penyerta" },
  { label: "Tanda Vital dan Tingkat Kesadaran", desc: "Parameter fisiologis, AVPU, dan GCS" },
  { label: "Skala Nyeri", desc: "Intensitas, lokasi & radiasi" },
  { label: "CPPT", desc: "Catatan perkembangan terintegrasi" },
];

const cloneRecord = (record: TriageRecord): TriageRecord => structuredClone(record);

interface RecordEditDialogProps {
  record: TriageRecord | null;
  open: boolean;
  onClose: () => void;
  aiProvider: string;
  aiModel: string;
  onSaved: () => void | Promise<void>;
}

/**
 * Edits an existing saved record entirely inside a popup — no navigation away
 * from the records list. Saving POSTs the record with its original `id`,
 * which the backend upserts in place (see triage.repository.ts saveRecord).
 */
export default function RecordEditDialog({ record, open, onClose, aiProvider, aiModel, onSaved }: RecordEditDialogProps) {
  const toast = useToast();
  const [editedRecord, setEditedRecord] = useState<TriageRecord>(() => (record ? cloneRecord(record) : ({} as TriageRecord)));
  const [activeSection, setActiveSection] = useState(0);
  const [isClassifying, setIsClassifying] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showAtsHighlight, setShowAtsHighlight] = useState(false);

  if (!record) return null;

  const updateRecord = (updates: Partial<TriageRecord>) => {
    if (editedRecord.atsPrediction) {
      toast.info("Data klinis berubah. Hasil ATS sebelumnya dibatalkan agar tidak memakai data yang sudah lama.");
    }
    setEditedRecord((current) => ({
      ...current,
      ...updates,
      atsPrediction: undefined,
      atsFinal: undefined,
    }));
  };

  const handleAnalyze = async () => {
    if (!editedRecord.nomorRM || !editedRecord.namaPasien) {
      toast.error("Nomor RM dan Nama Pasien wajib dilengkapi sebelum analisis ATS.");
      setActiveSection(0);
      return;
    }
    setIsClassifying(true);
    try {
      const response = await apiFetch("/api/triage/classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...editedRecord, aiProvider, aiModel }),
      });
      if (!response.ok) throw new Error("Respon analisis ATS tidak berhasil.");
      const prediction = await response.json();
      setEditedRecord((current) => ({ ...current, atsPrediction: prediction, atsFinal: undefined }));
      setShowAtsHighlight(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal melakukan analisis ATS.");
    } finally {
      setIsClassifying(false);
    }
  };

  const handleSave = async (overrideData?: {
    atsLevelOverride?: 1 | 2 | 3 | 4 | 5;
    alasanOverride?: string;
    namaPetugas?: string;
    jabatanPetugas?: string;
  }) => {
    if (!editedRecord.atsPrediction) return;
    setIsSaving(true);
    try {
      const finalPayload: TriageRecord = {
        ...editedRecord,
        atsFinal: overrideData
          ? {
              atsLevelOverride: overrideData.atsLevelOverride,
              alasanOverride: overrideData.alasanOverride,
              atsLevelFinal: overrideData.atsLevelOverride || editedRecord.atsPrediction.atsLevel,
              namaPetugas: overrideData.namaPetugas,
              jabatanPetugas: overrideData.jabatanPetugas,
            }
          : { atsLevelFinal: editedRecord.atsPrediction.atsLevel },
      };
      const response = await apiFetch("/api/triage/records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(finalPayload),
      });
      if (!response.ok) throw new Error("Gagal menyimpan perubahan rekam triase.");
      const saved = await response.json();
      toast.success(`Perubahan rekam ${editedRecord.nomorRM} berhasil disimpan.`, `Kode Transaksi: ${saved.id}`);
      await onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menyimpan perubahan rekam triase.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <ATSResultHighlightDialog open={showAtsHighlight} onClose={() => setShowAtsHighlight(false)} prediction={editedRecord.atsPrediction ?? null} />
      <Dialog
        open={open}
        onOpenChange={(next) => { if (!next) onClose(); }}
        variant="sheet"
        size="2xl"
        title={`Edit Rekam: ${record.namaPasien}`}
        description={record.nomorRM}
        footer={
          <div className="flex w-full flex-wrap items-center justify-between gap-2">
            <Button variant="outline" size="sm" disabled={activeSection === 0} onClick={() => setActiveSection((prev) => Math.max(0, prev - 1))}>
              Kembali
            </Button>
            <div className="flex flex-wrap items-center gap-2">
              {activeSection < FORM_SECTIONS.length - 1 && (
                <Button variant="outline" size="sm" onClick={() => setActiveSection((prev) => Math.min(FORM_SECTIONS.length - 1, prev + 1))}>
                  Lanjut
                </Button>
              )}
              {!editedRecord.atsPrediction && (
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={isClassifying}
                  loading={isClassifying}
                  onClick={handleAnalyze}
                  leftIcon={!isClassifying ? <Wand2 size={16} /> : undefined}
                >
                  {isClassifying ? "Menganalisis..." : "Analisis ATS dengan AI"}
                </Button>
              )}
            </div>
          </div>
        }
      >
        <div className="folder-workspace">
          <Stepper steps={FORM_SECTIONS} activeStep={activeSection} onStepClick={setActiveSection} />

          <div className="folder-content-panel space-y-4">
            <div>
              {activeSection === 0 && (
                <div key={editedRecord.id || editedRecord.nomorRM}>
                  <IdentitasForm data={editedRecord} onChange={updateRecord} />
                </div>
              )}
              {activeSection === 1 && <KeluhanAwalForm data={editedRecord} onChange={updateRecord} />}
              {activeSection === 2 && <VitalSignForm data={editedRecord} onChange={updateRecord} />}
              {activeSection === 3 && <NyeriForm data={editedRecord} onChange={updateRecord} />}
              {activeSection === 4 && <SOAPFormView data={editedRecord} onChange={updateRecord} />}
            </div>

            {editedRecord.atsPrediction && (
              <div className="border-t border-border/70 pt-4">
                <ATSHasilPanel data={editedRecord} onSave={handleSave} isSaving={isSaving} />
              </div>
            )}
          </div>
        </div>
      </Dialog>
    </>
  );
}
