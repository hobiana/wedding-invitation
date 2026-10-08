import type { HouseholdAdminDto } from "@invitation-app/shared";

/**
 * Les petites règles d'écriture de la page Foyers, hors des composants : un
 * fichier qui exporte composant et fonction casse le rechargement à chaud
 * (`only-export-components`), et ces règles se testent seules.
 */

/**
 * « 3 / 4 ». `confirmedCount` reste `null` tant que le foyer n'a pas répondu :
 * il s'écrit « — », jamais « 0 », qui dirait « personne ne vient ».
 */
/**
 * Le nom « place(s) » qui suit « 3 / 4 ». Il s'accorde sur le dernier nombre — la
 * capacité du foyer — avec la règle française : zéro et un restent au singulier
 * (« 1 / 1 place », jamais « 1 / 1 places »).
 */
export function motPlaces(n: number): "place" | "places" {
  return n >= 2 ? "places" : "place";
}

export function places(foyer: Pick<HouseholdAdminDto, "confirmedCount" | "allocatedSeats">): string {
  return `${foyer.confirmedCount ?? "—"} / ${foyer.allocatedSeats}`;
}

/** Le premier mot de chaque membre : « Lova, Haja, Toky » sur la carte du téléphone. */
export function prenoms(noms: readonly string[]): string[] {
  return noms
    .map((nom) => nom.trim().split(/\s+/)[0] ?? "")
    .filter((prenom) => prenom.length > 0);
}

/** La lettre de la pastille d'un membre. `Array.from` : une lettre accentuée composée reste entière. */
export function initiale(nom: string): string {
  const premiere = Array.from(nom.trim())[0];
  return premiere ? premiere.toLocaleUpperCase("fr") : "";
}

/** « 40 foyers », « 1 foyer », « 4 foyers trouvés » quand un filtre est actif. */
export function sousTitreFoyers(total: number, filtreActif: boolean): string {
  if (total === 0) return filtreActif ? "Aucun foyer trouvé" : "Aucun foyer";
  const nom = total > 1 ? "foyers" : "foyer";
  if (!filtreActif) return `${total} ${nom}`;
  return `${total} ${nom} ${total > 1 ? "trouvés" : "trouvé"}`;
}

const CLE_MEMBRES = "foyers.membres";

/**
 * L'interrupteur « Afficher les membres », retenu d'une visite à l'autre comme
 * la taille de page. Actif par défaut. Le stockage peut lever (navigation
 * privée stricte) et contenir n'importe quoi : l'écran ne dépend ni de l'un ni
 * de l'autre.
 */
export function membresRetenus(): boolean {
  try {
    return window.localStorage.getItem(CLE_MEMBRES) !== "0";
  } catch {
    return true;
  }
}

export function retenirMembres(actif: boolean) {
  try {
    window.localStorage.setItem(CLE_MEMBRES, actif ? "1" : "0");
  } catch {
    // Sans stockage, le choix vaut pour cette visite seulement.
  }
}
