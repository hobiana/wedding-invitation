import { useState, type FormEvent } from "react";
import type { CreateHouseholdDto, HouseholdAdminDto, RsvpStatus } from "@invitation-app/shared";
import { Button } from "@/components/ui/button";

/**
 * Creating only ever sends the two fields a new household needs. Editing may
 * additionally correct the RSVP itself — the spec requires admins to be able
 * to do that at any time, including past the guest-facing deadline.
 *
 * Shaped so one value satisfies both CreateHouseholdDto and UpdateHouseholdDto.
 */
export interface HouseholdFormValues extends CreateHouseholdDto {
  status?: RsvpStatus;
  confirmedCount?: number;
}

interface HouseholdFormDialogProps {
  initial?: HouseholdAdminDto;
  onSubmit: (dto: HouseholdFormValues) => void;
  onClose: () => void;
}

const STATUS_LABELS: Record<RsvpStatus, string> = {
  PENDING: "En attente",
  CONFIRMED: "Confirmé",
  DECLINED: "Décliné",
};

export function HouseholdFormDialog({ initial, onSubmit, onClose }: HouseholdFormDialogProps) {
  const isEdit = initial !== undefined;
  const [displayName, setDisplayName] = useState(initial?.displayName ?? "");
  const [allocatedSeats, setAllocatedSeats] = useState(initial?.allocatedSeats ?? 1);
  const [status, setStatus] = useState<RsvpStatus>(initial?.status ?? "PENDING");
  const [confirmedCount, setConfirmedCount] = useState(initial?.confirmedCount ?? 0);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!isEdit) {
      onSubmit({ displayName, allocatedSeats });
      return;
    }
    onSubmit({
      displayName,
      allocatedSeats,
      status,
      // A declined household seats nobody; the API normalises this too.
      // A still-pending household hasn't confirmed anything — omit the field
      // entirely rather than overwrite its null (no answer yet) with 0, which
      // would make the seating capacity maths treat it as holding zero seats.
      ...(status !== "PENDING" && { confirmedCount: status === "DECLINED" ? 0 : confirmedCount }),
    });
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
      <form onSubmit={handleSubmit} className="bg-white rounded-lg p-6 w-full max-w-sm space-y-4">
        <h2 className="text-lg font-semibold">{isEdit ? "Modifier le foyer" : "Nouveau foyer"}</h2>
        <div className="space-y-1">
          <label htmlFor="displayName" className="text-sm font-medium">Nom du foyer</label>
          <input
            id="displayName"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full border rounded-md px-3 py-2"
            required
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="allocatedSeats" className="text-sm font-medium">Nombre de places</label>
          <input
            id="allocatedSeats"
            type="number"
            min={1}
            value={allocatedSeats}
            onChange={(e) => setAllocatedSeats(Number(e.target.value))}
            className="w-full border rounded-md px-3 py-2"
          />
        </div>
        {isEdit && (
          <>
            <div className="space-y-1">
              <label htmlFor="status" className="text-sm font-medium">Statut</label>
              <select
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value as RsvpStatus)}
                className="w-full border rounded-md px-3 py-2"
              >
                {(Object.keys(STATUS_LABELS) as RsvpStatus[]).map((value) => (
                  <option key={value} value={value}>
                    {STATUS_LABELS[value]}
                  </option>
                ))}
              </select>
            </div>
            {status !== "DECLINED" && (
              <div className="space-y-1">
                <label htmlFor="confirmedCount" className="text-sm font-medium">Personnes confirmées</label>
                <input
                  id="confirmedCount"
                  type="number"
                  min={0}
                  max={allocatedSeats}
                  value={confirmedCount}
                  onChange={(e) => setConfirmedCount(Number(e.target.value))}
                  className="w-full border rounded-md px-3 py-2"
                />
              </div>
            )}
          </>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>Annuler</Button>
          <Button type="submit">Enregistrer</Button>
        </div>
      </form>
    </div>
  );
}
