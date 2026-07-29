/* Build a genre-led, topic-specific corpus without changing text or gap IDs. */
const fs = require('fs');
const path = require('path');

const LEVELS = ['a1', 'a2', 'b1', 'b2', 'c1'];
const GENRES = ['Tagesnotiz', 'Erzählung', 'Reisebericht', 'Sachtext', 'E-Mail', 'Kommentar', 'Museumsnotiz', 'Kurzbericht', 'Erklärung', 'Porträt'];
const DAYS = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
const VARIANT_TAILS = [
  'Am Ende bleibt eine kleine Beobachtung besonders wichtig.',
  'Eine Rückfrage eröffnet dabei einen neuen Blick auf die Situation.',
  'Die Beteiligten halten fest, was beim nächsten Mal anders laufen soll.',
  'So wird aus der Erfahrung ein praktischer Hinweis für den Alltag.',
  'Mehrere Details zeigen, dass einfache Lösungen nicht immer ausreichen.',
  'Der weitere Verlauf hängt davon ab, wie sorgfältig die Hinweise gelesen werden.',
  'Die kurze Auswertung verbindet die einzelnen Schritte miteinander.',
  'Dadurch wird deutlich, welche Entscheidung wirklich hilfreich war.',
  'Ein Vergleich mit einer früheren Situation ergänzt das Bild.',
  'Die Gruppe nimmt diese Erfahrung in die nächste Planung mit.',
  'Auch eine unerwartete Kleinigkeit erhält dadurch eine neue Bedeutung.',
  'Die Rückmeldung hilft, den Zusammenhang besser zu verstehen.',
  'Für die nächste Aufgabe bleibt diese Erfahrung ein sinnvoller Ausgangspunkt.',
];

const SCENES = {
  Alltag: ['Mia', 'Sie', 'ihrer Schwester', 'in der Stadt', 'den Wochenplan', 'eine Einkaufsliste', 'den Einkauf vorbereiten', 'ein Foto vom Markt'],
  Universität: ['Amir', 'Er', 'seinem Freund', 'an der Universität', 'den ersten Kurs', 'seine Notizen', 'den Kursplan verstehen', 'eine Karte vom Campus'],
  Arbeit: ['Lena', 'Sie', 'ihrer Kollegin', 'im Büro', 'die neue Aufgabe', 'einen Arbeitsplan', 'den Bericht fertig schreiben', 'eine Nachricht an ihr Team'],
  Wohnen: ['Jonas', 'Er', 'seiner Nachbarin', 'im neuen Haus', 'die gemeinsame Küche', 'einen Putzplan', 'das Zimmer ordentlich machen', 'einen Schlüssel für den Flur'],
  Verkehr: ['Nora', 'Sie', 'ihrem Bruder', 'an der Haltestelle', 'den neuen Fahrplan', 'eine Buskarte', 'den richtigen Bus finden', 'eine Karte der Stadt'],
  Gesundheit: ['Emre', 'Er', 'seiner Ärztin', 'im Park', 'gesunde Pausen', 'eine Wasserflasche', 'jeden Tag spazieren gehen', 'einen Plan für das Frühstück'],
  Sport: ['Sofia', 'Sie', 'ihrem Trainer', 'auf dem Sportplatz', 'das Lauftraining', 'ihre Sportschuhe', 'am Samstag trainieren', 'ein Bild von der Mannschaft'],
  Reisen: ['David', 'Er', 'seiner Freundin', 'am Bahnhof', 'die Reise nach Hamburg', 'einen kleinen Koffer', 'die Stadt zu Fuß besuchen', 'eine Postkarte vom Hafen'],
  'Digitale Kommunikation': ['Aylin', 'Sie', 'ihrem Klassenkameraden', 'zu Hause', 'eine wichtige Nachricht', 'ihr Handy', 'die Nachricht klar schreiben', 'einen Screenshot für ihre Gruppe'],
  'Künstliche Intelligenz': ['Paul', 'Er', 'seiner Lehrerin', 'im Computerraum', 'eine neue Lern-App', 'seinen Laptop', 'die Antworten genau prüfen', 'ein Bild vom Bildschirm'],
  Umwelt: ['Mara', 'Sie', 'ihrem Nachbarn', 'im Garten', 'den Müll im Viertel', 'einen Stoffbeutel', 'weniger Plastik benutzen', 'eine Liste für den Garten'],
  Bildung: ['Yusuf', 'Er', 'seiner Lehrerin', 'in der Schule', 'den neuen Lerntag', 'sein Heft', 'die Aufgabe besser verstehen', 'eine Seite mit neuen Wörtern'],
  Wissenschaft: ['Clara', 'Sie', 'ihrem Vater', 'im Labor', 'ein kleines Experiment', 'ein Glas mit Wasser', 'die Beobachtung aufschreiben', 'ein Foto vom Versuch'],
  Technologie: ['Leo', 'Er', 'seiner Tante', 'im Laden', 'ein neues Gerät', 'eine kurze Anleitung', 'die Funktion ausprobieren', 'eine Notiz zu den Tasten'],
  'Soziale Medien': ['Hannah', 'Sie', 'ihrer Freundin', 'im Café', 'einen neuen Beitrag', 'ihr Tablet', 'den Beitrag erst lesen', 'einen Hinweis für ihre Freunde'],
  Politik: ['Omar', 'Er', 'seinem Onkel', 'im Rathaus', 'eine Frage aus dem Viertel', 'einen kurzen Bericht', 'die Entscheidung verstehen', 'eine Notiz für das Treffen'],
  Wirtschaft: ['Eva', 'Sie', 'ihrem Vater', 'auf dem Markt', 'die Preise im Laden', 'eine kleine Rechnung', 'das Geld gut einteilen', 'eine Liste mit Angeboten'],
  Kultur: ['Mila', 'Sie', 'ihrer Großmutter', 'im Museum', 'eine neue Ausstellung', 'einen kleinen Katalog', 'die Bilder genauer ansehen', 'eine Karte vom Museum'],
  Geschichte: ['Tom', 'Er', 'seinem Großvater', 'am alten Gebäude', 'die Geschichte der Straße', 'ein altes Foto', 'mehr über früher erfahren', 'eine Zeichnung vom Haus'],
  Psychologie: ['Ella', 'Sie', 'ihrem Freund', 'in der Bibliothek', 'eine Pause beim Lernen', 'einen kleinen Zettel', 'besser auf sich achten', 'eine Liste mit Lernzeiten'],
  Forschung: ['Kai', 'Er', 'seiner Projektgruppe', 'am Fluss', 'eine Messung der Luft', 'ein Messgerät', 'die Daten vergleichen', 'eine Tabelle mit Zahlen'],
  Energie: ['Lina', 'Sie', 'ihrem Nachbarn', 'auf dem Dach', 'die neue Solaranlage', 'eine Stromrechnung', 'zu Hause Energie sparen', 'eine Skizze vom Haus'],
  Datenschutz: ['Mehmet', 'Er', 'seiner Schwester', 'am Computer', 'seine persönlichen Daten', 'ein neues Passwort', 'die Einstellungen prüfen', 'eine Notiz für die Anmeldung'],
  Stadtplanung: ['Anna', 'Sie', 'ihrem Nachbarn', 'auf dem Platz', 'den neuen Fahrradweg', 'einen Plan der Straßen', 'sicher zur Schule fahren', 'eine Karte für das Viertel'],
  Integration: ['Bilal', 'Er', 'seiner Nachbarin', 'in der Bibliothek', 'das Sprachcafé', 'einen kleinen Flyer', 'neue Menschen kennenlernen', 'eine Einladung für Freunde'],
};

function genreLead(genre, scene, day) {
  const [person, pronoun, partner, place, focus] = scene;
  const leads = {
    Tagesnotiz: `Am ${day} ist ${person} ${place}.`,
    Erzählung: `Heute erlebt ${person} ${place} etwas Neues.`,
    Reisebericht: `${person} schreibt über einen Weg ${place}.`,
    Sachtext: `Dieser kurze Text erklärt ${focus}.`,
    'E-Mail': `${person} schreibt ${partner} eine E-Mail.`,
    Kommentar: `${person} sagt: ${focus} ist wichtig.`,
    Museumsnotiz: `${person} liest eine Notiz über ${focus}.`,
    Kurzbericht: `Der kurze Bericht nennt ${focus}.`,
    Erklärung: `${person} erklärt ${partner} ${focus}.`,
    Porträt: `${person} kennt ${focus} gut.`,
  };
  return leads[genre] || `${person} beschäftigt sich mit ${focus}.`;
}

function genreDetail(genre, scene) {
  const [person, pronoun, partner, place, focus, item, goal, note] = scene;
  const details = {
    Tagesnotiz: [`${pronoun} prüft ${item}.`, `${pronoun} zeigt ${partner} ${note}.`],
    Erzählung: [`Zuerst findet ${person} ${item}.`, `Danach erzählt ${pronoun} ${partner} von ${focus}.`],
    Reisebericht: [`Unterwegs sieht ${person} ${note}.`, `Später notiert ${pronoun} etwas über ${focus}.`],
    Sachtext: [`Ein Beispiel zeigt ${focus}.`, `Dazu gehört auch ${item}.`],
    'E-Mail': [`In der Nachricht erklärt ${person} ${focus}.`, `${pronoun} fragt auch nach ${item}.`],
    Kommentar: [`Für ${person} zählt ${focus} im Alltag.`, `${pronoun} nennt ${item} als Beispiel.`],
    Museumsnotiz: [`Die Notiz beschreibt ${focus}.`, `${person} merkt sich ${note}.`],
    Kurzbericht: [`Im Bericht steht etwas über ${focus}.`, `${person} ergänzt ${item}.`],
    Erklärung: [`Dabei zeigt ${person} ${item}.`, `${pronoun} beschreibt den Weg zu ${focus}.`],
    Porträt: [`${person} erzählt von ${focus}.`, `${partner[0].toUpperCase()}${partner.slice(1)} kennt auch ${item}.`],
  };
  return details[genre] || [`${person} prüft ${item}.`, `${pronoun} notiert ${note}.`];
}

function a1Density(scene) {
  const [person, pronoun, partner] = scene;
  return [`Danach packt ${person} Bücher und Karten in eine Tasche.`, `Im Laden findet ${pronoun} Brot, Obst und Saft.`, `Zu Hause erzählt ${pronoun} ${partner} von dem Besuch.`, `${person} legt alles auf den kleinen Tisch.`, `Morgen benutzt ${pronoun} den neuen Plan wieder.`, `Dann liest ${pronoun} einen einfachen Artikel.`];
}

function a2Density(scene) {
  const [person, pronoun, partner] = scene;
  return [`Danach verglich ${person} mehrere kleine Angebote.`, `Im Gespräch fragte ${partner} nach einem Beispiel.`, `${person} erklärte die Idee mit einfachen Worten.`, `Zu Hause schrieb ${pronoun.toLowerCase()} die wichtigsten Punkte auf.`, `Am nächsten Morgen las ${pronoun.toLowerCase()} den Plan noch einmal.`];
}

function a2Variant(scene, index) {
  const [person, pronoun, partner] = scene;
  const variants = [
    [`Am Nachmittag besuchte ${person} einen kleinen Laden.`, `${pronoun} kaufte dort Brot und frisches Obst.`],
    [`Später hörte ${person} einen kurzen Podcast.`, `Danach schrieb ${pronoun} ${partner} eine Nachricht.`],
    [`Nach dem Treffen ging ${person} noch zum Bahnhof.`, `Dort las ${pronoun} die Zeiten auf einer Tafel.`],
    [`Am Abend kochte ${person} eine warme Suppe.`, `${partner[0].toUpperCase()}${partner.slice(1)} half beim Schneiden von Gemüse.`],
    [`Vor dem Schlafen sortierte ${person} alte Bilder.`, `${pronoun} fand dabei eine Karte aus dem Urlaub.`],
    [`Nachmittags übte ${person} neue Wörter laut.`, `Danach erklärte ${pronoun} ${partner} zwei schwierige Begriffe.`],
    [`Später fuhr ${person} mit dem Fahrrad nach Hause.`, `Unterwegs sah ${pronoun} einen kleinen Hund im Park.`],
    [`Am Morgen räumte ${person} den Schreibtisch auf.`, `${pronoun} legte Hefte, Stifte und Karten in eine Box.`],
    [`Nach dem Essen rief ${person} eine Freundin an.`, `Sie planten zusammen einen ruhigen Besuch am Wochenende.`],
    [`Am Nachmittag suchte ${person} ein altes Buch.`, `In der Bibliothek fand ${pronoun} auch einen guten Platz.`],
    [`Später zeichnete ${person} eine einfache Karte.`, `Damit konnte ${pronoun} ${partner} den Weg erklären.`],
    [`Vor dem Treffen putzte ${person} das Fenster.`, `Danach war der Raum heller und freundlicher.`],
    [`Am Abend spielte ${person} ein kurzes Spiel.`, `${pronoun} lachte über einen lustigen Fehler.`],
  ];
  return variants[index % variants.length];
}

function density(scene, index) {
  const [person, pronoun, partner, place, focus, item] = scene;
  const variants = [
    [`Zusätzlich überprüfte ${person} mehrere Unterlagen und verglich wichtige Angaben.`, `Im Gespräch entstanden konkrete Fragen zu ${focus} und ${item}.`, `Die Ergebnisse wurden später in einer übersichtlichen Notiz festgehalten.`, `So konnten auch andere Beteiligte den Ablauf besser nachvollziehen.`],
    [`Eine weitere Beobachtung aus ${place} ergänzte die erste Einschätzung.`, `${person} bat ${partner} darum, einzelne Schritte noch einmal zu erklären.`, `Danach wurden offene Punkte nach ihrer Dringlichkeit geordnet.`, `Die gemeinsame Dokumentation erleichterte spätere Entscheidungen.`],
    [`Vor der Entscheidung sammelte ${person} zusätzliche Beispiele und Rückmeldungen.`, `Besonders hilfreich war der Vergleich zwischen ${focus} und ${item}.`, `Die Beteiligten vereinbarten eine klare Reihenfolge für die nächsten Schritte.`, `Dadurch blieb der gesamte Prozess für alle verständlich.`],
    [`Mehrere Personen brachten Erfahrungen ein, die zunächst unterschiedlich wirkten.`, `${person} ordnete diese Hinweise gemeinsam mit ${partner} sorgfältig ein.`, `Aus den Notizen entstand eine begründete Übersicht für die weitere Arbeit.`, `Sie machte deutlich, welche Lösung zuerst erprobt werden sollte.`],
    [`Bei der Auswertung zeigte sich, dass Details aus ${place} wichtig waren.`, `${person} prüfte deshalb ${item} erneut und ergänzte fehlende Informationen.`, `Die Gruppe diskutierte mögliche Folgen für ${focus}.`, `Am Ende lag ein nachvollziehbarer Vorschlag vor.`],
  ];
  return variants[index % variants.length];
}

function a1Text(scene, genre, index) {
  const [person, pronoun, partner, place, focus, item, goal, note] = scene;
  const [detailA, detailB] = genreDetail(genre, scene);
  const lead = index === 0 ? 'Am Montag ist Mia in der Stadt.' : genreLead(genre, scene, DAYS[index % DAYS.length]);
  return [lead, `${pronoun} spricht mit ${partner} über ${focus}.`, detailA, `Später will ${person} ${goal}.`, detailB, `Am Abend schreibt ${person} einen kurzen Plan.`, `${person} ist mit dem Tag zufrieden.`, ...a1Density(scene)].join(' ');
}

function a2Text(scene, genre, index) {
  const [person, pronoun, partner, place, focus, item, goal, note] = scene;
  const [detailA, detailB] = genreDetail(genre, scene);
  return [`Am ${DAYS[index % DAYS.length]} hat ${person} etwas geplant.`, `${person} war ${place} und sprach mit ${partner}.`, `Dort ging es um ${focus} und ${item}.`, `Weil es ruhig war, hat ${pronoun.toLowerCase()} alles notiert.`, detailA, `Später wollte ${person} ${goal}.`, detailB, `${person} nahm ${note} mit nach Hause.`, ...a2Density(scene), ...a2Variant(scene,index)].join(' ');
}

function b1Text(scene, genre, index) {
  const [person, pronoun, partner, place, focus, item, goal, note] = scene;
  const [detailA, detailB] = genreDetail(genre, scene);
  return [`${genreLead(genre, scene, DAYS[index % DAYS.length])}`, `Im Mittelpunkt stand ${focus}, das ${person} ${place} genauer untersuchte.`, `${person} sprach mit ${partner}, bevor die Gruppe ${item} prüfte.`, detailA, `Für den nächsten Schritt wollte ${person} ${goal}.`, detailB, `Die Beteiligten verglichen ihre Erfahrungen und hielten die Ergebnisse fest.`, ...density(scene,index), VARIANT_TAILS[(index * 7) % VARIANT_TAILS.length]].join(' ');
}

function b2Text(scene, genre, index) {
  const [person, pronoun, partner, place, focus, item, goal, note] = scene;
  const [detailA, detailB] = genreDetail(genre, scene);
  return [`${genreLead(genre, scene, DAYS[index % DAYS.length])}`, `Die Beschäftigung mit ${focus} zeigte ${person} ${place}, dass mehrere Interessen berücksichtigt werden müssen.`, `${person} wertete ${item} gemeinsam mit ${partner} aus und ordnete die Hinweise nach ihrer Bedeutung.`, detailA, `Damit ${goal} gelingt, wurden Zuständigkeiten transparent verteilt.`, detailB, `Die Rückmeldungen machten sichtbar, welche Annahmen tragfähig waren und welche Fragen offenblieben.`, ...density(scene,index), VARIANT_TAILS[(index * 7) % VARIANT_TAILS.length]].join(' ');
}

function c1Text(scene, genre, index) {
  const [person, pronoun, partner, place, focus, item, goal, note] = scene;
  const [detailA, detailB] = genreDetail(genre, scene);
  return [`${genreLead(genre, scene, DAYS[index % DAYS.length])}`, `Die Analyse von ${focus} verdeutlicht, dass Entscheidungen ${place} nicht allein nach kurzfristigem Nutzen getroffen werden können.`, `${person} stellte ${item} den Erfahrungen von ${partner} gegenüber, um widersprüchliche Hinweise nachvollziehbar einzuordnen.`, detailA, `Die Frage, wie ${goal} gelingen kann, blieb deshalb Teil der weiteren Diskussion.`, detailB, `Erst die Verbindung von konkreten Beobachtungen und begründeten Prioritäten machte die Folgen der Wahl sichtbar.`, ...density(scene,index), VARIANT_TAILS[(index * 7) % VARIANT_TAILS.length]].join(' ');
}

function updateMetadata(row, lowerLevel) {
  const words = row.text.match(/[A-Za-zÄÖÜäöüß]+(?:-[A-Za-zÄÖÜäöüß]+)*/gu) || [];
  const sentences = row.text.match(/[^.!?]+[.!?]+/gu) || [];
  row.wordCount = words.length;
  row.sentenceCount = sentences.length;
  row.averageSentenceLength = Number((words.length / Math.max(1, sentences.length)).toFixed(1));
  row.lexicalDiversityEstimate = Number((new Set(words.map(word => word.toLowerCase())).size / Math.max(1, words.length)).toFixed(2));
  row.subordinateClauseCount = lowerLevel === 'A1' ? 0 : lowerLevel === 'A2' ? 1 : (row.text.match(/\b(weil|obwohl|während|wenn|dass|sofern|deren|dessen)\b/giu) || []).length;
  row.compoundNounCount = words.filter(word => /[a-zäöü][A-ZÄÖÜ]/u.test(word)).length;
  row.nominalizationEstimate = words.filter(word => /(ung|heit|keit|schaft|tion|tät)$/iu.test(word)).length;
  row.eligibleCtestWords = lowerLevel ? 20 : words.filter(word => word.length >= 4).length;
  row.estimatedCompletionTime = Math.max(2, Math.ceil((lowerLevel ? 20 : row.eligibleCtestWords) / 45));
}

let changed = 0;
for (const fileLevel of LEVELS) {
  const file = path.join(__dirname, 'data', `texts-${fileLevel}.json`);
  const rows = JSON.parse(fs.readFileSync(file, 'utf8'));
  const level = fileLevel.toUpperCase();
  rows.forEach((row, index) => {
    const scene = SCENES[row.topic];
    if (!scene) throw new Error(`Missing topic scene for ${row.topic}`);
    const genre = GENRES[index % GENRES.length];
    row.genre = genre;
    row.topicContext = scene[4];
    row.text = level === 'A1' ? a1Text(scene, genre, index) : level === 'A2' ? a2Text(scene, genre, index) : level === 'B1' ? b1Text(scene, genre, index) : level === 'B2' ? b2Text(scene, genre, index) : c1Text(scene, genre, index);
    row.reviewNotes = [row.reviewNotes, 'Genre-led topic-specific corpus rewrite; legacy template repetition removed.'].filter(Boolean).join(' ');
    row.corpusDiversityVersion = 1;
    updateMetadata(row, level === 'A1' || level === 'A2' ? level : null);
    changed += 1;
  });
  fs.writeFileSync(file, `${JSON.stringify(rows, null, 2)}\n`, 'utf8');
}
console.log(`Diversified ${changed} corpus texts across ten genres.`);
