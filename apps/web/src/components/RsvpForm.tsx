import { useState, type FormEvent } from "react";
import type { SubmitRsvpDto } from "@invitation-app/shared";
import { Button } from "@/components/ui/button";

interface RsvpFormProps {
  allocatedSeats: number;
  defaultConfirmedCount?: number;
  defaultDietaryNotes?: string;
  onSubmit: (dto: SubmitRsvpDto) => void;
}

export function RsvpForm({ allocatedSeats, defaultConfirmedCount, defaultDietaryNotes, onSubmit }: RsvpFormProps) {
  const [confirmedCount, setConfirmedCount] = useState(defaultConfirmedCount ?? allocatedSeats);
  const [dietaryNotes, setDietaryNotes] = useState(defaultDietaryNotes ?? "");

  function handleConfirm(e: FormEvent) {
    e.preventDefault();
    onSubmit({ status: "CONFIRMED", confirmedCount, dietaryNotes });
  }

  function handleDecline() {
    onSubmit({ status: "DECLINED" });
  }

  return (
    <form onSubmit={handleConfirm} className="space-y-4">
      <div className="space-y-1">
        <label htmlFor="confirmedCount" className="text-sm font-medium">
          Nombre de personnes présentes
        </label>
        <input
          id="confirmedCount"
          type="number"
          min={1}
          max={allocatedSeats}
          value={confirmedCount}
          onChange={(e) => setConfirmedCount(Number(e.target.value))}
          className="w-full border rounded-md px-3 py-2"
        />
      </div>
      <div className="space-y-1">
        <label htmlFor="dietaryNotes" className="text-sm font-medium">
          Régime alimentaire / allergies
        </label>
        <textarea
          id="dietaryNotes"
          value={dietaryNotes}
          onChange={(e) => setDietaryNotes(e.target.value)}
          className="w-full border rounded-md px-3 py-2"
        />
      </div>
      <div className="flex gap-2">
        <Button type="submit">Je viens</Button>
        <Button type="button" variant="outline" onClick={handleDecline}>
          Je ne viendrai pas
        </Button>
      </div>
    </form>
  );
}
