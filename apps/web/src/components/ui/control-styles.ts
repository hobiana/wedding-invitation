/**
 * The one description of what a form control looks like. Input, Textarea and
 * Select share it so they cannot drift apart the way the eleven inline field
 * blocks did.
 *
 * Every value here is a design token, and three of them are not negotiable:
 *
 * - `border-rule-strong` — `#8C7A68` is the only rule colour that clears 3:1
 *   against both `--color-ivory` and `--color-cream`, and a control sitting on
 *   a cream card must still show its edge.
 * - `rounded-control` — `--radius-control`, 2px. Never `rounded-md`.
 * - no `outline-none` — the focus ring is painted once, in `index.css`, in
 *   `--color-bordeaux-700`. Gold fails the text contrast threshold and never
 *   carries focus. Suppressing the outline here would remove the app's only
 *   focus indicator, silently.
 *
 * `text-base` is 16px, and that is a floor: below it iOS Safari zooms the page
 * on focus and shifts the form under the guest's thumb.
 */
export const controlClassName = [
  "w-full rounded-control border border-rule-strong bg-ivory",
  "px-3 py-2.5 text-base text-ink",
  "placeholder:text-ink-muted",
  "transition-colors duration-(--duration-micro) ease-(--ease-in)",
  "hover:border-ink-muted",
  // Reinforces the message, never replaces it: the text under the field is what
  // actually reports the error.
  "aria-invalid:border-bordeaux-700",
  "disabled:cursor-not-allowed disabled:bg-cream disabled:text-ink-muted",
].join(" ");
