import { describe, expect, it } from "vitest";
import { httpUrlOrNull } from "./url";

/**
 * `mapUrl` est un champ libre saisi dans les réglages admin, et il ressort sur
 * la seule page que tout invité ouvre — celle qui n'a aucune garde devant elle.
 * Ce filtre est ce qui sépare « un organisateur a fait une faute de frappe »
 * de « un href exécute du script chez chaque invité ».
 */
describe("httpUrlOrNull", () => {
  it.each(["javascript:alert(1)", "JavaScript:alert(1)", "data:text/html,<script>"])(
    "refuses %s",
    (hostile) => {
      expect(httpUrlOrNull(hostile)).toBeNull();
    },
  );

  it.each([
    "https://www.google.com/maps/dir/?api=1&destination=Espace+Ny+Akanintsika",
    "http://maps.example.com/lieu",
  ])("lets %s through untouched", (bon) => {
    expect(httpUrlOrNull(bon)).toBe(bon);
  });

  // Un champ vide, une valeur absente, ou du texte qui n'est pas une URL du
  // tout : trois façons dont un formulaire libre se remplit mal, un seul
  // résultat — pas de lien plutôt qu'un lien cassé.
  it.each([null, "", "   ", "espace ny akanintsika"])("returns null for %o", (vide) => {
    expect(httpUrlOrNull(vide)).toBeNull();
  });
});
