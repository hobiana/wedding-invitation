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
/**
 * C'\u00E9tait l'espace *fine* ins\u00E9cable U+202F \u2014 la forme la plus soign\u00E9e du
 * \u00AB 18 h 00 \u00BB fran\u00E7ais, et elle allait bien avec Marcellus.
 *
 * Avec Cormorant Garamond elle ne va plus. Mesur\u00E9e dans le navigateur : la
 * fine de Cormorant fait **3,5 px pour un corps de 30 px**, exactement la
 * moiti\u00E9 d'une espace normale. \u00C0 la taille o\u00F9 le programme affiche ses heures,
 * elle dispara\u00EEt et on lit \u00AB 9h00 \u00BB \u2014 le commanditaire l'a vu au premier coup
 * d'\u0153il. `word-spacing` ne la rattrape pas : v\u00E9rifi\u00E9, la propri\u00E9t\u00E9 n'agit pas
 * sur U+202F. Il ne restait qu'\u00E0 changer de caract\u00E8re.
 *
 * L'ins\u00E9cable ordinaire garde la seule propri\u00E9t\u00E9 indispensable \u2014 \u00AB 9 \u00BB et
 * \u00AB h \u00BB ne se s\u00E9parent jamais en fin de ligne \u2014 et elle se voit.
 */
const NNBSP = "\u00A0";

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

const datePartsFormatter = new Intl.DateTimeFormat("fr-FR", {
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
