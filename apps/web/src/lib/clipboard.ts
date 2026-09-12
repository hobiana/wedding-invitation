/**
 * Copier un texte, et **dire la vérité** sur le résultat.
 *
 * Le presse-papier n'existe qu'en contexte sécurisé, et le navigateur peut
 * refuser même là. Un `false` n'est pas une erreur à avaler : c'est ce qui
 * déclenche le repli visible côté interface. Un organisateur qui croit avoir
 * copié colle autre chose dans WhatsApp, et personne ne le saura avant que le
 * foyer réponde qu'il n'a pas d'invitation.
 */
export async function copyToClipboard(texte: string): Promise<boolean> {
  if (!window.isSecureContext) return false;
  if (typeof navigator.clipboard?.writeText !== "function") return false;
  try {
    await navigator.clipboard.writeText(texte);
    return true;
  } catch {
    return false;
  }
}
