import { Router } from "express";
import { classifyTriage } from "../ats/ats.service";
import { toTrainingDataset } from "../records/export.service";
import { requireAdmin } from "../auth/auth.middleware";
import { recordEvent } from "../monitoring/events.repository";
import { RecordAccessDeniedError, deleteRecord, generatePatientRm, listPatients, listRecords, saveRecord } from "./triage.repository";
import { isHeuristicResultWeak, parseNarrativeHeuristic, parseNarrativeWithAI } from "./narrative.service";

export const triageRouter = Router();

// User biasa cuma boleh pakai Pure Rule Based / Model Mandiri — provider AI pihak
// ketiga lain (Hugging Face, Gemini) dibatasi untuk admin saja.
const ADMIN_ONLY_AI_PROVIDERS = new Set(["huggingface", "gemini"]);

function isProviderAllowed(role: string | undefined, aiProvider?: string): boolean {
  if (!aiProvider) return true;
  if (!ADMIN_ONLY_AI_PROVIDERS.has(aiProvider)) return true;
  return role === "admin";
}

triageRouter.post("/classify", async (req, res, next) => {
  try {
    const { aiProvider, aiModel, ...record } = req.body;
    if (!record || !record.vitalSign) {
      return res.status(400).json({ error: "Data triage tidak lengkap" });
    }
    if (!isProviderAllowed(req.user?.role, aiProvider)) {
      return res.status(403).json({ error: "Provider AI ini hanya bisa dipakai admin." });
    }
    const result = await classifyTriage(record, aiProvider, aiModel, req.user);
    return res.json(result);
  } catch (error) {
    return next(error);
  }
});

triageRouter.post("/parse-narrative", async (req, res, next) => {
  const startedAt = Date.now();
  try {
    const { narrative, aiProvider, aiModel } = req.body;
    if (!narrative || typeof narrative !== "string" || !narrative.trim()) {
      return res.status(400).json({ error: "Data narasi klinis kosong atau tidak valid" });
    }
    if (!isProviderAllowed(req.user?.role, aiProvider)) {
      return res.status(403).json({ error: "Provider AI ini hanya bisa dipakai admin." });
    }
    const userId = req.user?.id;
    const userEmail = req.user?.email;

    // Kalau user memilih provider AI secara eksplisit, hormati pilihannya dan selalu
    // coba panggil AI-nya — jangan diam-diam di-skip hanya karena heuristik kebetulan
    // sudah menemukan sinyal inti (riwayat penyakit/skala nyeri) pada narasi pendek.
    const usingExplicitAiProvider = Boolean(aiProvider) && aiProvider !== "rulebased";
    const heuristicRecord = parseNarrativeHeuristic(narrative);
    if (!usingExplicitAiProvider && !isHeuristicResultWeak(narrative, heuristicRecord)) {
      req.log?.info({ source: "heuristic", aiProvider: aiProvider || "rulebased" }, "Narrative parsed");
      recordEvent({
        eventType: "narrative_parse",
        provider: "heuristic",
        durationMs: Date.now() - startedAt,
        detail: { source: "heuristic", aiProviderRequested: aiProvider || "rulebased" },
        userId,
        userEmail,
      });
      return res.json({ success: true, record: heuristicRecord, source: "heuristic" });
    }

    try {
      const aiRecord = await parseNarrativeWithAI(narrative, aiProvider, aiModel);
      if (aiRecord) {
        req.log?.info({ source: "ai", aiProvider, aiModel }, "Narrative parsed");
        recordEvent({
          eventType: "narrative_parse",
          provider: aiProvider,
          model: aiModel,
          durationMs: Date.now() - startedAt,
          detail: { source: "ai" },
          userId,
          userEmail,
        });
        return res.json({ success: true, record: aiRecord, source: "ai" });
      }
    } catch (error) {
      req.log?.error({ err: error, aiProvider, aiModel }, "AI narrative extraction failed, using heuristic result");
      recordEvent({
        eventType: "ai_failure",
        level: "error",
        provider: aiProvider || "unknown",
        model: aiModel,
        durationMs: Date.now() - startedAt,
        message: error instanceof Error ? error.message : String(error),
        detail: { context: "parse-narrative" },
        userId,
        userEmail,
      });
    }

    // Hasil heuristik terdeteksi lemah (lihat isHeuristicResultWeak) tapi AI tidak
    // dipanggil/gagal — jangan diam-diam kirim data pasien ke provider AI eksternal
    // kalau user memang memilih mode Rule-Based; cukup beri tahu lewat notice.
    const notice = !aiProvider || aiProvider === "rulebased"
      ? "Hasil ekstraksi cepat (heuristik) mungkin belum lengkap, terutama riwayat penyakit/alergi. Aktifkan provider AI (RunPod/Hugging Face) di pengaturan untuk hasil lebih menyeluruh, atau tinjau & lengkapi manual di formulir."
      : "AI tidak tersedia/gagal merespons sehingga memakai hasil ekstraksi cepat (heuristik), yang mungkin belum lengkap. Mohon tinjau & lengkapi manual di formulir.";

    req.log?.info({ source: "heuristic-fallback", aiProvider: aiProvider || "rulebased" }, "Narrative parsed");
    recordEvent({
      eventType: "narrative_parse",
      provider: "heuristic-fallback",
      durationMs: Date.now() - startedAt,
      detail: { source: "heuristic-fallback", aiProviderRequested: aiProvider || "rulebased" },
      userId,
      userEmail,
    });
    return res.json({ success: true, record: heuristicRecord, source: "heuristic", notice });
  } catch (error) {
    return next(error);
  }
});

triageRouter.get("/records", async (req, res, next) => {
  try {
    const records = await listRecords(req.query.search ? String(req.query.search) : undefined, req.user);
    return res.json(records);
  } catch (error) {
    return next(error);
  }
});

triageRouter.get("/patients", async (req, res, next) => {
  try {
    const patients = await listPatients(req.query.search ? String(req.query.search) : undefined);
    return res.json(patients);
  } catch (error) {
    return next(error);
  }
});

triageRouter.post("/patients/generate-rm", async (_req, res, next) => {
  try {
    const nomorRM = await generatePatientRm();
    return res.status(201).json({ nomorRM });
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
    const saved = await saveRecord(record, req.user);
    const atsLevel = saved.atsFinal?.atsLevelFinal || saved.atsFinal?.atsLevelOverride || saved.atsPrediction?.atsLevel || null;
    req.log?.info({ recordId: saved.id, atsLevel }, "Triage record saved");
    return res.json(saved);
  } catch (error) {
    if (error instanceof RecordAccessDeniedError) {
      return res.status(403).json({ error: error.message });
    }
    return next(error);
  }
});

triageRouter.get("/export", requireAdmin, async (_req, res, next) => {
  try {
    const records = await listRecords();
    return res.json(toTrainingDataset(records));
  } catch (error) {
    return next(error);
  }
});

triageRouter.delete("/records/:id", requireAdmin, async (req, res, next) => {
  try {
    const deleted = await deleteRecord(req.params.id, req.user);
    if (!deleted) {
      return res.status(404).json({ error: "Rekam triase tidak ditemukan" });
    }
    req.log?.info({ recordId: req.params.id }, "Triage record deleted");
    return res.json({ success: true });
  } catch (error) {
    return next(error);
  }
});
