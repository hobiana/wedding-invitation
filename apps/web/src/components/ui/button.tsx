import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-control text-sm font-medium transition-colors duration-(--duration-micro) ease-(--ease-in) disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        // Le registre admin : sobre, dense, aux jetons du mariage. La page
        // invité ne passe pas par ici — voir invitation/guest-styles.ts.
        default: "bg-bordeaux-700 text-on-bordeaux hover:bg-bordeaux-900",
        outline: "border border-rule-strong text-ink hover:bg-cream",
        // Rouge, et c'est un arbitrage du commanditaire du 2026-09-12 qui lève
        // sa propre règle « pas de second rouge à côté du bordeaux ».
        //
        // Ce qui l'a motivé, mesuré à l'écran : en `bordeaux-900`, ce bouton ne
        // se distinguait du primaire en `bordeaux-700` que de 1,43:1. Le libellé
        // portait seul le danger, et le garde-fou derrière.
        //
        // Ne pas « corriger » en relisant le design system : c'est la règle qui
        // a changé, pas le code qui s'en écarte.
        destructive: "bg-danger text-on-danger hover:bg-danger-strong",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 px-3",
        lg: "h-12 px-6",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";
