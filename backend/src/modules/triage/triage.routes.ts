import { Router } from "express";
import { classifyTriage } from "../ats/ats.service";
import { toTrainingDataset } from "../records/export.service";
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
      return res.json({ success: true, record: heuristicRecord, source: "heuristic" });
    }

    try {
      const aiRecord = await parseNarrativeWithAI(narrative, aiProvider, aiModel);
      if (aiRecord) return res.json({ success: true, record: aiRecord, source: "ai" });
    } catch (error) {
      console.error("AI narrative extraction failed, using heuristic result:", error);
    }

    return res.json({ success: true, record: heuristicRecord, source: "heuristic" });
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
    return res.json(await saveRecord(record));
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
    return res.json({ success: true });
  } catch (error) {
    return next(error);
  }
});
