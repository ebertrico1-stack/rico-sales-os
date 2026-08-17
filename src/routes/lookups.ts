import { Router } from "express";
import { prisma } from "../lib/prisma.js";

export const campaignsRouter = Router();
campaignsRouter.get("/", async (_req, res) => res.json(await prisma.campaign.findMany({ orderBy: { name: "asc" } })));
campaignsRouter.post("/", async (req, res) => {
  try {
    res.status(201).json(await prisma.campaign.create({ data: { name: req.body.name } }));
  } catch {
    res.status(400).json({ error: "Kampagne konnte nicht angelegt werden (evtl. Name schon vorhanden)." });
  }
});

export const statusesRouter = Router();
statusesRouter.get("/", async (_req, res) => res.json(await prisma.status.findMany({ orderBy: { sortOrder: "asc" } })));
statusesRouter.post("/", async (req, res) => {
  try {
    res.status(201).json(await prisma.status.create({ data: { name: req.body.name, sortOrder: req.body.sortOrder ?? 0 } }));
  } catch {
    res.status(400).json({ error: "Status konnte nicht angelegt werden." });
  }
});

export const prioritiesRouter = Router();
prioritiesRouter.get("/", async (_req, res) => res.json(await prisma.priority.findMany({ orderBy: { weight: "desc" } })));
prioritiesRouter.post("/", async (req, res) => {
  try {
    res.status(201).json(await prisma.priority.create({ data: { name: req.body.name, weight: req.body.weight ?? 0 } }));
  } catch {
    res.status(400).json({ error: "Priorität konnte nicht angelegt werden." });
  }
});
