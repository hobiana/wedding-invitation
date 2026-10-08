import { useId, type ReactNode } from "react";
import * as RadixSwitch from "@radix-ui/react-switch";

export interface SwitchProps {
  checked: boolean;
  onCheckedChange: (actif: boolean) => void;
  /** Le libellé visible — et le nom accessible. */
  label: string;
  /**
   * Une ligne sous le libellé (« Masqué — activation entièrement manuelle. »).
   * Sa présence passe l'interrupteur en **ligne de réglage** : texte à gauche,
   * piste à droite, sur toute la largeur.
   */
  description?: ReactNode;
  /** Pendant qu'un changement part vers le serveur, pour ne pas en empiler deux. */
  disabled?: boolean;
  /** Facultatif : un identifiant stable est généré sinon. */
  id?: string;
}

const pisteClassName =
  "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full bg-rule-strong p-0.5 transition-colors duration-(--duration-micro) ease-(--ease-in) data-[state=checked]:bg-bordeaux-700 disabled:cursor-not-allowed disabled:opacity-50";

/**
 * L'interrupteur. Radix Switch : `role="switch"`, `aria-checked` natif, Espace
 * et Entrée.
 *
 * Sans description (« Afficher les membres »), le `<label>` enveloppe la piste
 * **et** le libellé : la cible au doigt est la ligne entière, haute de 40 px, et
 * pas les 24 px de la piste. Il est aussi relié par `htmlFor`, pour que le nom
 * accessible ne dépende pas de l'imbrication.
 *
 * Avec une description, la description reste **hors** du `<label>` : dedans,
 * elle s'ajouterait au nom accessible (« Plan de table visible par les invités
 * Masqué — activation… »). Elle est rattachée par `aria-describedby`.
 *
 * L'état n'est pas porté par la seule couleur : la pastille change de côté, et
 * `aria-checked` le dit. Elle saute d'un côté à l'autre sans glisser — l'admin
 * n'anime rien d'autre qu'une transition de couleur.
 */
export function Switch({ checked, onCheckedChange, label, description, disabled, id }: SwitchProps) {
  const idGenere = useId();
  const idPiste = id ?? idGenere;
  const idDescription = `${idPiste}-description`;

  const piste = (
    <RadixSwitch.Root
      id={idPiste}
      checked={checked}
      onCheckedChange={onCheckedChange}
      disabled={disabled}
      aria-describedby={description ? idDescription : undefined}
      className={pisteClassName}
    >
      <RadixSwitch.Thumb className="block h-5 w-5 rounded-full bg-page shadow-card data-[state=checked]:translate-x-5" />
    </RadixSwitch.Root>
  );

  if (description) {
    return (
      <div className="flex min-h-10 items-center justify-between gap-4">
        <div className="min-w-0">
          <label htmlFor={idPiste} className="block cursor-pointer font-medium text-ink">
            {label}
          </label>
          <p id={idDescription} className="mt-0.5 text-sm text-ink-muted">
            {description}
          </p>
        </div>
        {piste}
      </div>
    );
  }

  return (
    <label htmlFor={idPiste} className="inline-flex min-h-10 cursor-pointer items-center gap-2.5 text-sm text-ink">
      {piste}
      <span>{label}</span>
    </label>
  );
}
