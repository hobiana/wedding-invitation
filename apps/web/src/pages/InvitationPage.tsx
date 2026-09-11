import { useCallback, useState } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  HouseholdPublicDto,
  InvitationResponseDto,
  SubmitRsvpDto,
  WeddingInfoDto,
} from "@invitation-app/shared";
import { api } from "@/lib/api";
import { formatRsvpDeadline, formatWeddingDate } from "@/lib/datetime";
import { RsvpForm } from "@/components/RsvpForm";
import { SeatingPlanSection } from "@/components/SeatingPlanSection";
import { Announcement } from "@/components/invitation/Announcement";
import { Calendar } from "@/components/invitation/Calendar";
import { Countdown } from "@/components/invitation/Countdown";
import { EnvelopeGate } from "@/components/invitation/EnvelopeGate";
import { InvitationHeader } from "@/components/invitation/InvitationHeader";
import { PhotoCarousel } from "@/components/invitation/PhotoCarousel";
import { Reveal } from "@/components/invitation/Reveal";
import { Schedule } from "@/components/invitation/Schedule";
import { Venue } from "@/components/invitation/Venue";
import { COUPLE } from "@/components/invitation/couple";
import {
  CONTACT_PHONES,
  MALAGASY,
} from "@/components/invitation/wedding-content";
import {
  eyebrowClassName,
  guestTextButtonClassName,
} from "@/components/invitation/guest-styles";

function peopleSentence(count: number): string {
  return count > 1
    ? `${count} personnes présentes`
    : `${count} personne présente`;
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
  // Ne passe à `true` qu'au moment où l'enveloppe s'en va, et jamais si la
  // porte n'a pas été montée — mouvement réduit, par exemple. La cascade
  // d'entrée est donc un supplément : la page est complète sans elle.
  const [revealed, setRevealed] = useState(false);
  const revealPage = useCallback(() => setRevealed(true), []);

  const { data, isLoading, error } = useQuery({
    queryKey: ["invitation", linkId],
    queryFn: () => api.get<InvitationResponseDto>(`/invitation/${linkId}`),
    enabled: !!linkId,
  });

  const rsvpMutation = useMutation({
    mutationFn: (dto: SubmitRsvpDto) =>
      api.patch(`/invitation/${linkId}/rsvp`, dto),
    onSuccess: () => {
      setIsEditing(false);
      return queryClient.invalidateQueries({
        queryKey: ["invitation", linkId],
      });
    },
  });

  // La porte est rendue dans les trois branches, à la même position dans
  // l'arbre : elle reste donc **le même composant monté** quand la requête se
  // résout. Ne la mettre que dans la branche chargée ferait voir « Chargement
  // de votre invitation… » une fraction de seconde avant l'enveloppe, et
  // rejouerait la scène depuis le début.
  const gate = <EnvelopeGate onReveal={revealPage} />;

  if (isLoading) {
    return (
      <>
        {gate}
        <p role="status" className="p-12 text-center text-ink-muted">
          Chargement de votre invitation…
        </p>
      </>
    );
  }

  if (error || !data) {
    return (
      <>
        {gate}
        <p role="alert" className="mx-auto max-w-column p-12 text-center">
          Cette invitation est introuvable. Vérifiez le lien reçu, ou contactez
          les organisateurs.
        </p>
      </>
    );
  }

  const { household, wedding } = data;
  // L'API renvoie un 403 anglais une fois la date limite passée. Rendre le
  // formulaire quand même laissait un invité le remplir, l'envoyer, et lire
  // cette phrase anglaise dans une page par ailleurs française.
  const rsvpClosed = new Date() > new Date(wedding.rsvpDeadline);

  // La réponse la plus fraîche connue : celle qu'on vient d'envoyer, sinon
  // celle que l'API a renvoyée. `variables` évite d'attendre le rafraîchissement
  // du cache pour reformuler ce que l'invité vient de choisir.
  const submitted = rsvpMutation.isSuccess ? rsvpMutation.variables : null;
  const answeredStatus =
    submitted?.status ??
    (household.status === "PENDING" ? null : household.status);
  // Le nombre ne vient plus de ce que l'invité a envoyé — il n'en envoie plus.
  // Il vient du serveur, qui l'a posé depuis les places accordées ; et si
  // l'organisateur l'a corrigé depuis, c'est sa valeur qu'on relit.
  const countedSeats = household.confirmedCount ?? household.allocatedSeats;

  return (
    <>
      {gate}
      {/* La carte du design : 680 px de papier crème, posés sur une page
          blanche. Sur un téléphone elle occupe tout ; au-delà, le blanc autour
          lui donne ses marges, comme un faire-part sur une table.

          `data-reveal` pilote la cascade d'entrée depuis `index.css`. Il ne vaut
          « true » qu'une fois l'enveloppe partie ; le reste du temps la page est
          rendue telle quelle, sans opacité ni transformation en attente. */}
      <main
        data-reveal={revealed ? "true" : "false"}
        className="relative mx-auto max-w-card bg-cream shadow-[0_0_3.75rem_-1.875rem_rgb(0_0_0/0.33)]"
      >
        {/* Le grain du papier, en fondu multiplicatif par-dessus tout. Il ne
            capte aucun clic, et les boutons du carrousel passent au-dessus. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-10 bg-[url(/decor/texture-papier.webp)] bg-[length:100%_auto] bg-repeat-y opacity-50 mix-blend-multiply"
        />

        <InvitationHeader />
        <Announcement weddingDate={wedding.weddingDate} />
        <PhotoCarousel />
        <Countdown weddingDate={wedding.weddingDate} />
        {/* Le calendrier emporte son air en dessous de lui. Sans ça sa carte
            blanche touchait le bandeau bordeaux du programme, et les deux
            sections se lisaient comme une seule. */}
        <div className="pb-14">
          <Calendar weddingDate={wedding.weddingDate} />
        </div>
        <Schedule weddingDate={wedding.weddingDate} />

        {/* À partir d'ici, c'est le défilement qui déclenche et non l'ouverture
            de l'enveloppe : la cascade du design s'arrête au septième bloc,
            c'est-à-dire au premier écran. Ce qui suit se lève quand l'invité y
            arrive — et reste visible si le navigateur ne sait pas le faire. */}
        <Reveal>
          <Venue
            venueName={wedding.venueName}
            address={wedding.address}
            mapUrl={wedding.mapUrl}
          />
        </Reveal>
        <Reveal>
          <PracticalInformation wedding={wedding} />
        </Reveal>

        <Reveal>
          <section
            aria-labelledby="votre-reponse"
            className="px-6 pb-14 pt-4 text-center"
          >
            <p className="font-sans text-[0.75rem] uppercase tracking-[0.4em] text-bordeaux-500">
              Réponse souhaitée
            </p>
            <h2
              id="votre-reponse"
              className="mt-2.5 font-script text-[3.125rem] leading-[1.1] text-bordeaux-700"
            >
              Serez-vous là ?
            </h2>
            {/* La date limite se lit **avant** de répondre. Elle n'apparaissait
                qu'une fois passée, pour verrouiller le formulaire. Et sans heure :
                une heure limite ne veut rien dire pour un invité, et celle qui
                s'affichait était fausse. */}
            {!rsvpClosed && (
              <p className="mt-1.5 font-sans text-[0.8125rem] leading-[1.7] text-ink-muted">
                Merci de nous répondre avant le{" "}
                <strong className="font-bold text-[0.9rem]">
                  {formatRsvpDeadline(wedding.rsvpDeadline)}
                </strong>
                .
              </p>
            )}

            <div className="mt-6">
              {rsvpClosed ? (
                <ClosedRsvpSummary household={household} />
              ) : answeredStatus && !isEditing ? (
                <RecordedAnswer
                  status={answeredStatus}
                  countedSeats={countedSeats}
                  message={submitted?.message ?? household.message ?? undefined}
                  onEdit={() => setIsEditing(true)}
                />
              ) : (
                <RsvpForm
                  householdName={household.displayName}
                  memberNames={household.memberNames}
                  allocatedSeats={household.allocatedSeats}
                  defaultStatus={
                    household.status === "PENDING" ? undefined : household.status
                  }
                  defaultMessage={household.message ?? ""}
                  onSubmit={(dto) => rsvpMutation.mutate(dto)}
                  isPending={rsvpMutation.isPending}
                  errorMessage={
                    rsvpMutation.isError
                      ? frenchRsvpError(rsvpMutation.error)
                      : null
                  }
                />
              )}
            </div>
          </section>
        </Reveal>

        <Reveal>
          <SeatingPlanSection seatingPlan={data.seatingPlan} />
        </Reveal>

        <Reveal>
          <footer className="bg-sand/60 px-6 pb-12 pt-9 text-center">
            <p className="font-script text-[2.125rem] text-bordeaux-500">
              {COUPLE.firstNames[0]} &amp; {COUPLE.firstNames[1]}
            </p>
            <p className="mt-2.5 font-sans text-[0.75rem] uppercase tracking-[0.34em] text-ink-muted">
              {formatWeddingDate(wedding.weddingDate, { weekday: false })} ·{" "}
              {COUPLE.city}
            </p>

            {/* Les numéros vivent aussi dans le formulaire, mais le formulaire
                disparaît dès qu'on a répondu. Ici ils restent — et c'est justement
                après avoir répondu qu'on rappelle pour changer quelque chose. */}
            <p className="mt-6 text-[0.875rem] text-ink-muted">
              Une question, un changement ?{" "}
              {CONTACT_PHONES.map((phone, i) => (
                <span key={phone.tel}>
                  {i > 0 && " · "}
                  <a
                    href={`tel:${phone.tel}`}
                    className="whitespace-nowrap text-bordeaux-700 underline underline-offset-[3px] decoration-1 hover:decoration-2"
                  >
                    {phone.display}
                  </a>
                </span>
              ))}
            </p>
          </footer>
        </Reveal>
      </main>
    </>
  );
}

/**
 * Ce que l'organisateur a saisi et que le design ne prévoyait nulle part.
 *
 * Le jour et le lieu sont portés par le programme et la section du lieu ; la
 * tenue a été retirée le 2026-09-11 à la demande du commanditaire. Il ne reste
 * que le stationnement, qui ne s'affiche que s'il est rempli — un intitulé
 * sans valeur n'apprend rien et ressemble à une panne.
 *
 * La garde ne regarde donc plus que `parkingInfo` : tant qu'elle lisait aussi
 * `dressCode`, un réglage où seule la tenue était saisie ouvrait la section sur
 * une liste vide.
 */
function PracticalInformation({ wedding }: { wedding: WeddingInfoDto }) {
  if (!wedding.parkingInfo) return null;

  return (
    <section className="px-6 pb-10">
      <dl className="mx-auto max-w-column space-y-6 text-center">
        {wedding.parkingInfo && (
          <div>
            <dt className={eyebrowClassName}>Stationnement</dt>
            <dd className="mt-2">{wedding.parkingInfo}</dd>
          </div>
        )}
      </dl>
    </section>
  );
}

/**
 * La réponse enregistrée **remplace** le formulaire, elle ne s'y ajoute pas :
 * un formulaire encore ouvert sous un « merci » laisse croire que rien n'est
 * parti. Le bouton de modification le ramène — la deadline seule le ferme.
 */
function RecordedAnswer({
  status,
  countedSeats,
  message,
  onEdit,
}: {
  status: SubmitRsvpDto["status"];
  /** Ce que le serveur compte pour ce foyer — pas ce que l'invité a envoyé. */
  countedSeats: number;
  message?: string;
  onEdit: () => void;
}) {
  return (
    <div className="border border-gold/40 bg-ivory px-6 py-9">
      <p className="font-script text-[2.375rem] text-bordeaux-500">
        {MALAGASY.thanks}
      </p>
      <p className="mt-3">
        {status === "CONFIRMED"
          ? `C'est noté : vous serez ${peopleSentence(countedSeats)}.`
          : "Vous ne pourrez pas être des nôtres. Nous le regrettons, et nous comprenons."}
      </p>
      {message && <p className="mt-2 text-ink-muted">Votre mot : {message}</p>}
      <button
        type="button"
        onClick={onEdit}
        className={`mt-4 ${guestTextButtonClassName}`}
      >
        Modifier notre réponse
      </button>
    </div>
  );
}

/** Ce qui remplace le formulaire une fois la date limite passée. */
function ClosedRsvpSummary({ household }: { household: HouseholdPublicDto }) {
  return (
    <div className="border border-gold/40 bg-ivory px-6 py-9">
      <p className="font-display text-[1.625rem] text-bordeaux-700">
        Les réponses sont closes.
      </p>
      {household.status === "CONFIRMED" && (
        <p className="mt-2">
          Votre réponse :{" "}
          {peopleSentence(household.confirmedCount ?? household.allocatedSeats)}
          .
        </p>
      )}
      {household.status === "DECLINED" && (
        <p className="mt-2">
          Votre réponse : vous ne pourrez pas être des nôtres.
        </p>
      )}
      {household.status === "PENDING" && (
        <p className="mt-2">Nous n'avons pas reçu votre réponse.</p>
      )}
      {household.message && (
        <p className="mt-2 text-ink-muted">Votre mot : {household.message}</p>
      )}
    </div>
  );
}
