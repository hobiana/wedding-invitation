import { useId, useState, type FormEvent } from "react";
import type { SubmitRsvpDto } from "@invitation-app/shared";
import { Field } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { eyebrowClassName, guestButtonClassName } from "@/components/invitation/guest-styles";
import { cn } from "@/lib/utils";

type Answer = "CONFIRMED" | "DECLINED";

/** « Anna », « Bob » et « Chloé » → « Anna, Bob et Chloé ». */
const nomsFormates = new Intl.ListFormat("fr-FR", { style: "long", type: "conjunction" });

interface RsvpFormProps {
  /** Le nom du foyer, tel qu'il est écrit sur l'enveloppe. */
  householdName: string;
  /** Les personnes nommément invitées, si l'organisateur les a saisies. */
  memberNames?: string[];
  allocatedSeats: number;
  defaultStatus?: Answer;
  defaultMessage?: string;
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

/**
 * Le formulaire de réponse.
 *
 * Il ne demande plus **combien** vous serez. Décision du commanditaire du
 * 2026-09-10 : confirmer veut dire « nous venons tous », et le serveur pose le
 * nombre depuis les places accordées. Le sélecteur a donc disparu, et avec lui
 * la seule façon pour un invité d'annoncer un chiffre.
 *
 * Ce qui le remplace n'est pas rien : une phrase qui dit explicitement combien
 * de personnes sont comptées, et qui invite à téléphoner si ça change. Sans
 * elle, un foyer de quatre dont un seul vient n'aurait aucun moyen de le
 * savoir — ni de le dire.
 */
export function RsvpForm({
  householdName,
  memberNames = [],
  allocatedSeats,
  defaultStatus,
  defaultMessage,
  onSubmit,
  isPending = false,
  errorMessage,
}: RsvpFormProps) {
  const groupName = useId();
  const [answer, setAnswer] = useState<Answer | null>(defaultStatus ?? null);
  const [message, setMessage] = useState(defaultMessage ?? "");
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

    const mot = message.trim();
    onSubmit({
      status: answer,
      // Omis plutôt que `""` : une chaîne vide n'est pas nulle, et une page
      // d'admin qui compte les messages compterait chaque textarea intacte.
      message: mot === "" ? undefined : mot,
    });
  }

  const places =
    allocatedSeats > 1
      ? `${allocatedSeats} places vous sont réservées.`
      : `${allocatedSeats} place vous est réservée.`;

  const compte =
    allocatedSeats > 1
      ? `Nous comptons donc sur vous ${allocatedSeats}.`
      : "Nous comptons donc sur vous.";

  return (
    <form onSubmit={handleSubmit} className="space-y-8 text-left">
      {/* L'en-tête du design : la seule information de la page propre à ce
          lien. C'est elle qui fait lire l'écran comme du courrier. */}
      <div className="flex items-center justify-between gap-3 border border-dashed border-gold/50 bg-ivory px-4 py-4">
        <div>
          <p className={eyebrowClassName}>Invité(e)</p>
          <p className="mt-1 text-[1.3125rem]">{householdName}</p>
          {/* Les prénoms quand ils ont été saisis : une invitation adressée à
              des gens, pas à un foyer. Le design ne les montrait nulle part. */}
          {memberNames.length > 0 && (
            <p className="mt-1 text-[0.9375rem] text-ink-muted">
              {nomsFormates.format(memberNames)}
            </p>
          )}
        </div>
        <div className="text-right">
          <p className={eyebrowClassName}>Places</p>
          <p className="mt-1 font-display text-[1.625rem] text-bordeaux-500">{allocatedSeats}</p>
        </div>
      </div>

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

      {/*
        La contrepartie du sélecteur supprimé. Répondre « oui » engage tout le
        foyer, et un invité doit le lire avant d'envoyer, pas le découvrir au
        plan de table. Le téléphone est la porte de sortie — il n'y en a plus
        d'autre côté invité, et c'est assumé.
      */}
      {answer === "CONFIRMED" && (
        <p className="text-[1.0625rem] leading-relaxed text-ink-muted">
          {places} {compte} Si l'un d'entre vous ne peut finalement pas venir, un coup de
          téléphone nous suffit.
        </p>
      )}

      {/* Offert aussi à qui décline : c'est souvent là qu'on écrit le mot le
          plus important. */}
      <Field
        label={
          <span className={eyebrowClassName}>
            Un mot pour nous <span className="normal-case tracking-normal">— facultatif</span>
          </span>
        }
      >
        <Textarea
          rows={3}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          // Soulignement seul (§9) : une boîte de plus dans une page de
          // papier lit comme un champ d'application.
          className="rounded-none border-0 border-b border-rule-strong bg-transparent px-0"
        />
      </Field>

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
