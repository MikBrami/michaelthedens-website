# MT·AI: Aufarbeitung des Nachrichteneingangs

Stand: 13. September 2026. Umsetzung lokal getestet; produktiver Durchlauf wird nach Veröffentlichung geprüft.

## Ausgangsbefund

Der gespeicherte Bestand enthielt 871 Kandidaten im 30-Tage-Fenster, davon 24 mit Aufnahmeentscheidung und 847 offen. Die Zahl bezeichnet Nachrichtentreffer, keine 847 unabhängigen Marktveränderungen. Im erhaltenen Bestand entfallen auf 6.–12. September 204 Treffer mit Relevanzwert >=65, entsprechend rund 29 pro Tag nach Veröffentlichungsdatum. Wegen der bisherigen Kappung des Speichers auf 1.000 Einträge ist dies keine vollständige historische Zugangsmessung.

## Änderungen

- Die Kappung des Eingangs auf 1.000 Einträge entfällt. Neue Zugänge und Dubletten werden pro Lauf gemessen. Historische Verluste werden dadurch nicht nachträglich rekonstruiert.
- Der bestehende Kandidatenbestand wird dauerhaft festgehalten. Ungeprüfte Kandidaten verschwinden nicht allein durch das Ablaufen des 30-Tage-Fensters.
- Eine konservative Vorfilterung archiviert explizite Anlagekommentare ohne konkretes betriebliches Ereignis und gruppiert nahezu gleiche Überschriften. Unterschiedliche Zahlen, Richtungen und unklare Fälle bleiben getrennt. Rohdaten, Gründe und Zuordnungen bleiben erhalten; Gruppierung ist keine fachliche Aufnahme.
- Erste lokale Vorfilterung: 18 Anlagekommentare und 12 nahe Dubletten. Keine umfassende semantische Bereinigung wird behauptet.
- Zwei parallele Quellenanfragen; Entscheidungen und Aufnahmeprüfung werden weiterhin nacheinander gespeichert, damit gleichzeitig recherchierte Belege nicht doppelt aufgenommen werden.
- Zusätzlicher stündlicher GitHub-Termin um Minute 37 UTC: bis zu 96 Kandidaten, maximal zehn Minuten Quellenprüfung. Bei höchstens 48 offenen Kandidaten überspringt der Zusatztermin die Verarbeitung. Die regulären Termine 05:17, 11:17, 17:17 und 23:17 UTC bearbeiten weiterhin bis zu 24 Kandidaten.
- Kapazität, echte Bearbeitungsmenge, Restbestand, Laufzeit und Fehler werden protokolliert. Aus einem konfigurierten Maximum wird kein garantierter Fertigstellungstermin abgeleitet; GitHub kann geplante Starts verzögern.
- Neue Meldungen und ältester Rückstand erhalten jeweils einen Teil der verfügbaren Plätze. Kuratierte Tagesdateien und historische Prognosen bleiben geschützt.

## Operative Annahmen

Die vier überfälligen Beobachtungen sind separat weiter offen. Öffentliche Marktberichte sind keine erneute Bestätigung einer konkreten Channel-Beobachtung. In dieser Prüfung wurde kein passender neuer Beleg für die vier gespeicherten Einzelfälle gefunden. Ihre Beobachtungs- und Wiedervorlagedaten wurden deshalb nicht künstlich aktualisiert.

Erforderliche Bestätigungen: aktuelle tatsächlich bestätigte RDIMM-Liefermengen; vergleichbare UDIMM-Verfügbarkeit; aktuelle Enterprise-SSD-Angebote mit belastbaren Lieferterminen; Status der konkreten SSD-Anfrage mit ausstehender NAND-Zuteilung. Insbesondere der letzte Punkt erfordert einen aktuellen Projekt-/Lieferantenstatus und lässt sich nicht aus allgemeinen Nachrichten ableiten.

## Tests

15 Tests bestanden, darunter Vorfilterung, Erhalt gegenteiliger Meldungen und unterschiedlicher Mengen, Auswahl alter und neuer Kandidaten sowie ein Integrationstest mit parallelen Anfragen: acht bearbeitete Kandidaten mit derselben Beobachtung ergeben genau eine Aufnahme. Syntax-, Schema- und Public/Private-Grenzprüfungen bestanden.


## Erste produktive Messung

Lauf 34758565079: Der ungekappte Eingang nahm 412 zuvor nicht gespeicherte Treffer auf, davon 27 mit Relevanz >=65. Das ist teilweise wiederentdeckter Altbestand und keine neue tägliche Zuflussrate. Rohbestand nun 898 Kandidaten. Nach 19 archivierten Anlagekommentaren und 12 gruppierten Meldungen blieben 867 Prüfkandidaten. Zwölf weitere Kandidaten wurden in 148 Sekunden geprüft; danach stoppte eine HTTP-429-Antwort die nächste Gruppe. Rest: 831. Der Workflow exportierte den Fehlerstatus korrekt; sein technischer Erfolg wurde nicht als vollständige Quellenprüfung gewertet.

Nachbesserung: Parallelität von vier auf zwei reduziert, Baseline-Zusammenfassungen gekürzt, Retry-After wird berücksichtigt und transiente Ratenbegrenzungen maximal zweimal wiederholt. Kontingenterschöpfung (`insufficient_quota`) wird nicht wiederholt. Der konkrete API-Fehlercode und die Wiederholungszahl werden gemessen. Diese Nachbesserung wird im nächsten produktiven Durchlauf geprüft.
