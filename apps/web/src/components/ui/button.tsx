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
        // Pas de second rouge : le bordeaux profond et le libellé portent le
        // danger. Le geste est de toute façon protégé par un AlertDialog.
        destructive: "bg-bordeaux-900 text-on-bordeaux hover:bg-bordeaux-700",
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
