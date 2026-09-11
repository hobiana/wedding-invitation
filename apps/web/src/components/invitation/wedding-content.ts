/**
 * Le texte du faire-part : les familles, le verset, le déroulé du jour.
 *
 * Ce sont des **constantes de build**, comme les prénoms et pour la même
 * raison — décision arrêtée par le commanditaire le 2026-08-22, reconduite le
 * 2026-09-10 en reprenant son design. Le produit est mono-événement par
 * construction : aucun de ces textes ne se modifie depuis l'admin, aucun ne
 * justifie une colonne, une migration ni une requête.
 *
 * Ce qui N'EST PAS ici, et ne doit pas y venir : la date, l'heure, le lieu de
 * réception, l'adresse, le lien de carte, la date limite de réponse. Tout ça
 * vient de l'API (`WeddingInfoDto`), parce que l'organisateur doit pouvoir le
 * corriger un dimanche soir sans qu'on redéploie. Le design les écrivait en
 * dur ; c'est la seule liberté qu'on ne reprend pas de lui.
 */

/** Le verset du faire-part, tel qu'il est imprimé. */
export const VERSE = {
  text:
    "Ainsi ils ne sont plus deux, mais ils sont une seule chair. " +
    "Que l'homme donc ne sépare pas ce que Dieu a joint.",
  reference: "Matthieu 19:6",
} as const;

/**
 * Les deux mères, dans l'ordre du faire-part — celle du marié, puis celle de
 * la mariée.
 *
 * Le libellé « Sa mère » est celui du design, repris mot pour mot : le texte
 * d'un faire-part appartient aux familles. Il se répète pourtant à l'identique
 * au-dessus des deux colonnes, où « sa » n'a plus de référent — signalé au
 * commanditaire, à lui de trancher s'il préfère « La mère du marié » et « La
 * mère de la mariée ».
 */
export const PARENTS = [
  { label: "Sa mère", name: "Mme veuve Razafindraibe Razakanaivo" },
  { label: "Sa mère", name: "Mme veuve Rasolonirina Ramarojaona" },
] as const;

/** L'annonce, entre les parents et les mariés. */
export const ANNOUNCEMENT = "Ont la joie d'annoncer le mariage de leurs enfants";

/** Les mariés au complet, avec leur rôle — l'ordre est celui du faire-part. */
export const SPOUSES = [
  { fullName: "Hobiana Tojoniaina Razakanaivo", role: "Le marié" },
  { fullName: "Lovasoa Sahondraniaina Ramarojaona", role: "La mariée" },
] as const;

/**
 * L'église. Elle n'est pas dans `WeddingInfoDto`, qui ne connaît qu'un lieu —
 * celui de la réception, parce que c'est lui qui porte le plan de table. Le
 * jour a pourtant deux adresses. Tant que le modèle n'en tient qu'une, la
 * seconde est ici.
 */
export const CEREMONY_VENUE = "Église FJKM Ambatobe";

/**
 * Le déroulé du jour.
 *
 * `time: null` sur la cérémonie n'est pas un oubli : son heure est celle de
 * `wedding.weddingDate`, et la recopier ici créerait deux vérités qui
 * divergeraient au premier ajustement. Le composant la rend depuis l'API.
 */
export const SCHEDULE = [
  {
    time: null,
    title: "Cérémonie religieuse",
    detail:
      "Église FJKM Ambatobe, Antananarivo. " +
      "Merci d'arriver quelques minutes avant le début du culte.",
  },
  {
    time: "Midi",
    title: "Départ vers l'espace",
    detail:
      "À la sortie de l'église, nous rejoignons ensemble " +
      "l'Espace Ny Akanintsika — vers midi ou 13 h.",
  },
  {
    time: "13 h",
    title: "Réception",
    detail:
      "Déjeuner, discours et danse à l'Espace Ny Akanintsika. " +
      "La fête continue jusqu'au soir.",
  },
] as const;

/**
 * Le malgache du design. Deux phrases, pas une traduction de la page : elles
 * disent l'accueil et le remerciement, là où le français dirait la même chose
 * en plus plat.
 */
export const MALAGASY = {
  welcome: "Tongasoa · Miara-mifaly aminay",
  thanks: "Misaotra betsaka",
} as const;
