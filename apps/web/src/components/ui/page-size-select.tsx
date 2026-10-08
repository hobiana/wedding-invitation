import { useId } from "react";
import { Select } from "./select";
import { PAGE_SIZES } from "./page-sizes";

export interface PageSizeSelectProps {
  value: number;
  onChange: (taille: number) => void;
}

/**
 * « Par page » et sa liste 10 / 25 / 50 / 100, sur une seule ligne : le
 * libellé à gauche, la liste à droite (maquettes 12 et 16). Un vrai `<label>`
 * visible, relié par `htmlFor`. Sert au pied de la table sur bureau et à la
 * barre d'outils du téléphone.
 */
export function PageSizeSelect({ value, onChange }: PageSizeSelectProps) {
  const id = useId();
  return (
    <div className="flex items-center gap-2">
      <label htmlFor={id} className="whitespace-nowrap text-sm text-ink-muted">
        Par page
      </label>
      <Select
        id={id}
        value={String(value)}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-10 w-20 rounded-field py-0"
      >
        {PAGE_SIZES.map((taille) => (
          <option key={taille} value={taille}>
            {taille}
          </option>
        ))}
      </Select>
    </div>
  );
}
