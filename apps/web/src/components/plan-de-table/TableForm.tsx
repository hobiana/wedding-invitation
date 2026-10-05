import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { CAPACITE_INVALIDE, capaciteValide, messageMinimum } from "@/lib/plan-de-table";

export interface TableFormProps {
  /** Création : le lien du bas dit « Annuler ». Modification : « Supprimer ». */
  mode: "creation" | "modification";
  nomInitial: string;
  capaciteInitiale: number;
  /** Places déjà occupées : la capacité ne descend pas en dessous. 0 à la création. */
  occupees?: number;
  /** Une requête est partie : « Terminé » attend sa réponse. */
  enCours?: boolean;
  onTerminer: (dto: { name: string; capacity: number }) => void;
  /** « Annuler » (création) et Échap (les deux modes) : rien n'est envoyé. */
  onFermer: () => void;
  /** « Supprimer » (modification) : la page demande confirmation. */
  onSupprimer?: () => void;
}

/**
 * Le formulaire de table, posé à la place de la carte — pour en créer une
 * comme pour la modifier.
 *
 * La capacité ne descend pas sous les places occupées : le serveur refuserait,
 * et on le dit avant, en français. Ce n'est qu'un confort ; c'est l'API qui
 * garantit (invariant 4).
 */
export function TableForm({
  mode,
  nomInitial,
  capaciteInitiale,
  occupees = 0,
  enCours = false,
  onTerminer,
  onFermer,
  onSupprimer,
}: TableFormProps) {
  const [nom, setNom] = useState(nomInitial);
  const [capacite, setCapacite] = useState(String(capaciteInitiale));
  const [tentee, setTentee] = useState(false);
  const nomRef = useRef<HTMLInputElement>(null);
  const capaciteId = useId();
  const erreurCapaciteId = `${capaciteId}-erreur`;

  // Le formulaire remplace le bouton qui l'a ouvert, démonté : sans ce focus,
  // il retomberait sur `<body>`.
  useEffect(() => {
    nomRef.current?.focus();
  }, []);

  const valeur = capaciteValide(capacite);
  const minimum = Math.max(1, occupees);
  const erreurNom = tentee && !nom.trim() ? "Donnez un nom à la table." : null;
  // Sous l'occupation, le message vient tout de suite : c'est en tapant qu'on
  // apprend la limite. Un champ vide n'est signalé qu'à la tentative.
  const saisi = capacite.trim() === "" ? Number.NaN : Number(capacite);
  const erreurCapacite =
    occupees > 0 && saisi < occupees
      ? messageMinimum(occupees)
      : tentee && valeur === null
        ? CAPACITE_INVALIDE
        : null;

  function terminer(evenement: FormEvent) {
    evenement.preventDefault();
    setTentee(true);
    if (!nom.trim() || valeur === null || valeur < occupees) return;
    onTerminer({ name: nom.trim(), capacity: valeur });
  }

  function echap(evenement: KeyboardEvent) {
    if (evenement.key !== "Escape") return;
    evenement.preventDefault();
    onFermer();
  }

  const pas = "inline-flex h-8 w-8 items-center justify-center rounded-full border border-rule-strong text-ink transition-colors duration-(--duration-micro) ease-(--ease-in) hover:bg-cream disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <form
      onSubmit={terminer}
      onKeyDown={echap}
      noValidate
      aria-label={mode === "creation" ? "Nouvelle table" : `Modifier la table « ${nomInitial} »`}
      className="flex flex-col gap-4 rounded-surface border border-gold bg-ivory p-5"
    >
      <Field label="Nom" error={erreurNom}>
        <Input ref={nomRef} value={nom} onChange={(e) => setNom(e.target.value)} className="font-display text-xl" />
      </Field>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <label htmlFor={capaciteId} className="text-sm font-medium text-ink">
            Capacité
          </label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Retirer une place"
              disabled={valeur === null || valeur <= minimum}
              onClick={() => valeur !== null && setCapacite(String(Math.max(minimum, valeur - 1)))}
              className={pas}
            >
              <Minus aria-hidden="true" className="h-3.5 w-3.5" />
            </button>
            <Input
              id={capaciteId}
              type="number"
              inputMode="numeric"
              min={minimum}
              value={capacite}
              onChange={(e) => setCapacite(e.target.value)}
              aria-invalid={erreurCapacite ? true : undefined}
              aria-describedby={erreurCapacite ? erreurCapaciteId : undefined}
              className="w-16 px-1 py-1 text-center"
            />
            <button
              type="button"
              aria-label="Ajouter une place"
              onClick={() => setCapacite(String(valeur === null ? minimum : valeur + 1))}
              className={pas}
            >
              <Plus aria-hidden="true" className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        {erreurCapacite && (
          <p id={erreurCapaciteId} role="alert" className="text-xs font-medium text-bordeaux-700">
            {erreurCapacite}
          </p>
        )}
      </div>

      <div className="flex items-center justify-between gap-3">
        <Button type="submit" size="sm" disabled={enCours}>
          Terminé
        </Button>
        {mode === "creation" ? (
          <button
            type="button"
            onClick={onFermer}
            className="inline-flex min-h-8 items-center rounded-control px-1 text-xs text-ink-muted hover:text-ink hover:underline"
          >
            Annuler
          </button>
        ) : (
          <button
            type="button"
            onClick={onSupprimer}
            className="inline-flex min-h-8 items-center rounded-control px-1 text-xs font-medium text-danger hover:text-danger-strong hover:underline"
          >
            Supprimer
          </button>
        )}
      </div>
    </form>
  );
}
