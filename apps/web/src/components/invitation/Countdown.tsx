import { useEffect, useId, useState } from "react";

const SECONDE = 1000;
const MINUTE = 60 * SECONDE;
const HEURE = 60 * MINUTE;
const JOUR = 24 * HEURE;

type Reste = { jours: number; heures: number; minutes: number; secondes: number };

function resteJusqua(iso: string, maintenant: number): Reste {
  const ecart = new Date(iso).getTime() - maintenant;
  // Le lendemain du mariage, la page existe encore : on y revient pour
  // retrouver une adresse ou une photo. Un compteur négatif serait un défaut
  // visible le seul jour où plus personne n'est disponible pour le corriger.
  if (ecart <= 0) return { jours: 0, heures: 0, minutes: 0, secondes: 0 };
  return {
    jours: Math.floor(ecart / JOUR),
    heures: Math.floor(ecart / HEURE) % 24,
    minutes: Math.floor(ecart / MINUTE) % 60,
    secondes: Math.floor(ecart / SECONDE) % 60,
  };
}

const deuxChiffres = (n: number) => String(n).padStart(2, "0");

/**
 * Le compte à rebours jusqu'à la cérémonie.
 *
 * Les chiffres qui défilent sont `aria-hidden`, et une phrase les remplace
 * pour qui écoute la page. Ce n'est pas une précaution de principe : un
 * compteur de secondes dans une région annoncée se réannonce indéfiniment et
 * recouvre tout le reste — le lecteur d'écran ne parlerait plus que de lui.
 * La phrase, elle, se lit une fois et dit la seule chose utile.
 *
 * Le battement est d'une seconde parce que le cadran affiche des secondes ;
 * `prefers-reduced-motion` ne le coupe pas, un chiffre qui change n'étant pas
 * un mouvement dans l'espace. Rien ici ne translate, ne tourne ni ne clignote.
 */
export function Countdown({ weddingDate }: { weddingDate: string }) {
  const headingId = useId();
  const [reste, setReste] = useState(() => resteJusqua(weddingDate, Date.now()));

  useEffect(() => {
    // Recalculé tout de suite : entre le premier rendu et la première seconde,
    // la date a pu changer de propriétaire (navigation, réveil de l'onglet).
    setReste(resteJusqua(weddingDate, Date.now()));
    const battement = setInterval(() => {
      setReste(resteJusqua(weddingDate, Date.now()));
    }, SECONDE);
    return () => clearInterval(battement);
  }, [weddingDate]);

  const passe =
    reste.jours === 0 && reste.heures === 0 && reste.minutes === 0 && reste.secondes === 0;

  const cases: { valeur: string; libelle: string }[] = [
    { valeur: String(reste.jours), libelle: "Jours" },
    { valeur: deuxChiffres(reste.heures), libelle: "Heures" },
    { valeur: deuxChiffres(reste.minutes), libelle: "Min" },
    { valeur: deuxChiffres(reste.secondes), libelle: "Sec" },
  ];

  return (
    <section aria-labelledby={headingId} className="px-6 pb-8 pt-11 text-center">
      <p className="font-sans text-[0.72rem] uppercase tracking-[0.42em] text-ink-label">
        Compte à rebours
      </p>
      <h2
        id={headingId}
        className="mt-2 font-display text-[2.375rem] leading-[1.1] text-bordeaux-700"
      >
        Le jour J approche
      </h2>
      <div aria-hidden="true" className="mx-auto mt-4 h-px w-14 bg-gold" />

      <div data-testid="cadran" aria-hidden="true" className="mt-6 grid grid-cols-4 gap-2">
        {cases.map((c) => (
          <div key={c.libelle} className="border border-gold/30 bg-page px-1 py-4">
            <p className="font-display text-[2.875rem] font-light leading-[0.9] text-bordeaux-700 tabular-nums">
              {c.valeur}
            </p>
            <p className="mt-2.5 font-sans text-[0.66rem] uppercase tracking-[0.24em] text-gold-ink">
              {c.libelle}
            </p>
          </div>
        ))}
      </div>

      <p className="sr-only">
        {passe
          ? "Le grand jour est passé."
          : `Il reste ${reste.jours} ${reste.jours > 1 ? "jours" : "jour"} avant le mariage.`}
      </p>
    </section>
  );
}
