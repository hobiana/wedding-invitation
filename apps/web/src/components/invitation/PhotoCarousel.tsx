import { useId, useState } from "react";

/**
 * Les trois portraits de fiançailles, décrits d'après ce qu'on y voit.
 *
 * Le design portait ici trois images générées, légendées « dans le jardin »,
 * « au coucher du soleil », « devant la salle » — des légendes qui décrivaient
 * des photos qui n'existaient pas. Celles-ci sont les leurs.
 */
const PHOTOS = [
  {
    nom: "couple-jardin",
    alt:
      "Hobiana et Lovasoa se regardent dans un jardin, devant une maison de brique rouge, " +
      "en tenues blanches brodées de bordeaux.",
  },
  {
    nom: "couple-dos-a-dos",
    alt:
      "Hobiana et Lovasoa dos à dos au crépuscule, devant la façade vitrée de la salle, " +
      "en tenues blanches brodées de bordeaux.",
  },
  {
    nom: "couple-perron",
    alt:
      "Hobiana et Lovasoa côte à côte devant la salle de réception en fin de journée, " +
      "en tenues blanches brodées de bordeaux.",
  },
] as const;

/**
 * Le carrousel de photos, en profondeur : la photo courante au premier plan,
 * les deux autres en retrait, tournées et désaturées.
 *
 * Les trois restent dans le DOM — c'est ce qui permet la transition. Les deux
 * écartées sont `aria-hidden` : sans ça, la page annoncerait trois photos
 * superposées, dont deux que personne ne regarde.
 *
 * Pas de défilement automatique. Une photo qui change toute seule pendant
 * qu'on la regarde est une contrariété, et la faire reprendre après une
 * interaction demande un code que personne ne relira. On avance au doigt.
 */
export function PhotoCarousel() {
  const headingId = useId();
  const [courante, setCourante] = useState(0);

  const avance = (pas: number) =>
    setCourante((i) => (i + pas + PHOTOS.length) % PHOTOS.length);

  return (
    <section aria-labelledby={headingId} className="overflow-hidden px-6 pb-10 pt-8">
      <p className="text-center font-sans text-[0.72rem] uppercase tracking-[0.42em] text-ink-label">
        Nous deux
      </p>
      <h2
        id={headingId}
        className="mt-2 text-center font-display text-[2.375rem] leading-[1.1] text-bordeaux-700"
      >
        Avant le grand jour
      </h2>

      <div
        role="group"
        aria-roledescription="carrousel"
        aria-label="Photos de Hobiana et Lovasoa"
        className="relative mt-5 h-[22rem] [perspective:1200px]"
      >
        {PHOTOS.map((photo, i) => {
          // Décalage signé, ramené dans [-1, 1] pour que la première et la
          // dernière soient voisines : le tour est rond, pas une pile.
          let ecart = i - courante;
          if (ecart > PHOTOS.length / 2) ecart -= PHOTOS.length;
          if (ecart < -PHOTOS.length / 2) ecart += PHOTOS.length;
          const loin = Math.abs(ecart);
          const active = loin === 0;

          return (
            <figure
              key={photo.nom}
              data-photo={String(i)}
              aria-hidden={!active}
              style={{
                transform: `translateX(${ecart * 46}%) scale(${1 - loin * 0.16}) rotateY(${-ecart * 34}deg)`,
                zIndex: 10 - loin,
                opacity: active ? 1 : 0.5,
                filter: active ? "none" : "saturate(0.65) brightness(1.06)",
              }}
              className="absolute left-1/2 top-0 -ml-[min(33%,7.625rem)] h-full w-[min(66%,15.25rem)] overflow-hidden rounded-photo bg-ivory shadow-card transition-[transform,opacity,filter] duration-500 ease-(--ease-in)"
            >
              <picture>
                <source type="image/avif" srcSet={`/${photo.nom}.avif`} />
                <img
                  src={`/${photo.nom}.jpg`}
                  alt={photo.alt}
                  width={900}
                  height={1350}
                  loading={active ? undefined : "lazy"}
                  decoding="async"
                  className="h-full w-full object-cover"
                />
              </picture>
            </figure>
          );
        })}

        <button
          type="button"
          onClick={() => avance(-1)}
          aria-label="Photo précédente"
          className="absolute left-3 top-1/2 z-20 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-bordeaux-900/80 font-sans text-[1.0625rem] text-on-bordeaux transition-colors duration-(--duration-micro) hover:bg-bordeaux-900"
        >
          <span aria-hidden="true">‹</span>
        </button>
        <button
          type="button"
          onClick={() => avance(1)}
          aria-label="Photo suivante"
          className="absolute right-3 top-1/2 z-20 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-bordeaux-900/80 font-sans text-[1.0625rem] text-on-bordeaux transition-colors duration-(--duration-micro) hover:bg-bordeaux-900"
        >
          <span aria-hidden="true">›</span>
        </button>
      </div>

      {/* Les pastilles ne sont pas qu'un indicateur : ce sont les seules cibles
          qui permettent d'aller directement à la troisième photo. */}
      <div className="mt-5 flex justify-center gap-2.5">
        {PHOTOS.map((photo, i) => (
          <button
            key={photo.nom}
            type="button"
            onClick={() => setCourante(i)}
            aria-label={`Aller à la photo ${i + 1}`}
            aria-current={i === courante ? "true" : undefined}
            className={`h-2 rounded-full transition-[width,background-color] duration-(--duration-transition) ${
              i === courante ? "w-6 bg-bordeaux-500" : "w-2 bg-bordeaux-500/30"
            }`}
          />
        ))}
      </div>
    </section>
  );
}
