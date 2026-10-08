import { useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import type { AdminSettingsDto, DashboardStatsDto, TableDto } from "@invitation-app/shared";
import { api, HOUSEHOLDS_MAX_LIMIT, listHouseholds } from "@/lib/api";
import { HouseholdsTruncationNotice } from "@/components/HouseholdsTruncationNotice";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { CountdownHero } from "@/components/dashboard/CountdownHero";
import { GuestsOverview } from "@/components/dashboard/GuestsOverview";
import { ResponsesCard } from "@/components/dashboard/ResponsesCard";
import { SeatingCard } from "@/components/dashboard/SeatingCard";
import { RelanceList } from "@/components/dashboard/RelanceList";
import { GuestMessages } from "@/components/dashboard/GuestMessages";

/**
 * Le tableau de bord, assemblé à l'image des maquettes du commanditaire
 * (`images/dashboard/`) : le compte à rebours, le bilan des places et du
 * seuil, les réponses et le plan de table côte à côte, puis les foyers à
 * relancer et les mots des invités.
 *
 * Quatre requêtes, et **chaque carte ne dépend que des siennes** : un plan de
 * table qui ne répond pas n'éteint pas les réponses, des paramètres absents
 * n'effacent que le bandeau et le seuil. Chaque carte a son squelette et son
 * message d'échec en français — jamais le texte de l'API.
 *
 * Aucun calcul ici : tout passe par `lib/dashboard.ts` et
 * `lib/plan-de-table.ts`, à travers les composants.
 */
export function DashboardPage() {
  // Figée au montage : le compte à rebours ne change pas de jour sous les yeux
  // de l'organisateur entre deux rendus.
  const [maintenant] = useState(() => new Date());

  const settings = useQuery({
    queryKey: ["settings"],
    queryFn: () => api.get<AdminSettingsDto>("/admin/settings"),
  });
  const stats = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: () => api.get<DashboardStatsDto>("/admin/dashboard"),
  });
  // Toute la liste, au plafond de l'API : les places se somment sur tous les
  // foyers, pas sur une page. La clé commence par « households » : une
  // correction faite dans l'écran Foyers l'invalide aussi.
  const parametresFoyers = { limit: HOUSEHOLDS_MAX_LIMIT };
  const foyers = useQuery({
    queryKey: ["households", parametresFoyers],
    queryFn: () => listHouseholds(parametresFoyers),
  });
  const tables = useQuery({
    queryKey: ["tables"],
    queryFn: () => api.get<TableDto[]>("/admin/tables"),
  });

  const chargement = settings.isPending || stats.isPending || foyers.isPending || tables.isPending;
  const listeFoyers = foyers.data?.items;

  return (
    <div className="space-y-6 px-4 pb-6 md:space-y-7 md:p-8">
      <PageHeader
        title="Tableau de bord"
        sticky
        className="-mx-4 px-4 md:mx-0 md:border-b-0 md:px-0 md:pb-0"
      />

      {chargement && (
        <p role="status" className="sr-only">
          Chargement du tableau de bord…
        </p>
      )}

      {foyers.data && (
        <HouseholdsTruncationNotice
          recus={foyers.data.items.length}
          total={foyers.data.total}
          consequence="les chiffres affichés sont incomplets"
        />
      )}

      {settings.isError ? (
        <Echec>Les dates du mariage n'ont pas pu être chargées.</Echec>
      ) : settings.data ? (
        <CountdownHero
          weddingDate={settings.data.weddingDate}
          rsvpDeadline={settings.data.rsvpDeadline}
          foyersSansReponse={stats.data?.pendingHouseholds ?? null}
          maintenant={maintenant}
        />
      ) : (
        <Skeleton className="h-[18rem] w-full rounded-card md:h-64" />
      )}

      {/* Le seuil vient des paramètres : on les attend, sauf s'ils ont échoué
          — le bilan s'affiche alors sans seuil, le bandeau dit l'échec. */}
      {stats.isError || foyers.isError ? (
        <Echec>Le bilan des invités n'a pas pu être chargé.</Echec>
      ) : stats.data && listeFoyers && !settings.isPending ? (
        <GuestsOverview
          foyers={listeFoyers}
          seuil={settings.data?.maxGuests ?? null}
          foyersInvites={stats.data.totalHouseholds}
          foyersEnAttente={stats.data.pendingHouseholds}
          regimesParticuliers={stats.data.dietaryNotesCount}
        />
      ) : (
        <Skeleton className="h-[29rem] w-full rounded-card md:h-[23.5rem]" />
      )}

      <div className="grid gap-4 md:grid-cols-2 md:gap-5">
        {stats.isError ? (
          <Echec>Les réponses n'ont pas pu être chargées.</Echec>
        ) : stats.data ? (
          <ResponsesCard
            confirmes={stats.data.confirmedHouseholds}
            declines={stats.data.declinedHouseholds}
            enAttente={stats.data.pendingHouseholds}
            total={stats.data.totalHouseholds}
          />
        ) : (
          <Skeleton className="h-40 w-full rounded-card md:h-44" />
        )}

        {tables.isError || foyers.isError ? (
          <Echec>Le plan de table n'a pas pu être chargé.</Echec>
        ) : tables.data && listeFoyers ? (
          <SeatingCard tables={tables.data} foyers={listeFoyers} />
        ) : (
          <Skeleton className="h-40 w-full rounded-card md:h-44" />
        )}
      </div>

      <div className="grid gap-10 md:grid-cols-2 md:gap-10">
        {foyers.isError ? (
          <Echec>La liste des foyers n'a pas pu être chargée.</Echec>
        ) : listeFoyers ? (
          <RelanceList foyers={listeFoyers} />
        ) : (
          <ListeEnAttente />
        )}

        {foyers.isError ? (
          <Echec>Les mots des invités n'ont pas pu être chargés.</Echec>
        ) : listeFoyers ? (
          <GuestMessages foyers={listeFoyers} />
        ) : (
          <ListeEnAttente />
        )}
      </div>
    </div>
  );
}

/** L'échec d'une carte : ce qui manque, en français, et quoi faire. */
function Echec({ children }: { children: ReactNode }) {
  return (
    <p
      role="alert"
      className="rounded-card border border-bordeaux-700 bg-bordeaux-50 px-4 py-3 text-sm text-bordeaux-700"
    >
      <span>{children}</span> <span>Vérifiez votre connexion, puis rechargez la page.</span>
    </p>
  );
}

function ListeEnAttente() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-8 w-40" />
      {Array.from({ length: 4 }, (_, index) => (
        <Skeleton key={index} className="h-16 w-full" />
      ))}
    </div>
  );
}
