/**
 * L'adresse qu'un foyer recevra.
 *
 * `Household.id` **est** la clé d'accès : le `nanoid(8)` sert de clé primaire
 * et l'API cherche l'invitation par `where: { id: linkId }`. Il n'y a donc rien
 * à demander au serveur pour composer ce lien — et rien à inventer non plus :
 * la route est `/i/:linkId`, déclarée dans `App.tsx`.
 */
export function invitationUrl(linkId: string, origin: string = window.location.origin): string {
  return `${origin.replace(/\/+$/, "")}/i/${linkId}`;
}
