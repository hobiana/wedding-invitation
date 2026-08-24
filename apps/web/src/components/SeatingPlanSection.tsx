import { useId } from "react";
import type { SeatingPlanDto } from "@invitation-app/shared";
import { SectionHeading } from "@/components/invitation/SectionHeading";
import {
  bandClassName,
  columnClassName,
  eyebrowClassName,
  sectionGapClassName,
} from "@/components/invitation/guest-styles";

/**
 * Invariant 6 : le plan de table s'affiche si et seulement si l'admin l'a
 * activé — et c'est l'**API** qui renvoie `seatingPlan: null` tant qu'il ne
 * l'est pas. Ce composant ne masque donc jamais des données reçues : il n'en
 * reçoit pas. Le seul `null` qu'il connaît est celui du serveur.
 *
 * La section emporte son propre espacement de 96/128 px : quand elle
 * disparaît, l'air disparaît avec elle plutôt que de laisser un trou.
 */
export function SeatingPlanSection({ seatingPlan }: { seatingPlan: SeatingPlanDto | null }) {
  const eyebrowId = useId();
  const headingId = useId();

  if (!seatingPlan) return null;

  return (
    <section
      // Nommée par l'exergue et par le nom de table : « À table, Table des
      // Baobabs » est ce qu'annonce un lecteur d'écran qui parcourt les
      // repères de la page, et c'est exactement l'information cherchée.
      aria-labelledby={`${eyebrowId} ${headingId}`}
      className={`${sectionGapClassName} bg-cream ${bandClassName}`}
    >
      <div className={columnClassName}>
        <p id={eyebrowId} className={eyebrowClassName}>
          À table
        </p>
        <div className="mt-2">
          <SectionHeading id={headingId}>{seatingPlan.tableName}</SectionHeading>
        </div>

        {seatingPlan.neighbors.length > 0 && (
          <ul className="mt-8 space-y-2 leading-[1.7]">
            {seatingPlan.neighbors.map((neighbor) => (
              // Pas de puces : une liste de noms n'en a pas besoin, et le
              // nombre se lit après un tiret demi-cadratin plutôt qu'entre
              // parenthèses — c'est une précision, pas un aparté.
              <li key={neighbor.displayName} className="list-none">
                {neighbor.displayName}
                <span className="text-ink-muted"> — {neighbor.confirmedCount}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
