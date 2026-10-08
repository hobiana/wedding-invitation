import { createContext, useContext, useRef, type ReactNode } from "react";
import * as RadixMenu from "@radix-ui/react-dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

/** L'action choisie, gardée jusqu'à ce que le menu ait rendu le focus au déclencheur. */
const ActionDiffereeContext = createContext<((action: () => void) => void) | null>(null);

export interface MenuProps {
  /**
   * Le nom accessible du déclencheur « … », qui n'a pas de texte visible :
   * « Actions pour Famille Rakoto ». Sur une page de quarante lignes, quarante
   * boutons « Actions » ne disent pas de quelle ligne ils sont.
   */
  label: string;
  /** Des `MenuItem`. */
  children: ReactNode;
  /** Classes ajoutées au déclencheur (bordure, fond sur téléphone…). */
  className?: string;
}

/**
 * Le menu « … » d'une ligne : Modifier, Supprimer. Radix DropdownMenu —
 * `role="menu"`, flèches, Entrée, Échap, focus rendu au déclencheur.
 *
 * Ancré sous le déclencheur, aligné sur son bord droit (`align="end"`) : la
 * ligne finit à droite, le menu ne déborde pas de l'écran. Il apparaît sans
 * glisser ni fondre — l'admin n'anime rien.
 *
 * **Un élément qui ouvre un dialogue.** C'est l'usage même de ce menu, et le
 * piège : nos dialogues mémorisent pendant leur rendu l'élément focalisé, pour
 * le lui rendre à la fermeture (`useFocusDeRetour`). Si `onSelect` tournait
 * tout de suite, le focus serait encore sur l'élément du menu — démonté juste
 * après — et c'est lui que le dialogue retiendrait ; à sa fermeture le focus
 * tomberait sur `<body>`. Radix, de son côté, tente de rendre le focus au
 * déclencheur au démontage du menu, dans un `setTimeout(0)`, **après** que le
 * dialogue a posé son propre piège.
 *
 * On diffère donc l'action : l'élément la confie au menu, le menu se ferme,
 * rend le focus au déclencheur dans `onCloseAutoFocus`, et **seulement alors**
 * exécute l'action. Le dialogue s'ouvre avec le focus sur « … », le retient,
 * et le lui rend à la fermeture. Si la ligne a disparu entre-temps (foyer
 * supprimé), le crochet laisse faire Radix : à la page de désigner un repère.
 */
export function Menu({ label, children, className }: MenuProps) {
  const declencheurRef = useRef<HTMLButtonElement>(null);
  const actionEnAttente = useRef<(() => void) | null>(null);

  return (
    <ActionDiffereeContext.Provider value={(action) => (actionEnAttente.current = action)}>
      <RadixMenu.Root>
        <RadixMenu.Trigger
          ref={declencheurRef}
          aria-label={label}
          className={cn(
            "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-button text-ink transition-colors duration-(--duration-micro) ease-(--ease-in) hover:bg-cream data-[state=open]:bg-cream",
            className,
          )}
        >
          <MoreHorizontal aria-hidden="true" className="h-5 w-5" />
        </RadixMenu.Trigger>
        <RadixMenu.Portal>
          <RadixMenu.Content
            align="end"
            sideOffset={4}
            onCloseAutoFocus={(evenement) => {
              const action = actionEnAttente.current;
              if (!action) return; // Échap, clic dehors : Radix fait comme d'habitude.
              actionEnAttente.current = null;
              evenement.preventDefault();
              declencheurRef.current?.focus();
              action();
            }}
            className="z-50 min-w-40 rounded-card border border-rule bg-page p-1 shadow-card"
          >
            {children}
          </RadixMenu.Content>
        </RadixMenu.Portal>
      </RadixMenu.Root>
    </ActionDiffereeContext.Provider>
  );
}

export interface MenuItemProps {
  /** Exécuté une fois le menu fermé et le focus rendu au déclencheur (cf. `Menu`). */
  onSelect: () => void;
  /** « Supprimer » : texte au jeton `danger`. Le libellé dit déjà le geste. */
  destructive?: boolean;
  children: ReactNode;
}

export function MenuItem({ onSelect, destructive = false, children }: MenuItemProps) {
  const differer = useContext(ActionDiffereeContext);

  return (
    <RadixMenu.Item
      onSelect={() => (differer ? differer(onSelect) : onSelect())}
      className={cn(
        "flex min-h-10 cursor-pointer select-none items-center rounded-button px-3 text-sm transition-colors duration-(--duration-micro) ease-(--ease-in) data-[highlighted]:bg-cream",
        destructive ? "text-danger" : "text-ink",
      )}
    >
      {children}
    </RadixMenu.Item>
  );
}
