# Rico Sales OS — Backend (Phase 2 + 3)

## Setup

```bash
npm install
cp .env.example .env
npx prisma generate
npx prisma migrate dev --name init
npm run seed
npm run dev
```

API läuft danach auf `http://localhost:4000`.

## Wichtigste Endpunkte

- `GET /api/contacts/today` — Heute-Liste (überfällig, heute, priorisiert sortiert)
- `GET /api/contacts/next-for-call?exclude=<id>` — nächster Kontakt für Call Mode
- `GET /api/contacts?filter=ueberfaellig|heute|morgen|diese_woche|abgeschlossen&campaignId=&statusId=&search=`
- `GET /api/contacts/:id` — Kontakt inkl. voller Historie (Activities, FollowUps, Appointments)
- `POST /api/contacts` — Kontakt anlegen (prüft Telefon/E-Mail auf Duplikate)
- `PATCH /api/contacts/:id` — Kontakt bearbeiten
- `POST /api/contacts/:id/log-call` — **Kernaktion**: Anrufergebnis erfassen, Follow-up setzen, ggf. Termin anlegen
- `GET/POST /api/campaigns`, `/api/statuses`, `/api/priorities` — Lookups, erweiterbar ohne Code-Änderung
- `GET /api/dashboard` — Tageskennzahlen

## Beispiel: Anruf erfassen

```json
POST /api/contacts/abc123/log-call
{
  "result": "nicht_erreicht",
  "note": "Mailbox erreicht",
  "followUpOption": "morgen"
}
```

Das setzt automatisch: Activity-Eintrag, altes FollowUp abgeschlossen, neues FollowUp für morgen 09:00 Uhr,
`Contact.nextActionAt` aktualisiert → Kontakt verschwindet aus "Heute" und taucht morgen wieder auf (Szenario 1–3 aus deiner Spec).

## Frontend starten (zweites Terminal, Backend muss laufen)

```bash
cd frontend
npm install
npm run dev
```

Öffnet auf `http://localhost:5173`, Requests an `/api/*` werden automatisch zum Backend (Port 4000) weitergeleitet.

## Status dieser Phase

Fertig:
- Backend: Datenmodell, DB-Migration-Setup, komplette API inkl. Call-Mode-Logik, Follow-up-Engine, Dashboard-Kennzahlen, Duplikatsprüfung
- Frontend: App-Shell mit mobiler Bottom-Navigation, **Heute-Seite** (Kennzahlen + priorisierte Liste), **Kontakte-Seite** (Filter + Suche), Kontakt-Detailseite mit Verlauf

- **Call Mode** (Phase 5): Vollbild-Ansicht, holt automatisch den nächsten fälligen Kontakt, große Schnellaktions-Buttons (Angerufen, Nicht erreicht, Rückruf, Termin, Kein Interesse, Falscher Kontakt, Pause), Ergebnis-Bottom-Sheet mit Notiz + Follow-up-Auswahl, springt nach dem Speichern automatisch zum nächsten Kontakt. Pause hält die Session an, ohne den Fortschritt zu verlieren.

- **Follow-up-System-Feinschliff** (Phase 6): eigener `POST /api/contacts/:id/reschedule`-Endpunkt, um einen Kontakt direkt aus der Liste zu verschieben, ohne den vollen Call-Mode-Flow zu durchlaufen (⋯-Button auf jeder Kontaktkarte in Heute- und Kontakte-Ansicht). Follow-up-Datumslogik ist jetzt mit 7 automatisierten Tests abgesichert (`npm test`, deckt Szenario 1–3 & 6 aus deiner Spec ab).

- **Dashboard-UI** (Phase 7): Kennzahlen-Grid (Calls heute, Erreicht, Nicht erreicht, Rückrufe offen, Termine, Conversion Rate) + Gesamtübersicht (Kontakte gesamt, Neue Kontakte, Abgeschlossen), gespeist vom bestehenden `/api/dashboard`-Endpunkt.

- **Import/Export** (Phase 8): CSV-Import mit Spaltenzuordnung (`/import-export`, erreichbar über den Dashboard-Link) — Datei auswählen, Spalten den Kontaktfeldern zuordnen (mit automatischer Vorbelegung bei gleichem Namen), Kampagne/Status/Priorität wählen, importieren. Duplikate (per Telefon/E-Mail) werden übersprungen und gemeldet, fehlerhafte Zeilen ebenso. CSV-Export aller Kontakte per Klick.

- **Testing** (Phase 9): Alle 8 Szenarien aus Punkt 28 als Integrationstests (`test/scenarios.test.ts`, via supertest gegen die echte API + Test-DB), plus 7 Unit-Tests für die Follow-up-Datumslogik. Details und manuelle Restpunkte in `TESTING.md`.

- **Mobile-UX-Feinschliff** (Phase 10): Safe-Area-Insets für iPhone-Notch/Home-Indicator (Bottom-Nav, Bottom-Sheets, Call Mode), kein iOS-Auto-Zoom mehr beim Fokussieren von Eingabefeldern (16px-Mindestschriftgröße), "Zum Home-Bildschirm hinzufügen" vorbereitet (Manifest + Apple-Meta-Tags → App startet im Standalone-Modus ohne Safari-Leiste), Skeleton-Loading im Call Mode statt Text-Warteanzeige, kein Overscroll-Bounce mehr an der fixierten Navigation.

Noch nicht gebaut: Terminkalender-Ansicht, Deployment.

## Tests ausführen

```bash
npm run test           # Unit-Tests (Follow-up-Logik)
npm run test:integration  # Integrationstests (Szenarien 1-8, braucht Test-DB)
npm run test:all       # beides
```

## Design-Tokens (Frontend)

Bewusst kein Standard-SaaS-Look: ruhiger salbeigrüner Neutralton (`#F4F5F0`), Kiefergrün als Markenfarbe (`#2F5D50`), Space Grotesk für Überschriften, Inter für Fließtext, IBM Plex Mono für Zahlen/Zeiten/Telefonnummern. Signature-Element: farbige Urgency-Rail am linken Rand jeder Kontaktkarte (Rot = überfällig, Amber = heute, Grün = später) — ermöglicht schnelles Scannen der Liste ohne Text lesen zu müssen.
