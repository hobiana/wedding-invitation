import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./button";
import { Field } from "./field";
import { Select } from "./select";
import { PAGE_SIZES } from "./page-sizes";

export interface PaginationProps {
  /** Nom du repère de navigation, lu par les lecteurs d'écran. */
  label: string;
  total: number;
  offset: number;
  limit: number;
  onOffsetChange: (offset: number) => void;
  onLimitChange: (limit: number) => void;
}

/**
 * « 1–25 sur 40 », Précédent / Suivant, et la taille de page.
 *
 * Les bornes sont marquées par `aria-disabled`, pas par `disabled`. Un bouton
 * qui reçoit `disabled` pendant qu'il a le focus le perd, et le focus retombe
 * sur `<body>` : l'organisateur au clavier qui vient d'atteindre la dernière
 * page devrait retraverser tout l'écran pour revenir. Avec `aria-disabled`, le
 * bouton reste focalisable, se lit « indisponible », et le clic est ignoré ici.
 *
 * L'état indisponible n'est pas porté par la seule teinte : il est annoncé par
 * l'attribut, et le libellé de plage dit déjà qu'on est au bout.
 */
export function Pagination({ label, total, offset, limit, onOffsetChange, onLimitChange }: PaginationProps) {
  const premier = total === 0 ? 0 : offset + 1;
  const dernier = Math.min(offset + limit, total);
  const plage = premier === dernier ? `${dernier} sur ${total}` : `${premier}–${dernier} sur ${total}`;

  const auDebut = offset <= 0;
  const aLaFin = offset + limit >= total;

  const indisponible =
    "aria-disabled:cursor-not-allowed aria-disabled:opacity-50 aria-disabled:hover:bg-transparent";

  return (
    <nav aria-label={label} className="flex flex-wrap items-end justify-between gap-3">
      <p aria-live="polite" className="text-sm text-ink-muted tabular-nums">
        {plage}
      </p>

      <div className="flex flex-wrap items-end gap-3">
        <Field label="Par page" className="w-24">
          <Select value={String(limit)} onChange={(e) => onLimitChange(Number(e.target.value))}>
            {PAGE_SIZES.map((taille) => (
              <option key={taille} value={taille}>
                {taille}
              </option>
            ))}
          </Select>
        </Field>

        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            aria-label="Page précédente"
            aria-disabled={auDebut || undefined}
            className={indisponible}
            onClick={() => {
              if (!auDebut) onOffsetChange(Math.max(0, offset - limit));
            }}
          >
            <ChevronLeft aria-hidden="true" className="mr-1 h-4 w-4" />
            Précédent
          </Button>
          <Button
            type="button"
            variant="outline"
            aria-label="Page suivante"
            aria-disabled={aLaFin || undefined}
            className={indisponible}
            onClick={() => {
              if (!aLaFin) onOffsetChange(offset + limit);
            }}
          >
            Suivant
            <ChevronRight aria-hidden="true" className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </div>
    </nav>
  );
}
