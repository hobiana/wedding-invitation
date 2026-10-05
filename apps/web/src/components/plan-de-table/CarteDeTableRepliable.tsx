import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Minus, Plus, X } from "lucide-react";
import { seatsFor, seatsTaken, type TableDto, type TableHouseholdSummaryDto } from "@invitation-app/shared";
import { places, placesLibres } from "@/lib/accord";
import { messageMinimum } from "@/lib/plan-de-table";
import { cn } from "@/lib/utils";
import { TableForm } from "./TableForm";

export interface CarteDeTableRepliableProps {
  table: TableDto;
  /** « Déplacer » d'une ligne : la feuille de choix s'ouvre, cette table exclue. */
  onDeplacer: (foyer: TableHouseholdSummaryDto) => void;
  /** Le × d'une ligne. */
  onRetirer: (foyer: TableHouseholdSummaryDto) => void;
  /**
   * Capacité (stepper) ou nom (« Renommer ») : résout `true` si la table est
   * modifiée. `false` : la saisie reste à l'écran, la page a dit pourquoi.
   */
  onEnregistrer: (dto: { name: string; capacity: number }) => Promise<boolean>;
  /** « Supprimer la table » : la page demande confirmation. */
  onSupprimer: () => void;
}

/** « 3 places · en attente », « 2 places », « 0 place · a décliné ». */
function sousTitre(foyer: TableHouseholdSummaryDto): string {
  const nombre = places(seatsFor(foyer));
  if (foyer.status === "PENDING") return `${nombre} · en attente`;
  if (foyer.status === "DECLINED") return `${nombre} · a décliné`;
  return nombre;
}

/**
 * Une table de l'onglet « Tables » au téléphone : repliée, son nom, son
 * remplissage et ce qui reste ; dépliée, ses foyers (« Déplacer », ×), la
 * capacité au stepper, et de quoi la renommer ou la supprimer.
 *
 * Le bouton de bascule vit dans le `h2` (motif « accordéon ») et porte
 * `data-bascule-table` : c'est le repère où `PlanDeTableTelephone` pose le
 * focus quand un foyer arrive à cette table ou en part, puisque la ligne du
 * foyer, elle, est démontée.
 *
 * Les places viennent de `seatsFor` / `seatsTaken` : un foyer sans réponse
 * compte pour toute son allocation, jamais pour zéro.
 */
export function CarteDeTableRepliable({ table, onDeplacer, onRetirer, onEnregistrer, onSupprimer }: CarteDeTableRepliableProps) {
  const [ouverte, setOuverte] = useState(false);
  const [renommer, setRenommer] = useState(false);
  const [enCours, setEnCours] = useState(false);
  const basculeRef = useRef<HTMLButtonElement>(null);
  const rendreLeFocus = useRef(false);
  const contenuId = useId();

  const prises = seatsTaken(table.households);
  const libres = table.capacity - prises;
  const remplissage = table.capacity > 0 ? Math.min(100, (prises / table.capacity) * 100) : 100;

  // Le formulaire de renommage se referme : il était seul à porter le focus,
  // qui retomberait sur `<body>`. On le rend à la bascule de la table.
  useEffect(() => {
    if (!renommer && rendreLeFocus.current) {
      rendreLeFocus.current = false;
      basculeRef.current?.focus();
    }
  }, [renommer]);

  function fermerRenommage() {
    rendreLeFocus.current = true;
    setRenommer(false);
  }

  async function enregistrer(dto: { name: string; capacity: number }) {
    setEnCours(true);
    const reussi = await onEnregistrer(dto);
    setEnCours(false);
    return reussi;
  }

  return (
    <section
      data-table-id={table.id}
      className="rounded-surface border border-rule bg-page px-4 pb-4 pt-3"
    >
      <h2>
        <button
          ref={basculeRef}
          type="button"
          data-bascule-table={table.id}
          aria-expanded={ouverte}
          aria-controls={ouverte ? contenuId : undefined}
          onClick={() => setOuverte((o) => !o)}
          className="flex min-h-11 w-full items-center justify-between gap-3 rounded-control text-left"
        >
          <span className="min-w-0 break-words font-display text-2xl leading-tight text-ink">{table.name}</span>
          <span className="flex shrink-0 items-center gap-1 text-sm tabular-nums text-ink-muted">
            <span aria-hidden="true">
              {prises} / {table.capacity}
            </span>
            <span className="sr-only">
              , {prises} sur {places(table.capacity)}
            </span>
            {ouverte ? (
              <ChevronUp aria-hidden="true" className="h-4 w-4" />
            ) : (
              <ChevronDown aria-hidden="true" className="h-4 w-4" />
            )}
          </span>
        </button>
      </h2>

      {/* La barre double le texte qui suit, elle ne le remplace pas. */}
      <div aria-hidden="true" className="mt-2 h-0.75 w-full bg-rule">
        <div className={cn("h-full", libres < 0 ? "bg-danger" : "bg-bordeaux-700")} style={{ width: `${remplissage}%` }} />
      </div>
      <p className={cn("mt-3 text-sm", libres < 0 ? "font-medium text-danger" : "text-ink-muted")}>
        {libres < 0 ? `Dépassement de ${places(-libres)}` : libres === 0 ? "Complète" : placesLibres(libres)}
      </p>

      {ouverte && (
        <div id={contenuId} className="mt-3 border-t border-rule">
          {renommer ? (
            <div className="pt-3">
              <TableForm
                mode="modification"
                nomInitial={table.name}
                capaciteInitiale={table.capacity}
                occupees={prises}
                enCours={enCours}
                onTerminer={(dto) => void enregistrer(dto).then((reussi) => reussi && fermerRenommage())}
                onFermer={fermerRenommage}
                onSupprimer={onSupprimer}
              />
            </div>
          ) : (
            <>
              {table.households.length === 0 ? (
                <p className="py-3 text-sm italic text-ink-muted">Table libre</p>
              ) : (
                <ul className="divide-y divide-rule">
                  {table.households.map((foyer) => (
                    <li key={foyer.id} data-household-id={foyer.id} className="flex items-center gap-2 py-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="break-words text-base text-ink">{foyer.displayName}</p>
                        <p className="text-sm text-ink-muted">{sousTitre(foyer)}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => onDeplacer(foyer)}
                        aria-label={`Déplacer ${foyer.displayName}`}
                        className="inline-flex h-10 shrink-0 items-center rounded-full border border-rule-strong px-4 text-sm text-ink transition-colors duration-(--duration-micro) ease-(--ease-in) hover:bg-cream"
                      >
                        Déplacer
                      </button>
                      <button
                        type="button"
                        onClick={() => onRetirer(foyer)}
                        aria-label={`Retirer ${foyer.displayName} de la table « ${table.name} »`}
                        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-rule-strong text-ink transition-colors duration-(--duration-micro) ease-(--ease-in) hover:bg-cream"
                      >
                        <X aria-hidden="true" className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <StepperDeCapacite table={table} occupees={prises} enCours={enCours} onEnregistrer={enregistrer} />

              <div className="flex items-center justify-between gap-3 border-t border-rule pt-2">
                <button
                  type="button"
                  onClick={() => setRenommer(true)}
                  aria-label={`Renommer la table « ${table.name} »`}
                  className="inline-flex min-h-10 items-center rounded-control px-1 text-sm text-ink-muted hover:text-ink hover:underline"
                >
                  Renommer
                </button>
                <button
                  type="button"
                  onClick={onSupprimer}
                  aria-label={`Supprimer la table « ${table.name} »`}
                  className="inline-flex min-h-10 items-center rounded-control px-1 text-sm font-medium text-danger hover:text-danger-strong hover:underline"
                >
                  Supprimer la table
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}

/**
 * « Capacité − 8 + », puis « Enregistrer » : une seule requête, et un seul
 * toast, quel que soit le nombre d'appuis.
 *
 * Les boutons qui ne peuvent rien sont `aria-disabled` et non `disabled` :
 * Chrome retire le focus d'un bouton qui devient `disabled` sous le doigt, et
 * le clavier retomberait sur `<body>`.
 */
function StepperDeCapacite({
  table,
  occupees,
  enCours,
  onEnregistrer,
}: {
  table: TableDto;
  occupees: number;
  enCours: boolean;
  onEnregistrer: (dto: { name: string; capacity: number }) => Promise<boolean>;
}) {
  // `null` : rien n'a été touché, la valeur affichée est celle du serveur.
  const [brouillon, setBrouillon] = useState<number | null>(null);
  const [auMinimum, setAuMinimum] = useState(false);
  const titreId = useId();
  const valeur = brouillon ?? table.capacity;
  const minimum = Math.max(1, occupees);
  const inchangee = valeur === table.capacity;

  function retirer() {
    if (valeur <= minimum) {
      setAuMinimum(occupees > 0);
      return;
    }
    setBrouillon(valeur - 1);
  }

  async function enregistrer() {
    if (inchangee || enCours) return;
    const reussi = await onEnregistrer({ name: table.name, capacity: valeur });
    if (reussi) {
      setBrouillon(null);
      setAuMinimum(false);
    }
  }

  const pas =
    "inline-flex h-10 w-10 items-center justify-center rounded-full border border-rule-strong text-ink transition-colors duration-(--duration-micro) ease-(--ease-in) hover:bg-cream aria-disabled:cursor-not-allowed aria-disabled:opacity-50";

  return (
    <div className="space-y-2 border-t border-rule py-3">
      <div role="group" aria-labelledby={titreId} className="flex items-center justify-between gap-3">
        <span id={titreId} className="text-sm text-ink-muted">
          Capacité
        </span>
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label="Retirer une place"
            aria-disabled={valeur <= minimum ? true : undefined}
            onClick={retirer}
            className={pas}
          >
            <Minus aria-hidden="true" className="h-4 w-4" />
          </button>
          {/* `output` : la nouvelle valeur s'annonce à chaque appui. */}
          <output aria-live="polite" className="w-8 text-center text-lg tabular-nums text-ink">
            <span aria-hidden="true">{valeur}</span>
            <span className="sr-only">{places(valeur)}</span>
          </output>
          <button
            type="button"
            aria-label="Ajouter une place"
            onClick={() => {
              setBrouillon(valeur + 1);
              setAuMinimum(false);
            }}
            className={pas}
          >
            <Plus aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>
      </div>
      {auMinimum && <p className="text-xs font-medium text-bordeaux-700">{messageMinimum(occupees)}</p>}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => void enregistrer()}
          aria-disabled={inchangee || enCours ? true : undefined}
          aria-label="Enregistrer la capacité"
          className="inline-flex min-h-10 items-center rounded-control bg-bordeaux-700 px-4 text-sm font-medium text-on-bordeaux transition-colors duration-(--duration-micro) ease-(--ease-in) hover:bg-bordeaux-900 aria-disabled:cursor-not-allowed aria-disabled:bg-cream aria-disabled:text-ink-muted"
        >
          Enregistrer
        </button>
      </div>
    </div>
  );
}
