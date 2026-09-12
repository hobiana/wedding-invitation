import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * La surface de l'admin : un encart ivoire posé sur le fond, cerné par le
 * filet clair. Pas d'ombre — l'admin est plat, l'ombre est réservée à la carte
 * du faire-part.
 */
export const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("rounded-surface border border-rule bg-ivory p-4", className)}
      {...props}
    />
  ),
);
Card.displayName = "Card";
