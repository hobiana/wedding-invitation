/**
 * La pliure d'une recherche : sans casse ni accents. « raissa » doit trouver
 * « Raïssa », et un organisateur ne tape pas les trémas.
 *
 * La plage des diacritiques combinants (U+0300 à U+036F) est construite par
 * `String.fromCharCode` et non écrite en échappement : les outils d'édition de
 * cet environnement transforment l'échappement en caractère littéral invisible,
 * et une classe de caractères vide ne lève aucune erreur — elle ne retire rien.
 */
const DIACRITIQUES = new RegExp(`[${String.fromCharCode(0x0300)}-${String.fromCharCode(0x036f)}]`, "g");

export function plier(texte: string): string {
  return texte.normalize("NFD").replace(DIACRITIQUES, "").toLowerCase();
}

interface Cherchable {
  displayName: string;
  memberNames?: string[];
}

/**
 * Les foyers dont le nom ou un prénom contient la recherche, dans l'ordre
 * reçu — celui du serveur, qu'on ne retrie pas.
 */
export function filtrerFoyers<T extends Cherchable>(foyers: T[], recherche: string): T[] {
  const cle = plier(recherche.trim());
  if (cle === "") return foyers;
  return foyers.filter((f) => [f.displayName, ...(f.memberNames ?? [])].some((nom) => plier(nom).includes(cle)));
}
