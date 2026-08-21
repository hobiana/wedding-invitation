import type { SeatingPlanDto } from "@invitation-app/shared";

export function SeatingPlanSection({ seatingPlan }: { seatingPlan: SeatingPlanDto | null }) {
  if (!seatingPlan) return null;

  return (
    <div className="border-t pt-4 space-y-2">
      <h2 className="font-semibold">Votre table : {seatingPlan.tableName}</h2>
      {seatingPlan.neighbors.length > 0 && (
        <ul className="text-sm text-neutral-600 list-disc list-inside">
          {seatingPlan.neighbors.map((n) => (
            <li key={n.displayName}>{n.displayName} ({n.confirmedCount})</li>
          ))}
        </ul>
      )}
    </div>
  );
}
