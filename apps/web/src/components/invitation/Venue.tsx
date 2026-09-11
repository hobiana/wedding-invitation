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

      {/* Le cadre du design, avec une vraie carte dedans au lieu du carré
          hachuré. Hauteur fixe et modeste : la carte situe le lieu, elle ne
          remplace pas l'application de navigation de l'invité. */}
      <div className="mt-7 border border-gold/40 bg-page p-2.5">
        <iframe
          title={`Carte — ${venueName}`}
          src={carteEmbarquee(venueName, address)}
          // Chargée seulement quand l'invité arrive dessus : elle est loin dans
          // la page, et personne ne doit payer une carte qu'il ne verra pas.
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          className="block h-[17rem] w-full border-0"
        />
      </div>

      {route && (
        <a
          href={route}
          target="_blank"
          rel="noopener noreferrer"
          // Un contour fin plutôt qu'un aplat pleine largeur : la carte
          // au-dessus porte déjà le poids visuel de la section, et deux blocs
          // pleins l'un sur l'autre feraient panneau publicitaire.
          className="mt-5 inline-flex items-center gap-2 border border-gold px-6 py-3 font-sans text-[0.6875rem] uppercase tracking-[0.24em] text-bordeaux-700 transition-colors duration-(--duration-micro) ease-(--ease-in) hover:border-bordeaux-700 hover:bg-bordeaux-700 hover:text-on-bordeaux"
        >
          Itinéraire vers la réception
          <span aria-hidden="true">→</span>
          <span className="sr-only"> (nouvel onglet)</span>
        </a>
      )}
    </section>
  );
}

/**
 * L'adresse de la carte embarquée, construite depuis le nom et l'adresse que
 * l'organisateur a saisis — pas depuis `mapUrl`, qui est du texte libre et
 * peut pointer n'importe où. Si le lieu change dans l'admin, la carte suit.
 *
 * Cette forme de Google Maps ne demande **aucune clé d'API** : rien à créer,
 * rien à facturer, rien à mettre dans le bundle. En contrepartie elle n'est pas
 * documentée par Google et pourrait changer un jour — d'où le bouton
 * d'itinéraire en dessous, qui reste la voie sûre si la carte ne s'affiche pas.
 *
 * Elle charge aussi des ressources Google chez chaque invité. Pour un
 * faire-part c'est l'usage, mais c'est dit.
 */
function carteEmbarquee(venueName: string, address: string): string {
  const lieu = encodeURIComponent(`${venueName}, ${address}`);
  return `https://maps.google.com/maps?q=${lieu}&hl=fr&z=15&output=embed`;
}
