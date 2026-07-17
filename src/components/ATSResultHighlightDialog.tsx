import React from "react";
import { motion } from "motion/react";
import { AlertTriangle, CheckCircle2, Clock, ListChecks } from "lucide-react";
import { ATS_LEVEL_DETAILS, TriageRecord } from "../types";
import { Dialog } from "./ui/Dialog";
import { Button } from "./ui/Button";
import { staggerContainer, staggerItem } from "../lib/motion";

interface ATSResultHighlightDialogProps {
  open: boolean;
  onClose: () => void;
  prediction: NonNullable<TriageRecord["atsPrediction"]> | null;
}

/**
 * Highlight popup shown right after AI/guard-rail classification finishes —
 * surfaces the ATS level and initial action recommendations front-and-center
 * before the clinician moves on to override/validate/save.
 */
export default function ATSResultHighlightDialog({ open, onClose, prediction }: ATSResultHighlightDialogProps) {
  if (!prediction) return null;
  const level = prediction.atsLevel;
  const details = ATS_LEVEL_DETAILS[level];
  const recommendations = prediction.rekomendasiAwal?.length ? prediction.rekomendasiAwal : [];

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose(); }} title="Hasil Analisis ATS" size="lg" variant="sheet">
      <div className="space-y-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className={`rounded-2xl border p-5 shadow-md ${details.color}`}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider opacity-90">Level Triase Ditetapkan</span>
              <h2 className="mt-1 text-2xl font-black leading-tight">{details.name}</h2>
              <p className="text-sm font-bold opacity-90">{details.subtitle}</p>
            </div>
            {prediction.emergencyIndicator && (
              <span className="flex shrink-0 items-center gap-1 rounded-lg bg-black/25 px-2 py-1 text-xs font-black uppercase tracking-wide">
                <AlertTriangle className="size-3.5" /> Gawat
              </span>
            )}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-white/15 pt-3 text-sm font-bold">
            <span className="flex items-center gap-1.5 rounded-lg bg-white/15 px-2.5 py-1.5">
              <Clock className="size-4" /> {details.timeLimit}
            </span>
            <span className="rounded-lg bg-white/15 px-2.5 py-1.5">Confidence {prediction.confidenceScore}%</span>
          </div>
        </motion.div>

        {recommendations.length > 0 && (
          <div className="rounded-2xl border border-secondary/30 bg-secondary/6 p-4">
            <div className="mb-3 flex items-center gap-2">
              <ListChecks className="size-4 text-secondary" />
              <h3 className="text-xs font-black uppercase tracking-wider text-secondary">Rekomendasi Tindakan Awal</h3>
            </div>
            <motion.ul variants={staggerContainer} initial="hidden" animate="visible" className="space-y-2">
              {recommendations.map((rec, index) => (
                <motion.li key={index} variants={staggerItem} className="flex items-start gap-2.5 text-sm font-semibold text-text">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-secondary" />
                  <span>{rec}</span>
                </motion.li>
              ))}
            </motion.ul>
          </div>
        )}

        <Button variant="primary" fullWidth onClick={onClose}>
          Lanjutkan ke Validasi Klinis
        </Button>
      </div>
    </Dialog>
  );
}
