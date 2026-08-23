import * as React from "react";
import { cn } from "@/lib/utils";
import { controlClassName } from "./control-styles";
import { useFieldControl } from "./field";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    const wired = useFieldControl(props);
    return (
      <input
        ref={ref}
        type={type}
        className={cn(
          controlClassName,
          // Source Sans 3 carries `tnum`. Without it a seat count typed into a
          // 40-row admin table shifts the column as the digits change, and the
          // eye loses the scan line.
          type === "number" && "tabular-nums",
          className,
        )}
        {...wired}
      />
    );
  },
);
Input.displayName = "Input";
