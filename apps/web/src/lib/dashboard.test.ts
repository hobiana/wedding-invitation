import { describe, expect, it } from "vitest";
import type { HouseholdAdminDto, RsvpStatus } from "@invitation-app/shared";
import {
  compteARebours,
  echelleBarre,
  friseDuBandeau,
  foyersARelancer,
  foyersPartiels,
  joursAvantLimite,
  limitePassee,
  messageDuSeuil,
  motsDesInvites,
  placesParStatut,
  pourcentage,
  tauxDeReponse,
  texteLimite,
} from "./dashboard";

type Compte = Pick<HouseholdAdminDto, "status" | "allocatedSeats" | "confirmedCount">;

function f(status: RsvpStatus, allocatedSeats: number, confirmedCount: number | null): Compte {
  return { status, allocatedSeats, confirmedCount };
}

function repeter<T>(n: number, valeur: T): T[] {
  return Array.from({ length: n }, () => valeur);
}

/**
 * Le cas de la maquette : 58 confirmées + 21 en attente + 33 déclinées = 112.
 * Les 33 déclinées : 24 par les 6 foyers qui ne viennent pas, 9 par les
 * 4 foyers qui viennent en partie.
 */
const MAQUETTE: Compte[] = [
  ...repeter(6, f("DECLINED", 4, 0)), // 24 places déclinées
  f("CONFIRMED", 4, 2), // partiels : 2 + 2 + 2 + 1 = 7 viennent, 9 manquent
  f("CONFIRMED", 4, 2),
  f("CONFIRMED", 4, 2),
  f("CONFIRMED", 4, 1),
  ...repeter(17, f("CONFIRMED", 3, 3)), // 51 viennent au complet
  ...repeter(7, f("PENDING", 3, null)), // 21 en attente
];

describe("placesParStatut", () => {
  it("retrouve le cas de la maquette : 58 + 21 + 33 = 112", () => {
    expect(placesParStatut(MAQUETTE)).toEqual({
      confirmees: 58,
      enAttente: 21,
      declinees: 33,
      prevues: 112,
      declineesParRefus: 24,
      foyersDeclines: 6,
      declineesParPartiels: 9,
    });
  });

  it("compte un foyer en attente pour toute son allocation, jamais pour zéro", () => {
    const r = placesParStatut([f("PENDING", 5, null)]);
    expect(r.enAttente).toBe(5);
    expect(r.confirmees).toBe(0);
    expect(r.declinees).toBe(0);
    expect(r.prevues).toBe(5);
  });

  it("vaut zéro partout sans foyer", () => {
    expect(placesParStatut([])).toEqual({
      confirmees: 0,
      enAttente: 0,
      declinees: 0,
      prevues: 0,
      declineesParRefus: 0,
      foyersDeclines: 0,
      declineesParPartiels: 0,
    });
  });
});

describe("foyersPartiels", () => {
  it("ne garde que les confirmés qui viennent à moins que prévu", () => {
    expect(foyersPartiels(MAQUETTE)).toHaveLength(4);
  });

  it("ignore un foyer en attente, dont confirmedCount est null", () => {
    expect(foyersPartiels([f("PENDING", 4, null), f("DECLINED", 4, 0)])).toEqual([]);
  });

  it("rend les foyers eux-mêmes, pas une copie appauvrie", () => {
    const partiel = { ...f("CONFIRMED", 4, 3), id: "abc" };
    expect(foyersPartiels([partiel])).toEqual([partiel]);
  });
});

describe("echelleBarre", () => {
  it("place le repère du seuil dépassé à 40 / 112", () => {
    const { echelle, repere } = echelleBarre(112, 40);
    expect(echelle).toBe(112);
    expect(repere).toBeCloseTo((40 / 112) * 100, 5);
  });

  it("étire l'échelle jusqu'au seuil quand il n'est pas atteint", () => {
    expect(echelleBarre(112, 120)).toEqual({ echelle: 120, repere: 100 });
  });

  it("n'a pas de repère sans seuil", () => {
    expect(echelleBarre(112, null)).toEqual({ echelle: 112, repere: null });
  });
});

describe("pourcentage", () => {
  it("rapporte une part à l'échelle", () => {
    expect(pourcentage(28, 112)).toBe(25);
  });

  it("vaut zéro sur une échelle vide, jamais NaN", () => {
    expect(pourcentage(0, 0)).toBe(0);
  });
});

describe("messageDuSeuil", () => {
  it("dit le dépassement : seuil 40, 112 prévues", () => {
    expect(messageDuSeuil(112, 40)).toEqual({
      ton: "depasse",
      texte: "72 places prévues au-delà du seuil de 40 invités",
    });
  });

  it("dit ce qui reste : seuil 120, 112 prévues", () => {
    expect(messageDuSeuil(112, 120)).toEqual({
      ton: "reste",
      texte: "Encore 8 places à accorder avant le seuil de 120 invités",
    });
  });

  it("accorde au singulier une seule place", () => {
    expect(messageDuSeuil(41, 40)?.texte).toBe("1 place prévue au-delà du seuil de 40 invités");
    expect(messageDuSeuil(119, 120)?.texte).toBe("Encore 1 place à accorder avant le seuil de 120 invités");
  });

  it("ne dit pas « Encore 0 place » quand le seuil est tout juste atteint", () => {
    expect(messageDuSeuil(120, 120)).toEqual({ ton: "atteint", texte: "Seuil de 120 invités atteint" });
  });

  it("ne dit rien sans seuil", () => {
    expect(messageDuSeuil(112, null)).toBeNull();
  });
});

// Instants choisis pour piéger un calcul fait en UTC ou dans le fuseau de la
// machine : 22 h 30 UTC le 7 octobre est déjà le 8 à Antananarivo (UTC+3).
const AUJOURDHUI = new Date("2026-10-07T22:30:00Z"); // 8 oct. 2026, 1 h 30 à Tana
const MARIAGE = "2027-01-02T06:00:00Z"; // 2 janv. 2027, 9 h à Tana
const LIMITE = "2026-12-01T00:00:00Z"; // 1er déc. 2026, 3 h à Tana

describe("compteARebours", () => {
  it("compte les jours de calendrier à Antananarivo : J-86 le 8 octobre", () => {
    expect(compteARebours(MARIAGE, AUJOURDHUI)).toEqual({ jours: 86, libelle: "J-86" });
  });

  it("dit « Jour J » le jour même", () => {
    expect(compteARebours(MARIAGE, new Date("2027-01-01T21:30:00Z"))).toEqual({ jours: 0, libelle: "Jour J" });
  });

  it("ne compte jamais en négatif une fois le mariage passé", () => {
    expect(compteARebours(MARIAGE, new Date("2027-01-05T10:00:00Z"))).toEqual({
      jours: 0,
      libelle: "Mariage célébré",
    });
  });
});

describe("joursAvantLimite et limitePassee", () => {
  it("compte 54 jours avant le 1er décembre depuis le 8 octobre", () => {
    expect(joursAvantLimite(LIMITE, AUJOURDHUI)).toBe(54);
    expect(limitePassee(LIMITE, AUJOURDHUI)).toBe(false);
  });

  it("le jour de la limite, il reste 0 jour et elle n'est pas passée", () => {
    const jour = new Date("2026-12-01T15:00:00Z");
    expect(joursAvantLimite(LIMITE, jour)).toBe(0);
    expect(limitePassee(LIMITE, jour)).toBe(false);
  });

  it("une fois passée, ne rend jamais de jours négatifs", () => {
    const apres = new Date("2026-12-04T10:00:00Z");
    expect(joursAvantLimite(LIMITE, apres)).toBe(0);
    expect(limitePassee(LIMITE, apres)).toBe(true);
  });
});

describe("texteLimite", () => {
  it("annonce les jours restants et la date en français", () => {
    expect(texteLimite(LIMITE, AUJOURDHUI)).toBe("54 jours avant la date limite du 1er décembre 2026");
  });

  it("accorde au singulier la veille", () => {
    expect(texteLimite(LIMITE, new Date("2026-11-30T10:00:00Z"))).toBe(
      "1 jour avant la date limite du 1er décembre 2026",
    );
  });

  it("dit que c'est aujourd'hui le jour même", () => {
    expect(texteLimite(LIMITE, new Date("2026-12-01T10:00:00Z"))).toBe(
      "Date limite des réponses aujourd'hui, 1er décembre 2026",
    );
  });

  it("dit que la date est passée, sans « −3 jours »", () => {
    const texte = texteLimite(LIMITE, new Date("2026-12-04T10:00:00Z"));
    expect(texte).toBe("Date limite des réponses passée depuis le 1er décembre 2026");
    expect(texte).not.toMatch(/-|−/);
  });
});

describe("friseDuBandeau", () => {
  it("part d'aujourd'hui à 0 %, finit au mariage à 100 %, la limite au prorata", () => {
    const frise = friseDuBandeau(LIMITE, MARIAGE, AUJOURDHUI);
    expect(frise.aujourdhui).toBe(0);
    expect(frise.mariage).toBe(100);
    expect(frise.limite).toBeCloseTo((54 / 86) * 100, 5);
    expect(frise.limitePassee).toBe(false);
  });

  it("colle la limite passée à « Aujourd'hui » au lieu de la sortir de la frise", () => {
    const frise = friseDuBandeau(LIMITE, MARIAGE, new Date("2026-12-10T10:00:00Z"));
    expect(frise.limite).toBe(0);
    expect(frise.limitePassee).toBe(true);
  });

  it("ne divise pas par zéro le jour du mariage", () => {
    const frise = friseDuBandeau(LIMITE, MARIAGE, new Date("2027-01-02T10:00:00Z"));
    expect(frise.limite).toBe(0);
    expect(frise.mariage).toBe(100);
  });
});

type Mot = Pick<HouseholdAdminDto, "id" | "displayName" | "status" | "message" | "updatedAt">;

function mot(id: string, message: string | null, updatedAt: string, status: RsvpStatus = "CONFIRMED"): Mot {
  return { id, displayName: `Famille ${id}`, status, message, updatedAt };
}

describe("motsDesInvites", () => {
  it("garde les messages non vides, les plus récents d'abord, quatre au plus", () => {
    const mots = motsDesInvites([
      mot("a", "Félicitations !", "2026-10-01T10:00:00Z"),
      mot("b", null, "2026-10-07T10:00:00Z"),
      mot("c", "   ", "2026-10-06T10:00:00Z"),
      mot("d", "Nous serons là", "2026-10-05T10:00:00Z", "DECLINED"),
      mot("e", "Hâte d'y être", "2026-10-04T10:00:00Z"),
      mot("f", "Tous nos vœux", "2026-10-03T10:00:00Z"),
      mot("g", "Le plus ancien", "2026-09-01T10:00:00Z"),
    ]);
    expect(mots.map((m) => m.id)).toEqual(["d", "e", "f", "a"]);
  });

  it("porte le nom, le statut et le message rogné", () => {
    expect(motsDesInvites([mot("a", "  Bravo  ", "2026-10-01T10:00:00Z", "DECLINED")])).toEqual([
      { id: "a", nom: "Famille a", statut: "DECLINED", message: "Bravo" },
    ]);
  });

  it("ne modifie pas la liste reçue", () => {
    const liste = [mot("a", "x", "2026-10-01T10:00:00Z"), mot("b", "y", "2026-10-02T10:00:00Z")];
    motsDesInvites(liste);
    expect(liste.map((m) => m.id)).toEqual(["a", "b"]);
  });
});

describe("tauxDeReponse", () => {
  it("arrondit au pour-cent : 34 / 42 = 81 %", () => {
    expect(tauxDeReponse(34, 42)).toBe(81);
  });

  it("vaut zéro sans foyer, jamais NaN", () => {
    expect(tauxDeReponse(0, 0)).toBe(0);
  });
});

describe("foyersARelancer", () => {
  type Relance = Pick<HouseholdAdminDto, "id" | "displayName" | "status" | "allocatedSeats">;
  const r = (id: string, displayName: string, allocatedSeats: number, status: RsvpStatus = "PENDING"): Relance => ({
    id,
    displayName,
    allocatedSeats,
    status,
  });

  it("ne garde que les foyers sans réponse", () => {
    const liste = [r("a", "A", 2, "CONFIRMED"), r("b", "B", 2), r("c", "C", 2, "DECLINED")];
    expect(foyersARelancer(liste).map((f) => f.id)).toEqual(["b"]);
  });

  // « les plus grands foyers en premier » : relancer d'abord là où il y a le plus de places en jeu.
  it("met les plus grands foyers en premier, puis l'ordre alphabétique", () => {
    const liste = [r("a", "Tante Hanta", 1), r("b", "Famille Ravelo", 5), r("c", "Élodie", 2), r("d", "Camille", 2)];
    expect(foyersARelancer(liste).map((f) => f.id)).toEqual(["b", "d", "c", "a"]);
  });

  it("ne modifie pas la liste reçue", () => {
    const liste = [r("a", "A", 1), r("b", "B", 5)];
    foyersARelancer(liste);
    expect(liste.map((f) => f.id)).toEqual(["a", "b"]);
  });
});
