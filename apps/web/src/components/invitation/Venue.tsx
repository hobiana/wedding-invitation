import { useId } from "react";
import { httpUrlOrNull } from "@/lib/url";

/**
 * Le lieu de la réception, et le chemin pour y aller.
 *
 * Le design posait ici un carré gris hachuré portant « carte du lieu ·
 * capture ». Il n'y est plus : **une fausse carte est pire que pas de carte**.
 * Elle promet une image qui n'arrivera jamais, et un invité qui la touche ne
 * comprend pas pourquoi rien ne se passe. Ce qu'on avait déjà, et qui marche,
 * c'est le lien — saisi par l'organisateur, filtré, ouvert dans un onglet.
 *
 * Sans lien, il ne reste que le nom et l'adresse. C'est l'information ; le
 * lien n'est que la commodité.
 */
export function Venue({
  venueName,
  address,
  mapUrl,
}: {
  venueName: string;
  address: string;
  mapUrl: string | null;
}) {
  const headingId = useId();
  const route = httpUrlOrNull(mapUrl);

  return (
    <section aria-labelledby={headingId} className="px-6 pb-12 pt-11 text-center">
      <p className="font-sans text-[0.72rem] uppercase tracking-[0.42em] text-ink-label">
        Le lieu
      </p>
      <h2
        id={headingId}
        className="mt-2 font-display text-[2.375rem] leading-[1.1] text-bordeaux-700"
      >
        {venueName}
      </h2>
      <p className="mt-2.5 font-sans text-[0.78rem] leading-[1.8] tracking-[0.16em] text-ink-muted">
        {address}
      </p>
      <div aria-hidden="true" className="mx-auto mt-5 h-px w-14 bg-gold" />

      {route && (
        <a
          href={route}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-8 block bg-bordeaux-700 px-4 py-4 font-sans text-[0.75rem] uppercase tracking-[0.28em] text-on-bordeaux shadow-[inset_0_0_0_1px_var(--color-gold)] transition-colors duration-(--duration-micro) ease-(--ease-in) hover:bg-bordeaux-500"
        >
          Itinéraire vers la réception
          <span className="sr-only"> (nouvel onglet)</span>
        </a>
      )}
    </section>
  );
}
