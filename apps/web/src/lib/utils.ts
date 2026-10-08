import { type ClassValue, clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * tailwind-merge, instruit des rayons du projet (`@theme` de `index.css`).
 * Sans eux, il ne reconnaît pas `rounded-field` comme un rayon : passé par
 * `className` à un `Input` qui porte déjà `rounded-control`, les deux classes
 * restaient, et c'était l'ordre du CSS produit qui choisissait — en silence.
 */
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      radius: ["control", "surface", "photo", "button", "field", "card"],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
