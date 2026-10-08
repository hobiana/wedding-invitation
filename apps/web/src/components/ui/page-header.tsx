import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface PageHeaderProps {
  /** Le `h1` de la page, en police d'affichage. */
  title: string;
  /** Une ligne sous le titre (« 40 foyers », « 4 foyers trouvés »). */
  subtitle?: ReactNode;
  /** Ce qui se tient à droite du titre, d'ordinaire le bouton d'ajout. */
  action?: ReactNode;
  /**
   * Sur téléphone (< 768 px), l'en-tête se colle en haut de l'écran pendant le
   * défilement, sur fond de page : le contenu passe dessous, pas au travers.
   * Sur bureau il reste à sa place.
   */
  sticky?: boolean;
  /**
   * Pour la page qui l'accueille. Un en-tête collé doit toucher les deux bords
   * de l'écran : si la page a une marge intérieure, elle la compense ici
   * (`-mx-4 px-4`), faute de quoi le contenu défile visible sur les côtés.
   */
  className?: string;
}

/**
 * L'en-tête d'une page d'administration : titre, sous-titre, action à droite,
 * séparés du contenu par un filet.
 *
 * L'action ne passe pas sous le titre sur un téléphone : la rangée ne se plie
 * pas, c'est le bloc du titre qui se resserre (`min-w-0`) et coupe un mot trop
 * long plutôt que de pousser le bouton hors de l'écran.
 */
export function PageHeader({ title, subtitle, action, sticky = false, className }: PageHeaderProps) {
  return (
    <header
      className={cn(
        "flex items-center justify-between gap-4 border-b border-rule bg-page py-3 md:items-end md:pb-6 md:pt-0",
        sticky && "max-md:sticky max-md:top-0 max-md:z-30",
        className,
      )}
    >
      <div className="min-w-0">
        <h1 className="break-words font-display text-3xl leading-tight text-ink md:text-5xl">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-ink-muted md:mt-1">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}
