import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.campaign.createMany({
    data: [{ name: "Swiss Family Group" }, { name: "Tech Markets" }],
    skipDuplicates: true,
  });

  const statuses = [
    "Neu", "Zu kontaktieren", "Nicht erreicht", "Rückruf", "Gespräch geführt",
    "Termin vereinbart", "Termin verschoben", "Kein Interesse", "Falscher Ansprechpartner", "Abgeschlossen",
  ];
  for (let i = 0; i < statuses.length; i++) {
    await prisma.status.upsert({
      where: { name: statuses[i] },
      update: {},
      create: { name: statuses[i], sortOrder: i },
    });
  }

  const priorities: [string, number][] = [["Niedrig", 1], ["Normal", 2], ["Hoch", 3], ["Sehr hoch", 4]];
  for (const [name, weight] of priorities) {
    await prisma.priority.upsert({ where: { name }, update: {}, create: { name, weight } });
  }

  console.log("Seed abgeschlossen: 2 Kampagnen, 10 Status, 4 Prioritäten angelegt.");
}

main().finally(() => prisma.$disconnect());
