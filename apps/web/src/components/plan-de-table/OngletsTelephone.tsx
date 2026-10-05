import { useId, useRef, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface Onglet {
  id: string;
  /** « À placer · 6 » : c'est aussi le nom du panneau. */
  titre: string;
  contenu: ReactNode;
}

export interface OngletsTelephoneProps {
  /** Le nom de la liste d'onglets, pour un lecteur d'écran. */
  libelle: string;
  onglets: Onglet[];
  actif: string;
  onChange: (id: string) => void;
}

/**
 * Les deux onglets du plan de table au téléphone (« À placer » / « Tables »),
 * au motif ARIA des onglets : un seul arrêt de tabulation pour la liste, les
 * flèches et Début / Fin passent d'un onglet à l'autre, et la sélection suit
 * le focus (activation automatique — le panneau est déjà en mémoire, rien
 * n'est chargé au changement).
 *
 * Seul le panneau choisi est monté : deux listes cachées par CSS doubleraient
 * les boutons pour un lecteur d'écran. L'état vit chez l'appelant, et n'est
 * pas mémorisé d'une visite à l'autre (décision du commanditaire).
 *
 * L'onglet actif se distingue par un fond clair en relief et une graisse,
 * pas par la seule couleur. Rien n'anime.
 */
export function OngletsTelephone({ libelle, onglets, actif, onChange }: OngletsTelephoneProps) {
  const base = useId();
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});
  const idOnglet = (id: string) => `${base}-onglet-${id}`;
  const idPanneau = (id: string) => `${base}-panneau-${id}`;
  const courant = onglets.find((o) => o.id === actif) ?? onglets[0];

  function aller(index: number) {
    const cible = onglets[(index + onglets.length) % onglets.length];
    onChange(cible.id);
    refs.current[cible.id]?.focus();
  }

  function clavier(evenement: KeyboardEvent, index: number) {
    const geste: Record<string, () => void> = {
      ArrowRight: () => aller(index + 1),
      ArrowLeft: () => aller(index - 1),
      Home: () => aller(0),
      End: () => aller(onglets.length - 1),
    };
    const action = geste[evenement.key];
    if (!action) return;
    evenement.preventDefault();
    action();
  }

  return (
    <div>
      <div role="tablist" aria-label={libelle} className="grid grid-cols-2 gap-1 rounded-surface bg-cream p-1">
        {onglets.map((onglet, index) => {
          const choisi = onglet.id === courant?.id;
          return (
            <button
              key={onglet.id}
              ref={(element) => {
                refs.current[onglet.id] = element;
              }}
              type="button"
              role="tab"
              id={idOnglet(onglet.id)}
              data-onglet={onglet.id}
              aria-selected={choisi}
              aria-controls={choisi ? idPanneau(onglet.id) : undefined}
              tabIndex={choisi ? 0 : -1}
              onClick={() => onChange(onglet.id)}
              onKeyDown={(evenement) => clavier(evenement, index)}
              className={cn(
                "min-h-11 rounded-surface px-3 text-sm text-ink transition-colors duration-(--duration-micro) ease-(--ease-in)",
                choisi ? "bg-page font-medium shadow-card" : "hover:bg-sand",
              )}
            >
              {onglet.titre}
            </button>
          );
        })}
      </div>
      {courant && (
        <div
          role="tabpanel"
          id={idPanneau(courant.id)}
          aria-labelledby={idOnglet(courant.id)}
          className="mt-4"
        >
          {courant.contenu}
        </div>
      )}
    </div>
  );
}
