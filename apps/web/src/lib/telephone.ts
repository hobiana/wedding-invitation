/**
 * Les numéros où joindre les mariés, tels que l'organisateur les saisit
 * (« +261 34 64 314 02 »). L'œil lit la saisie, le lien `tel:` compose ses
 * seuls chiffres et le `+` initial.
 */

/** Le plafond de l'API (`@ArrayMaxSize(5)`) : au-delà, le 400 serait en anglais. */
export const MAX_TELEPHONES = 5;

/** La longueur maximale d'un numéro côté API (`@MaxLength(30)`). */
const LONGUEUR_MAX = 30;

const MIN_CHIFFRES = 7;

/** Ce que l'organisateur peut taper : chiffres, espaces, `+`, `-`, `.`, parenthèses. */
const CARACTERES_PERMIS = /^[\d\s+\-.()]+$/;

/** Le numéro tel que le téléphone le compose : sans espaces, tirets, points ni parenthèses. */
function composable(saisie: string): string {
  return saisie.replace(/[\s\-.()]/g, "");
}

/** `+261 34 64 314 02` → `tel:+261346431402`. */
export function lienTel(saisie: string): string {
  return `tel:${composable(saisie)}`;
}

/**
 * Une erreur en français par numéro, `null` s'il est bon. Rédigée ici pour ne
 * jamais laisser l'anglais du 400 de l'API arriver à l'écran. Le doublon se
 * mesure sur le numéro composé : « 034 64 » et « 03464 » sonnent au même
 * endroit. Il est signalé sur la seconde occurrence, la première restant la
 * référence.
 */
export function erreursTelephones(numeros: string[]): (string | null)[] {
  const vus = new Set<string>();
  return numeros.map((saisie) => {
    const texte = saisie.trim();
    if (texte === "") return "Indiquez un numéro, ou retirez cette ligne.";
    if (!CARACTERES_PERMIS.test(texte)) {
      return "Utilisez seulement des chiffres, espaces, +, -, points et parenthèses.";
    }
    // L'API (`PHONE` dans `update-settings.dto.ts`) n'admet le `+` qu'en
    // premier caractère : « (+261) … » partirait en 400.
    if (texte.indexOf("+", 1) !== -1) {
      return "Le + ne peut figurer qu'en tête du numéro.";
    }
    if (texte.length > LONGUEUR_MAX) {
      return `Un numéro ne peut pas dépasser ${LONGUEUR_MAX} caractères.`;
    }
    if (texte.replace(/\D/g, "").length < MIN_CHIFFRES) {
      return `Un numéro compte au moins ${MIN_CHIFFRES} chiffres.`;
    }
    const cle = composable(texte);
    if (vus.has(cle)) return "Ce numéro est déjà dans la liste.";
    vus.add(cle);
    return null;
  });
}
