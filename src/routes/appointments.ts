import { Router } from "express";
import { prisma } from "../lib/prisma.js";

export const appointmentsRouter = Router();

// GET /api/appointments/upcoming — kommende Termine, chronologisch
appointmentsRouter.get("/upcoming", async (_req, res) => {
  const appointments = await prisma.appointment.findMany({
    where: { scheduledAt: { gte: new Date() }, status: "geplant" },
    include: { contact: { select: { id: true, firstName: true, lastName: true, phone: true, company: true } } },
    orderBy: { scheduledAt: "asc" },
    take: 20,
  });
  res.json(appointments);
});
