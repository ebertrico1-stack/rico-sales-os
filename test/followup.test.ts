import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveFollowUpDate } from "../src/lib/followup.js";

const now = new Date("2026-08-17T10:00:00.000Z"); // Montag

test("morgen → nächster Tag, 09:00 Uhr", () => {
  const result = resolveFollowUpDate({ option: "morgen", now });
  assert.equal(result?.getDate(), 18);
  assert.equal(result?.getHours(), 9);
});

test("in_3_tagen → +3 Tage, 09:00 Uhr", () => {
  const result = resolveFollowUpDate({ option: "in_3_tagen", now });
  assert.equal(result?.getDate(), 20);
});

test("naechste_woche → +7 Tage", () => {
  const result = resolveFollowUpDate({ option: "naechste_woche", now });
  assert.equal(result?.getDate(), 24);
});

test("spaeter_heute → gleicher Tag, 3h später", () => {
  const result = resolveFollowUpDate({ option: "spaeter_heute", now });
  assert.equal(result?.getDate(), 17);
  assert.equal(result?.getHours(), 13);
});

test("custom → exaktes Datum wird übernommen", () => {
  const result = resolveFollowUpDate({ option: "custom", customDate: "2026-09-01T14:30:00.000Z", now });
  assert.equal(result?.toISOString(), "2026-09-01T14:30:00.000Z");
});

test("custom ohne customDate wirft Fehler", () => {
  assert.throws(() => resolveFollowUpDate({ option: "custom", now }));
});

test("keine_weitere_aktion → null (Kontakt wird abgeschlossen, Szenario 6)", () => {
  const result = resolveFollowUpDate({ option: "keine_weitere_aktion", now });
  assert.equal(result, null);
});
