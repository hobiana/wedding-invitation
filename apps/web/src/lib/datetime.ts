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
