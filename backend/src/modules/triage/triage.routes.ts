import { Router } from "express";
import { classifyTriage } from "../ats/ats.service";
import { toTrainingDataset } from "../records/export.service";
import { recordEvent } from "../monitoring/events.repository";
import { deleteRecord, listRecords, saveRecord } from "./triage.repository";
import { isHeuristicResultWeak, parseNarrativeHeuristic, parseNarrativeWithAI } from "./narrative.service";

export const triageRouter = Router();

triageRouter.post("/classify", async (req, res, next) => {
  try {
    const { aiProvider, aiModel, ...record } = req.body;
    if (!record || !record.vitalSign) {
      return res.status(400).json({ error: "Data triage tidak lengkap" });
    }
    const result = await classifyTriage(record, aiProvider, aiModel);
    return res.json(result);
  } catch (error) {
    return next(error);
  }
});

triageRouter.post("/parse-narrative", async (req, res, next) => {
  try {
    const { narrative, aiProvider, aiModel } = req.body;
    if (!narrative || typeof narrative !== "string" || !narrative.trim()) {
      return res.status(400).json({ error: "Data narasi klinis kosong atau tidak valid" });
    }

    const heuristicRecord = parseNarrativeHeuristic(narrative);
    if (!isHeuristicResultWeak(narrative, heuristicRecord)) {
      req.log?.info({ source: "heuristic", aiProvider: aiProvider || "rulebased" }, "Narrative parsed");
      return res.json({ success: true, record: heuristicRecord, source: "heuristic" });
    }

    try {
      const aiRecord = await parseNarrativeWithAI(narrative, aiProvider, aiModel);
      if (aiRecord) {
        req.log?.info({ source: "ai", aiProvider, aiModel }, "Narrative parsed");
        return res.json({ success: true, record: aiRecord, source: "ai" });
      }
    } catch (error) {
      req.log?.error({ err: error, aiProvider, aiModel }, "AI narrative extraction failed, using heuristic result");
      recordEvent({
        eventType: "ai_failure",
        level: "error",
        provider: aiProvider || "unknown",
        model: aiModel,
        message: error instanceof Error ? error.message : String(error),
        detail: { context: "parse-narrative" },
      });
    }

    // Hasil heuristik terdeteksi lemah (lihat isHeuristicResultWeak) tapi AI tidak
    // dipanggil/gagal — jangan diam-diam kirim data pasien ke provider AI eksternal
    // kalau user memang memilih mode Rule-Based; cukup beri tahu lewat notice.
    const notice = !aiProvider || aiProvider === "rulebased"
      ? "Hasil ekstraksi cepat (heuristik) mungkin belum lengkap, terutama riwayat penyakit/alergi. Aktifkan provider AI (RunPod/Hugging Face) di pengaturan untuk hasil lebih menyeluruh, atau tinjau & lengkapi manual di formulir."
      : "AI tidak tersedia/gagal merespons sehingga memakai hasil ekstraksi cepat (heuristik), yang mungkin belum lengkap. Mohon tinjau & lengkapi manual di formulir.";

    req.log?.info({ source: "heuristic-fallback", aiProvider: aiProvider || "rulebased" }, "Narrative parsed");
    return res.json({ success: true, record: heuristicRecord, source: "heuristic", notice });
  } catch (error) {
    return next(error);
  }
});

triageRouter.get("/records", async (req, res, next) => {
  try {
    const records = await listRecords(req.query.search ? String(req.query.search) : undefined);
    return res.json(records);
  } catch (error) {
    return next(error);
  }
});

triageRouter.post("/records", async (req, res, next) => {
  try {
    const record = req.body;
    if (!record.nomorRM || !record.namaPasien) {
      return res.status(400).json({ error: "Nomor RM dan Nama Pasien wajib diisi" });
    }
    const saved = await saveRecord(record);
    const atsLevel = saved.atsFinal?.atsLevelFinal || saved.atsFinal?.atsLevelOverride || saved.atsPrediction?.atsLevel || null;
    req.log?.info({ recordId: saved.id, atsLevel }, "Triage record saved");
    return res.json(saved);
  } catch (error) {
    return next(error);
  }
});

triageRouter.get("/export", async (_req, res, next) => {
  try {
    const records = await listRecords();
    return res.json(toTrainingDataset(records));
  } catch (error) {
    return next(error);
  }
});

triageRouter.delete("/records/:id", async (req, res, next) => {
  try {
    const deleted = await deleteRecord(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: "Rekam triase tidak ditemukan" });
    }
    req.log?.info({ recordId: req.params.id }, "Triage record deleted");
    return res.json({ success: true });
  } catch (error) {
    return next(error);
  }
});
