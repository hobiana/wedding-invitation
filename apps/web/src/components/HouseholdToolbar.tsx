import { useId, useState } from "react";
import { ArrowDown, ArrowUp, ListFilter } from "lucide-react";
import type { HouseholdSortKey, RsvpStatus, SortOrder } from "@invitation-app/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { FilterPills } from "@/components/ui/filter-pills";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { PageSizeSelect } from "@/components/ui/page-size-select";
import { cn } from "@/lib/utils";

export type StatutFiltre = RsvpStatus | "ALL";

const STATUTS: { value: StatutFiltre; label: string }[] = [
  { value: "ALL", label: "Tous" },
  { value: "PENDING", label: "En attente" },
  { value: "CONFIRMED", label: "Confirmés" },
  { value: "DECLINED", label: "Déclinés" },
];

const TRIS: { valeur: HouseholdSortKey; libelle: string }[] = [
  { valeur: "name", libelle: "Nom du foyer" },
  { valeur: "seats", libelle: "Places" },
  { valeur: "status", libelle: "Statut" },
  { valeur: "createdAt", libelle: "Date d'ajout" },
];

export interface HouseholdToolbarProps {
  /** Choisi par la page avec `useMediaQuery` : un seul rendu dans le DOM. */
  variant: "desktop" | "mobile";
  recherche: string;
  onRechercheChange: (texte: string) => void;
  statut: StatutFiltre;
  onStatutChange: (statut: StatutFiltre) => void;
  tri: HouseholdSortKey;
  onTriChange: (tri: HouseholdSortKey) => void;
  sens: SortOrder;
  onSensToggle: () => void;
  membres: boolean;
  onMembresChange: (actif: boolean) => void;
  /** Téléphone seulement : sur bureau, « Par page » est au pied de la table. */
  limit: number;
  onLimitChange: (taille: number) => void;
}

/** « Trier par » et sa liste, libellé visible relié par `htmlFor`. */
function ChoixDuTri({ tri, onTriChange, empile }: { tri: HouseholdSortKey; onTriChange: (tri: HouseholdSortKey) => void; empile?: boolean }) {
  const id = useId();
  return (
    <div className={cn("flex gap-2", empile ? "flex-col" : "items-center")}>
      <label htmlFor={id} className="whitespace-nowrap text-sm text-ink-muted">
        Trier par
      </label>
      <Select
        id={id}
        value={tri}
        onChange={(e) => onTriChange(e.target.value as HouseholdSortKey)}
        className={cn("h-10 rounded-field py-0", empile ? "w-full" : "w-auto text-sm")}
      >
        {TRIS.map(({ valeur, libelle }) => (
          <option key={valeur} value={valeur}>
            {libelle}
          </option>
        ))}
      </Select>
    </div>
  );
}

/** Le sens se lit en toutes lettres ; le nom accessible contient le libellé visible (WCAG 2.5.3). */
function BoutonDeSens({ sens, onSensToggle, className }: { sens: SortOrder; onSensToggle: () => void; className?: string }) {
  const libelle = sens === "asc" ? "Croissant" : "Décroissant";
  const Fleche = sens === "asc" ? ArrowUp : ArrowDown;
  return (
    <Button
      type="button"
      variant="outline"
      aria-label={`Sens du tri : ${libelle}`}
      onClick={onSensToggle}
      className={cn("h-10 border-rule", className)}
    >
      <Fleche aria-hidden="true" className="mr-1.5 h-4 w-4" />
      {libelle}
    </Button>
  );
}

/**
 * La barre d'outils de la page Foyers. Bureau (maquette 10) : recherche,
 * pastilles de statut, puis à droite l'interrupteur, « Trier par » et le sens.
 * Téléphone (maquette 16) : recherche ; pastilles défilantes suivies de
 * « Trier », qui ouvre une feuille du bas ; l'interrupteur et « Par page ».
 *
 * Elle ne tient aucun état métier : tout remonte à la page, qui envoie les
 * critères au serveur. Seule l'ouverture de la feuille vit ici.
 */
export function HouseholdToolbar(props: HouseholdToolbarProps) {
  const { variant, recherche, onRechercheChange, statut, onStatutChange, membres, onMembresChange } = props;
  const [feuilleOuverte, setFeuilleOuverte] = useState(false);
  const telephone = variant === "mobile";

  const champ = (
    <Input
      type="search"
      aria-label="Rechercher un foyer"
      placeholder="Nom du foyer ou d'un invité"
      value={recherche}
      onChange={(e) => onRechercheChange(e.target.value)}
      className={cn("rounded-field border-rule", telephone ? "h-12" : "h-10 py-0 md:w-80 lg:w-96")}
    />
  );

  const pastilles = (
    <FilterPills
      label="Filtrer par statut"
      options={STATUTS}
      value={statut}
      onChange={(valeur) => onStatutChange(valeur as StatutFiltre)}
      className={telephone ? "min-w-0 flex-1" : undefined}
    />
  );

  const interrupteur = <Switch label="Afficher les membres" checked={membres} onCheckedChange={onMembresChange} />;

  if (!telephone) {
    return (
      <div className="flex flex-wrap items-center gap-x-3 gap-y-3">
        {champ}
        {pastilles}
        <div className="ml-auto flex flex-wrap items-center gap-x-4 gap-y-2">
          {interrupteur}
          <ChoixDuTri tri={props.tri} onTriChange={props.onTriChange} />
          <BoutonDeSens sens={props.sens} onSensToggle={props.onSensToggle} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {champ}
      <div className="flex items-center gap-2">
        {pastilles}
        <Button
          type="button"
          variant="outline"
          aria-haspopup="dialog"
          onClick={() => setFeuilleOuverte(true)}
          className="h-10 shrink-0 rounded-full border-rule px-3"
        >
          <ListFilter aria-hidden="true" className="mr-1.5 h-4 w-4" />
          Trier
        </Button>
      </div>
      <div className="flex items-center justify-between gap-3">
        {interrupteur}
        <PageSizeSelect value={props.limit} onChange={props.onLimitChange} />
      </div>

      <BottomSheet open={feuilleOuverte} onOpenChange={setFeuilleOuverte} eyebrow="Foyers" title="Trier">
        <div className="mt-5 space-y-4">
          <ChoixDuTri tri={props.tri} onTriChange={props.onTriChange} empile />
          <BoutonDeSens sens={props.sens} onSensToggle={props.onSensToggle} className="w-full" />
        </div>
      </BottomSheet>
    </div>
  );
}
