import { weddingMonthGrid } from "@/lib/datetime";

const JOURS = ["Lu", "Ma", "Me", "Je", "Ve", "Sa", "Di"];

/**
 * Le mois du mariage, avec un cœur sur le jour.
 *
 * Il est **entièrement muet pour les lecteurs d'écran**. Ce n'est pas un
 * oubli : il ne porte aucune information que la page ne donne déjà deux fois —
 * le faire-part écrit la date en toutes lettres, le programme donne l'heure.
 * Lu à voix haute, il ferait épeler trente-et-un nombres entre deux choses
 * utiles. C'est une image de la date, pas la date.
 *
 * Un `<table>` quand même, et pas une grille de div : c'est un tableau, et le
 * jour de la semaine est bien l'en-tête de sa colonne. Si un jour ce
 * calendrier devait parler, il n'y aurait rien à refaire.
 */
export function Calendar({ weddingDate }: { weddingDate: string }) {
  const { label, weeks, weddingDay } = weddingMonthGrid(weddingDate);

  return (
    <div
      data-testid="calendrier"
      aria-hidden="true"
      className="mx-auto mt-8 max-w-[24.25rem] rounded-[0.875rem] bg-page px-6 pb-6 pt-7 shadow-card"
    >
      <p className="font-script text-[2rem] leading-none text-bordeaux-700 capitalize">{label}</p>

      <table className="mt-5 w-full table-fixed border-collapse">
        <thead>
          <tr>
            {JOURS.map((jour) => (
              <th
                key={jour}
                scope="col"
                className="border-b border-ink-label/20 pb-3 font-sans text-[0.6875rem] font-normal tracking-[0.06em] text-ink-label"
              >
                {jour}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="font-sans text-[0.8125rem] text-bordeaux-700">
          {weeks.map((semaine, i) => (
            <tr key={i}>
              {semaine.map((jour, j) => (
                <td key={j} className="py-2 text-center align-middle">
                  {jour === weddingDay ? (
                    // Le cœur est posé derrière le chiffre, pas à côté : la
                    // case garde sa largeur, la grille ne se déforme pas.
                    <span
                      data-jour-du-mariage
                      className="relative inline-grid h-9 w-9 place-items-center"
                    >
                      <span className="absolute text-[2.75rem] leading-none text-bordeaux-700">
                        ♥
                      </span>
                      <span className="relative font-medium text-on-bordeaux">{jour}</span>
                    </span>
                  ) : (
                    jour
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
