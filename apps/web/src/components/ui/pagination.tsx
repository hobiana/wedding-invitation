import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./button";
import { PageSizeSelect } from "./page-size-select";

export interface PaginationProps {
  /** Nom du repère de navigation, lu par les lecteurs d'écran. */
  label: string;
  total: number;
  offset: number;
  limit: number;
  onOffsetChange: (offset: number) => void;
  /** Requis par la variante complète, qui porte « Par page ». */
  onLimitChange?: (limit: number) => void;
  /**
   * `full` (bureau) : « 1–25 sur 40 » à gauche, « Par page », « ‹ Précédent »,
   * « Suivant › » à droite. `compact` (téléphone) : « ‹ 1–10 sur 40 › », deux
   * flèches de 40 px ; la taille de page est alors dans la barre d'outils.
   */
  variant?: "full" | "compact";
}

/**
 * Les bornes sont marquées par `aria-disabled`, pas par `disabled`. Un bouton
 * qui reçoit `disabled` pendant qu'il a le focus le perd, et le focus retombe
 * sur `<body>` : l'organisateur au clavier qui vient d'atteindre la dernière
 * page devrait retraverser tout l'écran pour revenir. Avec `aria-disabled`, le
 * bouton reste focalisable, se lit « indisponible », et le clic est ignoré ici.
 *
 * L'état indisponible n'est pas porté par la seule teinte : il est annoncé par
 * l'attribut, et le libellé de plage dit déjà qu'on est au bout.
 */
export function Pagination({
  label,
  total,
  offset,
  limit,
  onOffsetChange,
  onLimitChange,
  variant = "full",
}: PaginationProps) {
  const premier = total === 0 ? 0 : offset + 1;
  const dernier = Math.min(offset + limit, total);
  const plage = premier === dernier ? `${dernier} sur ${total}` : `${premier}–${dernier} sur ${total}`;

  const auDebut = offset <= 0;
  const aLaFin = offset + limit >= total;

  const indisponible =
    "aria-disabled:cursor-not-allowed aria-disabled:opacity-50 aria-disabled:hover:bg-transparent";

  const precedente = () => {
    if (!auDebut) onOffsetChange(Math.max(0, offset - limit));
  };
  const suivante = () => {
    if (!aLaFin) onOffsetChange(offset + limit);
  };

  if (variant === "compact") {
    return (
      <nav aria-label={label} className="flex items-center justify-between gap-3">
        <Button
          type="button"
          variant="outline"
          aria-label="Page précédente"
          aria-disabled={auDebut || undefined}
          className={`h-10 w-10 border-rule p-0 ${indisponible}`}
          onClick={precedente}
        >
          <ChevronLeft aria-hidden="true" className="h-4 w-4" />
        </Button>
        <p aria-live="polite" className="text-sm text-ink-muted tabular-nums">
          {plage}
        </p>
        <Button
          type="button"
          variant="outline"
          aria-label="Page suivante"
          aria-disabled={aLaFin || undefined}
          className={`h-10 w-10 border-rule p-0 ${indisponible}`}
          onClick={suivante}
        >
          <ChevronRight aria-hidden="true" className="h-4 w-4" />
        </Button>
      </nav>
    );
  }

  return (
    <nav aria-label={label} className="flex flex-wrap items-center justify-between gap-3">
      <p aria-live="polite" className="text-sm text-ink-muted tabular-nums">
        {plage}
      </p>

      <div className="flex flex-wrap items-center gap-3">
        {onLimitChange && <PageSizeSelect value={limit} onChange={onLimitChange} />}

        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            aria-label="Page précédente"
            aria-disabled={auDebut || undefined}
            className={`border-rule ${indisponible}`}
            onClick={precedente}
          >
            <ChevronLeft aria-hidden="true" className="mr-1 h-4 w-4" />
            Précédent
          </Button>
          <Button
            type="button"
            variant="outline"
            aria-label="Page suivante"
            aria-disabled={aLaFin || undefined}
            className={`border-rule ${indisponible}`}
            onClick={suivante}
          >
            Suivant
            <ChevronRight aria-hidden="true" className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </div>
    </nav>
  );
}
