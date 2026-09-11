import { useState } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  HouseholdPublicDto,
  InvitationResponseDto,
  SubmitRsvpDto,
  WeddingInfoDto,
} from "@invitation-app/shared";
import { api } from "@/lib/api";
import {
  WEDDING_TIME_ZONE_LABEL,
  formatRsvpDeadline,
  formatWeddingDate,
  formatWeddingTime,
} from "@/lib/datetime";
import { RsvpForm } from "@/components/RsvpForm";
import { SeatingPlanSection } from "@/components/SeatingPlanSection";
import { CouplePhoto } from "@/components/invitation/CouplePhoto";
import { SectionHeading } from "@/components/invitation/SectionHeading";
import { COUPLE, HERO_NAME_CLASS } from "@/components/invitation/couple";
import {
  bandClassName,
  columnClassName,
  eyebrowClassName,
  guestTextButtonClassName,
  sectionGapClassName,
} from "@/components/invitation/guest-styles";

/**
 * mapUrl is free text typed into the admin settings form. Anything that isn't
 * a plain http(s) URL — a `javascript:` scheme, or just a typo — is dropped
 * rather than handed to an href on the one page every guest opens.
 */
function httpUrlOrNull(url: string | null): string | null {
  if (!url) return null;
  try {
    const { protocol } = new URL(url);
    return protocol === "http:" || protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

const nameFormatter = new Intl.ListFormat("fr-FR", { style: "long", type: "conjunction" });

/** "Jean", "Marie" et "Paul" → "Jean, Marie et Paul". */
function formatNames(names: string[]): string {
  return nameFormatter.format(names);
}

function seatsSentence(seats: number): string {
  return seats > 1 ? `${seats} places vous sont réservées.` : `${seats} place vous est réservée.`;
}

function peopleSentence(count: number): string {
  return count > 1 ? `${count} personnes présentes` : `${count} personne présente`;
}

/**
 * L'API répond en anglais — « RSVP deadline has passed », « Internal server
 * error ». Un invité français ne lit jamais la chaîne brute d'un serveur : le
 * défaut a déjà été relevé une fois sur exactement cette route.
 *
 * On ne traduit pas message par message, on traduit **la situation** : soit la
 * date limite est tombée pendant que la page était ouverte, soit l'envoi n'est
 * pas passé. Dans les deux cas l'invité a besoin de savoir quoi faire, pas de
 * quel code HTTP il s'agit.
 */
function frenchRsvpError(error: unknown): string {
  const raw = error instanceof Error ? error.message.toLowerCase() : "";
  if (raw.includes("deadline")) {
    return "Les réponses viennent d'être closes. Merci de contacter directement les organisateurs.";
  }
  return "Votre réponse n'a pas pu être enregistrée. Vérifiez votre connexion, puis réessayez.";
}

export function InvitationPage() {
  const { linkId } = useParams<{ linkId: string }>();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["invitation", linkId],
    queryFn: () => api.get<InvitationResponseDto>(`/invitation/${linkId}`),
    enabled: !!linkId,
  });

  const rsvpMutation = useMutation({
    mutationFn: (dto: SubmitRsvpDto) => api.patch(`/invitation/${linkId}/rsvp`, dto),
    onSuccess: () => {
      setIsEditing(false);
      return queryClient.invalidateQueries({ queryKey: ["invitation", linkId] });
    },
  });

  if (isLoading) {
    return (
      <p role="status" className="p-12 text-center text-ink-muted">
        Chargement de votre invitation…
      </p>
    );
  }

  if (error || !data) {
    return (
      <p role="alert" className="mx-auto max-w-column p-12 text-center">
        Cette invitation est introuvable. Vérifiez le lien reçu, ou contactez les organisateurs.
      </p>
    );
  }

  const { household, wedding } = data;
  // The API returns a raw English 403 ("RSVP deadline has passed") once the
  // deadline is up. Rendering the form anyway meant a guest could fill it in,
  // submit, and get that English string in an otherwise-French page.
  const rsvpClosed = new Date() > new Date(wedding.rsvpDeadline);

  // La réponse la plus fraîche connue : celle qu'on vient d'envoyer, sinon
  // celle que l'API a renvoyée. `variables` évite d'attendre le rafraîchissement
  // du cache pour reformuler ce que l'invité vient de choisir.
  const submitted = rsvpMutation.isSuccess ? rsvpMutation.variables : null;
  const answered =
    submitted ??
    (household.status === "PENDING"
      ? null
      : {
          status: household.status,
          confirmedCount: household.confirmedCount ?? undefined,
          dietaryNotes: household.dietaryNotes ?? undefined,
        });

  return (
    <main className="pb-0">
      {/* ————————————————————————— §1 · Le héros ————————————————————————— */}
      <section className="relative flex min-h-svh flex-col items-center justify-center px-6 text-center">
        {/* La seule information de la page propre à ce lien : elle la fait lire
            comme du courrier plutôt que comme une page web. */}
        <p className={eyebrowClassName}>{household.displayName}</p>

        <h1
          className={`mt-6 max-w-hero font-display leading-[1.05] text-bordeaux-900 ${HERO_NAME_CLASS}`}
        >
          {COUPLE.firstNames[0]}
          {/* L'esperluette a sa propre ligne : celle de Marcellus mesure
              0,77 em, c'est un beau dessin et il mérite sa ligne. */}
          <span className="block py-2 font-display text-[1.75rem] text-bordeaux-700 md:text-[2.5rem]">
            &amp;
          </span>
          {COUPLE.firstNames[1]}
        </h1>


        <p className="mt-6 font-display text-xl text-bordeaux-700">
          {formatWeddingDate(wedding.weddingDate)}, {formatWeddingTime(wedding.weddingDate, { compact: true })}
        </p>
        <p className="mt-2 text-base text-ink-muted">{wedding.venueName}</p>

        {/* Un trait qui dit que la page continue. Il ne bouge pas : pas de
            chevron, pas de rebond, rien qui demande une animation pour être
            compris. */}
        <span aria-hidden="true" className="absolute bottom-6 h-8 w-px bg-rule" />
      </section>

      {/* —————————————————————— §2 · L'adressage —————————————————————— */}
      <section className={`${sectionGapClassName} ${columnClassName}`}>
        {household.memberNames.length > 0 && (
          <>
            <p className={eyebrowClassName}>Cette invitation est adressée à</p>
            <p className="mt-2 font-display text-2xl text-bordeaux-900">
              {formatNames(household.memberNames)}
            </p>
          </>
        )}
        <p className="mt-2 text-ink-muted">{seatsSentence(household.allocatedSeats)}</p>
      </section>

      {/* ——————————————————————— §3 · La photo ——————————————————————— */}
      <div className={sectionGapClassName}>
        <CouplePhoto />
      </div>

      {/* ————————————— §4 · Les informations pratiques ————————————— */}
      <section
        aria-labelledby="le-jour-j"
        className={`${sectionGapClassName} bg-cream ${bandClassName}`}
      >
        <div className={columnClassName}>
          <SectionHeading id="le-jour-j">Le jour J</SectionHeading>
          <PracticalInformation wedding={wedding} />
        </div>
      </section>

      {/* ————————————————————— §5 · Votre réponse ————————————————————— */}
      <section aria-labelledby="votre-reponse" className={`${sectionGapClassName} ${columnClassName}`}>
        <SectionHeading id="votre-reponse">Votre réponse</SectionHeading>

        <div className="mt-8">
          {rsvpClosed ? (
            <ClosedRsvpSummary household={household} />
          ) : answered && !isEditing ? (
            <RecordedAnswer answer={answered} onEdit={() => setIsEditing(true)} />
          ) : (
            <>
              {/* La date limite doit être lisible *avant* de répondre. Elle
                  n'apparaissait qu'une fois passée, pour verrouiller le
                  formulaire. Et sans heure : une heure limite ne veut rien dire
                  pour un invité, et celle qui s'affichait était fausse. */}
              <p className="mb-8 text-ink-muted">
                Merci de nous répondre avant le {formatRsvpDeadline(wedding.rsvpDeadline)}.
              </p>
              <RsvpForm
                allocatedSeats={household.allocatedSeats}
                defaultStatus={household.status === "PENDING" ? undefined : household.status}
                defaultConfirmedCount={household.confirmedCount ?? household.allocatedSeats}
                defaultDietaryNotes={household.dietaryNotes ?? ""}
                onSubmit={(dto) => rsvpMutation.mutate(dto)}
                isPending={rsvpMutation.isPending}
                errorMessage={rsvpMutation.isError ? frenchRsvpError(rsvpMutation.error) : null}
              />
            </>
          )}
        </div>
      </section>

      {/* ——————————————————————— §6 · Votre table ——————————————————————— */}
      <SeatingPlanSection seatingPlan={data.seatingPlan} />

      {/* ——————————————————————— §7 · Le pied de page ——————————————————————— */}
      <footer className={`${sectionGapClassName} bg-bordeaux-900 px-6 pt-16 pb-12 text-center`}>
        <p className="font-display text-2xl text-ivory">
          {COUPLE.firstNames[0]} &amp; {COUPLE.firstNames[1]}
        </p>
        {/* Le seul endroit de la page où l'or est lumineux : 5,18:1 sur le
            bordeaux 900. Il porte un filet, jamais un mot. */}
        <span aria-hidden="true" className="mx-auto my-6 block h-px w-16 bg-gold" />
        <p className="text-sm tracking-[0.08em] text-ivory">
          {formatWeddingDate(wedding.weddingDate, { weekday: false })} · {COUPLE.city}
        </p>
      </footer>
    </main>
  );
}

function PracticalInformation({ wedding }: { wedding: WeddingInfoDto }) {
  const mapHref = httpUrlOrNull(wedding.mapUrl);

  return (
    // 32 px entre deux entrées, et aucun filet entre elles : les capitales
    // structurent déjà.
    <dl className="mt-8 space-y-8">
      <div>
        <dt className={eyebrowClassName}>Quand</dt>
        <dd className="mt-2">
          <span className="block">
            {formatWeddingDate(wedding.weddingDate)} à {formatWeddingTime(wedding.weddingDate)}
          </span>
          {/* Toujours affiché, jamais conditionné au fuseau du lecteur : une
              parenthèse permanente coûte une ligne et supprime toute une
              classe d'ambiguïté. */}
          <span className="block text-ink-muted">({WEDDING_TIME_ZONE_LABEL})</span>
        </dd>
      </div>

      <div>
        <dt className={eyebrowClassName}>Où</dt>
        <dd className="mt-2">
          <span className="block">{wedding.venueName}</span>
          <span className="block text-ink-muted">{wedding.address}</span>
          {mapHref && (
            <a
              href={mapHref}
              target="_blank"
              rel="noopener noreferrer"
              // Le soulignement ne se retire jamais : c'est le seul lien de la
              // page, et il n'y a pas de bleu pour le signaler.
              className={`mt-1 ${guestTextButtonClassName}`}
            >
              Voir l'itinéraire<span className="sr-only"> (nouvel onglet)</span>
              <span aria-hidden="true"> →</span>
            </a>
          )}
        </dd>
      </div>

      {/* Chaque champ facultatif n'est rendu que s'il est rempli : un intitulé
          « Tenue » sans valeur n'apprend rien et ressemble à une panne. */}
      {wedding.dressCode && (
        <div>
          <dt className={eyebrowClassName}>Tenue</dt>
          <dd className="mt-2">{wedding.dressCode}</dd>
        </div>
      )}

      {wedding.parkingInfo && (
        <div>
          <dt className={eyebrowClassName}>Stationnement</dt>
          <dd className="mt-2">{wedding.parkingInfo}</dd>
        </div>
      )}
    </dl>
  );
}

/**
 * La réponse enregistrée **remplace** le formulaire, elle ne s'y ajoute pas :
 * un formulaire encore ouvert sous un « merci » laisse croire que rien n'est
 * parti. Le bouton de modification le ramène — la deadline seule le ferme.
 */
function RecordedAnswer({
  answer,
  onEdit,
}: {
  answer: Pick<SubmitRsvpDto, "status" | "confirmedCount" | "dietaryNotes">;
  onEdit: () => void;
}) {
  return (
    <div className="border-t border-bordeaux-700 pt-6">
      <p className="font-display text-2xl text-bordeaux-900">C'est noté.</p>
      <p className="mt-2">
        {answer.status === "CONFIRMED"
          ? `Vous serez ${peopleSentence(answer.confirmedCount ?? 1)}.`
          : "Vous ne pourrez pas être des nôtres. Nous le regrettons, et nous comprenons."}
      </p>
      {answer.dietaryNotes && (
        <p className="mt-2 text-ink-muted">Régime alimentaire, allergies : {answer.dietaryNotes}</p>
      )}
      <button type="button" onClick={onEdit} className={`mt-4 ${guestTextButtonClassName}`}>
        Modifier notre réponse
      </button>
    </div>
  );
}

/** Read-only replacement for the RSVP form once the deadline has passed. */
function ClosedRsvpSummary({ household }: { household: HouseholdPublicDto }) {
  return (
    <div className="border-t border-bordeaux-700 pt-6">
      <p className="font-display text-2xl text-bordeaux-900">Les réponses sont closes.</p>
      {household.status === "CONFIRMED" && (
        <p className="mt-2">
          Votre réponse : {peopleSentence(household.confirmedCount ?? 1)}.
        </p>
      )}
      {household.status === "DECLINED" && (
        <p className="mt-2">Votre réponse : vous ne pourrez pas être des nôtres.</p>
      )}
      {household.status === "PENDING" && (
        <p className="mt-2">Nous n'avons pas reçu votre réponse.</p>
      )}
      {household.dietaryNotes && (
        <p className="mt-2 text-ink-muted">
          Régime alimentaire, allergies : {household.dietaryNotes}
        </p>
      )}
      <p className="mt-4 text-ink-muted">
        Pour toute modification, merci de contacter directement les organisateurs.
      </p>
    </div>
  );
}
