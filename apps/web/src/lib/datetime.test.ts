import { afterEach, describe, expect, it } from "vitest";
import {
  WEDDING_TIME_ZONE,
  formatRsvpDeadline,
  formatWeddingDate,
  formatWeddingTime,
  weddingDateParts,
} from "./datetime";

/** Espace fine insécable — la seule espace admise autour du « h » français. */
const NNBSP = "\u202F";

/**
 * Les trois fuseaux couvrent les trois cas qui cassent : le lieu lui-même,
 * un décalage d'une heure vers l'ouest (Paris, qui donne 17:00), et un
 * décalage assez grand pour changer de jour sur la deadline (New York).
 */
const READER_TIME_ZONES = ["Indian/Antananarivo", "Europe/Paris", "America/New_York"];

const realTz = process.env.TZ;
afterEach(() => {
  process.env.TZ = realTz;
});

describe("formatWeddingTime", () => {
  it.each(READER_TIME_ZONES)("reads the venue's own clock for a guest in %s", (tz) => {
    process.env.TZ = tz;
    expect(formatWeddingTime("2027-06-12T15:00:00.000Z")).toBe(`18${NNBSP}h${NNBSP}00`);
  });

  // « 18:00 » est une notation de tableau horaire. Sur un faire-part français
  // l'heure s'écrit « 18 h 00 », avec des espaces qui ne se coupent pas en
  // bout de ligne.
  it("separates the hour from the minutes with a narrow no-break space", () => {
    expect(formatWeddingTime("2027-06-12T15:00:00.000Z")).not.toContain(":");
  });

  // « 09 h » n'existe pas en typographie française ; « 9 h 30 » si.
  it("drops the leading zero on the hour", () => {
    expect(formatWeddingTime("2027-06-12T06:30:00.000Z")).toBe(`9${NNBSP}h${NNBSP}30`);
  });

  it("omits a round :00 in compact form", () => {
    expect(formatWeddingTime("2027-06-12T15:00:00.000Z", { compact: true })).toBe(`18${NNBSP}h`);
  });

  it("keeps the minutes in compact form when they are not round", () => {
    expect(formatWeddingTime("2027-06-12T15:30:00.000Z", { compact: true })).toBe(
      `18${NNBSP}h${NNBSP}30`,
    );
  });
});

describe("formatWeddingDate", () => {
  it.each(READER_TIME_ZONES)("names the same day for a guest in %s", (tz) => {
    process.env.TZ = tz;
    expect(formatWeddingDate("2027-06-12T15:00:00.000Z")).toBe("samedi 12 juin 2027");
  });

  it("drops the weekday when the caller asks for the short form", () => {
    expect(formatWeddingDate("2027-06-12T15:00:00.000Z", { weekday: false })).toBe("12 juin 2027");
  });

  // 23:30 UTC le 11 juin est déjà le 12 juin à Antananarivo. Un rendu dans le
  // fuseau du lecteur ferait tomber la moitié du monde sur la veille.
  it("keeps a late-evening UTC instant on the venue's calendar day", () => {
    process.env.TZ = "America/New_York";
    expect(formatWeddingDate("2027-06-11T23:30:00.000Z")).toBe("samedi 12 juin 2027");
  });
});

describe("formatRsvpDeadline", () => {
  // La deadline du seed est 2027-05-01T00:00:00Z : le 1er mai à Antananarivo,
  // mais encore le 30 avril à New York. Un invité américain lisait une date
  // limite plus courte que la vraie.
  it.each(READER_TIME_ZONES)("names the same limit day for a guest in %s", (tz) => {
    process.env.TZ = tz;
    expect(formatRsvpDeadline("2027-05-01T00:00:00.000Z")).toBe("1er mai 2027");
  });

  // « avant le 1er mai 2027 à 04:00 » : l'heure affichée était le bug de fuseau
  // qui affleurait, et une heure limite ne veut rien dire pour un invité.
  it("carries no time at all", () => {
    expect(formatRsvpDeadline("2027-05-01T00:00:00.000Z")).not.toMatch(/h|:/);
  });

  it("writes an ordinary day without the ordinal suffix", () => {
    expect(formatRsvpDeadline("2027-05-02T00:00:00.000Z")).toBe("2 mai 2027");
  });
});

describe("WEDDING_TIME_ZONE", () => {
  it("is the venue's zone, pinned at build time", () => {
    expect(WEDDING_TIME_ZONE).toBe("Indian/Antananarivo");
  });
});

/**
 * Le faire-part du design pose la date en trois colonnes — « Samedi 09h00 »,
 * « 02 », « Janvier 2027 » — et le design l'écrivait en dur. Elle vient d'ici,
 * donc de `wedding.weddingDate`, pour qu'un seul enregistrement fasse foi.
 */
describe("weddingDateParts", () => {
  it.each(READER_TIME_ZONES)("splits the venue's own day for a guest in %s", (tz) => {
    process.env.TZ = tz;
    expect(weddingDateParts("2027-01-02T06:00:00.000Z")).toEqual({
      weekday: "samedi",
      day: "02",
      month: "janvier",
      year: "2027",
    });
  });

  // 22:00 UTC le 1er janvier est déjà le 2 à Antananarivo. C'est exactement le
  // cas que le gros chiffre du faire-part rendrait faux sous les yeux de la
  // moitié des invités.
  it("keeps a late-evening UTC instant on the venue's calendar day", () => {
    process.env.TZ = "America/New_York";
    expect(weddingDateParts("2027-01-01T22:00:00.000Z")).toMatchObject({
      day: "02",
      month: "janvier",
    });
  });

  // Minuscules en sortie : « samedi » et « janvier » s'écrivent ainsi en
  // français. Les capitales du design sont une affaire de CSS, pas de données —
  // un lecteur d'écran doit entendre le mot, pas l'épeler.
  it("returns French lower case, leaving the capitals to CSS", () => {
    const parts = weddingDateParts("2027-01-02T06:00:00.000Z");
    expect(parts.weekday).toBe(parts.weekday.toLowerCase());
    expect(parts.month).toBe(parts.month.toLowerCase());
  });
});
