import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Une pastille d'état. Les trois teintes viennent des jetons `--color-status-*`
 * et rien d'autre : le rouge et le vert de Tailwind jurent à côté du bordeaux,
 * et la direction artistique les exclut.
 *
 * `pending` est bordeaux — c'est le seul état qui appelle un geste, relancer
 * le foyer. `no` est un brun éteint : un refus est une information, pas une
 * alerte.
 */
const TONS = {
  yes: "bg-status-yes-bg text-status-yes",
  pending: "bg-status-pending-bg text-status-pending",
  no: "bg-status-no-bg text-status-no",
  neutral: "bg-cream text-ink-muted",
} as const;

export type BadgeTone = keyof typeof TONS;

export interface BadgeProps {
  tone?: BadgeTone;
  className?: string;
  /** Le libellé. Il est obligatoire : la couleur seule ne dit rien. */
  children: ReactNode;
}

export function Badge({ tone = "neutral", className, children }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-control px-2 py-0.5 text-xs font-medium",
        TONS[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
