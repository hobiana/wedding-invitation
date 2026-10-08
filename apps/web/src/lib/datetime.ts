/**
 * Toutes les dates de la page invité, rendues dans le fuseau du **lieu**.
 *
 * Le bug qu'on corrige ici : `toLocaleString` sans `timeZone` rend l'instant
 * dans le fuseau de la machine qui lit. Une cérémonie enregistrée à
 * `2027-06-12T15:00:00Z` se lisait donc 18:00 à Antananarivo, 17:00 à Paris et
 * 11:00 à New York — trois invités, trois heures, un seul mariage. L'heure d'un
 * événement physique est celle de son lieu ; elle est la même pour tous.
 *
 * La deadline RSVP est pire encore : `2027-05-01T00:00:00Z` tombait au 30 avril
 * pour tout invité à l'ouest de Greenwich, qui lisait une date limite plus
 * courte que la vraie.
 *
 * Le fuseau est donc **fixé au build** et passé explicitement à chaque rendu.
 * Corollaire : les `Intl.DateTimeFormat` ci-dessous peuvent vivre au niveau du
 * module. Un formateur sans `timeZone` explicite fige au contraire le fuseau
 * ambiant au premier import, ce qui est le même bug avec un pas de plus.
 */

/**
 * Constante de build, comme les prénoms : le produit est mono-événement par
 * construction. Si le mariage change de pays, cette ligne change, et le
 * `WEDDING_TIME_ZONE_LABEL` avec elle.
 */
export const WEDDING_TIME_ZONE = "Indian/Antananarivo";

/**
 * Affiché en clair et **toujours**, jamais conditionné au fuseau du lecteur :
 * une parenthèse permanente coûte une ligne et supprime toute une classe
 * d'ambiguïté.
 */
export const WEDDING_TIME_ZONE_LABEL = "heure de Madagascar";

/** Espace fine insécable U+202F : l'espace du « 18 h 00 » français. */
/** Espace fine ins\u00E9cable U+202F : l'espace du \u00AB 18 h 00 \u00BB fran\u00E7ais. */
const NNBSP = "\u202F";

const fullDateFormatter = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: WEDDING_TIME_ZONE,
});

const shortDateFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: WEDDING_TIME_ZONE,
});

const timeFormatter = new Intl.DateTimeFormat("fr-FR", {
  hour: "numeric",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: WEDDING_TIME_ZONE,
});

/**
 * `1` → `1er`. Le français est la seule langue de cette page et son premier du
 * mois porte un ordinal ; `Intl` ne le pose pas.
 */
function withFrenchOrdinal(parts: Intl.DateTimeFormatPart[]): string {
  return parts.map((p) => (p.type === "day" && p.value === "1" ? "1er" : p.value)).join("");
}

/** `samedi 12 juin 2027` — ou `12 juin 2027` sans le jour de la semaine. */
export function formatWeddingDate(iso: string, { weekday = true } = {}): string {
  const formatter = weekday ? fullDateFormatter : shortDateFormatter;
  return withFrenchOrdinal(formatter.formatToParts(new Date(iso)));
}

/**
 * `18 h 00` — et `18 h` en forme compacte, pour le héros.
 *
 * Les composants sont relus depuis `formatToParts` plutôt que le résultat
 * découpé au `:` : la séparation dépend de la locale, les parts non.
 */
export function formatWeddingTime(iso: string, { compact = false } = {}): string {
  const parts = timeFormatter.formatToParts(new Date(iso));
  const hour = parts.find((p) => p.type === "hour")?.value ?? "";
  const minute = parts.find((p) => p.type === "minute")?.value ?? "";
  // `Number` plutôt qu'un `replace(/^0/, "")` : « 09 h » n'existe pas en
  // typographie française, « 9 h 30 » si — et `00 h` doit rester `0 h`.
  const hours = String(Number(hour));
  if (compact && minute === "00") return `${hours}${NNBSP}h`;
  return `${hours}${NNBSP}h${NNBSP}${minute}`;
}

const dayMonthFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  timeZone: WEDDING_TIME_ZONE,
});

/**
 * `2 janvier` — l'étiquette « Réception · 2 janvier » du plan de table.
 *
 * `null` plutôt qu'une exception pour une valeur qui n'est pas une date :
 * l'étiquette est un ornement de l'admin, elle s'efface sans faire tomber
 * l'écran (un `formatToParts` sur une date invalide lève `RangeError`).
 */
export function formatWeddingDayMonth(iso: string): string | null {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return withFrenchOrdinal(dayMonthFormatter.formatToParts(date));
}

const dayShortMonthFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
  timeZone: WEDDING_TIME_ZONE,
});

/** `8 oct.`, `1er déc.` — les repères de la frise du tableau de bord. */
export function formatJourMoisCourt(iso: string): string {
  return withFrenchOrdinal(dayShortMonthFormatter.formatToParts(new Date(iso)));
}

const datePartsFormatter =new Intl.DateTimeFormat("fr-FR", {
  weekday: "long",
  day: "2-digit",
  month: "long",
  year: "numeric",
  timeZone: WEDDING_TIME_ZONE,
});

/**
 * La date éclatée en morceaux, pour le bloc à trois colonnes du faire-part :
 * `samedi` · `02` · `janvier` `2027`.
 *
 * Le design écrivait ces quatre valeurs en dur. Elles viennent d'ici, donc de
 * `wedding.weddingDate`, pour la même raison que tout le reste de la page : un
 * seul enregistrement fait foi, et l'organisateur peut encore corriger une
 * heure sans qu'un coin de la page reste en arrière.
 *
 * Le jour est sur deux chiffres parce que le design en fait un grand chiffre
 * cadré entre deux filets, où `2` seul flotterait. Le reste sort en minuscules :
 * c'est le français correct, et les capitales du design sont une affaire de
 * `text-transform` — un lecteur d'écran doit entendre « samedi », pas l'épeler.
 */
export function weddingDateParts(iso: string): {
  weekday: string;
  day: string;
  month: string;
  year: string;
} {
  const parts = datePartsFormatter.formatToParts(new Date(iso));
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";
  return {
    weekday: value("weekday"),
    day: value("day"),
    month: value("month"),
    year: value("year"),
  };
}

const numericPartsFormatter = new Intl.DateTimeFormat("fr-FR", {
  year: "numeric",
  month: "numeric",
  day: "numeric",
  timeZone: WEDDING_TIME_ZONE,
});

/**
 * Le mois du mariage, en grille, avec le jour à marquer.
 *
 * Le design dessinait janvier 2027 cellule par cellule, un cœur posé à la main
 * sur le 2. Il se déduit : le jour de la semaine du 1er et la longueur du mois
 * suffisent.
 *
 * Le fuseau n'intervient qu'une fois, pour savoir **de quel mois on parle** —
 * un mariage à 1 h du matin à Antananarivo est la veille à Paris, et ce serait
 * alors le mauvais mois qui s'afficherait. Ensuite c'est de l'arithmétique de
 * calendrier pure : les `Date.UTC` ci-dessous ne sont pas des instants, ce sont
 * des repères de grille, et aucun fuseau ne les déplace.
 *
 * Semaines commençant le lundi, comme tout calendrier français. Les cases
 * avant le 1er sont `null` ; il n'y a pas de semaine vide à la fin.
 */
export function weddingMonthGrid(iso: string): {
  label: string;
  weeks: (number | null)[][];
  weddingDay: number;
} {
  const parts = Object.fromEntries(
    numericPartsFormatter.formatToParts(new Date(iso)).map((p) => [p.type, p.value]),
  );
  const year = Number(parts.year);
  const month = Number(parts.month);
  const weddingDay = Number(parts.day);

  // `getUTCDay` rend 0 pour dimanche ; +6 %7 fait glisser la semaine au lundi.
  const premierJour = (new Date(Date.UTC(year, month - 1, 1)).getUTCDay() + 6) % 7;
  // Jour 0 du mois suivant = dernier jour de celui-ci.
  const longueur = new Date(Date.UTC(year, month, 0)).getUTCDate();

  const cases: (number | null)[] = [
    ...Array.from({ length: premierJour }, () => null),
    ...Array.from({ length: longueur }, (_, i) => i + 1),
  ];
  while (cases.length % 7 !== 0) cases.push(null);

  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cases.length; i += 7) weeks.push(cases.slice(i, i + 7));

  const { month: monthName, year: yearLabel } = weddingDateParts(iso);
  return { label: `${monthName} ${yearLabel}`, weeks, weddingDay };
}

/**
 * `1er mai 2027`, sans heure.
 *
 * L'heure limite affichée jusqu'ici (`04:00`) était le bug de fuseau qui
 * affleurait : une deadline enregistrée à minuit UTC. Elle ne veut rien dire
 * pour un invité, et la retirer supprime la question.
 */
export function formatRsvpDeadline(iso: string): string {
  return withFrenchOrdinal(shortDateFormatter.formatToParts(new Date(iso)));
}

/**
 * Le décalage du lieu, lu à `Intl` plutôt qu'écrit à la main : « UTC+3 ».
 * Madagascar n'a pas d'heure d'été, une date quelconque suffit.
 */
export const WEDDING_UTC_OFFSET_LABEL =
  new Intl.DateTimeFormat("fr-FR", {
    timeZone: WEDDING_TIME_ZONE,
    timeZoneName: "shortOffset",
  })
    .formatToParts(new Date("2026-01-01T00:00:00Z"))
    .find((p) => p.type === "timeZoneName")?.value ?? "UTC+3";

const saisieFormatter = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
  timeZone: WEDDING_TIME_ZONE,
});

/** L'heure murale d'Antananarivo à cet instant, en morceaux numériques. */
function heureMurale(date: Date) {
  return Object.fromEntries(
    saisieFormatter.formatToParts(date).map((x) => [x.type, Number(x.value)]),
  ) as Record<"year" | "month" | "day" | "hour" | "minute" | "second", number>;
}

const pad2 = (n: number) => String(n).padStart(2, "0");

/**
 * ISO → `YYYY-MM-DDTHH:mm` d'un `<input type="datetime-local">`, **en heure de
 * Madagascar** quel que soit le fuseau du navigateur. Les secondes tombent :
 * le champ n'en montre pas.
 *
 * C'était le bug des Paramètres : `getHours()` lit l'heure de la machine, et un
 * organisateur à Maurice voyait la date limite au 2 décembre 00:59.
 */
export function versSaisieMadagascar(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const p = heureMurale(date);
  return `${p.year}-${pad2(p.month)}-${pad2(p.day)}T${pad2(p.hour)}:${pad2(p.minute)}`;
}

/**
 * `YYYY-MM-DDTHH:mm` lu comme une heure d'Antananarivo → ISO UTC. `null` pour
 * une saisie incomplète ou impossible (30 février) : le formulaire l'ignore
 * plutôt que d'envoyer une date que `@IsDateString` refuserait.
 *
 * `seconde` fixe les secondes de l'instant produit (0 par défaut) : la date
 * limite les met à 59, pour que « 23:59 » couvre la minute entière.
 *
 * Le décalage est relu à `Intl` au lieu d'un `+3` codé en dur : si le lieu
 * change, seul `WEDDING_TIME_ZONE` change.
 */
export function depuisSaisieMadagascar(saisie: string, { seconde = 0 } = {}): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(saisie);
  if (!m) return null;
  const [annee, mois, jour, heure, minute] = m.slice(1).map(Number);
  // L'heure murale voulue, posée comme si elle était UTC…
  const voulu = Date.UTC(annee, mois - 1, jour, heure, minute, seconde);
  // …puis corrigée de l'écart entre cette heure murale et ce qu'Antananarivo
  // lit à cet instant. Sans heure d'été, un seul passage suffit.
  const lu = heureMurale(new Date(voulu));
  const ecart =
    Date.UTC(lu.year, lu.month - 1, lu.day, lu.hour, lu.minute, lu.second) - voulu;
  const instant = new Date(voulu - ecart);
  // Le 30 février « existe » pour `Date.UTC` (il glisse au 2 mars) : on vérifie
  // que l'instant relu est bien ce qui a été tapé.
  if (versSaisieMadagascar(instant.toISOString()) !== saisie) return null;
  return instant.toISOString();
}
