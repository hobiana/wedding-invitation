import { useId, useState, type FormEvent } from "react";
import type { SubmitRsvpDto } from "@invitation-app/shared";
import { Field } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { CONTACT_PHONES } from "@/components/invitation/wedding-content";
import {
  eyebrowClassName,
  guestButtonClassName,
} from "@/components/invitation/guest-styles";
import { cn } from "@/lib/utils";

type Answer = "CONFIRMED" | "DECLINED";

/** « Anna », « Bob » et « Chloé » → « Anna, Bob et Chloé ». */
const nomsFormates = new Intl.ListFormat("fr-FR", {
  style: "long",
  type: "conjunction",
});

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
  "flex flex-1 cursor-pointer items-center justify-center border px-5 py-3.5 text-center",
  "font-sans text-[0.8125rem]",
  "transition-colors duration-(--duration-transition) ease-(--ease-in)",
  // Le focus vit sur la puce : le bouton radio lui-même est masqué, et un
  // focus invisible est un formulaire inutilisable au clavier.
  "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2",
  "has-[:focus-visible]:outline-bordeaux-700",
].join(" ");

/**
 * La forme vient du design du commanditaire : des puces, pas des cartes.
 *
 * Ce que la forme ne change pas, c'est la correction d'audit : « Je viens »
 * était un aplat et « Je ne viendrai pas » un contour deux fois plus large, et
 * la page poussait à accepter. Les deux puces sortent de la même fonction et
 * portent le même liseré d'1 px dans les deux états — aucune ne peut grossir
 * sans l'autre, et rien ne saute au clic.
 *
 * Trois signaux pour l'option retenue, jamais la teinte seule : l'aplat plein
 * (une différence de clarté, que voit un œil daltonien), l'inversion du texte,
 * et l'état coché du radio que lit une technologie d'assistance. Les deux états
 * sont calculés en React plutôt qu'en `has-[:checked]:` pour que la différence
 * soit **lisible dans le DOM** — c'est ce qui permet à un test de prouver que
 * les deux puces non retenues sont identiques.
 */
const CHOICE_SELECTED = "border-bordeaux-500 bg-bordeaux-500 text-on-bordeaux";

/**
 * Le liseré est à 60 %, pas aux 20 % du design.
 *
 * Mesuré : à 20 % sur l'ivoire il donne **1,44:1**, quand la limite d'un
 * élément qu'on doit reconnaître comme cliquable demande 3:1. À 60 % il donne
 * 3,44:1. C'est plus marqué que le trait de cheveu du design, et c'est le prix
 * d'une puce que voit aussi une tante de soixante-dix ans sur un téléphone en
 * plein soleil — c'est-à-dire une bonne partie des invités.
 *
 * La puce retenue, elle, est à 8,37:1 (crème sur bordeaux) et ne pose pas de
 * question.
 */
const CHOICE_IDLE =
  "border-bordeaux-500/60 bg-ivory text-bordeaux-700 hover:border-bordeaux-500";

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
    <label
      className={cn(CHOICE_BASE, selected ? CHOICE_SELECTED : CHOICE_IDLE)}
    >
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
          <p className="mt-1 font-display text-[1.625rem] text-bordeaux-500">
            {allocatedSeats}
          </p>
        </div>
      </div>

      <fieldset>
        <legend className={`${eyebrowClassName} mb-2.5`}>Votre réponse</legend>
        <div className="flex flex-wrap gap-2">
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
          <p
            role="alert"
            className="mt-3 text-[1.0625rem] font-medium text-bordeaux-700"
          >
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
        <p className="text-[0.9375rem] leading-relaxed text-ink-muted">
          {places} {compte}
          <br />
          Si l'un d'entre vous ne peut finalement pas venir, appelez-nous :{" "}
          {CONTACT_PHONES.map((phone, i) => (
            <span key={phone.tel}>
              {i > 0 && " ou "}
              {/* `tel:` compose directement depuis un téléphone — et c'est sur
                  un téléphone que cette page sera ouverte. */}
              <a
                href={`tel:${phone.tel}`}
                className="whitespace-nowrap text-bordeaux-700 underline underline-offset-[3px] decoration-1 hover:decoration-2"
              >
                {phone.display}
              </a>
            </span>
          ))}
          .
        </p>
      )}

      {/* Offert aussi à qui décline : c'est souvent là qu'on écrit le mot le
          plus important. */}
      <Field label={<span className={eyebrowClassName}>Un mot pour nous</span>}>
        <Textarea
          rows={3}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          // « Facultatif » en indication plutôt qu'en étiquette, comme le
          // design : l'étiquette dit ce que c'est, l'indication dit qu'on peut
          // passer son chemin.
          placeholder="Facultatif"
          // Même liseré que les puces, et pour la même raison mesurée : un
          // champ de saisie est un élément qu'on doit voir avant d'y écrire.
          className="rounded-none border-bordeaux-500/60 bg-ivory px-4 py-3.5 text-[0.875rem]"
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

      <button
        type="submit"
        className={guestButtonClassName}
        disabled={isPending}
        aria-busy={isPending}
      >
        {isPending
          ? "Envoi…"
          : errorMessage
            ? "Réessayer"
            : "Envoyer notre réponse"}
      </button>
    </form>
  );
}
