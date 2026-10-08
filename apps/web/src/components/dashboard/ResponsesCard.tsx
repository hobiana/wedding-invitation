import { useId } from "react";
import { tauxDeReponse } from "@/lib/dashboard";

export interface ResponsesCardProps {
  confirmes: number;
  declines: number;
  enAttente: number;
  total: number;
}

/** Le français met au singulier jusqu'à 1 inclus. */
const accord = (n: number, singulier: string, pluriel: string) => (n >= 2 ? pluriel : singulier);

/**
 * Où en sont les réponses, en foyers : trois nombres nommés, et le taux.
 *
 * Bureau : le taux en haut à droite et la phrase en pied. Téléphone : la
 * fraction « 34 / 42 foyers » en haut, sans pied — la maquette le veut ainsi.
 * Les deux formes sont masquées par `display: none`, donc jamais lues deux fois.
 */
export function ResponsesCard({ confirmes, declines, enAttente, total }: ResponsesCardProps) {
  const titreId = useId();
  const repondu = confirmes + declines;
  const chiffres = [
    { valeur: confirmes, mot: accord(confirmes, "confirmé", "confirmés") },
    { valeur: declines, mot: accord(declines, "décliné", "déclinés") },
    { valeur: enAttente, mot: "en attente" },
  ];

  return (
    <section
      aria-labelledby={titreId}
      className="rounded-card border border-rule bg-ivory p-[1.125rem] md:px-6 md:py-5"
    >
      <div className="flex items-baseline justify-between gap-4">
        <h2 id={titreId} className="font-display text-[1.375rem] text-ink md:text-2xl">
          Réponses
        </h2>
        <p className="text-[0.8125rem] text-ink-muted tabular-nums md:text-sm">
          <span className="max-md:hidden">{tauxDeReponse(repondu, total)}&#8239;%</span>
          <span className="md:hidden">
            {repondu} / {total} {accord(total, "foyer", "foyers")}
          </span>
        </p>
      </div>

      <dl className="mt-3 grid grid-cols-3 gap-3">
        {chiffres.map((c) => (
          <div key={c.mot} className="flex flex-col-reverse">
            <dt className="mt-1 text-xs text-ink-muted md:text-[0.8125rem]">{c.mot}</dt>
            <dd className="font-display text-[2rem] leading-none text-ink tabular-nums md:text-4xl">{c.valeur}</dd>
          </div>
        ))}
      </dl>

      <p className="mt-4 text-[0.8125rem] text-ink-muted max-md:hidden">
        {repondu} {accord(repondu, "foyer", "foyers")} sur {total} {accord(repondu, "a", "ont")} répondu
      </p>
    </section>
  );
}
