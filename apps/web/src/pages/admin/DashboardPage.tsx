import { useQuery } from "@tanstack/react-query";
import type { DashboardStatsDto, HouseholdAdminDto } from "@invitation-app/shared";
import { api } from "@/lib/api";
import { StatusBadge } from "@/components/StatusBadge";

export function DashboardPage() {
  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: () => api.get<DashboardStatsDto>("/admin/dashboard"),
  });
  const { data: households, isLoading: householdsLoading } = useQuery({
    queryKey: ["households"],
    queryFn: () => api.get<HouseholdAdminDto[]>("/admin/households"),
  });

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-semibold">Tableau de bord</h1>
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatCard label="Foyers confirmés" value={stats.confirmedHouseholds} />
          <StatCard label="Foyers déclinés" value={stats.declinedHouseholds} />
          <StatCard label="En attente" value={stats.pendingHouseholds} />
          <StatCard label="Invités confirmés" value={stats.totalConfirmedGuests} />
          {/* Computed by the API all along but never rendered — the traiteur
              needs this number, and the notes behind it (see Foyers). */}
          <StatCard label="Régimes particuliers" value={stats.dietaryNotesCount} />
        </div>
      )}
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="text-left border-b">
            <th className="py-2">Foyer</th>
            <th>Places</th>
            <th>Statut</th>
          </tr>
        </thead>
        <tbody>
          {householdsLoading && (
            <tr>
              <td className="py-4 text-neutral-500" colSpan={3}>
                Chargement…
              </td>
            </tr>
          )}
          {!householdsLoading && households?.length === 0 && (
            <tr>
              <td className="py-4 text-neutral-500" colSpan={3}>
                Aucun foyer pour le moment.
              </td>
            </tr>
          )}
          {households?.map((h) => (
            <tr key={h.id} className="border-b">
              <td className="py-2">{h.displayName}</td>
              <td>
                {h.confirmedCount ?? "—"} / {h.allocatedSeats}
              </td>
              <td>
                <StatusBadge status={h.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="border rounded-lg p-4">
      <p className="text-sm text-neutral-500">{label}</p>
      <p className="text-2xl font-semibold">{value}</p>
    </div>
  );
}
