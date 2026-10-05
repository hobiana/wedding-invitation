/**
 * Le garde-fou contre la troncature silencieuse.
 *
 * Le tableau de bord et le plan de table demandent tous les foyers d'un coup,
 * au plafond de l'API (500). Le jour où il y en a davantage, l'API en renvoie
 * 500 sans erreur, et les compteurs mentiraient sans que rien ne le dise.
 * L'enveloppe porte `total` : on compare, et on le dit.
 *
 * Bordeaux et non rouge : ce n'est pas une action destructive, c'est une
 * information. Le texte porte le sens, la bordure ne fait que l'appuyer.
 */
export function HouseholdsTruncationNotice({
  recus,
  total,
  consequence,
}: {
  recus: number;
  total: number;
  /** La fin de la phrase, propre à l'écran : ce qui est faux à cause de la coupe. */
  consequence: string;
}) {
  if (total <= recus) return null;
  return (
    <p
      role="alert"
      className="rounded-surface border border-bordeaux-700 bg-bordeaux-50 px-4 py-3 text-sm text-bordeaux-700"
    >
      Seuls les {recus} premiers foyers sur {total} sont pris en compte : {consequence}.
    </p>
  );
}
