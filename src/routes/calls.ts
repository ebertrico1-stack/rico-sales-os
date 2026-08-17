import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { resolveFollowUpDate, type FollowUpOption } from "../lib/followup.js";

export const callsRouter = Router();

const logCallSchema = z.object({
  result: z.enum([
    "interesse",
    "kein_interesse",
    "rueckruf",
    "termin_vereinbart",
    "spaeter_entscheiden",
    "falscher_ansprechpartner",
    "nicht_erreicht",
    "sonstiges",
  ]),
  note: z.string().optional(),
  followUpOption: z.enum([
    "spaeter_heute",
    "morgen",
    "in_3_tagen",
    "naechste_woche",
    "custom",
    "keine_weitere_aktion",
  ]),
  customDate: z.string().optional(),
  appointment: z
    .object({ scheduledAt: z.string(), location: z.string().optional() })
    .optional(),
});

// POST /api/contacts/:id/log-call
callsRouter.post("/:id/log-call", async (req, res) => {
  const parsed = logCallSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Das Ergebnis konnte nicht gespeichert werden.", details: parsed.error.flatten() });
  }
  const { result, note, followUpOption, customDate, appointment } = parsed.data;
  const contactId = req.params.id;

  const contact = await prisma.contact.findUnique({ where: { id: contactId } });
  if (!contact) return res.status(404).json({ error: "Kontakt nicht gefunden." });

  const nextDate = resolveFollowUpDate({ option: followUpOption as FollowUpOption, customDate });

  try {
    const updated = await prisma.$transaction(async (tx) => {
      // 1) Activity-Log (Historie, Punkt 10)
      await tx.activity.create({
        data: { contactId, type: "Anruf", result, note },
      });

      // 2) Bisheriges aktives FollowUp abschließen
      await tx.followUp.updateMany({
        where: { contactId, isDone: false },
        data: { isDone: true, resolvedAt: new Date() },
      });

      // 3) Neues FollowUp anlegen, falls ein weiterer Termin nötig ist
      if (nextDate) {
        await tx.followUp.create({
          data: { contactId, dueAt: nextDate, reason: result },
        });
      }

      // 4) Termin anlegen, falls "Termin vereinbart" (Punkt 14 — getrennt vom Follow-up-System)
      if (result === "termin_vereinbart" && appointment) {
        await tx.appointment.create({
          data: {
            contactId,
            scheduledAt: new Date(appointment.scheduledAt),
            location: appointment.location,
          },
        });
      }

      // 5) Kontakt aktualisieren
      return tx.contact.update({
        where: { id: contactId },
        data: {
          lastContactAt: new Date(),
          nextActionAt: nextDate,
          nextActionType: nextDate ? "Anruf" : null,
          isCompleted: nextDate === null, // keine weitere Aktion → abgeschlossen (Szenario 6)
        },
      });
    });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Der Kontakt konnte nicht gespeichert werden." });
  }
});
