import type { ReactNode } from "react";
import { Card } from "./card";

/**
 * Un vide expliqué. Trois occasions dans l'admin : aucun foyer encore saisi,
 * une recherche sans résultat, aucun foyer en attente de réponse. Les trois
 * demandent une phrase, pas un tableau à zéro ligne.
 */
export interface EmptyStateProps {
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <Card className="flex flex-col items-center gap-2 px-6 py-12 text-center">
      <p className="font-display text-xl text-ink">{title}</p>
      <p className="text-sm text-ink-muted">{description}</p>
      {action && <div className="mt-2">{action}</div>}
    </Card>
  );
}
