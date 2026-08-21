// Integrationstests gegen eine echte (temporäre) Postgres-DB.
// Ausführen: npm run test:integration (siehe README — braucht `prisma generate` + eine erreichbare Test-DB zuvor)

import { test, before, beforeEach, after } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { app } from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";

let campaignId: string;
let statusNeu: string;
let priorityNormal: string;

before(async () => {
  const campaign = await prisma.campaign.upsert({
    where: { name: "Test-Kampagne" }, update: {}, create: { name: "Test-Kampagne" },
  });
  campaignId = campaign.id;

  const neu = await prisma.status.upsert({ where: { name: "Neu" }, update: {}, create: { name: "Neu", sortOrder: 0 } });
  statusNeu = neu.id;

  const normal = await prisma.priority.upsert({ where: { name: "Normal" }, update: {}, create: { name: "Normal", weight: 2 } });
  priorityNormal = normal.id;
});

beforeEach(async () => {
  // saubere Kontakt-/Activity-/FollowUp-Tabellen vor jedem Test
  await prisma.activity.deleteMany();
  await prisma.followUp.deleteMany();
  await prisma.contact.deleteMany();
});

after(async () => {
  await prisma.$disconnect();
});

async function createContact(overrides: Partial<{ nextActionAt: Date }> = {}) {
  return prisma.contact.create({
    data: {
      firstName: "Max", lastName: "Mustermann", phone: "+491234567",
      campaignId, statusId: statusNeu, priorityId: priorityNormal,
      nextActionAt: overrides.nextActionAt ?? new Date(),
    },
  });
}

// ---------- Szenario 1: Kontakt wird heute fällig → erscheint unter "Heute" ----------
test("Szenario 1: fälliger Kontakt erscheint in /contacts/today", async () => {
  await createContact({ nextActionAt: new Date() });
  const res = await request(app).get("/api/contacts/today");
  assert.equal(res.status, 200);
  assert.equal(res.body.length, 1);
});

// ---------- Szenario 2: Kontakt wird auf morgen verschoben → verschwindet aus "Heute" ----------
test("Szenario 2: verschobener Kontakt verschwindet aus Heute, erscheint morgen", async () => {
  const contact = await createContact({ nextActionAt: new Date() });
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
  await request(app).post(`/api/contacts/${contact.id}/reschedule`).send({ dueAt: tomorrow.toISOString() });

  const today = await request(app).get("/api/contacts/today");
  assert.equal(today.body.length, 0);

  const updated = await prisma.contact.findUnique({ where: { id: contact.id } });
  assert.equal(updated?.nextActionAt?.toDateString(), tomorrow.toDateString());
});

// ---------- Szenario 3: Kontakt wird auf +7 Tage verschoben → erscheint erst dann ----------
test("Szenario 3: Kontakt mit Termin in einer Woche taucht nicht in Heute auf", async () => {
  const contact = await createContact({ nextActionAt: new Date() });
  const nextWeek = new Date(Date.now() + 7 * 86400000);
  await request(app).post(`/api/contacts/${contact.id}/reschedule`).send({ dueAt: nextWeek.toISOString() });

  const today = await request(app).get("/api/contacts/today");
  assert.equal(today.body.length, 0);
});

// ---------- Szenario 6: Kontakt als erledigt markiert → nicht mehr in offenen Follow-ups ----------
test("Szenario 6: /complete schließt Kontakt ab", async () => {
  const contact = await createContact();
  await request(app).post(`/api/contacts/${contact.id}/complete`);

  const updated = await prisma.contact.findUnique({ where: { id: contact.id } });
  assert.equal(updated?.isCompleted, true);
  assert.equal(updated?.nextActionAt, null);

  const today = await request(app).get("/api/contacts/today");
  assert.equal(today.body.length, 0);
});

// ---------- Szenario 7: überfälliger Kontakt erscheint automatisch unter "Überfällig" ----------
test("Szenario 7: überfälliger Kontakt wird als überfällig einsortiert (zuerst sortiert)", async () => {
  const yesterday = new Date(Date.now() - 86400000);
  const overdueContact = await createContact({ nextActionAt: yesterday });
  await createContact({ nextActionAt: new Date() }); // heute fällig, zum Vergleich

  const res = await request(app).get("/api/contacts/today");
  assert.equal(res.body[0].id, overdueContact.id); // überfällig muss zuerst kommen
});

// ---------- Szenario 8: Kontakt wird doppelt importiert → Duplikat wird erkannt ----------
test("Szenario 8: Import erkennt Duplikat per Telefonnummer", async () => {
  await createContact(); // hat phone +491234567

  const csv = "Vorname;Nachname;Telefon\nMax;Mustermann;+491234567";
  const res = await request(app).post("/api/import/commit").send({
    csv,
    campaignId, statusId: statusNeu, priorityId: priorityNormal,
    mapping: { Vorname: "firstName", Nachname: "lastName", Telefon: "phone" },
  });

  assert.equal(res.body.created, 0);
  assert.equal(res.body.skippedDuplicates.length, 1);
});

// ---------- Kontakt endgültig löschen ----------
test("DELETE /contacts/:id entfernt Kontakt samt Verlauf", async () => {
  const contact = await createContact();
  await request(app).post(`/api/contacts/${contact.id}/complete`); // erzeugt einen Activity-Eintrag

  const res = await request(app).delete(`/api/contacts/${contact.id}`);
  assert.equal(res.status, 204);

  const stillThere = await prisma.contact.findUnique({ where: { id: contact.id } });
  assert.equal(stillThere, null);
});

// ---------- Tage-seit-Kontakt: mark-contacted + Sortierung/Filter ----------
test("mark-contacted setzt lastContactAt, Notiz/Verschieben rühren es nicht an", async () => {
  const contact = await createContact();

  const before = await prisma.contact.findUnique({ where: { id: contact.id } });
  assert.equal(before?.lastContactAt, null);

  await request(app).post(`/api/contacts/${contact.id}/mark-contacted`);
  const afterMark = await prisma.contact.findUnique({ where: { id: contact.id } });
  assert.ok(afterMark?.lastContactAt);

  // Verschieben darf lastContactAt nicht verändern
  const original = afterMark!.lastContactAt!.getTime();
  const tomorrow = new Date(Date.now() + 86400000);
  await request(app).post(`/api/contacts/${contact.id}/reschedule`).send({ dueAt: tomorrow.toISOString() });
  const afterReschedule = await prisma.contact.findUnique({ where: { id: contact.id } });
  assert.equal(afterReschedule?.lastContactAt?.getTime(), original);
});

test("noContactDays-Filter findet Kontakte ohne kürzlichen Kontakt", async () => {
  const oldContact = await createContact();
  const oldDate = new Date(Date.now() - 40 * 86400000);
  await prisma.contact.update({ where: { id: oldContact.id }, data: { lastContactAt: oldDate } });

  const recentContact = await createContact();
  await request(app).post(`/api/contacts/${recentContact.id}/mark-contacted`);

  const res = await request(app).get("/api/contacts?noContactDays=30");
  const ids = res.body.map((c: any) => c.id);
  assert.ok(ids.includes(oldContact.id));
  assert.ok(!ids.includes(recentContact.id));
});
