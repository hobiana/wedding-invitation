import { useId, useState, type FormEvent } from "react";
import type { SubmitRsvpDto } from "@invitation-app/shared";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { eyebrowClassName, guestButtonClassName } from "@/components/invitation/guest-styles";
import { cn } from "@/lib/utils";

type Answer = "CONFIRMED" | "DECLINED";

interface RsvpFormProps {
  allocatedSeats: number;
  defaultStatus?: Answer;
  defaultConfirmedCount?: number;
  defaultDietaryNotes?: string;
  onSubmit: (dto: SubmitRsvpDto) => void;
  isPending?: boolean;
  /** Déjà traduit par l'appelant. Ce composant n'affiche jamais une chaîne d'API. */
  errorMessage?: string | null;
}

/**
 * Les deux réponses sont **une seule question à deux options**, pas deux
 * boutons. C'est la correction du défaut relevé à l'audit : « Je viens » était
 * un aplat et « Je ne viendrai pas » un contour deux fois plus large, si bien
 * que la page poussait à accepter. Deux options du même contrôle, rendues par
 * la même fonction, ne peuvent plus diverger — l'équilibre est structurel.
 */
const CHOICE_BASE = [
  "flex cursor-pointer items-center gap-3 rounded-control p-5",
  "text-[1.0625rem] font-medium text-ink",
  "transition-colors duration-(--duration-micro) ease-(--ease-in)",
  // Le focus vit sur la carte : le bouton radio lui-même est masqué, et un
  // focus invisible est un formulaire inutilisable au clavier.
  "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2",
  "has-[:focus-visible]:outline-bordeaux-700",
].join(" ");

/**
 * Trois signaux pour l'option retenue, jamais la couleur seule : l'état coché
 * du radio (que lit une technologie d'assistance), le liseré qui double
 * d'épaisseur (que voit un œil daltonien) et le disque plein.
 *
 * Les deux états sont calculés en React plutôt qu'en `has-[:checked]:` pour
 * que la différence soit **lisible dans le DOM** — c'est ce qui permet à un
 * test de prouver que les deux cartes non sélectionnées sont identiques, et
 * cette preuve est exactement ce que l'audit réclamait.
 */
const CHOICE_SELECTED = "border-2 border-bordeaux-700 bg-bordeaux-50";
const CHOICE_IDLE = "border border-rule-strong bg-ivory hover:border-ink-muted";

/** Le liseré passe de 1 à 2 px ; sans compensation la carte sauterait d'1 px. */
const CHOICE_IDLE_PADDING = "p-[calc(--spacing(5)+1px)]";

function ChoiceCard({
  name,
  value,
  label,
  selected,
  onSelect,
}: {
  name: string;
  value: Answer;
  label: string;
  selected: boolean;
  onSelect: (value: Answer) => void;
}) {
  return (
    <label className={cn(CHOICE_BASE, selected ? CHOICE_SELECTED : [CHOICE_IDLE, CHOICE_IDLE_PADDING])}>
      {/*
        Le radio natif est masqué visuellement mais reste dans l'ordre de
        tabulation : les flèches du clavier parcourent le groupe, l'état coché
        est exposé nativement. On n'ajoute pas `aria-checked` par-dessus — sur
        un `input[type=radio]` il duplique l'état natif et peut le contredire.
      */}
      <input
        type="radio"
        name={name}
        value={value}
        checked={selected}
        onChange={() => onSelect(value)}
        className="sr-only"
      />
      <span
        aria-hidden="true"
        className={cn(
          "size-2 shrink-0 rounded-full",
          selected ? "bg-bordeaux-700" : "border border-rule-strong",
        )}
      />
      {label}
    </label>
  );
}

const STEPPER_BUTTON =
  "flex size-11 shrink-0 items-center justify-center rounded-control border border-rule-strong " +
  "text-xl text-bordeaux-700 transition-colors duration-(--duration-micro) ease-(--ease-in) " +
  "hover:border-ink-muted disabled:cursor-not-allowed disabled:text-ink-muted disabled:opacity-50";

export function RsvpForm({
  allocatedSeats,
  defaultStatus,
  defaultConfirmedCount,
  defaultDietaryNotes,
  onSubmit,
  isPending = false,
  errorMessage,
}: RsvpFormProps) {
  const groupName = useId();
  const seatsId = useId();
  const [answer, setAnswer] = useState<Answer | null>(defaultStatus ?? null);
  const [confirmedCount, setConfirmedCount] = useState(
    clamp(defaultConfirmedCount ?? allocatedSeats, allocatedSeats),
  );
  const [dietaryNotes, setDietaryNotes] = useState(defaultDietaryNotes ?? "");
  const [missingAnswer, setMissingAnswer] = useState(false);

  function chooseAnswer(next: Answer) {
    setAnswer(next);
    setMissingAnswer(false);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();

    // Un bouton grisé sans explication laisse l'invité chercher ce qui manque.
    // On accepte le clic, et on dit ce qui manque.
    if (answer === null) {
      setMissingAnswer(true);
      return;
    }

    if (answer === "DECLINED") {
      // Aucun `confirmedCount`, pas même `0` : écrire zéro effacerait la
      // distinction entre « personne ne vient » et « pas encore répondu ».
      onSubmit({ status: "DECLINED" });
      return;
    }

    const notes = dietaryNotes.trim();
    onSubmit({
      status: "CONFIRMED",
      confirmedCount: clamp(confirmedCount, allocatedSeats),
      // Omis plutôt que `""` : une chaîne vide n'est pas nulle, et le tableau
      // de bord comptait chaque textarea intacte comme un régime à prévoir.
      dietaryNotes: notes === "" ? undefined : notes,
    });
  }

  const seatsSentence =
    allocatedSeats > 1
      ? `${allocatedSeats} places vous sont réservées.`
      : `${allocatedSeats} place vous est réservée.`;

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <fieldset>
        {/* Le titre de section porte déjà la question à l'écran ; la légende
            la redonne à qui n'a que la voix, sans la répéter en double. */}
        <legend className="sr-only">Serez-vous des nôtres ?</legend>
        <div className="grid gap-3 min-[520px]:grid-cols-2">
          <ChoiceCard
            name={groupName}
            value="CONFIRMED"
            label="Nous serons là"
            selected={answer === "CONFIRMED"}
            onSelect={chooseAnswer}
          />
          <ChoiceCard
            name={groupName}
            value="DECLINED"
            label="Nous ne pourrons pas venir"
            selected={answer === "DECLINED"}
            onSelect={chooseAnswer}
          />
        </div>
        {missingAnswer && (
          <p role="alert" className="mt-3 text-[1.0625rem] font-medium text-bordeaux-700">
            Merci d'indiquer si vous serez présents.
          </p>
        )}
      </fieldset>

      {/* Demander à un foyer qui décline combien il sera n'a pas de sens, et la
          réponse partirait sans lui. */}
      {answer === "CONFIRMED" && (
        <>
          <Field label={<span className={eyebrowClassName}>Combien serez-vous&nbsp;?</span>}>
            <div className="flex items-center gap-3">
              <button
                // `type="button"` : un bouton sans type dans un formulaire vaut
                // `submit`, et le premier pas du sélecteur enverrait la réponse.
                type="button"
                aria-label="Une personne de moins"
                className={STEPPER_BUTTON}
                disabled={confirmedCount <= 1}
                onClick={() => setConfirmedCount((n) => clamp(n - 1, allocatedSeats))}
              >
                <span aria-hidden="true">&minus;</span>
              </button>
              <Input
                type="number"
                inputMode="numeric"
                min={1}
                max={allocatedSeats}
                value={confirmedCount}
                aria-describedby={seatsId}
                onChange={(e) => setConfirmedCount(clamp(Number(e.target.value), allocatedSeats))}
                // Le champ **est** la valeur affichée entre les deux pas : un
                // second affichage en doublon donnerait deux nombres à
                // maintenir d'accord, et un seul serait modifiable au clavier.
                className={cn(
                  "h-11 w-20 text-center font-display text-[1.75rem] tabular-nums",
                  "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none",
                  "[&::-webkit-outer-spin-button]:appearance-none",
                )}
              />
              <button
                type="button"
                aria-label="Une personne de plus"
                className={STEPPER_BUTTON}
                disabled={confirmedCount >= allocatedSeats}
                onClick={() => setConfirmedCount((n) => clamp(n + 1, allocatedSeats))}
              >
                <span aria-hidden="true">+</span>
              </button>
            </div>
            {/* Sous le sélecteur, pas au-dessus : quand « + » se grise, la
                raison est la ligne qui suit immédiatement. */}
            <p id={seatsId} className="text-[0.9375rem] text-ink-muted">
              {seatsSentence}
            </p>
          </Field>

          <Field
            label={
              <span className={eyebrowClassName}>
                Régime alimentaire, allergies{" "}
                <span className="normal-case tracking-normal">— facultatif</span>
              </span>
            }
          >
            <Textarea
              rows={3}
              value={dietaryNotes}
              onChange={(e) => setDietaryNotes(e.target.value)}
              // Soulignement seul (§9) : une boîte de plus dans une page de
              // papier lit comme un champ d'application.
              className="rounded-none border-0 border-b border-rule-strong bg-transparent px-0"
            />
          </Field>
        </>
      )}

      {errorMessage && (
        <p
          role="alert"
          className="border-l-2 border-bordeaux-700 bg-bordeaux-50 py-3 pl-4 text-[1.0625rem] text-bordeaux-900"
        >
          {errorMessage}
        </p>
      )}

      <button type="submit" className={guestButtonClassName} disabled={isPending} aria-busy={isPending}>
        {isPending ? "Envoi…" : errorMessage ? "Réessayer" : "Envoyer notre réponse"}
      </button>
    </form>
  );
}

/** Invariant 3 : `confirmedCount <= allocatedSeats`, et jamais moins d'une personne. */
function clamp(value: number, max: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.min(Math.max(Math.round(value), 1), max);
}
