import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { resolveFollowUpDate, type FollowUpOption } from "../lib/followup.js";

export const followUpRouter = Router();

const rescheduleSchema = z.object({
  followUpOption: z.enum(["spaeter_heute", "morgen", "in_3_tagen", "naechste_woche", "custom"]),
  customDate: z.string().optional(),
  reason: z.string().optional(), // z.B. "manuell verschoben"
});

// POST /api/contacts/:id/reschedule
// Für den Fall, dass Rico einen Kontakt aus der Liste heraus verschieben will,
// ohne durch den vollen Call-Mode-Flow zu gehen (Szenario 2 + 3 aus der Spec).
followUpRouter.post("/:id/reschedule", async (req, res) => {
  const parsed = rescheduleSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Der Termin konnte nicht verschoben werden.", details: parsed.error.flatten() });
  }
  const { followUpOption, customDate, reason } = parsed.data;
  const contactId = req.params.id;

  const contact = await prisma.contact.findUnique({ where: { id: contactId } });
  if (!contact) return res.status(404).json({ error: "Kontakt nicht gefunden." });

  const nextDate = resolveFollowUpDate({ option: followUpOption as FollowUpOption, customDate });
  if (!nextDate) return res.status(400).json({ error: "Ungültiges Datum." });

  try {
    const updated = await prisma.$transaction(async (tx) => {
      await tx.activity.create({
        data: { contactId, type: "Follow-up verschoben", note: reason ?? undefined },
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
