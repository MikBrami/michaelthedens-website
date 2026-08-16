# MT·AI Business OS — ChatGPT Sales Ingestion Contract

## Ziel
Michael pflegt das Business OS primär im normalen Gespräch mit ChatGPT. Unstrukturierter Input wird in strukturierte Sales-Daten übersetzt. Es gibt keine Pflichtsyntax.

## Trigger
Wenn Michael im Chat eine reale Vertriebsinformation nennt — neuer Lead, Kontakt, Gespräch, Mail, Termin, Projekt, Menge, Preis, Angebot, Auftrag, Verlust, Blocker, Follow-up, Erfolg oder Änderung einer bestehenden Opportunity — soll die Information als Business-OS-Input behandelt werden, sofern er nicht ausdrücklich sagt, dass sie nicht gespeichert werden soll.

## Verarbeitung
1. Account/Unternehmen erkennen oder neu anlegen.
2. Bestehende Opportunity zuordnen oder neue Opportunity anlegen.
3. Activity Log mit Datum, Typ, Zusammenfassung und Wirkung ergänzen.
4. Funnel-Stage nur ändern, wenn der neue Sachverhalt die Änderung eindeutig trägt.
5. Next Action, Datum, Blocker und Cross-Selling aktualisieren, soweit aus dem Input ableitbar.
6. Priorität nach Konkretheit, Volumen, Dringlichkeit und nächstem Termin setzen.
7. Keine Fakten erfinden. Unklare Felder bleiben offen.
8. Dashboard-Datenstand aktualisieren.

## Funnel
Lead → Kontakt → Qualifiziert → Projekt → Angebot → Verhandlung → Won / Lost

## Source of truth
- `business-os/data/sales-funnel.json` — aktueller Opportunity-Zustand und Next Actions
- `business-os/data/activity-log.json` — chronologische Vertriebsaktivitäten

## UX-Prinzip
Input darf chaotisch sein. Output muss strukturiert sein.

Beispiele für gültigen Input:
- „Bechtle NL hat geantwortet. Call am Donnerstag.“
- „Anexia: Micron bestätigt 600 Stück, Angebot geht morgen raus.“
- „Neuer Lead ABC, 100 Server, vermutlich 128 GB DIMMs.“
- „Projekt XYZ verloren, Kunde hat sich für Samsung entschieden.“

## Command Center
Die Startansicht priorisiert Next Actions. Die zentrale Frage lautet: „Was sollte Michael jetzt tun?“ Historie und Funnel folgen danach.
