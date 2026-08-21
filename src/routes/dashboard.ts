import { Router } from "express";
import { prisma } from "../lib/prisma.js";

export const dashboardRouter = Router();

dashboardRouter.get("/", async (_req, res) => {
  const totalContacts = await prisma.contact.count();
  res.json({ totalContacts });
});
