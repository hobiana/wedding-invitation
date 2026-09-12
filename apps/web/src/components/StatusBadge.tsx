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

export function StatusBadge({ status }: { status: RsvpStatus }) {
  return <Badge tone={TONS[status]}>{LIBELLES[status]}</Badge>;
}
