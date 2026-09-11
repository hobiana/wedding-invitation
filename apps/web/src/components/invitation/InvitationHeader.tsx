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
          anglaise, ses jambages se croisent si on serre l'interligne.

          Les trois lignes sont des `block` plutôt que du texte nu parce qu'elles
          s'animent séparément — `data-nom` les numérote, et `index.css` leur
          donne leurs retards. Le rendu au repos est identique : elles
          étaient déjà sur trois lignes, elles y restent. */}
      <h1 className="mt-8 font-script text-[3.5rem] leading-[1.05] text-bordeaux-700">
        <ScriptName name={COUPLE.firstNames[0]} startsAt={0.35} />
        {/* L'esperluette est un signe, pas un mot : masquée à l'œil des
            lecteurs d'écran, elle laissait le titre se prononcer
            « HobianaLovasoa » d'un seul souffle. Un « et » en clair, invisible
            à l'écran, rend au titre sa respiration — et c'est ainsi qu'un
            francophone le lit de toute façon. */}
        <span
          data-nom="2"
          className="block font-display text-[1.5rem] italic text-gold-ink"
        >
          <span aria-hidden="true">&amp;</span>
          <span className="sr-only"> et </span>
        </span>
        <ScriptName name={COUPLE.firstNames[1]} startsAt={1.25} />
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

/** 60 ms entre deux lettres : la main court, elle ne s'applique pas. */
const PAS_ENTRE_LETTRES = 0.06;

/**
 * Un prénom qui s'écrit, lettre après lettre.
 *
 * **Ce qu'entend un lecteur d'écran, et pourquoi c'est fait ainsi.** Un mot
 * découpé en `<span>` est lu lettre par lettre par certaines synthèses — « H,
 * O, B, I, A, N, A ». Le prénom est donc écrit **deux fois** : une fois en
 * clair pour les technologies d'assistance, qui prononcent « Hobiana » ; une
 * fois en lettres séparées, marquées `aria-hidden`, qui ne sont là que pour
 * l'œil. Le titre de niveau 1 de la page se lit donc exactement comme avant.
 *
 * **Ce que ça coûte à la typographie : 0,05 px sur 188.** Mesuré dans un vrai
 * navigateur, Parisienne chargée, avant d'écrire la première ligne. Ses
 * liaisons ne tiennent pas à un crénage entre paires — elles sont dans le
 * dessin des glyphes — donc le découpage ne disloque rien.
 *
 * Le retard de chaque lettre est posé en style en ligne parce qu'il se calcule :
 * il l'emporte sur la règle de `index.css`, un style en ligne battant une
 * feuille de style.
 */
function ScriptName({ name, startsAt }: { name: string; startsAt: number }) {
  return (
    <span className="block">
      <span className="sr-only">{name}</span>
      <span aria-hidden="true">
        {[...name].map((lettre, i) => (
          <span
            key={i}
            data-lettre=""
            style={{
              animationDelay: `${(startsAt + i * PAS_ENTRE_LETTRES).toFixed(3)}s`,
            }}
          >
            {lettre}
          </span>
        ))}
      </span>
    </span>
  );
}
