import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { z } from "zod";

export const contactsRouter = Router();

// ---------- Heute-Liste (Herzstück der App, Punkt 3 + 11) ----------
// Sortierung: Überfällig zuerst, dann Priorität (Sehr hoch > Hoch), dann Uhrzeit
contactsRouter.get("/today", async (req, res) => {
  const now = new Date();
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);

  const contacts = await prisma.contact.findMany({
    where: {
      isCompleted: false,
      nextActionAt: { not: null, lte: endOfToday },
    },
    include: { campaign: true, status: true, priority: true },
  });

  const sorted = contacts.sort((a, b) => {
    const aOverdue = a.nextActionAt! < now ? 1 : 0;
    const bOverdue = b.nextActionAt! < now ? 1 : 0;
    if (aOverdue !== bOverdue) return bOverdue - aOverdue; // überfällig zuerst
    if (a.priority.weight !== b.priority.weight) return b.priority.weight - a.priority.weight;
    return a.nextActionAt!.getTime() - b.nextActionAt!.getTime();
  });

  res.json(sorted);
});

// ---------- Nächster Kontakt für Call Mode (Punkt 4) ----------
contactsRouter.get("/next-for-call", async (req, res) => {
  const excludeId = typeof req.query.exclude === "string" ? req.query.exclude : undefined;
  const now = new Date();

  const next = await prisma.contact.findFirst({
    where: {
      isCompleted: false,
      nextActionAt: { not: null, lte: now },
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    include: { campaign: true, status: true, priority: true, activities: { orderBy: { createdAt: "desc" }, take: 5 } },
    orderBy: [{ priority: { weight: "desc" } }, { nextActionAt: "asc" }],
  });

  res.json(next);
});

// ---------- Liste mit Filtern + Suche (Punkt 12) ----------
const listQuerySchema = z.object({
  filter: z.enum(["alle", "heute", "ueberfaellig", "morgen", "diese_woche", "abgeschlossen"]).optional(),
  campaignId: z.string().optional(),
  statusId: z.string().optional(),
  search: z.string().optional(),
});

contactsRouter.get("/", async (req, res) => {
  const parsed = listQuerySchema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: "Ungültige Filterparameter" });
  const { filter, campaignId, statusId, search } = parsed.data;

  const now = new Date();
  const where: any = {};

  if (filter === "abgeschlossen") where.isCompleted = true;
  else where.isCompleted = false;

  if (filter === "ueberfaellig") where.nextActionAt = { lt: now };
  if (filter === "heute") {
    const end = new Date(now); end.setHours(23, 59, 59, 999);
    where.nextActionAt = { gte: now, lte: end };
  }
  if (filter === "morgen") {
    const start = new Date(now); start.setDate(start.getDate() + 1); start.setHours(0, 0, 0, 0);
    const end = new Date(start); end.setHours(23, 59, 59, 999);
    where.nextActionAt = { gte: start, lte: end };
  }
  if (filter === "diese_woche") {
    const end = new Date(now); end.setDate(end.getDate() + (7 - end.getDay()));
    where.nextActionAt = { gte: now, lte: end };
  }

  if (campaignId) where.campaignId = campaignId;
  if (statusId) where.statusId = statusId;

  if (search) {
    where.OR = [
      { firstName: { contains: search } },
      { lastName: { contains: search } },
      { company: { contains: search } },
      { phone: { contains: search } },
      { email: { contains: search } },
    ];
  }

  const contacts = await prisma.contact.findMany({
    where,
    include: { campaign: true, status: true, priority: true },
    orderBy: { updatedAt: "desc" },
  });

  res.json(contacts);
});

// ---------- Geburtstage heute (Tag/Monat, Jahr wird ignoriert) ----------
contactsRouter.get("/birthdays/today", async (_req, res) => {
  const now = new Date();
  const contacts = await prisma.contact.findMany({ where: { birthday: { not: null } } });
  const todays = contacts.filter((c) => {
    if (!c.birthday) return false;
    return c.birthday.getUTCMonth() === now.getMonth() && c.birthday.getUTCDate() === now.getDate();
  });
  res.json(todays);
});

// ---------- Einzelner Kontakt inkl. voller Historie ----------
contactsRouter.get("/:id", async (req, res) => {
  const contact = await prisma.contact.findUnique({
    where: { id: req.params.id },
    include: {
      campaign: true,
      status: true,
      priority: true,
      activities: { orderBy: { createdAt: "desc" } },
      followUps: { orderBy: { createdAt: "desc" } },
      appointments: { orderBy: { scheduledAt: "asc" } },
    },
  });
  if (!contact) return res.status(404).json({ error: "Kontakt nicht gefunden" });
  res.json(contact);
});

// ---------- Kontakt anlegen ----------
const createContactSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  company: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  source: z.string().optional(),
  notes: z.string().optional(),
  birthday: z.string().optional(), // ISO-Datum, z.B. "1985-06-12"
  campaignId: z.string().optional(),
  statusId: z.string(),
  priorityId: z.string(),
});

contactsRouter.post("/", async (req, res) => {
  const parsed = createContactSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Der Kontakt konnte nicht gespeichert werden.", details: parsed.error.flatten() });

  // Duplikatsprüfung (Punkt 17): Telefon zuerst, dann E-Mail
  const { phone, email, birthday, ...rest } = parsed.data;
  if (phone || email) {
    const possibleDuplicate = await prisma.contact.findFirst({
      where: { OR: [phone ? { phone } : undefined, email ? { email } : undefined].filter(Boolean) as any },
    });
    if (possibleDuplicate) {
      return res.status(409).json({ error: "Möglicher Duplikat-Kontakt gefunden.", duplicate: possibleDuplicate });
    }
  }

  const contact = await prisma.contact.create({
    data: { ...rest, phone, email, birthday: birthday ? new Date(birthday) : undefined },
  });
  res.status(201).json(contact);
});

// ---------- Aktivität löschen ----------
contactsRouter.delete("/:contactId/activities/:activityId", async (req, res) => {
  try {
    await prisma.activity.delete({ where: { id: req.params.activityId } });
    res.status(204).end();
  } catch {
    res.status(404).json({ error: "Eintrag konnte nicht gelöscht werden." });
  }
});

// ---------- Kontakt aktualisieren ----------
contactsRouter.patch("/:id", async (req, res) => {
  try {
    const { birthday, ...rest } = req.body;
    const data =
      birthday !== undefined
        ? { ...rest, birthday: birthday ? new Date(birthday) : null }
        : rest;

    const contact = await prisma.contact.update({
      where: { id: req.params.id },
      data,
    });
    res.json(contact);
  } catch (err) {
    console.error(err); // technische Details nur im Server-Log
    res.status(400).json({ error: "Der Kontakt konnte nicht gespeichert werden." });
  }
});
