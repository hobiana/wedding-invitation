import { cn } from "@/lib/utils";

export interface FilterPillOption {
  value: string;
  label: string;
}

export interface FilterPillsProps {
  options: FilterPillOption[];
  /** La valeur de la pastille active. */
  value: string;
  onChange: (valeur: string) => void;
  /** Le nom du groupe, lu par l'assistance technique (« Filtrer par statut »). */
  label: string;
  className?: string;
}

/**
 * Les pastilles de statut « Tous / En attente / Confirmés / Déclinés » : un
 * choix unique, toujours un choix actif.
 *
 * Sémantique : un `role="group"` nommé et des boutons `aria-pressed`, plutôt
 * qu'un `radiogroup`. Un groupe radio impose la navigation aux flèches et une
 * seule tabulation ; ici chaque pastille est un bouton ordinaire, atteint à la
 * tabulation et actionné à Entrée ou Espace, ce qu'un organisateur au clavier
 * devine sans mode d'emploi. L'état actif est dit par `aria-pressed`, pas par
 * le seul remplissage.
 *
 * La rangée défile horizontalement quand elle ne tient pas (téléphone), sans
 * barre visible. Le `p-1` n'est pas décoratif : un conteneur défilant rogne ce
 * qui dépasse, et l'anneau de focus global (2 px, décalé de 2 px) dépasse de
 * 4 px.
 */
export function FilterPills({ options, value, onChange, label, className }: FilterPillsProps) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        "-m-1 flex gap-2 overflow-x-auto p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className,
      )}
    >
      {options.map((option) => {
        const actif = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={actif}
            onClick={() => onChange(option.value)}
            className={cn(
              "inline-flex min-h-10 shrink-0 items-center whitespace-nowrap rounded-full border px-4 text-sm font-medium transition-colors duration-(--duration-micro) ease-(--ease-in)",
              actif
                ? "border-bordeaux-700 bg-bordeaux-700 text-on-bordeaux"
                : "border-rule bg-page text-ink hover:border-rule-strong hover:bg-cream",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
