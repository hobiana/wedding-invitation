import { render, screen, fireEvent, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RsvpForm } from "./RsvpForm";

const YES = /nous serons là/i;
const NO = /nous ne pourrons pas venir/i;

function setup(props: Partial<React.ComponentProps<typeof RsvpForm>> = {}) {
  const onSubmit = vi.fn();
  const utils = render(
    <RsvpForm householdName="Famille Rakoto" allocatedSeats={4} onSubmit={onSubmit} {...props} />,
  );
  return { onSubmit, ...utils };
}

function send() {
  fireEvent.click(screen.getByRole("button", { name: /envoyer notre réponse|réessayer/i }));
}

describe("RsvpForm — le choix", () => {
  // Le défaut relevé à l'audit : « Je viens » était un bouton plein et « Je ne
  // viendrai pas » un bouton fantôme deux fois plus large. Deux poids, deux
  // messages — la page poussait à accepter. Une seule question, deux options du
  // même contrôle : l'équilibre devient structurel et ne peut plus dériver.
  it("asks one question with two options, not two buttons of unequal weight", () => {
    setup();

    const yes = screen.getByRole("radio", { name: YES });
    const no = screen.getByRole("radio", { name: NO });

    expect(yes).toHaveAttribute("name", no.getAttribute("name"));
    expect(screen.queryByRole("button", { name: YES })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: NO })).not.toBeInTheDocument();
  });

  it("gives the two unselected cards the very same styling", () => {
    setup();

    const yes = screen.getByRole("radio", { name: YES }).closest("label");
    const no = screen.getByRole("radio", { name: NO }).closest("label");

    expect(yes?.className).toBe(no?.className);
  });

  // Trois signaux, jamais la couleur seule : l'état coché, le liseré épaissi et
  // le disque plein. Un invité daltonien, un écran en plein soleil et un
  // lecteur d'écran voient chacun au moins un des trois.
  it("marks only the chosen card, and marks it in more than one way", () => {
    setup();
    fireEvent.click(screen.getByRole("radio", { name: YES }));

    const yes = screen.getByRole("radio", { name: YES });
    const no = screen.getByRole("radio", { name: NO });

    expect(yes).toBeChecked();
    expect(no).not.toBeChecked();
    expect(yes.closest("label")?.className).not.toBe(no.closest("label")?.className);
  });

  // Un bouton d'envoi grisé sans explication laisse l'invité chercher ce qui
  // manque. On accepte le clic et on dit ce qui manque, en français.
  it("says what is missing rather than silently refusing to send", () => {
    const { onSubmit } = setup();

    send();

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText(/merci d'indiquer si vous serez présents/i)).toBeInTheDocument();
  });
});

/**
 * Décision du commanditaire, 2026-09-10 : confirmer veut dire « nous venons
 * tous ». L'invité ne choisit plus un nombre — l'organisateur l'a déjà fixé en
 * accordant les places, et c'est le serveur qui le pose.
 *
 * Ce qui se joue ici n'est donc pas l'absence d'un champ, mais ce qui le
 * remplace : un invité doit **lire avant d'envoyer** qu'il engage tout son
 * foyer, et savoir par où passer si ça change.
 */
describe("RsvpForm — le nombre, désormais décidé par l'organisateur", () => {
  it("offers no way at all to state a number", () => {
    setup({ allocatedSeats: 3 });
    fireEvent.click(screen.getByRole("radio", { name: YES }));

    expect(screen.queryByLabelText(/combien serez-vous/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("spinbutton")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /une personne de plus/i })).not.toBeInTheDocument();
  });

  it("says how many it is counting, and how to correct it", () => {
    setup({ allocatedSeats: 4 });
    fireEvent.click(screen.getByRole("radio", { name: YES }));

    expect(screen.getByText(/4 places vous sont réservées/i)).toBeInTheDocument();
    expect(screen.getByText(/nous comptons donc sur vous 4/i)).toBeInTheDocument();
    expect(screen.getByText(/coup de téléphone/i)).toBeInTheDocument();
  });

  it("writes the reserved seats in the singular for a household of one", () => {
    setup({ allocatedSeats: 1 });
    fireEvent.click(screen.getByRole("radio", { name: YES }));

    expect(screen.getByText(/1 place vous est réservée/i)).toBeInTheDocument();
  });

  // Rien à annoncer à qui ne vient pas : la phrase ne parle que de présence.
  it("stays quiet about seats when the household declines", () => {
    setup();
    fireEvent.click(screen.getByRole("radio", { name: NO }));

    expect(screen.queryByText(/places vous sont réservées/i)).not.toBeInTheDocument();
  });
});

describe("RsvpForm — l'en-tête du foyer", () => {
  // La seule information de la page propre à ce lien : c'est elle qui fait
  // lire l'écran comme du courrier plutôt que comme un formulaire.
  it("names the household and the seats held for it", () => {
    setup({ householdName: "Famille Rasoanaivo", allocatedSeats: 3 });

    expect(screen.getByText("Famille Rasoanaivo")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  // Une invitation est adressée à des gens, pas à un foyer. Le design ne
  // montrait ces prénoms nulle part ; ils existent en base et l'organisateur
  // les a saisis à la main.
  it("names the people invited when the organiser recorded them", () => {
    setup({ memberNames: ["Anna", "Bob", "Chloé"] });

    expect(screen.getByText("Anna, Bob et Chloé")).toBeInTheDocument();
  });

  it("says nothing extra when no names were recorded", () => {
    const { container } = setup({ memberNames: [] });

    expect(container).not.toHaveTextContent(" et ");
  });
});

describe("RsvpForm — la soumission", () => {
  it("sends the status and the word, trimmed", () => {
    const { onSubmit } = setup();
    fireEvent.click(screen.getByRole("radio", { name: YES }));
    fireEvent.change(screen.getByLabelText(/un mot pour nous/i), {
      target: { value: "  Nous avons hâte  " },
    });

    send();

    expect(onSubmit).toHaveBeenCalledWith({
      status: "CONFIRMED",
      message: "Nous avons hâte",
    });
  });

  // `""` n'est pas `null`. Une page d'admin qui compte les messages compterait
  // chaque textarea intacte — c'est exactement ce qui était arrivé aux régimes.
  it.each(["", "   "])("omits the message entirely when it holds %o", (vide) => {
    const { onSubmit } = setup();
    fireEvent.click(screen.getByRole("radio", { name: YES }));
    fireEvent.change(screen.getByLabelText(/un mot pour nous/i), { target: { value: vide } });
    send();

    expect(onSubmit).toHaveBeenCalledWith({ status: "CONFIRMED", message: undefined });
  });

  // Invariant : `confirmedCount` reste nul tant que personne n'a annoncé venir,
  // et l'invité n'a de toute façon aucun moyen d'en parler.
  it("sends a refusal without any guest count at all", () => {
    const { onSubmit } = setup();
    fireEvent.click(screen.getByRole("radio", { name: NO }));
    send();

    expect(onSubmit).toHaveBeenCalledWith({ status: "DECLINED", message: undefined });
  });

  // C'est souvent là que se écrit le mot le plus important — celui de qui ne
  // pourra pas venir.
  it("still offers the word to a household that declines", () => {
    const { onSubmit } = setup();
    fireEvent.click(screen.getByRole("radio", { name: NO }));
    fireEvent.change(screen.getByLabelText(/un mot pour nous/i), {
      target: { value: "Nous serons avec vous de loin" },
    });
    send();

    expect(onSubmit).toHaveBeenCalledWith({
      status: "DECLINED",
      message: "Nous serons avec vous de loin",
    });
  });

  it("starts on the answer already recorded so an edit is not a fresh start", () => {
    setup({ defaultStatus: "CONFIRMED", defaultMessage: "À très vite" });

    expect(screen.getByRole("radio", { name: YES })).toBeChecked();
    expect(screen.getByLabelText(/un mot pour nous/i)).toHaveValue("À très vite");
  });
});

describe("RsvpForm — l'envoi en cours et l'échec", () => {
  // Le double envoi relevé à l'audit. Pas de roue de chargement : le libellé
  // qui change dit la même chose et ne coûte pas une animation.
  it("says it is sending and refuses a second click", () => {
    setup({ isPending: true });

    const button = screen.getByRole("button", { name: /envoi…/i });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
  });

  // L'API renvoie « RSVP deadline has passed » en anglais. Un invité français
  // ne doit jamais lire la chaîne brute d'un serveur.
  it("shows the French message it was handed, with a way to try again", () => {
    setup({ errorMessage: "Votre réponse n'a pas pu être enregistrée." });

    expect(screen.getByText(/votre réponse n'a pas pu être enregistrée/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /réessayer/i })).toBeInTheDocument();
  });

  it("announces the failure rather than leaving it to be noticed", () => {
    setup({ errorMessage: "Votre réponse n'a pas pu être enregistrée." });

    const alert = screen.getByRole("alert");
    expect(within(alert).getByText(/n'a pas pu être enregistrée/i)).toBeInTheDocument();
  });
});
