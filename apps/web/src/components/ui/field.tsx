import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * `Field` owns the wiring that eleven hand-rolled field blocks across the app
 * each re-implemented — and that several of them got wrong: the label/control
 * association, the error message, and the aria plumbing between them.
 *
 * The control never receives that wiring as props. It reads it from context, so
 * a caller cannot forget to pass it:
 *
 *     <Field label="Nom du foyer" error={error} required>
 *       <Input value={value} onChange={...} />
 *     </Field>
 */

interface FieldContextValue {
  controlId: string;
  describedBy?: string;
  invalid: boolean;
  required: boolean;
}

const FieldContext = React.createContext<FieldContextValue | null>(null);

/** The subset of props a control accepts from its surrounding `Field`. */
export interface FieldControlProps {
  id?: string;
  required?: boolean;
  "aria-describedby"?: string;
  "aria-invalid"?: React.AriaAttributes["aria-invalid"];
}

/**
 * Merges the surrounding `Field`'s wiring into a control's own props. The
 * caller's values win, with two deliberate exceptions.
 *
 * `aria-describedby` is concatenated rather than overridden: dropping either id
 * would silence one of the two messages.
 *
 * `id` is the interesting one. **Inside a `Field`, the field's id always wins.**
 * Letting the control's own id through was the first bug these primitives
 * caught: the control took the caller's id while the `<label for=…>` kept
 * pointing at the generated one, so the label quietly came unhooked — the exact
 * defect the audit found in the hand-rolled blocks, reintroduced by the thing
 * meant to fix it. The id is one field's business, so `Field` owns it; a caller
 * who needs a specific id passes it to `Field`, not to the control.
 *
 * Outside a `Field` the props pass through untouched — a bare `<Input>` with
 * its own `aria-label` stays valid.
 */
export function useFieldControl<T extends FieldControlProps>(props: T): T {
  const field = React.useContext(FieldContext);
  if (!field) return props;

  if (import.meta.env.DEV && props.id !== undefined && props.id !== field.controlId) {
    console.warn(
      `Field: l'id "${props.id}" posé sur le contrôle est ignoré — il détacherait le label. ` +
        `Passez id="${props.id}" à <Field> plutôt qu'au contrôle.`,
    );
  }

  const describedBy =
    [props["aria-describedby"], field.describedBy].filter(Boolean).join(" ") || undefined;

  return {
    ...props,
    id: field.controlId,
    required: props.required ?? (field.required || undefined),
    "aria-describedby": describedBy,
    // `|| undefined` rather than `false`: a valid field carries no attribute at
    // all, which is what the `aria-invalid:` style variant keys off.
    "aria-invalid": props["aria-invalid"] ?? (field.invalid || undefined),
  };
}

export interface FieldProps {
  label: React.ReactNode;
  children: React.ReactNode;
  /** Supply one only when something outside must target the control. */
  id?: string;
  /** Present means invalid. The string is shown; it is never colour alone. */
  error?: string | null;
  hint?: React.ReactNode;
  required?: boolean;
  className?: string;
}

export function Field({
  label,
  children,
  id,
  error,
  hint,
  required = false,
  className,
}: FieldProps) {
  const generatedId = React.useId();
  const controlId = id ?? generatedId;
  const hintId = `${controlId}-hint`;
  const errorId = `${controlId}-error`;

  const describedBy =
    [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ") || undefined;

  const context = React.useMemo<FieldContextValue>(
    () => ({ controlId, describedBy, invalid: Boolean(error), required }),
    [controlId, describedBy, error, required],
  );

  return (
    <div className={cn("space-y-2", className)}>
      <label htmlFor={controlId} className="block text-sm font-medium text-ink">
        {label}
        {/*
          Spelled out rather than an asterisk. A bare `*` is a convention the
          reader has to already know, and it is typically painted in the error
          colour — information carried by a glyph and a hue, which is exactly
          what the design system forbids.
        */}
        {required && <span className="ml-1.5 font-normal text-ink-muted">(obligatoire)</span>}
      </label>

      {hint && (
        <p id={hintId} className="text-sm text-ink-muted">
          {hint}
        </p>
      )}

      <FieldContext.Provider value={context}>{children}</FieldContext.Provider>

      {error && (
        // Bordeaux, not a second red: the design system rules out putting a
        // `red-600` next to `#6E1F35`. The message itself carries the meaning.
        <p id={errorId} className="text-sm font-medium text-bordeaux-700">
          {error}
        </p>
      )}
    </div>
  );
}
