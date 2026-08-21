import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";

export const followUpRouter = Router();

const rescheduleSchema = z.object({
  dueAt: z.string(), // ISO-Datetime, vom datetime-local Input
  reason: z.string().optional(), // freier Text, z.B. "Call Allgemein", "Termin für Vertragsgespräch"
});

// POST /api/contacts/:id/complete
// Schneller Weg, einen Kontakt direkt aus der Liste als erledigt zu markieren,
// ohne durch Call Mode zu gehen.
followUpRouter.post("/:id/complete", async (req, res) => {
  const contactId = req.params.id;
  const contact = await prisma.contact.findUnique({ where: { id: contactId } });
  if (!contact) return res.status(404).json({ error: "Kontakt nicht gefunden." });

  try {
    const updated = await prisma.$transaction(async (tx) => {
      await tx.activity.create({
        data: { contactId, type: "Als erledigt markiert" },
      });
      await tx.followUp.updateMany({
        where: { contactId, isDone: false },
        data: { isDone: true, resolvedAt: new Date() },
      });
      return tx.contact.update({
        where: { id: contactId },
        data: { nextActionAt: null, nextActionType: null, isCompleted: true },
      });
    });
    res.json(updated);
  } catch {
    res.status(500).json({ error: "Der Kontakt konnte nicht als erledigt markiert werden." });
  }
});

// POST /api/contacts/:id/reschedule
// Für den Fall, dass Rico einen Kontakt aus der Liste heraus verschieben will,
// ohne durch den vollen Call-Mode-Flow zu gehen (Szenario 2 + 3 aus der Spec).
followUpRouter.post("/:id/reschedule", async (req, res) => {
  const parsed = rescheduleSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Der Termin konnte nicht verschoben werden.", details: parsed.error.flatten() });
  }
  const { dueAt, reason } = parsed.data;
  const contactId = req.params.id;

  const contact = await prisma.contact.findUnique({ where: { id: contactId } });
  if (!contact) return res.status(404).json({ error: "Kontakt nicht gefunden." });

  const nextDate = new Date(dueAt);
  if (isNaN(nextDate.getTime())) return res.status(400).json({ error: "Ungültiges Datum." });

  try {
    const formattedDate = nextDate.toLocaleString("de-DE", {
      day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
    });
    const note = reason ? `Termin am ${formattedDate} Uhr — ${reason}` : `Termin am ${formattedDate} Uhr`;

    const updated = await prisma.$transaction(async (tx) => {
      await tx.activity.create({
        data: { contactId, type: "Follow-up verschoben", note },
      });
      await tx.followUp.updateMany({
        where: { contactId, isDone: false },
        data: { isDone: true, resolvedAt: new Date() },
      });
      await tx.followUp.create({
        data: { contactId, dueAt: nextDate, reason: reason ?? "manuell verschoben" },
      });
      return tx.contact.update({
        where: { id: contactId },
        data: { nextActionAt: nextDate },
      });
    });
    res.json(updated);
  } catch {
    res.status(500).json({ error: "Der Termin konnte nicht verschoben werden." });
  }
});
