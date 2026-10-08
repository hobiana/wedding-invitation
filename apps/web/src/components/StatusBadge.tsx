import type { RsvpStatus } from "@invitation-app/shared";
import { Badge, type BadgeTone } from "@/components/ui/badge";

const TONS: Record<RsvpStatus, BadgeTone> = {
  CONFIRMED: "yes",
  DECLINED: "no",
  PENDING: "pending",
};

const LIBELLES: Record<RsvpStatus, string> = {
  CONFIRMED: "Confirmé",
  DECLINED: "Décliné",
  PENDING: "En attente",
};

/** `className` : la page Foyers l'arrondit en pastille, comme ses maquettes. */
export function StatusBadge({ status, className }: { status: RsvpStatus; className?: string }) {
  return (
    <Badge tone={TONS[status]} className={className}>
      {LIBELLES[status]}
    </Badge>
  );
}
