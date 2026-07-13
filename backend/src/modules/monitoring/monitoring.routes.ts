import { Router } from "express";
import { buildMonitoringWorkbook } from "./report.service";

export const monitoringRouter = Router();

monitoringRouter.get("/export", async (req, res, next) => {
  try {
    const from = req.query.from ? String(req.query.from) : undefined;
    const to = req.query.to ? String(req.query.to) : undefined;
    const workbook = await buildMonitoringWorkbook(from, to);

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="Log_Monitoring_ATS_${new Date().toISOString().slice(0, 10)}.xlsx"`,
    );
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    next(error);
  }
});
