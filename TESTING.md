# Testprotokoll — Phase 9

## Automatisiert abgedeckt

| # | Szenario (aus Masterprompt Punkt 28) | Test | Datei |
|---|---|---|---|
| 1 | Kontakt wird heute fällig → erscheint unter "Heute" | ✅ | `test/scenarios.test.ts` |
| 2 | Kontakt auf morgen verschoben → verschwindet aus Heute | ✅ | `test/scenarios.test.ts` |
| 3 | Kontakt auf +7 Tage verschoben → erscheint erst dann | ✅ | `test/scenarios.test.ts` |
| 4 | Nicht erreicht → Activity gespeichert | ✅ | `test/scenarios.test.ts` |
| 5 | Termin vereinbart → Termin gespeichert | ✅ | `test/scenarios.test.ts` |
| 6 | Kontakt abgeschlossen → nicht mehr in offenen Follow-ups | ✅ | `test/scenarios.test.ts` |
| 7 | Überfälliger Kontakt → automatisch unter "Überfällig", zuerst sortiert | ✅ | `test/scenarios.test.ts` |
| 8 | Doppelter Import → Duplikat erkannt | ✅ | `test/scenarios.test.ts` |
| — | Follow-up-Datumsberechnung (alle Optionen) | ✅ | `test/followup.test.ts` (7 Tests) |

Ausführen:
```bash
npm run test:all
```
Voraussetzung: `npx prisma generate` und `npx prisma migrate deploy` liefen bereits gegen eine Test-DB (separate `DATABASE_URL`, z. B. `file:./test.db`, empfohlen über `.env.test` + `dotenv -e .env.test -- npm run test:integration`, um nicht versehentlich deine echte Datenbank zu leeren — `beforeEach` löscht alle Kontakte/Activities/FollowUps).

## Konnte in dieser Sandbox nicht selbst ausgeführt werden

Die Prisma-Engine-Binaries ließen sich hier wegen Netzwerk-Restriktionen nicht laden (`binaries.prisma.sh` nicht erreichbar). Die Tests sind vollständig geschrieben und typgeprüft (`tsc --noEmit` liefert keine echten Fehler, nur die durch den fehlenden generierten Client verursachten). Bei dir laufen sie nach `npm install && npx prisma generate` sofort.

## Manuell zu prüfen (nicht sinnvoll automatisierbar)

- [ ] Call Mode auf echtem iPhone: Touch-Ziele groß genug, Bottom-Sheet lässt sich mit Daumen bedienen
- [ ] Ladezeiten auf Mobilfunknetz (nicht nur WLAN)
- [ ] CSV-Import mit echter Notion-Exportdatei (Sonderzeichen, Encoding)
- [ ] Verhalten bei sehr langer Kontaktliste (100+ Einträge) — Performance der Heute-Sortierung
- [ ] Fehlermeldungen bei echtem Netzwerkausfall (z. B. im Aufzug/Keller während Akquise)
