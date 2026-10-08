import { useId } from "react";
import type { HouseholdAdminDto } from "@invitation-app/shared";
import { CopyLinkButton } from "@/components/CopyLinkButton";
import { ShareLinkButton } from "@/components/ShareLinkButton";
import { HouseholdDetail } from "@/components/HouseholdDetail";
import { StatusBadge } from "@/components/StatusBadge";
import { Menu, MenuItem } from "@/components/ui/menu";
import { motPlaces, prenoms } from "@/lib/foyers";
import { cn } from "@/lib/utils";

export interface HouseholdMobileCardProps {
  household: HouseholdAdminDto;
  /** L'interrupteur « Afficher les membres » : les prénoms après les places. */
  showMembers: boolean;
  expanded: boolean;
  onToggle: () => void;
  onEdit: (foyer: HouseholdAdminDto) => void;
  /** Ouvre le garde-fou de suppression ; ne supprime rien par lui-même. */
  onDelete: (foyer: HouseholdAdminDto) => void;
}

/**
 * Un foyer sur téléphone (maquettes 16 et 17) : nom et statut, « 3 / 3 places
 * · Lova, Haja, Toky », puis « Copier le lien », « Partager » et « … ».
 *
 * **L'en-tête entier est le bouton qui déplie** (`aria-expanded`) : la
 * maquette n'a pas de chevron, et toute la largeur de la carte fait une cible
 * généreuse au pouce. Les boutons d'action restent **hors** de cet en-tête —
 * un bouton dans un bouton n'est pas du HTML valide, et l'appui sur « Copier »
 * ne doit pas déplier la carte.
 *
 * Dépliée, la carte prend une bordure plus marquée et montre le panneau crème
 * sur place. Le panneau ne répète ni les places (l'en-tête les porte) ni les
 * boutons de lien (la carte les porte juste dessous) ; les prénoms quittent
 * l'en-tête, puisque le panneau liste les membres en entier.
 */
export function HouseholdMobileCard({
  household,
  showMembers,
  expanded,
  onToggle,
  onEdit,
  onDelete,
}: HouseholdMobileCardProps) {
  const idPanneau = useId();
  const lesPrenoms = showMembers && !expanded ? prenoms(household.memberNames) : [];

  return (
    <article
      aria-label={household.displayName}
      className={cn(
        "rounded-card border bg-page p-4 transition-colors duration-(--duration-micro) ease-(--ease-in)",
        expanded ? "border-rule-strong" : "border-rule",
      )}
    >
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={expanded ? idPanneau : undefined}
        onClick={onToggle}
        className="flex min-h-10 w-full items-start justify-between gap-3 rounded-button text-left"
      >
        <span className="min-w-0 flex-1">
          <span className="block break-words text-lg font-semibold leading-snug text-ink">
            {household.displayName}
          </span>
          <span className="mt-1 block text-sm text-ink-muted">
            <span className="tabular-nums">
              {/* `—` tant que le foyer n'a pas répondu, jamais 0. */}
              <span className="font-semibold text-ink">{household.confirmedCount ?? "—"}</span> /{" "}
              {household.allocatedSeats} {motPlaces(household.allocatedSeats)}
            </span>
            {lesPrenoms.length > 0 && (
              <>
                <span aria-hidden="true" className="px-1.5">
                  ·
                </span>
                <span>{lesPrenoms.join(", ")}</span>
              </>
            )}
          </span>
        </span>
        <StatusBadge status={household.status} className="mt-0.5 shrink-0 rounded-full px-2.5 py-1" />
      </button>

      {expanded && (
        <div id={idPanneau} className="mt-3">
          <HouseholdDetail household={household} withLinkActions={false} withSeats={false} />
        </div>
      )}

      <div className="mt-3 flex items-start gap-2">
        <CopyLinkButton
          linkId={household.id}
          householdName={household.displayName}
          className="min-w-0 flex-1"
          buttonClassName="h-10 w-full border-rule bg-ivory"
        />
        <ShareLinkButton
          linkId={household.id}
          householdName={household.displayName}
          className="shrink-0"
          buttonClassName="h-10 border-rule bg-ivory"
        />
        <Menu label={`Actions pour ${household.displayName}`}>
          <MenuItem onSelect={() => onEdit(household)}>Modifier</MenuItem>
          <MenuItem destructive onSelect={() => onDelete(household)}>
            Supprimer
          </MenuItem>
        </Menu>
      </div>
    </article>
  );
}
