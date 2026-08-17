import { Router } from "express";
import { prisma } from "../lib/prisma.js";

export const dashboardRouter = Router();

dashboardRouter.get("/", async (_req, res) => {
  const now = new Date();
  const startOfDay = new Date(now); startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(now); endOfDay.setHours(23, 59, 59, 999);

  const [
    totalContacts,
    newContacts,
    callsToday,
    reachedToday,
    notReachedToday,
    callbacksOpen,
    appointmentsUpcoming,
    completedContacts,
  ] = await Promise.all([
    prisma.contact.count(),
    prisma.contact.count({ where: { createdAt: { gte: startOfDay } } }),
    prisma.activity.count({ where: { type: "Anruf", createdAt: { gte: startOfDay, lte: endOfDay } } }),
    prisma.activity.count({ where: { type: "Anruf", result: { in: ["interesse", "termin_vereinbart", "rueckruf", "kein_interesse"] }, createdAt: { gte: startOfDay, lte: endOfDay } } }),
    prisma.activity.count({ where: { type: "Anruf", result: "nicht_erreicht", createdAt: { gte: startOfDay, lte: endOfDay } } }),
    prisma.followUp.count({ where: { isDone: false, reason: "rueckruf" } }),
    prisma.appointment.count({ where: { scheduledAt: { gte: now }, status: "geplant" } }),
    prisma.contact.count({ where: { isCompleted: true } }),
  ]);

  const conversionRate = callsToday > 0 ? Math.round((reachedToday / callsToday) * 100) : 0;

  res.json({
    totalContacts,
    newContacts,
    callsToday,
    reachedToday,
    notReachedToday,
    callbacksOpen,
    appointmentsUpcoming,
    completedContacts,
    conversionRate,
  });
});
