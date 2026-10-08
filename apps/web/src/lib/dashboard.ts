import { seatsFor, type HouseholdAdminDto, type RsvpStatus } from "@invitation-app/shared";
import { places } from "./accord";
import { formatRsvpDeadline, WEDDING_TIME_ZONE } from "./datetime";

/**
 * Les calculs du tableau de bord, hors des composants : purs, testés seuls.
 *
 * Deux règles qui traversent tout le fichier :
 * - `confirmedCount` reste `null` tant qu'un foyer n'a pas répondu. On ne le lit
 *   donc jamais comme un nombre pour un foyer en attente : il y compte pour
 *   toute son allocation (`seatsFor`, la définition unique de l'occupation).
 * - Les jours se comptent en **dates de calendrier à Antananarivo**, pas en
 *   tranches de 24 h ni dans le fuseau de la machine : « J-86 » doit être le
 *   même pour un organisateur à Paris et à Tana.
 */

type Compte = Pick<HouseholdAdminDto, "status" | "allocatedSeats" | "confirmedCount">;

export interface PlacesParStatut {
  /** Places de ceux qui viennent : Σ des personnes confirmées. */
  confirmees: number;
  /** Places des foyers sans réponse, pour toute leur allocation. */
  enAttente: number;
  /** Places perdues : `declineesParRefus + declineesParPartiels`. */
  declinees: number;
  /** Σ des allocations — `confirmees + enAttente + declinees`. */
  prevues: number;
  /** « 24 par les 6 foyers qui ne viennent pas… » */
  declineesParRefus: number;
  foyersDeclines: number;
  /** « …9 par des foyers qui viennent en partie. » */
  declineesParPartiels: number;
}

/** Contrôle de la maquette : 58 confirmées + 21 en attente + 33 déclinées = 112 prévues. */
export function placesParStatut(foyers: readonly Compte[]): PlacesParStatut {
  const r: PlacesParStatut = {
    confirmees: 0,
    enAttente: 0,
    declinees: 0,
    prevues: 0,
    declineesParRefus: 0,
    foyersDeclines: 0,
    declineesParPartiels: 0,
  };
  for (const foyer of foyers) {
    r.prevues += foyer.allocatedSeats;
    if (foyer.status === "PENDING") {
      r.enAttente += foyer.allocatedSeats;
    } else if (foyer.status === "DECLINED") {
      r.declineesParRefus += foyer.allocatedSeats;
      r.foyersDeclines += 1;
    } else {
      // `confirmedCount <= allocatedSeats` est garanti par l'API ; le `max`
      // n'est là que pour qu'une donnée incohérente ne produise pas un négatif.
      const viennent = seatsFor(foyer);
      r.confirmees += viennent;
      r.declineesParPartiels += Math.max(0, foyer.allocatedSeats - viennent);
    }
  }
  r.declinees = r.declineesParRefus + r.declineesParPartiels;
  return r;
}

/** Les foyers confirmés qui viennent à moins que prévu (« 4 foyers viennent à moins que prévu »). */
export function foyersPartiels<T extends Compte>(foyers: readonly T[]): T[] {
  return foyers.filter(
    (f) => f.status === "CONFIRMED" && f.confirmedCount !== null && f.confirmedCount < f.allocatedSeats,
  );
}

/**
 * L'échelle de la barre empilée et la position du repère du seuil, en %.
 *
 * L'échelle est le plus grand des deux : un seuil dépassé laisse la barre
 * pleine et ramène le repère à l'intérieur (40 / 112 ≈ 36 %), un seuil non
 * atteint étire l'échelle et pose le repère au bout. Sans seuil, pas de repère.
 */
export function echelleBarre(prevues: number, seuil: number | null): { echelle: number; repere: number | null } {
  if (seuil === null) return { echelle: prevues, repere: null };
  const echelle = Math.max(prevues, seuil);
  return { echelle, repere: pourcentage(seuil, echelle) };
}

/** Une part rapportée à l'échelle, en % ; `0` sur une échelle vide plutôt que `NaN`. */
export function pourcentage(part: number, echelle: number): number {
  return echelle > 0 ? (part / echelle) * 100 : 0;
}

function invites(n: number): string {
  return `${n} ${n >= 2 ? "invités" : "invité"}`;
}

export interface MessageDuSeuil {
  /** `depasse` s'affiche en `danger`, avec une puce : le texte porte le sens, pas la couleur seule. */
  ton: "depasse" | "atteint" | "reste";
  texte: string;
}

/** La phrase sous la barre ; `null` quand l'organisateur n'a fixé aucun seuil. */
export function messageDuSeuil(prevues: number, seuil: number | null): MessageDuSeuil | null {
  if (seuil === null) return null;
  if (prevues > seuil) {
    const n = prevues - seuil;
    return {
      ton: "depasse",
      texte: `${n} ${n >= 2 ? "places prévues" : "place prévue"} au-delà du seuil de ${invites(seuil)}`,
    };
  }
  if (prevues === seuil) return { ton: "atteint", texte: `Seuil de ${invites(seuil)} atteint` };
  return { ton: "reste", texte: `Encore ${places(seuil - prevues)} à accorder avant le seuil de ${invites(seuil)}` };
}

const calendrier = new Intl.DateTimeFormat("fr-FR", {
  year: "numeric",
  month: "numeric",
  day: "numeric",
  timeZone: WEDDING_TIME_ZONE,
});

/** Le jour de calendrier d'un instant à Antananarivo, en jours depuis l'époque. */
function jourATana(instant: Date): number {
  const p = Object.fromEntries(calendrier.formatToParts(instant).map((x) => [x.type, x.value]));
  return Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day)) / 86_400_000;
}

/** Jours de calendrier de `maintenant` à `iso`, négatif si `iso` est passé. */
function ecartEnJours(iso: string, maintenant: Date): number {
  return jourATana(new Date(iso)) - jourATana(maintenant);
}

/** « J-86 », « Jour J », puis « Mariage célébré » — jamais un nombre négatif. */
export function compteARebours(weddingDate: string, maintenant: Date): { jours: number; libelle: string } {
  const jours = ecartEnJours(weddingDate, maintenant);
  if (jours > 0) return { jours, libelle: `J-${jours}` };
  return { jours: 0, libelle: jours === 0 ? "Jour J" : "Mariage célébré" };
}

/** Jours restants avant la date limite ; `0` le jour même **et** une fois passée — voir `limitePassee`. */
export function joursAvantLimite(rsvpDeadline: string, maintenant: Date): number {
  return Math.max(0, ecartEnJours(rsvpDeadline, maintenant));
}

/** Le jour de la date limite, on peut encore répondre : elle n'est passée que le lendemain. */
export function limitePassee(rsvpDeadline: string, maintenant: Date): boolean {
  return ecartEnJours(rsvpDeadline, maintenant) < 0;
}

/** « 54 jours avant la date limite du 1er décembre 2026 », ou sa forme du jour même et d'après. */
export function texteLimite(rsvpDeadline: string, maintenant: Date): string {
  const date = formatRsvpDeadline(rsvpDeadline);
  const jours = ecartEnJours(rsvpDeadline, maintenant);
  if (jours < 0) return `Date limite des réponses passée depuis le ${date}`;
  if (jours === 0) return `Date limite des réponses aujourd'hui, ${date}`;
  return `${jours} ${jours >= 2 ? "jours" : "jour"} avant la date limite du ${date}`;
}

export interface Frise {
  aujourdhui: number;
  limite: number;
  mariage: number;
  limitePassee: boolean;
}

/**
 * Les trois repères de la frise du bandeau, en % : « Aujourd'hui » à 0, le
 * mariage à 100, la date limite au prorata des jours. Une limite passée reste
 * collée à « Aujourd'hui » (et `limitePassee` le dit) plutôt que de sortir de
 * la frise par la gauche.
 */
export function friseDuBandeau(rsvpDeadline: string, weddingDate: string, maintenant: Date): Frise {
  const versMariage = ecartEnJours(weddingDate, maintenant);
  const versLimite = ecartEnJours(rsvpDeadline, maintenant);
  const limite = versMariage > 0 ? Math.min(100, Math.max(0, (versLimite / versMariage) * 100)) : 0;
  return { aujourdhui: 0, limite, mariage: 100, limitePassee: versLimite < 0 };
}

export interface MotDInvite {
  id: string;
  nom: string;
  statut: RsvpStatus;
  message: string;
}

type AvecMot = Pick<HouseholdAdminDto, "id" | "displayName" | "status" | "message" | "updatedAt">;

/** Les mots laissés par les foyers : non vides, les plus récents d'abord, `max` au plus. */
export function motsDesInvites(foyers: readonly AvecMot[], max = 4): MotDInvite[] {
  return foyers
    .filter((f) => (f.message ?? "").trim() !== "")
    // `filter` rend déjà une copie : ce `sort` ne touche pas la liste reçue.
    // Pas de `toSorted`, absent des Safari d'avant la 16.
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
    .slice(0, max)
    .map((f) => ({ id: f.id, nom: f.displayName, statut: f.status, message: (f.message ?? "").trim() }));
}

const ordreDesNoms = new Intl.Collator("fr", { sensitivity: "base" });

type ARelancer = Pick<HouseholdAdminDto, "displayName" | "status" | "allocatedSeats">;

/**
 * Les foyers sans réponse, **les plus grands d'abord** : on relance d'abord là
 * où il y a le plus de places en jeu. À égalité, l'ordre alphabétique, pour
 * qu'une liste ne change pas d'ordre d'un rechargement à l'autre.
 */
export function foyersARelancer<T extends ARelancer>(foyers: readonly T[]): T[] {
  return foyers
    .filter((f) => f.status === "PENDING")
    .sort((a, b) => b.allocatedSeats - a.allocatedSeats || ordreDesNoms.compare(a.displayName, b.displayName));
}

/** La part des foyers qui ont répondu, en pour-cent entier : 34 / 42 → 81. */
export function tauxDeReponse(repondus: number, total: number): number {
  return total > 0 ? Math.round((repondus / total) * 100) : 0;
}
