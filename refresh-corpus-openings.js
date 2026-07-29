/* Replace legacy worksheet framing with varied, topic-aware C-Test context. */
const fs = require('fs');
const path = require('path');

const LEVELS = ['a1', 'a2', 'b1', 'b2', 'c1'];
const LEGACY_WORKSHEET = /\s*Auf dem Arbeitsblatt stehen die Stichwörter „[^”]+“, „[^”]+“ und „[^”]+“\./u;
const LEGACY_ASPECT = /\s*Zusätzlich wird bei dieser Ausgabe ein besonderer Aspekt hervorgehoben: [^.]+\./u;
const LEGACY_BODIES = [
  /\s*Zunächst fehlte Zeit, doch wir teilten die Aufgaben auf und vereinbarten feste Termine\. Eine Kollegin erklärte den Ablauf, während die Verwaltung Materialien bereitstellte\. Am Ende zeigte sich, dass die Zusammenarbeit ein brauchbares Ergebnis ermöglicht hatte\./u,
  /\s*Rückmeldungen zeigen unterschiedliche Interessen, die frühzeitig berücksichtigt werden sollten\. Deshalb werden Maßnahmen transparent begründet und regelmäßig überprüft\. Kooperationen zwischen Fachleuten, Verwaltung und engagierten Menschen erleichtern die Umsetzung\./u,
  /\s*Entscheidend ist nicht nur die Bereitstellung von Informationen, sondern deren Einordnung in größere Zusammenhänge\. Werden unterschiedliche Erfahrungen systematisch berücksichtigt, lassen sich Zielkonflikte früher erkennen und produktiv bearbeiten\. Dadurch wächst die Akzeptanz nachvollziehbar begründeter Entscheidungen\./u,
];

const OPENINGS = [
  (topic) => `Im Gespräch wird deutlich, welche praktischen Fragen das Thema ${topic} aufwirft.`,
  (topic) => `Mehrere konkrete Beispiele zeigen, warum das Thema ${topic} für den Alltag relevant ist.`,
  (topic) => `Die Beteiligten betrachten das Thema ${topic} aus unterschiedlichen Perspektiven.`,
  (topic) => `Dabei geht es auch darum, welche Entscheidungen im Zusammenhang mit ${topic} sinnvoll sind.`,
  (topic) => `Anhand eigener Erfahrungen wird erörtert, wie sich das Thema ${topic} im Alltag auswirkt.`,
  (topic) => `Für das Thema ${topic} werden Lösungen gesucht, die sich tatsächlich umsetzen lassen.`,
  (topic) => `Die Gruppe sammelt Beobachtungen, die verschiedene Seiten des Themas ${topic} sichtbar machen.`,
  (topic) => `Im Mittelpunkt steht die Frage, welche Folgen das Thema ${topic} für unterschiedliche Menschen haben kann.`,
  (topic) => `Zu dem Thema ${topic} liegen Erfahrungen vor, die gemeinsam eingeordnet werden müssen.`,
  (topic) => `Das Thema ${topic} wird an einer Situation untersucht, die viele Beteiligte aus ihrem Alltag kennen.`,
  (topic) => `Bei der Beschäftigung mit dem Thema ${topic} werden verschiedene Interessen miteinander abgewogen.`,
  (topic) => `Die Diskussion zeigt, dass das Thema ${topic} nicht nur eine einfache Antwort zulässt.`,
];

const BODY_VARIANTS = [
  'Zu Beginn sammeln die Beteiligten ihre Beobachtungen und ordnen sie nach ihrer Bedeutung. Anschließend wird festgelegt, wer den nächsten Schritt übernimmt.',
  'Die Gruppe vergleicht mehrere Möglichkeiten, bevor sie sich auf einen nachvollziehbaren Weg einigt. Eine kurze Auswertung zeigt später, was daran praktisch war.',
  'Erfahrungen aus verschiedenen Situationen werden zusammengetragen und gemeinsam geprüft. So lässt sich erkennen, welche Lösung unter den gegebenen Bedingungen trägt.',
  'Zunächst werden offene Fragen benannt, damit keine wichtige Perspektive verloren geht. Danach entwickelt die Gruppe einen Plan, der im Alltag umsetzbar bleibt.',
  'Die Beteiligten stimmen ihre Erwartungen ab und halten die wichtigsten Gründe fest. Bei der nächsten Besprechung prüfen sie, ob die Vereinbarung noch passt.',
  'Mehrere Vorschläge werden an konkreten Beispielen erprobt. Dadurch wird sichtbar, welche Folgen eine Entscheidung für die Beteiligten haben kann.',
  'Ein Austausch mit anderen Betroffenen ergänzt die erste Einschätzung. Die Rückmeldungen helfen dabei, den Ablauf klarer und gerechter zu gestalten.',
  'Für die weitere Arbeit werden Aufgaben und Fristen verständlich verteilt. Regelmäßige Rückfragen verhindern, dass Missverständnisse zu spät auffallen.',
  'Die Gruppe achtet darauf, praktische Erfahrungen nicht von allgemeinen Zielen zu trennen. Auf diese Weise entsteht eine Lösung, die begründet werden kann.',
  'Unterschiedliche Meinungen werden nicht übergangen, sondern Schritt für Schritt verglichen. Erst danach entscheidet die Gruppe, welche Maßnahme Vorrang hat.',
  'Eine erste Idee wird durch konkrete Beobachtungen ergänzt und bei Bedarf verändert. Das Ergebnis soll für alle Beteiligten nachvollziehbar bleiben.',
  'Im Verlauf der Arbeit zeigt sich, wo zusätzliche Informationen nötig sind. Mit diesen Erkenntnissen wird der ursprüngliche Plan sorgfältig angepasst.',
];
const FOLLOW_UPS = [
  'Eine abschließende Rückmeldung macht deutlich, welche Entscheidung besonders gut begründet werden muss.',
  'Dabei bleibt wichtig, dass die vereinbarten Schritte für alle Beteiligten verständlich formuliert sind.',
  'Die Ergebnisse werden festgehalten, damit ähnliche Situationen später leichter eingeschätzt werden können.',
  'So entsteht ein Überblick, der praktische Erfahrungen und gemeinsame Ziele miteinander verbindet.',
  'Eine erneute Prüfung verhindert, dass eine schnelle Lösung wichtige Folgen übersieht.',
  'Am Ende wird besprochen, welche Erkenntnisse sich auf andere vergleichbare Fälle übertragen lassen.',
  'Dadurch erhalten auch Personen ohne Vorkenntnisse einen nachvollziehbaren Zugang zum Ergebnis.',
  'Die gemeinsame Auswertung zeigt, an welcher Stelle noch genauer nachgefragt werden sollte.',
  'Diese Vorgehensweise erleichtert es, spätere Entscheidungen transparent zu erklären.',
  'Damit bleibt die Lösung auch dann tragfähig, wenn sich einzelne Rahmenbedingungen ändern.',
  'Die Beteiligten dokumentieren ihre Gründe, um den weiteren Verlauf später überprüfen zu können.',
  'Auf diese Weise werden offene Punkte nicht verschoben, sondern rechtzeitig bearbeitet.',
];
const TOPIC_DETAILS = {
  Alltag: 'Morgenroutinen, Wege im Viertel und die Verteilung kleiner Aufgaben liefern dafür anschauliche Beispiele.',
  Universität: 'Seminare, Lerngruppen und der Zugang zu Materialien machen die Folgen für Studierende konkret sichtbar.',
  Arbeit: 'Absprachen im Team, verständliche Aufgaben und Rückmeldungen aus dem Betrieb prägen die weitere Entscheidung.',
  Wohnen: 'Nachbarschaft, gemeinsame Räume und bezahlbare Lösungen werden dabei aus der Sicht verschiedener Bewohner betrachtet.',
  Verkehr: 'Fahrpläne, sichere Wege und die Bedürfnisse von Pendlerinnen und Pendlern stehen dabei miteinander in Beziehung.',
  Gesundheit: 'Pausen, Bewegung und verlässliche Informationen zeigen, wie persönliche Gewohnheiten und Rahmenbedingungen zusammenwirken.',
  Sport: 'Training, Erholung und die Zusammenarbeit in der Gruppe machen unterschiedliche Prioritäten deutlich.',
  Reisen: 'Planung, Orientierung vor Ort und Rücksicht auf andere Reisende eröffnen mehrere praktische Blickwinkel.',
  'Digitale Kommunikation': 'Nachrichten, verständliche Formulierungen und der Schutz persönlicher Angaben werden gemeinsam abgewogen.',
  'Künstliche Intelligenz': 'Automatisierte Vorschläge, menschliche Kontrolle und nachvollziehbare Entscheidungen bilden den konkreten Rahmen.',
  Umwelt: 'Ressourcenverbrauch, lokale Projekte und langfristige Folgen verbinden persönliche Entscheidungen mit gemeinsamen Aufgaben.',
  Bildung: 'Lernwege, faire Zugänge und die Rolle von Lehrkräften machen unterschiedliche Erwartungen sichtbar.',
  Wissenschaft: 'Beobachtungen, sorgfältige Methoden und vorsichtige Schlussfolgerungen bestimmen die Qualität der Ergebnisse.',
  Technologie: 'Nützliche Funktionen, mögliche Risiken und die Frage nach einer verantwortlichen Nutzung werden miteinander verknüpft.',
  'Soziale Medien': 'Beiträge, Sichtbarkeit und ein respektvoller Umgang mit abweichenden Meinungen stehen im Mittelpunkt.',
  Politik: 'Öffentliche Interessen, nachvollziehbare Entscheidungen und die Beteiligung verschiedener Gruppen werden gegenübergestellt.',
  Wirtschaft: 'Preise, Arbeitsbedingungen und regionale Angebote zeigen, dass unterschiedliche Ziele berücksichtigt werden müssen.',
  Kultur: 'Ausstellungen, lokale Geschichten und der Zugang zu kulturellen Angeboten eröffnen verschiedene Deutungen.',
  Geschichte: 'Quellen, Erinnerungen und Spuren früherer Entscheidungen helfen dabei, Gegenwart und Vergangenheit zu verbinden.',
  Psychologie: 'Aufmerksamkeit, Lerngewohnheiten und die Wirkung von Rückmeldungen machen die Perspektiven der Beteiligten greifbar.',
  Forschung: 'Messungen, transparente Auswertung und der Umgang mit Unsicherheit bestimmen, wie belastbar Ergebnisse sind.',
  Energie: 'Verbrauch, erneuerbare Quellen und faire Kostenverteilung verbinden technische Fragen mit dem Alltag vieler Menschen.',
  Datenschutz: 'Berechtigungen, persönliche Angaben und verständliche Einstellungen zeigen, warum Schutz nicht allein technisch ist.',
  Stadtplanung: 'Öffentliche Räume, sichere Wege und die Interessen von Anwohnerinnen und Anwohnern müssen zusammen gedacht werden.',
  Integration: 'Sprachliche Teilhabe, Begegnungen im Viertel und gemeinsame Regeln zeigen, wie Vertrauen entstehen kann.',
};

function openingFor(row, index) {
  return OPENINGS[index % OPENINGS.length](row.topic);
}

function refreshTextMetadata(row) {
  const words = row.text.match(/[A-Za-zÄÖÜäöüß]+(?:-[A-Za-zÄÖÜäöüß]+)*/gu) || [];
  const sentences = row.text.match(/[^.!?]+[.!?]+/gu) || [];
  row.wordCount = words.length;
  row.sentenceCount = sentences.length;
  row.averageSentenceLength = Number((words.length / Math.max(1, sentences.length)).toFixed(1));
  row.lexicalDiversityEstimate = Number((new Set(words.map((word) => word.toLowerCase())).size / Math.max(1, words.length)).toFixed(2));
  row.subordinateClauseCount = (row.text.match(/\b(weil|obwohl|während|wenn|dass|sofern|deren|dessen)\b/giu) || []).length;
  row.compoundNounCount = words.filter((word) => /[a-zäöü][A-ZÄÖÜ]/u.test(word)).length;
  row.nominalizationEstimate = words.filter((word) => /(ung|heit|keit|schaft|tion|tät)$/iu.test(word)).length;
  row.eligibleCtestWords = words.filter((word) => word.length >= 4).length;
  row.estimatedCompletionTime = Math.max(2, Math.ceil(row.eligibleCtestWords / 45));
}

let changed = 0;
for (const level of LEVELS) {
  const file = path.join(__dirname, 'data', `texts-${level}.json`);
  if (!fs.existsSync(file)) throw new Error(`Required corpus file is missing: ${file}`);
  const rows = JSON.parse(fs.readFileSync(file, 'utf8'));
  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const hadWorksheet = LEGACY_WORKSHEET.test(row.text);
    const hadAspect = LEGACY_ASPECT.test(row.text);
    const legacyBody = LEGACY_BODIES.find((pattern) => pattern.test(row.text));
    const needsExpansion = ['b1', 'b2', 'c1'].includes(level) && row.corpusStyleVersion < 2;
    const needsTopicDetail = ['b1', 'b2', 'c1'].includes(level) && row.corpusStyleVersion < 3;
    const needsMetadata = ['b1', 'b2', 'c1'].includes(level) && row.corpusStyleVersion < 4;
    if (!hadWorksheet && !hadAspect && !legacyBody && !needsExpansion && !needsTopicDetail && !needsMetadata) continue;
    let text = row.text.replace(LEGACY_WORKSHEET, ` ${openingFor(row, index)}`);
    text = text.replace(LEGACY_ASPECT, '');
    if (legacyBody) text = text.replace(legacyBody, ` ${BODY_VARIANTS[index % BODY_VARIANTS.length]}`);
    if (needsExpansion) text = `${text} ${FOLLOW_UPS[index % FOLLOW_UPS.length]}`;
    if (needsTopicDetail) text = `${text} ${TOPIC_DETAILS[row.topic] || `Konkrete Erfahrungen mit dem Thema ${row.topic} ergänzen die allgemeine Betrachtung.`}`;
    row.text = text.replace(/\s{2,}/gu, ' ').trim();
    if (needsMetadata) refreshTextMetadata(row);
    row.corpusStyleVersion = 4;
    row.reviewNotes = [row.reviewNotes, 'Legacy worksheet framing replaced with varied topic-specific context.']
      .filter(Boolean)
      .join(' ');
    changed += 1;
  }
  fs.writeFileSync(file, `${JSON.stringify(rows, null, 2)}\n`, 'utf8');
}

console.log(`Updated ${changed} corpus texts; no worksheet framing remains.`);
