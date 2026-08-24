/**
 * La photo du couple, pleine largeur, sans texte, sans voile, sans arrondi
 * (§9 §3). Deux recadrages produits à la tâche 7 : un **3:4 portrait** pour le
 * téléphone, un **3:2 paysage** au-delà de 768 px — un paysage servi à un
 * téléphone donnerait une bande de 125 px de haut.
 *
 * `<picture>` à **deux `media` × deux `type`**, dans cet ordre exact : le
 * navigateur retient la *première* source dont le `media` correspond et dont
 * le `type` lui est connu. L'AVIF passe donc avant le JPEG à chaque largeur, et
 * le `<img>` de repli reste un JPEG — le seul format que tout navigateur
 * décode. Un `<img>` en AVIF n'afficherait rien là où l'AVIF manque.
 *
 * Pas de `srcset` à plusieurs largeurs : l'AVIF paysage 1800 × 1200 pèse
 * **26,8 Ko**. Découper en trois largeurs économiserait des kilo-octets sur un
 * fichier qui en fait vingt-sept, au prix de neuf fichiers de plus à produire
 * et à garder cohérents.
 *
 * Le ratio affiché est celui des fichiers livrés, pas le 4/5 esquissé au §9 :
 * afficher un 3:4 dans une boîte 4/5 en recouperait 6 %, et ces 6 % ont été
 * choisis à la main pour tenir le décor hors du cadre.
 */
export function CouplePhoto() {
  return (
    <picture>
      <source media="(min-width: 768px)" type="image/avif" srcSet="/couple-paysage.avif" />
      <source media="(min-width: 768px)" type="image/jpeg" srcSet="/couple-paysage.jpg" />
      <source type="image/avif" srcSet="/couple-portrait.avif" />
      <img
        src="/couple-portrait.jpg"
        alt="Hobiana et Lovasoa, en tenue de fiançailles ivoire et bordeaux, main dans la main."
        width={1080}
        height={1440}
        loading="lazy"
        decoding="async"
        className="aspect-[3/4] w-full object-cover md:aspect-[3/2]"
      />
    </picture>
  );
}
