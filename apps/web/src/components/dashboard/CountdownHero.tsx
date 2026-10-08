import {
  compteARebours,
  friseDuBandeau,
  joursAvantLimite,
  limitePassee,
  texteLimite,
} from "@/lib/dashboard";
import { formatJourMoisCourt, formatRsvpDeadline, formatWeddingDate } from "@/lib/datetime";
import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

export interface CountdownHeroProps {
  weddingDate: string;
  rsvpDeadline: string;
  /** Foyers en attente, ou `null` tant que les chiffres ne sont pas arrivés. */
  foyersSansReponse: number | null;
  /** Injecté : la page passe `new Date()`, les tests une date fixe. */
  maintenant: Date;
}

/** « 8 foyers n'ont pas encore répondu », accordé ; `null` si le nombre manque. */
function silencieux(n: number | null): string | null {
  if (n === null) return null;
  if (n === 0) return "tous les foyers ont répondu";
  return n >= 2 ? `${n} foyers n'ont pas encore répondu` : `${n} foyer n'a pas encore répondu`;
}

/**
 * Le bandeau bordeaux en tête du tableau de bord : combien de jours avant le
 * mariage, combien avant la date limite, et la frise qui les situe.
 *
 * Tout le texte est en `on-bordeaux` (11,08:1) ou `on-bordeaux-muted`
 * (9,01:1) : le doré n'y porte jamais une lettre.
 *
 * La frise part d'« Aujourd'hui » — pas de date d'envoi des invitations, elle
 * n'existe nulle part (décision du commanditaire). Le trait et les repères sont
 * un dessin `aria-hidden` ; ce qu'ils disent est dans la liste en dessous, en
 * mots, et c'est elle qu'on lit.
 */
export function CountdownHero({ weddingDate, rsvpDeadline, foyersSansReponse, maintenant }: CountdownHeroProps) {
  const rebours = compteARebours(weddingDate, maintenant);
  const passee = limitePassee(rsvpDeadline, maintenant);
  const jours = joursAvantLimite(rsvpDeadline, maintenant);
  const frise = friseDuBandeau(rsvpDeadline, weddingDate, maintenant);
  const clause = silencieux(foyersSansReponse);
  const dateDuMariage = formatWeddingDate(weddingDate);
  // Le signe moins typographique, comme sur la maquette : le trait d'union de
  // Cormorant est trop court pour un chiffre de 80 px.
  const libelle = rebours.libelle.replace("-", "−");

  // Le jour même, la date limite **est** aujourd'hui : un seul repère, sinon
  // les deux étiquettes se superposent et la seconde sort du bandeau (vu au
  // navigateur). Une fois passée, elle n'a plus de place sur la frise.
  const afficherLimite = !frise.limitePassee && jours > 0;
  // Près d'un bout, l'étiquette de la date limite passe au-dessus du trait,
  // dans une place réservée (`pt-10`) : sinon elle chevauche « Aujourd'hui »
  // ou « Mariage ». Et elle s'aligne sur son repère plutôt que de se centrer,
  // pour ne pas sortir du bandeau.
  const limiteSerree = afficherLimite && (frise.limite < 22 || frise.limite > 78);
  const alignementLimite =
    frise.limite <= 12 ? "text-left" : frise.limite >= 88 ? "-translate-x-full text-right" : "-translate-x-1/2 text-center";

  return (
    <section
      aria-label="Compte à rebours"
      className="rounded-card bg-bordeaux-700 px-5 pt-5 pb-4 text-on-bordeaux md:px-9 md:pt-8 md:pb-7"
    >
      <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between md:gap-10">
        <div className="min-w-0">
          <p className="font-display text-[4rem] leading-none tracking-[-0.01em] md:text-[5rem] md:tracking-[-0.02em]">
            {libelle}
          </p>
          <p className="mt-2 text-sm md:text-[0.9375rem]">
            {rebours.jours > 0 ? `avant le mariage · ${dateDuMariage}` : dateDuMariage}
          </p>
        </div>

        <div className="border-t border-on-bordeaux/35 pt-3.5 md:w-[21.25rem] md:shrink-0 md:pt-5">
          {passee || jours === 0 ? (
            <>
              <p className="font-display text-2xl leading-tight">{texteLimite(rsvpDeadline, maintenant)}</p>
              {clause && (
                <p className="mt-1 text-sm md:text-[0.9375rem]">
                  {clause.charAt(0).toUpperCase() + clause.slice(1)}.
                </p>
              )}
            </>
          ) : (
            <div className="flex items-baseline gap-3 md:block">
              <p className="shrink-0 font-display text-4xl leading-none md:text-[2.75rem]">
                {jours} {jours >= 2 ? "jours" : "jour"}
              </p>
              <p className="text-[0.8125rem] md:mt-1.5 md:text-[0.9375rem]">
                {`avant la date limite du ${formatRsvpDeadline(rsvpDeadline)}${clause ? `, ${clause}` : ""}`}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className={cn("mt-6 md:mt-8", limiteSerree && "pt-10")}>
        <div aria-hidden="true" className="relative h-3.5">
          <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-on-bordeaux/25" />
          <span className="absolute top-0 left-0 size-3.5 rounded-full bg-on-bordeaux" />
          {afficherLimite && (
            <span
              className="absolute top-0 h-3.5 w-0.5 -translate-x-1/2 bg-on-bordeaux"
              style={{ left: `${frise.limite}%` }}
            />
          )}
          <span className="absolute top-0 right-0 h-3.5 w-0.5 bg-on-bordeaux" />
        </div>

        <ol aria-label="Calendrier" className="relative mt-2 h-10 text-xs">
          <Repere titre="Aujourd'hui" date={formatJourMoisCourt(maintenant.toISOString())} className="left-0" />
          {afficherLimite && (
            <Repere
              titre="Date limite"
              date={formatJourMoisCourt(rsvpDeadline)}
              className={cn(alignementLimite, limiteSerree && "bottom-[calc(100%+1.75rem)]")}
              style={{ left: `${frise.limite}%` }}
            />
          )}
          <Repere titre="Mariage" date={formatJourMoisCourt(weddingDate)} className="right-0 text-right" />
        </ol>
      </div>
    </section>
  );
}

function Repere({
  titre,
  date,
  className,
  style,
}: {
  titre: string;
  date: string;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <li className={cn("absolute whitespace-nowrap", className)} style={style}>
      <span className="block font-medium">{titre}</span>
      <span className="block text-on-bordeaux-muted">{date}</span>
    </li>
  );
}
