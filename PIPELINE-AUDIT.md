# MT·AI Pipeline-Prüfung – 13. September 2026

Status: Veröffentlicht und produktiv geprüft am 13. September 2026. GitHub-Lauf 34757511850 erfolgreich; Vercel-Produktionsdeployment dpl_DggQ6QgkxrQzhhNHxtQpGDyhew5c READY. Die beiden Executive-Daily-Brief-Aufträge und der persönliche Daily Brief wurden auf direkten JSON-Abruf und getrennte Zeitstände umgestellt.

## Nachgewiesene Ursachen

1. Der Generator setzte `acceptedSignals` unabhängig vom Nachrichteneingang auf `[]`. Eine fachliche Aufnahmeprüfung fehlte. Trotzdem wurde „keine materielle Richtungsänderung“ veröffentlicht.
2. Der manuelle Overlay-Schritt lief vor der Auswahl der neuen Tagesdatei und bearbeitete die bisherige `latest`-Datei.
3. Zwei Berechnungen nutzten unterschiedliche Stichtage. Einige Zusammenfassungen und die Tagesdatei konnten deshalb einen anderen Berechnungsstand enthalten.
4. Ein frischer technischer Lauf wurde als aktuelle Evidenz dargestellt. Operative Nachprüfungen waren teilweise überfällig.
5. Die HTML-Ausgabe enthielt lediglich Ladeplatzhalter. Ein Textabruf sah die tatsächlich nachgeladenen Zahlen nicht.
6. Bei Übersetzungsproblemen blieb der komplette englische Snapshot zurück, einschließlich seiner Zahlen.

## Veröffentlichte Korrektur

- Begrenzte, quellenbasierte Inbox-Prüfung über den vorhandenen OpenAI-API-Zugang. Vier Kandidaten je Anfrage, höchstens 24 je Lauf. Aktuelle Meldungen und Rückstand werden berücksichtigt.
- Pro Kandidat ein protokollierter Entscheid mit Rubrik, Primärquellen, Ereignisdatum, Kausalität, Verweis auf bestehende Prognose, Falsifikator und Nachprüfung. Unvollständige Evidenz bleibt Watchlist. API-Ausfälle werden sichtbar.
- Deterministische Admission Gates, Dublettenprüfung und dauerhafte Übernahme zugelassener Signale in die Wissensbasis, auch bei kuratierten Tagesdateien.
- Eine einzige Indexberechnung mit einem Stichtag, Eingabe-Hash und Indexhistorie. Bestehende Gewichte bleiben 40 % Server DRAM, 30 % HBM, 30 % Enterprise SSD.
- Keine künstliche Änderung der 79. Der lokale Lauf mit der bestehenden Evidenz ergibt weiterhin 79.
- Getrennte Berechnungs- und Evidenzdaten sowie sichtbarer Prüfstatus. Keine pauschale Entwarnung bei offenem Rückstand.
- Reihenfolge der Tagesdatei- und Overlay-Verarbeitung korrigiert. Historische Prognosen und Research-Referenzwerte bleiben erhalten.
- Datierten Zahlenstand ins HTML schreiben; Javascript aktualisiert dieselbe Datenquelle. DE/EN-Zahlen dürfen nicht auseinanderlaufen.
- Operative Zustände können durch explizit verknüpfte, spätere Beobachtungen ersetzt werden. Schweigen wird weiterhin nicht als Entspannung gewertet.

## Prüfung

Zehn Tests bestanden, einschließlich zusätzlicher Regressionen für Konfidenzskala, richtungsunabhängige Dubletten und die Trennung von Marktanteil und direkter Indexevidenz. Ursprüngliche Prüffälle: offene Prüfung, fehlende Primärquellen/Prognosezuordnung, korrekte Aufnahme, Dubletten, ungültige Datumswerte, operative Zustandsablösung und nachweisbare Indexreaktion auf neue Preisevidenz.

Der vollständige lokale Generierungs-/Sync-/Build-Lauf und die vorhandenen Schema-, Forecast-, Syntax- und Public/Private-Grenzprüfungen bestanden. DE, EN und interne Tages-/Dashboardwerte stimmen überein. Ältere Tagesdateien wurden nicht verändert.

Produktiv geprüft: Der OpenAI-Analyst hat 24 unterschiedliche Kandidaten und anschließend die betroffenen Entscheidungen erneut geprüft. Endstand: 1 Kontextbeleg angenommen (ohne Indexwirkung), 7 Watchlist, 16 abgelehnt; 847 Kandidaten bleiben offen. API-Fehler: keiner. Die erste reale Prüfung deckte weitere Schnittstellenprobleme auf, die korrigiert und erneut produktiv verifiziert wurden:

- Erlaubte Märkte, Treiber und Signalarten als Schema-Auswahl statt freier Strings.
- Ganzzahlige Severity/Confidence auf 0–100; keine unbemerkte 0–1-Skala.
- Gleiche Quelle und gleiches Ereignis sind auch bei entgegengesetzter Wirkungsrichtung ein Duplikat.
- Nur die jüngste Aufnahmeentscheidung zählt; zurückgezogene Einträge bleiben protokolliert, werden jedoch öffentlich und für den Index gesperrt.
- Marktanteile allein belegen keine qualifizierte Angebots-/Preisänderung. Der aufgenommene YMTC-Beleg bleibt Kontext ohne Indexwirkung. Indexmessungen sind auf den belegten Produktmarkt begrenzt.

Live-Abgleich: DE/EN-JSON und Browser zeigen Executive Pulse 79, Server DRAM 81, HBM 73, Enterprise SSD 81, Risk Pressure 83. Berechnung: 2026-09-13; Indexevidenz: 2026-08-28. Sichtbarer Status: Evidenzprüfung offen. Der numerische Executive Pulse steht bereits im HTML; nachgeladene Anzeige und Datenquelle stimmen überein. Englisch wurde produktiv übersetzt.

Offen bleiben der Prüfrückstand von 847 Kandidaten und vier überfällige operative Nachprüfungen. Die regulären Läufe bearbeiten weitere Meldungen. Unveränderte 79 sind keine Bestätigung einer unveränderten Marktlage. Historischer Enterprise-SSD-Researchstand vom 5. September und dessen Referenzindex 83 bleiben getrennt vom heutigen Segmentindex.

## Freigabe und nächster Schritt

Der Nutzer hat die Übernahme ins bestehende Repository `MikBrami/michaelthedens-website`, Veröffentlichung über den bestehenden GitHub-/Vercel-Ablauf auf `www.michaelthedens.de` und die anschließende Prüfung ausdrücklich genehmigt. Veröffentlicht werden Code-/Konfigurationsänderungen und öffentliches HTML; lokal erzeugte private Daten werden nicht hochgeladen.

Ein Prüfrückstand bleibt ausdrücklich offen, bis die betreffenden Kandidaten bearbeitet wurden. Dieser technische Audit ersetzt keine vollständige neue Marktrecherche.
