/**
 * `mapUrl` est du texte libre, saisi dans le formulaire de réglages admin.
 * Tout ce qui n'est pas une URL `http(s)` nue — un schéma `javascript:`, un
 * `data:`, ou simplement une faute de frappe — est écarté plutôt que passé à
 * un `href` sur la seule page que chaque invité ouvre.
 *
 * Elle vivait dans `InvitationPage`. Elle est ici depuis que la section du lieu
 * est un composant à part : une garde recopiée est une garde qu'on oublie de
 * recopier la fois suivante.
 */
export function httpUrlOrNull(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const { protocol } = new URL(url);
    return protocol === "http:" || protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}
