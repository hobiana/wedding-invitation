import { cn } from "@/lib/utils";

/**
 * La forme de l'attente. Elle prend les dimensions de ce qu'on attend — une
 * ligne de tableau, une tuile — pour que rien ne saute quand le contenu
 * arrive.
 *
 * Elle ne pulse pas : l'admin n'anime rien, et un clignotement à dix lignes
 * simultanées est un scintillement, pas une information.
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div data-testid="skeleton" aria-hidden="true" className={cn("rounded-control bg-cream", className)} />
  );
}
