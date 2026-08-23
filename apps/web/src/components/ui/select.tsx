import * as React from "react";
import { cn } from "@/lib/utils";
import { controlClassName } from "./control-styles";
import { useFieldControl } from "./field";

export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

/**
 * Deliberately the native `<select>`. On a phone it opens the OS picker, which
 * is the control the guest already knows how to use, and it is keyboard- and
 * screen-reader-correct without a line of code from us. A div-based listbox
 * would cost a dependency and re-implement all of that, worse.
 *
 * The platform's own arrow is left in place — hiding it with `appearance-none`
 * would mean drawing and maintaining a replacement for no gain.
 */
export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => {
    const wired = useFieldControl(props);
    return (
      <select ref={ref} className={cn(controlClassName, className)} {...wired}>
        {children}
      </select>
    );
  },
);
Select.displayName = "Select";
