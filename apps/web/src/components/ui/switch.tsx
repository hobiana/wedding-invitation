import { useId } from "react";
import * as RadixSwitch from "@radix-ui/react-switch";

export interface SwitchProps {
  checked: boolean;
  onCheckedChange: (actif: boolean) => void;
  /** Le libellé visible, à droite de la piste — et le nom accessible. */
  label: string;
  /** Facultatif : un identifiant stable est généré sinon. */
  id?: string;
}

/**
 * L'interrupteur « Afficher les membres ». Radix Switch : `role="switch"`,
 * `aria-checked` natif, Espace et Entrée.
 *
 * Le `<label>` enveloppe la piste **et** le libellé : la cible au doigt est la
 * ligne entière, haute de 40 px, et pas les 24 px de la piste. Il est aussi
 * relié par `htmlFor`, pour que le nom accessible ne dépende pas de
 * l'imbrication.
 *
 * L'état n'est pas porté par la seule couleur : la pastille change de côté, et
 * `aria-checked` le dit. Elle saute d'un côté à l'autre sans glisser — l'admin
 * n'anime rien d'autre qu'une transition de couleur.
 */
export function Switch({ checked, onCheckedChange, label, id }: SwitchProps) {
  const idGenere = useId();
  const idPiste = id ?? idGenere;

  return (
    <label htmlFor={idPiste} className="inline-flex min-h-10 cursor-pointer items-center gap-2.5 text-sm text-ink">
      <RadixSwitch.Root
        id={idPiste}
        checked={checked}
        onCheckedChange={onCheckedChange}
        className="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full bg-rule-strong p-0.5 transition-colors duration-(--duration-micro) ease-(--ease-in) data-[state=checked]:bg-bordeaux-700"
      >
        <RadixSwitch.Thumb className="block h-5 w-5 rounded-full bg-page shadow-card data-[state=checked]:translate-x-5" />
      </RadixSwitch.Root>
      <span>{label}</span>
    </label>
  );
}
