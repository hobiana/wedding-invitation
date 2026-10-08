import { useId } from "react";
import { Link } from "react-router-dom";
import type { HouseholdAdminDto } from "@invitation-app/shared";
import { echelleBarre, foyersPartiels, messageDuSeuil, placesParStatut, pourcentage } from "@/lib/dashboard";
import { motPlaces } from "@/lib/foyers";
import { cn } from "@/lib/utils";

type Compte = Pick<HouseholdAdminDto, "status" | "allocatedSeats" | "confirmedCount">;

export interface GuestsOverviewProps {
  foyers: readonly Compte[];
  /** Le seuil des paramètres ; `null` = aucun seuil, donc ni repère ni message. */
  seuil: number | null;
  /** Les comptes de foyers viennent de `/admin/dashboard`, les places de la liste. */
  foyersInvites: number;
  foyersEnAttente: number;
  regimesParticuliers: number;
}

function enAttente(n: number): string {
  if (n === 0) return "Aucun foyer n'attend de réponse.";
  return n >= 2
    ? `Les places des ${n} foyers qui n'ont pas encore répondu.`
    : "Les places du foyer qui n'a pas encore répondu.";
}

function declinees(refus: number, foyersDeclines: number, partiels: number, foyersPartiels: number): string {
  const morceaux: string[] = [];
  if (refus > 0) {
    morceaux.push(
      `${refus} par ${foyersDeclines >= 2 ? `les ${foyersDeclines} foyers qui ne viennent pas` : "le foyer qui ne vient pas"}`,
    );
  }
  if (partiels > 0) {
    morceaux.push(
      `${partiels} par ${foyersPartiels >= 2 ? "des foyers qui viennent" : "un foyer qui vient"} en partie`,
    );
  }
  return morceaux.length ? `${morceaux.join(", ")}.` : "Aucune place perdue pour l'instant.";
}

function prevues(n: number): string {
  if (n === 0) return "Aucun foyer invité pour l'instant.";
  return n >= 2
    ? `Le total des places accordées aux ${n} foyers invités.`
    : "Le total des places accordées au foyer invité.";
}

const SEGMENTS = [
  { cle: "confirmees", couleur: "bg-bordeaux-700" },
  { cle: "enAttente", couleur: "bg-gold" },
  { cle: "declinees", couleur: "bg-sand" },
] as const;

/**
 * Le bilan des places : qui vient, qui n'a pas répondu, ce qui est perdu, et
 * où l'on en est du seuil que le couple s'est fixé.
 *
 * **La barre empilée ne porte pas le sens seule.** Ses trois teintes se
 * distinguent mal entre elles, et le sable tient à peine sur l'ivoire : elle
 * est `aria-hidden`, et c'est la légende — chaque segment nommé, chiffré et
 * expliqué — qui se lit. Le seuil est un trait **et** un texte, et son
 * dépassement une phrase en brique précédée d'une puce : ni la couleur ni la
 * position ne le disent seules.
 */
export function GuestsOverview({
  foyers,
  seuil,
  foyersInvites,
  foyersEnAttente,
  regimesParticuliers,
}: GuestsOverviewProps) {
  const titreId = useId();
  const p = placesParStatut(foyers);
  const partiels = foyersPartiels(foyers).length;
  const { echelle, repere } = echelleBarre(p.prevues, seuil);
  const message = messageDuSeuil(p.prevues, seuil);
  const segments = SEGMENTS.filter((s) => p[s.cle] > 0);

  const colonnes = [
    {
      etiquette: "Confirmées",
      places: p.confirmees,
      pastille: "bg-bordeaux-700",
      texte: (
        <>
          <span className="max-md:hidden">Les invités qui ont dit oui. </span>Le chiffre à donner au traiteur.
        </>
      ),
    },
    { etiquette: "En attente", places: p.enAttente, pastille: "bg-gold", texte: enAttente(foyersEnAttente) },
    {
      etiquette: "Déclinées",
      places: p.declinees,
      pastille: "border border-rule bg-sand",
      texte: declinees(p.declineesParRefus, p.foyersDeclines, p.declineesParPartiels, partiels),
    },
    { etiquette: "Prévues", places: p.prevues, pastille: null, texte: prevues(foyersInvites) },
  ];

  const aligneSeuil =
    repere === null ? "" : repere >= 90 ? "-translate-x-full" : repere <= 10 ? "" : "-translate-x-1/2";

  return (
    <section
      aria-labelledby={titreId}
      className="rounded-card border border-rule bg-ivory px-[1.125rem] py-5 md:px-8 md:py-7"
    >
      <div className="flex flex-col gap-1 md:flex-row md:items-end md:justify-between md:gap-6">
        <h2 id={titreId} className="flex items-baseline gap-3 text-ink">
          <span className="font-display text-[3.5rem] leading-[0.9] md:text-[4.5rem]">{p.confirmees}</span>{" "}
          <span className="font-display text-[1.375rem] md:text-[1.625rem]">
            {p.confirmees >= 2 ? "invités confirmés" : "invité confirmé"}
          </span>
        </h2>
        {message && (
          <p
            className={cn(
              "flex items-center gap-2 text-[0.8125rem] md:pb-1 md:text-sm",
              message.ton === "depasse" ? "text-danger" : "text-ink-muted",
            )}
          >
            {message.ton === "depasse" && (
              <span data-puce aria-hidden="true" className="size-2 shrink-0 rounded-full bg-danger" />
            )}
            <span>{message.texte}</span>
          </p>
        )}
      </div>

      <div data-barre aria-hidden="true" className={cn("relative mt-4 md:mt-5", repere !== null && "pb-7")}>
        <div className="flex h-3 md:h-3.5">
          {segments.map((s, i) => (
            <span
              key={s.cle}
              data-segment
              className={cn(
                "h-full",
                s.couleur,
                i === 0 && "rounded-l-full",
                i === segments.length - 1 ? "rounded-r-full" : "border-r-2 border-ivory",
              )}
              style={{ width: `${pourcentage(p[s.cle], echelle)}%` }}
            />
          ))}
        </div>
        {repere !== null && (
          <>
            <span
              data-seuil
              className="absolute -top-1 h-5 w-0.5 -translate-x-1/2 bg-ink md:h-[1.375rem]"
              style={{ left: `${repere}%` }}
            />
            <span
              className={cn("absolute top-6 text-xs font-medium whitespace-nowrap text-ink md:top-7", aligneSeuil)}
              style={{ left: `${repere}%` }}
            >
              Seuil max · {seuil}
            </span>
          </>
        )}
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-5 md:mt-6 md:grid-cols-4 md:gap-x-8">
        {colonnes.map((c) => (
          <div key={c.etiquette} className={cn(c.pastille === null && "border-l border-rule pl-5")}>
            <dt className="flex items-center gap-2 text-[0.8125rem] font-medium text-ink">
              {c.pastille && <span aria-hidden="true" className={cn("size-2.5 shrink-0 rounded-[2px]", c.pastille)} />}
              {c.etiquette}
            </dt>
            <dd className={cn("mt-1", c.pastille && "pl-[1.125rem]")}>
              <span className="text-lg font-medium text-ink tabular-nums md:text-xl">{c.places}</span>{" "}
              <span className="text-[0.8125rem] text-ink-muted md:text-sm">{motPlaces(c.places)}</span>
            </dd>
            <dd
              className={cn(
                "mt-1 text-xs leading-normal text-ink-muted md:text-[0.8125rem]",
                c.pastille && "pl-[1.125rem]",
              )}
            >
              {c.texte}
            </dd>
          </div>
        ))}
      </dl>

      {(partiels > 0 || regimesParticuliers > 0) && (
        <div className="mt-6 flex flex-col gap-1 border-t border-rule pt-4 text-[0.8125rem] text-ink-muted md:flex-row md:gap-5">
          {partiels > 0 && (
            <p>
              {partiels >= 2
                ? `${partiels} foyers viennent à moins que prévu`
                : `${partiels} foyer vient à moins que prévu`}
            </p>
          )}
          {regimesParticuliers > 0 && (
            <p>
              {regimesParticuliers}{" "}
              {regimesParticuliers >= 2 ? "régimes particuliers" : "régime particulier"}, détail dans{" "}
              <Link to="/admin/households" className="text-bordeaux-700 underline underline-offset-2">
                Foyers
              </Link>
            </p>
          )}
        </div>
      )}
    </section>
  );
}
