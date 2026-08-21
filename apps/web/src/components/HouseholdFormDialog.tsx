import { useState, type FormEvent } from "react";
import type { CreateHouseholdDto, HouseholdAdminDto } from "@invitation-app/shared";
import { Button } from "@/components/ui/button";

interface HouseholdFormDialogProps {
  initial?: HouseholdAdminDto;
  onSubmit: (dto: CreateHouseholdDto) => void;
  onClose: () => void;
}

export function HouseholdFormDialog({ initial, onSubmit, onClose }: HouseholdFormDialogProps) {
  const [displayName, setDisplayName] = useState(initial?.displayName ?? "");
  const [allocatedSeats, setAllocatedSeats] = useState(initial?.allocatedSeats ?? 1);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSubmit({ displayName, allocatedSeats });
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
      <form onSubmit={handleSubmit} className="bg-white rounded-lg p-6 w-full max-w-sm space-y-4">
        <h2 className="text-lg font-semibold">{initial ? "Modifier le foyer" : "Nouveau foyer"}</h2>
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
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>Annuler</Button>
          <Button type="submit">Enregistrer</Button>
        </div>
      </form>
    </div>
  );
}
