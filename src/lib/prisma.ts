import { PrismaClient } from "@prisma/client";

// Ein einziger PrismaClient über die gesamte App (verhindert zu viele Connections bei Hot-Reload)
export const prisma = new PrismaClient();
