import { useEffect, useRef, useState } from "react";
import { Plus } from "lucide-react";
import type { TableDto } from "@invitation-app/shared";
import { foyers } from "@/lib/accord";
import { bilan } from "@/lib/plan-de-table";
import { CarteDeTableRepliable } from "./CarteDeTableRepliable";
import { FeuilleChoixDeTable, type FoyerADeplacer } from "./FeuilleChoixDeTable";
import { HouseholdCard } from "./HouseholdCard";
import { OngletsTelephone } from "./OngletsTelephone";
import type { PlanDeTableBureauProps } from "./PlanDeTableBureau";
import { TableForm } from "./TableForm";

/** Les mêmes données et les mêmes rappels que le bureau : la page ne sait pas lequel elle rend. */
export type PlanDeTableTelephoneProps = PlanDeTableBureauProps;

const CAPACITE_PAR_DEFAUT = 10;

/**
 * Le plan de table au téléphone (< 768 px), d'après la maquette : deux
 * onglets, « À placer » et « Tables » ; un appui sur « Placer › » ou
 * « Déplacer » ouvre la feuille du bas où l'on choisit la table. Pas de
 * glisser-déposer (décision du commanditaire).
 *
 * L'état d'interface vit ici (onglet, feuille, brouillon de table) ; les
 * données, les requêtes et les toasts restent à la page.
 */
export function PlanDeTableTelephone({
  tables,
  aPlacer,
  onAssign,
  onUnassign,
  onCreateTable,
  onUpdateTable,
  onDeleteTable,
}: PlanDeTableTelephoneProps) {
  const [onglet, setOnglet] = useState("a-placer");
  const [feuille, setFeuille] = useState<FoyerADeplacer | null>(null);
  const [creation, setCreation] = useState(false);
  const [enCours, setEnCours] = useState(false);
  const racine = useRef<HTMLDivElement>(null);
  const aFocaliser = useRef<(() => HTMLElement | null | undefined) | null>(null);

  const chercher = (selecteur: string) => racine.current?.querySelector<HTMLElement>(selecteur) ?? null;
  const bascule = (tableId: string | null) => (tableId ? chercher(`[data-bascule-table="${CSS.escape(tableId)}"]`) : null);
  const ongletDe = (id: string) => chercher(`[data-onglet="${id}"]`);

  /**
   * Le foyer qu'on vient de placer, déplacer ou retirer, et d'où il partait.
   *
   * Sa carte ou sa ligne est démontée quand le plan rechargé le montre
   * ailleurs, et le focus retomberait sur `<body>`. On le pose alors sur un
   * repère qui, lui, reste :
   * - depuis « À placer », l'onglet « À placer », qui annonce le nouveau compte ;
   * - déplacé, la bascule de la table d'arrivée, avec son compteur à jour ;
   * - retiré, la bascule de la table qu'il quitte, toujours dépliée.
   * Un refus du serveur ne le déplace pas : rien n'est alors volé. Périmé au
   * bout de 5 s, pour qu'un rechargement sans rapport ne tire pas le focus.
   */
  const suivi = useRef<{ id: string; depuis: string | null; le: number } | null>(null);
  const tablesConnues = useRef(new Set(tables.map((t) => t.id)));

  useEffect(() => {
    const s = suivi.current;
    if (s && Date.now() - s.le > 5000) suivi.current = null;
    else if (s) {
      const arrivee = tables.find((t) => t.households.some((h) => h.id === s.id))?.id ?? null;
      if (arrivee !== s.depuis) {
        suivi.current = null;
        const cible =
          s.depuis === null ? ongletDe("a-placer") : (bascule(arrivee) ?? bascule(s.depuis) ?? ongletDe(onglet));
        cible?.focus();
      }
    }

    // Une table a disparu — supprimée, ici ou ailleurs — et le focus avec elle.
    const ids = new Set(tables.map((t) => t.id));
    const disparue = [...tablesConnues.current].some((id) => !ids.has(id));
    tablesConnues.current = ids;
    if (disparue && (document.activeElement === document.body || document.activeElement === null)) {
      ongletDe("tables")?.focus();
    }

    if (aFocaliser.current) {
      const cible = aFocaliser.current();
      aFocaliser.current = null;
      cible?.focus();
    }
  });

  function choisir(table: TableDto) {
    if (!feuille) return;
    suivi.current = { id: feuille.foyer.id, depuis: feuille.depuis, le: Date.now() };
    // Fermée d'abord : `useFocusDeRetour` rend le focus au bouton qui l'a
    // ouverte, encore là jusqu'à la réponse du serveur.
    setFeuille(null);
    onAssign(table.id, feuille.foyer.id);
  }

  function retirer(householdId: string, depuis: string) {
    suivi.current = { id: householdId, depuis, le: Date.now() };
    onUnassign(householdId);
  }

  function fermerCreation() {
    setCreation(false);
    aFocaliser.current = () => chercher("[data-action='nouvelle-table']");
  }

  async function creer(dto: { name: string; capacity: number }) {
    setEnCours(true);
    const reussi = await onCreateTable(dto);
    setEnCours(false);
    if (reussi) fermerCreation();
  }

  const chiffres = bilan(tables, aPlacer);

  const listeAPlacer =
    aPlacer.length === 0 ? (
      <p className="py-6 text-center text-sm text-ink-muted">Tous les foyers sont placés.</p>
    ) : (
      <ul className="space-y-2.5">
        {aPlacer.map((foyer) => (
          <li key={foyer.id}>
            <HouseholdCard foyer={foyer} onPlacer={() => setFeuille({ foyer, depuis: null })} telephone />
          </li>
        ))}
      </ul>
    );

  const listeTables = (
    <div className="space-y-3">
      {tables.length === 0 && !creation && (
        <p className="py-2 text-sm text-ink-muted">
          Aucune table pour l'instant : créez la première, les foyers pourront ensuite y être placés.
        </p>
      )}
      {tables.map((table) => (
        <CarteDeTableRepliable
          key={table.id}
          table={table}
          onDeplacer={(foyer) => setFeuille({ foyer, depuis: table.id })}
          onRetirer={(foyer) => retirer(foyer.id, table.id)}
          onEnregistrer={(dto) => onUpdateTable(table.id, dto)}
          onSupprimer={() => onDeleteTable(table)}
        />
      ))}
      {creation ? (
        <TableForm
          mode="creation"
          nomInitial={`Table ${tables.length + 1}`}
          capaciteInitiale={CAPACITE_PAR_DEFAUT}
          enCours={enCours}
          onTerminer={(dto) => void creer(dto)}
          onFermer={fermerCreation}
        />
      ) : (
        <button
          type="button"
          data-action="nouvelle-table"
          onClick={() => setCreation(true)}
          className="flex min-h-14 w-full items-center justify-center gap-2 rounded-surface border border-dashed border-gold text-sm text-ink transition-colors duration-(--duration-micro) ease-(--ease-in) hover:bg-cream"
        >
          <Plus aria-hidden="true" className="h-4 w-4" />
          Nouvelle table
        </button>
      )}
    </div>
  );

  return (
    <div ref={racine}>
      <header className="mb-5">
        <h1 className="font-display text-4xl leading-tight text-ink">Plan de table</h1>
        <p className="mt-1 text-sm text-ink-muted">
          {chiffres.placesAttribuees} / {chiffres.placesTotales} places attribuées · {foyers(chiffres.foyersAPlacer)} à
          placer
        </p>
      </header>

      <OngletsTelephone
        libelle="Vues du plan de table"
        actif={onglet}
        onChange={setOnglet}
        onglets={[
          { id: "a-placer", titre: `À placer · ${aPlacer.length}`, contenu: listeAPlacer },
          { id: "tables", titre: `Tables · ${tables.length}`, contenu: listeTables },
        ]}
      />

      <FeuilleChoixDeTable enJeu={feuille} tables={tables} onChoisir={choisir} onFermer={() => setFeuille(null)} />
    </div>
  );
}
