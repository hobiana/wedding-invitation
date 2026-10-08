import type { HouseholdAdminDto } from "@invitation-app/shared";
import { CopyLinkButton } from "@/components/CopyLinkButton";
import { Menu, MenuItem } from "@/components/ui/menu";

/**
 * Les cellules propres à Foyers dans la table du bureau. La table elle-même
 * reste le `DataTable` générique : seules ces deux cellules savent ce qu'est
 * un foyer.
 */

export interface HouseholdNameCellProps {
  household: HouseholdAdminDto;
  /** L'interrupteur « Afficher les membres ». */
  showMembers: boolean;
}

/**
 * Le nom en gras ; dessous, quand l'interrupteur est actif, les noms complets
 * des membres. Un foyer sans membre n'a rien sous son nom : les prénoms sont
 * facultatifs, et une ligne vide se lirait comme une donnée perdue.
 */
export function HouseholdNameCell({ household, showMembers }: HouseholdNameCellProps) {
  const membres = household.memberNames.map((nom) => nom.trim()).filter(Boolean);
  return (
    <div className="min-w-0">
      <span className="font-semibold text-ink">{household.displayName}</span>
      {showMembers && membres.length > 0 && (
        <p className="mt-0.5 text-xs text-ink-muted">{membres.join(", ")}</p>
      )}
    </div>
  );
}

export interface HouseholdActionsCellProps {
  household: HouseholdAdminDto;
  onEdit: (foyer: HouseholdAdminDto) => void;
  /** Ouvre le garde-fou de suppression ; ne supprime rien par lui-même. */
  onDelete: (foyer: HouseholdAdminDto) => void;
}

/** « Copier le lien » et le menu « … » (Modifier, Supprimer). */
export function HouseholdActionsCell({ household, onEdit, onDelete }: HouseholdActionsCellProps) {
  return (
    <div className="flex items-center gap-1">
      <CopyLinkButton linkId={household.id} householdName={household.displayName} buttonClassName="h-9 border-rule" />
      <Menu label={`Actions pour ${household.displayName}`}>
        <MenuItem onSelect={() => onEdit(household)}>Modifier</MenuItem>
        <MenuItem destructive onSelect={() => onDelete(household)}>
          Supprimer
        </MenuItem>
      </Menu>
    </div>
  );
}
