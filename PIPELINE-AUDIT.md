# MT·AI Pipeline-Prüfung – 13. September 2026

Status: Korrektur lokal implementiert und getestet; Veröffentlichung am 13. September vom Nutzer ausdrücklich freigegeben. Produktiver Durchlauf und Live-Prüfung stehen noch aus. Die beiden Executive-Daily-Brief-Aufträge und der persönliche Daily Brief wurden bereits auf den direkten JSON-Abruf und getrennte Zeitstände umgestellt.

## Nachgewiesene Ursachen

1. Der Generator setzte `acceptedSignals` unabhängig vom Nachrichteneingang auf `[]`. Eine fachliche Aufnahmeprüfung fehlte. Trotzdem wurde „keine materielle Richtungsänderung“ veröffentlicht.
2. Der manuelle Overlay-Schritt lief vor der Auswahl der neuen Tagesdatei und bearbeitete die bisherige `latest`-Datei.
3. Zwei Berechnungen nutzten unterschiedliche Stichtage. Einige Zusammenfassungen und die Tagesdatei konnten deshalb einen anderen Berechnungsstand enthalten.
4. Ein frischer technischer Lauf wurde als aktuelle Evidenz dargestellt. Operative Nachprüfungen waren teilweise überfällig.
5. Die HTML-Ausgabe enthielt lediglich Ladeplatzhalter. Ein Textabruf sah die tatsächlich nachgeladenen Zahlen nicht.
6. Bei Übersetzungsproblemen blieb der komplette englische Snapshot zurück, einschließlich seiner Zahlen.

## Vorbereitete Korrektur

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

Sieben Tests bestanden: offene Prüfung, fehlende Primärquellen/Prognosezuordnung, korrekte Aufnahme, Dubletten, ungültige Datumswerte, operative Zustandsablösung und nachweisbare Indexreaktion auf neue Preisevidenz.

Der vollständige lokale Generierungs-/Sync-/Build-Lauf und die vorhandenen Schema-, Forecast-, Syntax- und Public/Private-Grenzprüfungen bestanden. DE, EN und interne Tages-/Dashboardwerte stimmen überein. Ältere Tagesdateien wurden nicht verändert.

Noch nicht geprüft: echte Analystenantworten mit dem produktiven API-Schlüssel und anschließendes Vercel-Deployment. Lokal ist dieser Schlüssel nicht verfügbar. Die Browserprüfung des lokalen Servers war durch die Browser-Netzwerkumgebung blockiert; eine visuelle Freigabe wird daher nicht behauptet.

## Freigabe und nächster Schritt

Der Nutzer hat die Übernahme ins bestehende Repository `MikBrami/michaelthedens-website`, Veröffentlichung über den bestehenden GitHub-/Vercel-Ablauf auf `www.michaelthedens.de` und die anschließende Prüfung ausdrücklich genehmigt. Veröffentlicht werden Code-/Konfigurationsänderungen und öffentliches HTML; lokal erzeugte private Daten werden nicht hochgeladen.

Ein Prüfrückstand bleibt ausdrücklich offen, bis die betreffenden Kandidaten bearbeitet wurden. Dieser technische Audit ersetzt keine vollständige neue Marktrecherche.
