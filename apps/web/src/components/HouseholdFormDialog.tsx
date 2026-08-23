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

const COUNT_ERROR_ID = "confirmedCount-error";

export function HouseholdFormDialog({ initial, onSubmit, onClose }: HouseholdFormDialogProps) {
  const isEdit = initial !== undefined;
  const [displayName, setDisplayName] = useState(initial?.displayName ?? "");
  const [allocatedSeats, setAllocatedSeats] = useState(initial?.allocatedSeats ?? 1);
  const [status, setStatus] = useState<RsvpStatus>(initial?.status ?? "PENDING");
  // null, not 0: a household that never answered has no count, and the input
  // must show an empty field the admin has to fill in deliberately. Defaulting
  // to 0 is what shipped a CONFIRMED household seating nobody.
  const [confirmedCount, setConfirmedCount] = useState<number | null>(initial?.confirmedCount ?? null);
  const [countError, setCountError] = useState<string | null>(null);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!isEdit) {
      onSubmit({ displayName, allocatedSeats });
      return;
    }
    // CONFIRMED requires a count of at least 1 — the API now rejects anything
    // else, and a confirmed household holding zero seats silently disappears
    // from the table plan. Say it in French here rather than let the server's
    // English message surface.
    if (status === "CONFIRMED") {
      if (confirmedCount === null || confirmedCount < 1) {
        setCountError("Indiquez le nombre de personnes : un foyer confirmé compte au moins une personne.");
        return;
      }
      // The upper bound (invariant: confirmedCount <= allocatedSeats) is held
      // by max={allocatedSeats} below — native constraint validation blocks the
      // submit before this handler runs — and by the API. No JS check here: it
      // would be unreachable code.
      setCountError(null);
      onSubmit({ displayName, allocatedSeats, status, confirmedCount });
      return;
    }
    setCountError(null);
    onSubmit({
      displayName,
      allocatedSeats,
      status,
      // A declined household seats nobody; the API normalises this too.
      // A still-pending household hasn't confirmed anything — omit the field
      // entirely rather than overwrite its null (no answer yet) with 0, which
      // would make the seating capacity maths treat it as holding zero seats.
      ...(status === "DECLINED" && { confirmedCount: 0 }),
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
                onChange={(e) => {
                  setStatus(e.target.value as RsvpStatus);
                  setCountError(null);
                }}
                className="w-full border rounded-md px-3 py-2"
              >
                {(Object.keys(STATUS_LABELS) as RsvpStatus[]).map((value) => (
                  <option key={value} value={value}>
                    {STATUS_LABELS[value]}
                  </option>
                ))}
              </select>
            </div>
            {/*
              Only CONFIRMED carries a count. DECLINED is always 0 and PENDING
              has none yet, so showing an editable field for those two offered a
              value the form then threw away on submit.
            */}
            {status === "CONFIRMED" && (
              <div className="space-y-1">
                <label htmlFor="confirmedCount" className="text-sm font-medium">Personnes confirmées</label>
                <input
                  id="confirmedCount"
                  type="number"
                  min={1}
                  max={allocatedSeats}
                  value={confirmedCount ?? ""}
                  onChange={(e) => {
                    const raw = e.target.value;
                    setConfirmedCount(raw === "" ? null : Number(raw));
                    setCountError(null);
                  }}
                  aria-invalid={countError !== null}
                  aria-describedby={countError ? COUNT_ERROR_ID : undefined}
                  className="w-full border rounded-md px-3 py-2"
                />
                {countError && (
                  <p id={COUNT_ERROR_ID} role="alert" className="text-sm text-red-700">
                    {countError}
                  </p>
                )}
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
