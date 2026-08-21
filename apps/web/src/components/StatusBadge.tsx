import type { RsvpStatus } from "@invitation-app/shared";
import { cn } from "@/lib/utils";

const STYLES: Record<RsvpStatus, string> = {
  CONFIRMED: "bg-green-100 text-green-800",
  DECLINED: "bg-red-100 text-red-800",
  PENDING: "bg-amber-100 text-amber-800",
};

const LABELS: Record<RsvpStatus, string> = {
  CONFIRMED: "Confirmé",
  DECLINED: "Décliné",
  PENDING: "En attente",
};

export function StatusBadge({ status }: { status: RsvpStatus }) {
  return (
    <span className={cn("inline-block px-2 py-1 rounded-full text-xs font-medium", STYLES[status])}>
      {LABELS[status]}
    </span>
  );
}
