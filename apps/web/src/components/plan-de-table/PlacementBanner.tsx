import { seatsFor } from "@invitation-app/shared";
import { places } from "@/lib/accord";
import type { FoyerAPlacer } from "./HouseholdCard";

export interface PlacementBannerProps {
  /** Le foyer en cours de placement, ou `null` hors du mode « Où placer ? ». */
  foyer: FoyerAPlacer | null;
  /** Aucune table ne peut l'accueillir : on le dit, au lieu d'une grille toute estompée. */
  aucuneTable: boolean;
  onAnnuler: () => void;
}

/**
 * La question du mode « Où placer ? ».
 *
 * La région live reste montée hors du mode, vide : une région créée en même
 * temps que son texte n'est pas toujours écoutée par les lecteurs d'écran, et
 * c'est elle qui dit à un organisateur au clavier ce qu'on attend de lui.
 */
export function PlacementBanner({ foyer, aucuneTable, onAnnuler }: PlacementBannerProps) {
  return (
    <div aria-live="polite">
      {foyer && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-surface border border-bordeaux-200 bg-bordeaux-50 px-4 py-3 text-sm text-ink">
          {aucuneTable ? (
            <p>
              Aucune table n'a assez de places pour <strong className="font-medium">{foyer.displayName}</strong> (
              {places(seatsFor(foyer))}).
            </p>
          ) : (
            <p>
              Où placer <strong className="font-medium">{foyer.displayName}</strong> ? ({places(seatsFor(foyer))}) —
              choisissez une table en surbrillance.
            </p>
          )}
          <button
            type="button"
            onClick={onAnnuler}
            className="inline-flex min-h-8 items-center rounded-control px-1 text-xs text-ink underline hover:text-bordeaux-700"
          >
            Annuler
          </button>
        </div>
      )}
    </div>
  );
}
