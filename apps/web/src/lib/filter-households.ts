import type { HouseholdAdminDto, RsvpStatus } from "@invitation-app/shared";

export interface HouseholdFilter {
  query: string;
  status: RsvpStatus | "ALL";
}

/**
 * Replie une chaîne sur sa forme cherchable : sans casse et sans accent.
 *
 * `NFD` sépare la lettre de son accent, et l'intervalle `U+0300-U+036F` est
 * celui des diacritiques combinants. Sans ça, « eric » ne trouve pas « Éric »,
 * et personne ne tape les accents dans un champ de recherche.
 */
function replier(texte: string): string {
  return texte
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/**
 * Le filtrage est côté client, délibérément : 15 tables au plus, donc de
 * l'ordre de 80 foyers. Une recherche serveur coûterait une route, un état de
 * chargement par frappe et une gestion d'annulation, pour un tableau qui tient
 * déjà en mémoire.
 */
export function filterHouseholds(
  foyers: HouseholdAdminDto[],
  { query, status }: HouseholdFilter,
): HouseholdAdminDto[] {
  const recherche = replier(query.trim());

  return foyers.filter((foyer) => {
    if (status !== "ALL" && foyer.status !== status) return false;
    if (recherche === "") return true;
    const matiere = replier([foyer.displayName, ...foyer.memberNames].join(" "));
    return matiere.includes(recherche);
  });
}
