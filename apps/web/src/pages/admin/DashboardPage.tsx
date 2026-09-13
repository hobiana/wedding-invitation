import { useMemo, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import type { DashboardStatsDto, HouseholdAdminDto } from "@invitation-app/shared";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { CopyLinkButton } from "@/components/CopyLinkButton";
import { formatWeddingDate } from "@/lib/datetime";

const TITRE_RELANCE = "tableau-de-bord-a-relancer";

/**
 * Le tableau de bord, en rapports plutôt qu'en nombres nus.
 *
 * Trois tuiles et une liste, et rien d'autre : la grande table de foyers qui
 * vivait ici faisait doublon avec l'écran Foyers, sans en avoir ni la
 * recherche, ni le dépli, ni les actions. Un même objet à deux endroits, dont
 * l'un est en retard, est pire qu'un seul.
 *
 * Ce que l'organisateur vient chercher ici tient en trois phrases — où en sont
 * les réponses, combien de couverts annoncer au traiteur, combien de régimes
 * particuliers — puis en un geste : relancer ceux qui n'ont pas répondu.
 */
export function DashboardPage() {
  const {
    data: stats,
    isPending: statsEnAttente,
    isError: statsEnErreur,
  } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: () => api.get<DashboardStatsDto>("/admin/dashboard"),
  });

  // Même clé que l'écran Foyers : les deux écrans lisent la même liste, et
  // une correction faite là-bas rafraîchit celui-ci sans second appel.
  const {
    data: foyers,
    isPending: foyersEnAttente,
    isError: foyersEnErreur,
  } = useQuery({
    queryKey: ["households"],
    queryFn: () => api.get<HouseholdAdminDto[]>("/admin/households"),
  });

  const enAttente = statsEnAttente || foyersEnAttente;
  const enErreur = statsEnErreur || foyersEnErreur;

  /**
   * Les plus anciens d'abord, sur `createdAt`.
   *
   * Pas `updatedAt` : il bouge à chaque correction faite depuis l'admin, donc
   * un foyer qu'on vient de modifier passerait pour le plus récemment invité
   * et tomberait en fin de liste. Et il n'y a pas de `respondedAt` au contrat.
   *
   * `filter` rend un nouveau tableau : le `sort` qui suit ne retourne donc pas
   * celui que React Query garde en cache.
   */
  const aRelancer = useMemo(
    () =>
      (foyers ?? [])
        .filter((foyer) => foyer.status === "PENDING")
        .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt)),
    [foyers],
  );

  /**
   * Le total des places prévues n'est pas au contrat — `DashboardStatsDto` ne
   * le porte pas. Il se somme ici, sur la liste que la page charge déjà :
   * zéro changement d'API pour le chiffre que le traiteur attend.
   */
  const placesPrevues = useMemo(
    () => (foyers ?? []).reduce((total, foyer) => total + foyer.allocatedSeats, 0),
    [foyers],
  );

  if (enErreur) {
    return (
      <div className="space-y-6 p-6 md:p-8">
        <h1 className="font-display text-2xl text-ink">Tableau de bord</h1>
        <p
          role="alert"
          className="rounded-surface border border-bordeaux-700 bg-bordeaux-50 px-4 py-3 text-sm text-bordeaux-700"
        >
          Le tableau de bord n'a pas pu être chargé. Vérifiez votre connexion, puis rechargez la
          page.
        </p>
      </div>
    );
  }

  const repondu = stats ? stats.confirmedHouseholds + stats.declinedHouseholds : 0;

  return (
    <div className="space-y-8 p-6 md:p-8">
      <h1 className="font-display text-2xl text-ink">Tableau de bord</h1>

      {enAttente && (
        <p role="status" className="sr-only">
          Chargement du tableau de bord…
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        {enAttente || !stats ? (
          Array.from({ length: 3 }, (_, index) => <Skeleton key={index} className="h-28 w-full" />)
        ) : (
          <>
            <Tuile
              etiquette="Réponses"
              rapport={`${repondu} ${accord(repondu, "foyer", "foyers")} sur ${stats.totalHouseholds} ${accord(repondu, "a", "ont")} répondu`}
            >
              {/* La tuile « déclinés » a sauté : c'est le complément, et la
                  jauge plus la légende le disent déjà. */}
              <Jauge valeur={repondu} total={stats.totalHouseholds} />
              <p className="text-sm text-ink-muted">
                {stats.confirmedHouseholds}{" "}
                {accord(stats.confirmedHouseholds, "confirmé", "confirmés")} ·{" "}
                {stats.declinedHouseholds} {accord(stats.declinedHouseholds, "décliné", "déclinés")}{" "}
                · {stats.pendingHouseholds} en attente
              </p>
            </Tuile>

            <Tuile
              etiquette="Places"
              rapport={`${stats.totalConfirmedGuests} ${accord(stats.totalConfirmedGuests, "place confirmée", "places confirmées")} sur ${placesPrevues} ${accord(placesPrevues, "prévue", "prévues")}`}
            >
              <Jauge valeur={stats.totalConfirmedGuests} total={placesPrevues} />
              <p className="text-sm text-ink-muted">Le chiffre à annoncer au traiteur.</p>
            </Tuile>

            <Tuile
              etiquette="Régimes"
              rapport={`${stats.dietaryNotesCount} ${accord(stats.dietaryNotesCount, "régime particulier", "régimes particuliers")}`}
            >
              <p className="text-sm text-ink-muted">
                Le détail de chacun est dans la fiche du foyer, sur l'écran Foyers.
              </p>
            </Tuile>
          </>
        )}
      </div>

      <section aria-labelledby={TITRE_RELANCE} className="space-y-3">
        <div className="space-y-1">
          <h2 id={TITRE_RELANCE} className="font-display text-xl text-ink">
            À relancer
          </h2>
          {!enAttente && aRelancer.length > 0 && (
            <p className="text-sm text-ink-muted">
              {aRelancer.length} {accord(aRelancer.length, "foyer n'a", "foyers n'ont")} pas encore
              répondu, du plus ancien au plus récent.
            </p>
          )}
        </div>

        {enAttente ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} className="h-20 w-full" />
            ))}
          </div>
        ) : aRelancer.length === 0 ? (
          // Deux vides, deux phrases. « Personne à relancer » est une bonne
          // nouvelle ; « aucun foyer saisi » est un travail qui reste entier.
          <EmptyState
            title={foyers?.length ? "Aucun foyer en attente" : "Aucun foyer"}
            description={
              foyers?.length
                ? "Tous les foyers invités ont répondu. Il n'y a plus personne à relancer."
                : "La liste des foyers se saisit depuis l'écran Foyers. Chacun y reçoit son lien d'invitation."
            }
          />
        ) : (
          <ul className="space-y-3">
            {aRelancer.map((foyer) => (
              <li key={foyer.id}>
                <Card className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 space-y-0.5">
                    <p className="font-medium text-ink">{foyer.displayName}</p>
                    {/* `confirmedCount` reste `null` tant que le foyer n'a pas
                        répondu. « 0 » dirait « personne ne vient » — ce n'est
                        pas la même information, et c'est le bug qui est
                        revenu trois fois. */}
                    <p className="text-sm text-ink-muted">
                      Places : {foyer.confirmedCount ?? "—"} / {foyer.allocatedSeats}
                    </p>
                    <p className="text-xs text-ink-label">
                      Ajouté le {formatWeddingDate(foyer.createdAt, { weekday: false })}
                    </p>
                  </div>
                  <CopyLinkButton linkId={foyer.id} householdName={foyer.displayName} />
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

/**
 * La part d'un tout, en pourcentage entier, bornée à 100.
 *
 * Les deux nombres ne viennent pas toujours de la même source — les places
 * confirmées sont comptées par l'API, les places prévues sommées ici — donc
 * ils peuvent se contredire le temps d'un rafraîchissement. Et sur un dépôt
 * fraîchement installé, le tout vaut zéro : sans cette borne, la jauge reçoit
 * une largeur `NaN%` que le navigateur ignore en silence.
 */
export function partEnPourcent(part: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(100, Math.round((part / total) * 100));
}

/** Le français met au singulier jusqu'à 1 inclus, pas seulement à 1. */
function accord(nombre: number, singulier: string, pluriel: string): string {
  return nombre < 2 ? singulier : pluriel;
}

function Tuile({
  etiquette,
  rapport,
  children,
}: {
  etiquette: string;
  rapport: string;
  children?: ReactNode;
}) {
  return (
    <Card className="flex flex-col gap-2 p-5">
      <p className="text-xs font-medium tracking-wide text-ink-label uppercase">{etiquette}</p>
      <p className="font-display text-xl leading-snug text-ink">{rapport}</p>
      {children}
    </Card>
  );
}

/**
 * Un remplissage statique — pas une animation, l'admin n'anime rien.
 *
 * **Un seul segment, et c'est une correction mesurée.** La première version
 * découpait la barre des réponses en deux, `status-yes` pour les confirmés et
 * `status-no` pour les déclinés. Les deux jetons ne se distinguent l'un de
 * l'autre que de **1,26:1** : sur une barre de 8 px, c'est un seul aplat coupé
 * en deux, et rien ne dit lequel est lequel. Chacun tient pourtant très bien
 * contre le fond (6,31:1 et 5,02:1) — c'est leur écart mutuel qui manque, et
 * aucun de ces deux nombres ne le révélait.
 *
 * La barre dit donc une seule chose, celle de la phrase au-dessus, en
 * `bordeaux-700` à 10,25:1 contre le fond `cream`. Le détail confirmés /
 * déclinés / en attente est juste en dessous, **en chiffres et en mots** : il
 * se lit, au lieu de se deviner à la teinte.
 *
 * `aria-hidden` : la phrase porte déjà l'information entière. Un
 * `role="progressbar"` la ferait relire une seconde fois pour rien.
 */
function Jauge({ valeur, total }: { valeur: number; total: number }) {
  return (
    <div aria-hidden="true" className="h-2 w-full overflow-hidden rounded-control bg-cream">
      <div
        className="h-full bg-bordeaux-700"
        style={{ width: `${partEnPourcent(valeur, total)}%` }}
      />
    </div>
  );
}
