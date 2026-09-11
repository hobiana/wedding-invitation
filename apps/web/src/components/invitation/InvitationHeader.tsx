import { COUPLE } from "@/components/invitation/couple";
import { VERSE } from "@/components/invitation/wedding-content";

/**
 * L'en-tête : l'enveloppe ouverte d'où sort votre photo, les prénoms, le
 * verset.
 *
 * La composition est un empilement de quatre calques dans une boîte de hauteur
 * fixe — enveloppe, branche, photo inclinée, socle de fleurs. Elle est en
 * position absolue parce que les calques se chevauchent volontairement : la
 * photo dépasse du rabat, les fleurs mordent sur l'enveloppe. Un flux normal
 * les mettrait bout à bout et le tour de main disparaîtrait.
 *
 * La seule image qui parle est la photo. L'enveloppe et les fleurs ne montrent
 * rien que le texte ne dise ; les annoncer à voix haute avant les prénoms
 * rendrait la page pénible à écouter.
 *
 * « Save the date » est la seule expression anglaise de l'interface invité.
 * Exception assumée par le commanditaire, qui a gardé la formule de son design.
 */
export function InvitationHeader() {
  return (
    <header className="px-6 pb-14 pt-11 text-center">
      <p className="font-sans text-[0.75rem] uppercase tracking-[0.4em] text-bordeaux-500">
        Save the date
      </p>

      <div className="relative mx-auto mt-7 h-[26rem] max-w-[21.375rem]">
        <img
          src="/decor/enveloppe-ouverte.webp"
          alt=""
          aria-hidden="true"
          className="absolute left-0 top-2 z-10 w-full select-none"
        />
        <img
          src="/decor/branche-fleurie.webp"
          alt=""
          aria-hidden="true"
          className="absolute -left-1.5 top-6 z-20 w-32 -rotate-6 select-none"
        />

        {/* La photo est posée de travers et débordante, comme un tirage glissé
            dans une enveloppe — pas centrée, sinon c'est une vignette. */}
        <div className="absolute left-[23%] right-[20%] top-6 z-30 rotate-3 bg-ivory p-2.5 pb-6 shadow-card">
          <div className="aspect-[3/4] overflow-hidden">
            <picture>
              <source type="image/avif" srcSet="/couple-portrait.avif" />
              <img
                src="/couple-portrait.jpg"
                alt="Hobiana et Lovasoa, en tenue de fiançailles ivoire et bordeaux, main dans la main."
                width={1080}
                height={1440}
                decoding="async"
                className="h-full w-full object-cover"
              />
            </picture>
          </div>
        </div>

        <img
          src="/decor/enveloppe-socle.webp"
          alt=""
          aria-hidden="true"
          className="absolute bottom-2 left-0 z-40 w-full select-none drop-shadow-[0_1.375rem_2.125rem_rgb(0_0_0/0.28)]"
        />
      </div>

      {/* Un prénom par ligne, l'esperluette sur la sienne : Parisienne est une
          anglaise, ses jambages se croisent si on serre l'interligne. */}
      <h1 className="mt-8 font-script text-[3.5rem] leading-[1.05] text-bordeaux-700">
        {COUPLE.firstNames[0]}
        <span
          aria-hidden="true"
          className="block font-display text-[1.5rem] italic text-gold-ink"
        >
          &amp;
        </span>
        {COUPLE.firstNames[1]}
      </h1>

      <figure className="mx-auto mt-6 max-w-[25rem]">
        <blockquote className="font-display text-[1.25rem] italic leading-[1.6] text-gold-ink text-pretty">
          {VERSE.text}
        </blockquote>
        <figcaption className="mt-3.5 font-sans text-[0.6875rem] uppercase tracking-[0.36em] text-gold-ink">
          {VERSE.reference}
        </figcaption>
      </figure>
    </header>
  );
}
