import express from "express";
import cors from "cors";
import { contactsRouter } from "./routes/contacts.js";
import { callsRouter } from "./routes/calls.js";
import { followUpRouter } from "./routes/followup.js";
import { campaignsRouter, statusesRouter, prioritiesRouter } from "./routes/lookups.js";
import { dashboardRouter } from "./routes/dashboard.js";
import { importExportRouter } from "./routes/importExport.js";
import { appointmentsRouter } from "./routes/appointments.js";

export const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" })); // CSV-Importe können mehrere tausend Zeilen haben

app.use("/api/contacts", contactsRouter);
app.use("/api/contacts", callsRouter); // stellt POST /api/contacts/:id/log-call bereit
app.use("/api/contacts", followUpRouter); // stellt POST /api/contacts/:id/reschedule bereit
app.use("/api/campaigns", campaignsRouter);
app.use("/api/statuses", statusesRouter);
app.use("/api/priorities", prioritiesRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api", importExportRouter); // /api/import/preview, /api/import/commit, /api/export
app.use("/api/appointments", appointmentsRouter);

// Verständliche Fehlermeldungen statt technischer Stacktraces (Punkt 30)
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err); // technische Details nur im Server-Log
  res.status(500).json({ error: "Etwas ist schiefgelaufen. Bitte versuche es erneut." });
});
