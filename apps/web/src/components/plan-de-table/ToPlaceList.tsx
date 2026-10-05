import { useId, useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { Input } from "@/components/ui/input";
import { places } from "@/lib/accord";
import { ZONE_A_PLACER } from "@/lib/plan-de-table";
import { filtrerFoyers } from "@/lib/plier";
import { cn } from "@/lib/utils";
import { HouseholdCard, type FoyerAPlacer } from "./HouseholdCard";

export interface ToPlaceListProps {
  /** Déjà débarrassés des foyers assis et de ceux qui ont décliné, dans l'ordre du serveur. */
  foyers: FoyerAPlacer[];
  /** « 16 places » : la somme des `seatsFor` de toute la liste, recherche ignorée. */
  placesAPlacer: number;
  /** Le foyer dont on choisit la table, pour le dessiner en bordeaux. */
  selectionId: string | null;
  onPlacer: (foyer: FoyerAPlacer) => void;
  /** Bureau : cartes glissables, et la colonne reçoit le dépôt d'un foyer qu'on retire. Exige un `DndContext`. */
  glissable?: boolean;
}

export function ToPlaceList(props: ToPlaceListProps) {
  return props.glissable ? <ListeDeposable {...props} /> : <Liste {...props} />;
}

function ListeDeposable(props: ToPlaceListProps) {
  const { setNodeRef, isOver } = useDroppable({ id: ZONE_A_PLACER });
  return <Liste {...props} nodeRef={setNodeRef} survolee={isOver} />;
}

function Liste({
  foyers,
  placesAPlacer,
  selectionId,
  onPlacer,
  glissable = false,
  nodeRef,
  survolee = false,
}: ToPlaceListProps & { nodeRef?: (element: HTMLElement | null) => void; survolee?: boolean }) {
  const [recherche, setRecherche] = useState("");
  const rechercheId = useId();
  const affiches = filtrerFoyers(foyers, recherche);

  return (
    <section
      ref={nodeRef}
      aria-labelledby="titre-a-placer"
      className={cn(
        "rounded-surface transition-colors duration-(--duration-micro) ease-(--ease-in)",
        survolee && "bg-bordeaux-50 outline-2 outline-offset-4 outline-dashed outline-bordeaux-500",
      )}
    >
      <div className="flex items-baseline justify-between gap-3">
        {/* Repère stable du focus quand le foyer suivi n'a plus de carte où aller. */}
        <h2 id="titre-a-placer" tabIndex={-1} data-repere-a-placer="" className="font-display text-2xl text-ink">
          À placer
        </h2>
        <p className="text-xs tabular-nums text-ink-muted">{places(placesAPlacer)}</p>
      </div>
      <p className="mt-1 text-xs text-ink-muted">
        Glissez un foyer sur une table, ou cliquez-le puis choisissez sa table.
      </p>

      <label htmlFor={rechercheId} className="sr-only">
        Rechercher un foyer
      </label>
      <Input
        id={rechercheId}
        type="search"
        value={recherche}
        onChange={(e) => setRecherche(e.target.value)}
        placeholder="Rechercher un foyer…"
        className="mt-4"
      />

      {foyers.length === 0 ? (
        <p className="mt-4 text-sm text-ink-muted">Tous les foyers sont placés.</p>
      ) : affiches.length === 0 ? (
        <p className="mt-4 text-sm text-ink-muted">Aucun foyer ne correspond à « {recherche.trim()} ».</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {affiches.map((foyer) => (
            <li key={foyer.id}>
              <HouseholdCard
                foyer={foyer}
                onPlacer={() => onPlacer(foyer)}
                selectionne={foyer.id === selectionId}
                glissable={glissable}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
