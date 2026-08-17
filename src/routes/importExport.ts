import { Router } from "express";
import { z } from "zod";
import Papa from "papaparse";
import { prisma } from "../lib/prisma.js";

export const importExportRouter = Router();

// Felder, auf die eine CSV-Spalte gemappt werden kann (Punkt 15)
const targetFields = [
  "firstName", "lastName", "company", "phone", "email", "city", "country", "source",
] as const;

// ---------- Vorschau: Spalten erkennen + erste Zeilen zeigen ----------
const previewSchema = z.object({ csv: z.string().min(1) });

importExportRouter.post("/import/preview", (req, res) => {
  const parsed = previewSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Die CSV-Datei konnte nicht gelesen werden." });

  const result = Papa.parse<Record<string, string>>(parsed.data.csv, { header: true, skipEmptyLines: true });
  if (result.errors.length > 0 && result.data.length === 0) {
    return res.status(400).json({ error: "Die CSV-Datei konnte nicht gelesen werden." });
  }

  res.json({
    columns: result.meta.fields ?? [],
    sampleRows: result.data.slice(0, 5),
    totalRows: result.data.length,
    targetFields,
  });
});

// ---------- Commit: Spaltenzuordnung anwenden, Kontakte anlegen, Duplikate melden (Punkt 17) ----------
const commitSchema = z.object({
  csv: z.string().min(1),
  campaignId: z.string(),
  statusId: z.string(),
  priorityId: z.string(),
  mapping: z.record(z.string()), // { "Vorname": "firstName", "Telefon": "phone", ... }
});

importExportRouter.post("/import/commit", async (req, res) => {
  const parsed = commitSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Der Import konnte nicht gestartet werden.", details: parsed.error.flatten() });
  }
  const { csv, campaignId, statusId, priorityId, mapping } = parsed.data;

  const result = Papa.parse<Record<string, string>>(csv, { header: true, skipEmptyLines: true });

  let created = 0;
  const skippedDuplicates: { row: number; phone?: string; email?: string }[] = [];
  const failed: { row: number; error: string }[] = [];

  for (let i = 0; i < result.data.length; i++) {
    const row = result.data[i];
    const mapped: Record<string, string> = {};
    for (const [csvColumn, target] of Object.entries(mapping)) {
      if (target && row[csvColumn] !== undefined) mapped[target] = row[csvColumn].trim();
    }

    if (!mapped.firstName || !mapped.lastName) {
      failed.push({ row: i + 1, error: "Vorname oder Nachname fehlt." });
      continue;
    }

    // Duplikatsprüfung: Telefon zuerst, dann E-Mail (Punkt 17)
    if (mapped.phone || mapped.email) {
      const duplicate = await prisma.contact.findFirst({
        where: {
          OR: [mapped.phone ? { phone: mapped.phone } : undefined, mapped.email ? { email: mapped.email } : undefined].filter(
            Boolean
          ) as any,
        },
      });
      if (duplicate) {
        skippedDuplicates.push({ row: i + 1, phone: mapped.phone, email: mapped.email });
        continue;
      }
    }

    try {
      await prisma.contact.create({
        data: {
          firstName: mapped.firstName,
          lastName: mapped.lastName,
          company: mapped.company || undefined,
          phone: mapped.phone || undefined,
          email: mapped.email || undefined,
          city: mapped.city || undefined,
          country: mapped.country || undefined,
          campaignId, statusId, priorityId,
          source: mapped.source || "CSV-Import",
        },
      });
      created++;
    } catch {
      failed.push({ row: i + 1, error: "Zeile konnte nicht gespeichert werden." });
    }
  }

  res.json({ created, skippedDuplicates, failed, totalRows: result.data.length });
});

// ---------- Export als CSV (Punkt 16) ----------
importExportRouter.get("/export", async (req, res) => {
  const contacts = await prisma.contact.findMany({
    include: { campaign: true, status: true, priority: true },
    orderBy: { createdAt: "asc" },
  });

  const rows = contacts.map((c) => ({
    Vorname: c.firstName,
    Nachname: c.lastName,
    Unternehmen: c.company ?? "",
    Telefon: c.phone ?? "",
    "E-Mail": c.email ?? "",
    Stadt: c.city ?? "",
    Land: c.country ?? "",
    Kampagne: c.campaign?.name ?? "",
    Status: c.status.name,
    Priorität: c.priority.name,
    "Letzter Kontakt": c.lastContactAt?.toISOString() ?? "",
    "Nächste Aktion": c.nextActionAt?.toISOString() ?? "",
    Notizen: c.notes ?? "",
    Quelle: c.source ?? "",
  }));

  const csv = Papa.unparse(rows);
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="rico-sales-os-export-${new Date().toISOString().slice(0, 10)}.csv"`);
  res.send(csv);
});
