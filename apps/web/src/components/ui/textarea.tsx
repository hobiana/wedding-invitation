import * as React from "react";
import { cn } from "@/lib/utils";
import { controlClassName } from "./control-styles";
import { useFieldControl } from "./field";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, rows = 4, ...props }, ref) => {
    const wired = useFieldControl(props);
    return (
      <textarea
        ref={ref}
        // Four rows, not one. The two places a guest writes prose are the
        // dietary note and the message to the couple; a single-line box asks
        // for a single word.
        rows={rows}
        className={cn(controlClassName, "resize-y", className)}
        {...wired}
      />
    );
  },
);
Textarea.displayName = "Textarea";
