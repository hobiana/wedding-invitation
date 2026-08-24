import { render, screen, fireEvent, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RsvpForm } from "./RsvpForm";

const YES = /nous serons là/i;
const NO = /nous ne pourrons pas venir/i;

function setup(props: Partial<React.ComponentProps<typeof RsvpForm>> = {}) {
  const onSubmit = vi.fn();
  const utils = render(<RsvpForm allocatedSeats={4} onSubmit={onSubmit} {...props} />);
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

describe("RsvpForm — le nombre de convives", () => {
  it("offers a real number input, labelled and reachable by keyboard", () => {
    setup({ allocatedSeats: 3 });
    fireEvent.click(screen.getByRole("radio", { name: YES }));

    const input = screen.getByLabelText(/combien serez-vous/i) as HTMLInputElement;
    expect(input.type).toBe("number");
    expect(input.min).toBe("1");
    expect(input.max).toBe("3");
    expect(input.inputMode).toBe("numeric");
  });

  // Invariant 3 : confirmedCount <= allocatedSeats. Le serveur tranche, mais
  // l'interface n'a aucune raison d'envoyer sciemment une valeur refusée.
  it("clamps a typed count to the seats actually allocated", () => {
    const { onSubmit } = setup({ allocatedSeats: 2 });
    fireEvent.click(screen.getByRole("radio", { name: YES }));

    fireEvent.change(screen.getByLabelText(/combien serez-vous/i), { target: { value: "9" } });
    send();

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ confirmedCount: 2 }));
  });

  it("floors the count at one — a household that comes has at least one person", () => {
    const { onSubmit } = setup({ allocatedSeats: 4 });
    fireEvent.click(screen.getByRole("radio", { name: YES }));

    fireEvent.change(screen.getByLabelText(/combien serez-vous/i), { target: { value: "0" } });
    send();

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ confirmedCount: 1 }));
  });

  it("steps the count up and down", () => {
    const { onSubmit } = setup({ allocatedSeats: 4, defaultConfirmedCount: 2 });
    fireEvent.click(screen.getByRole("radio", { name: YES }));

    fireEvent.click(screen.getByRole("button", { name: /une personne de plus/i }));
    fireEvent.click(screen.getByRole("button", { name: /une personne de moins/i }));
    fireEvent.click(screen.getByRole("button", { name: /une personne de plus/i }));
    send();

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ confirmedCount: 3 }));
  });

  // Un <button> sans `type` à l'intérieur d'un <form> vaut `type="submit"` :
  // les deux pas du sélecteur enverraient la réponse au premier clic.
  it("does not submit the form when stepping the count", () => {
    const { onSubmit } = setup({ allocatedSeats: 4 });
    fireEvent.click(screen.getByRole("radio", { name: YES }));

    fireEvent.click(screen.getByRole("button", { name: /une personne de plus/i }));

    expect(onSubmit).not.toHaveBeenCalled();
  });

  // Un « + » grisé sans raison lit comme une panne. La ligne de places est la
  // raison, et elle est déjà là.
  it("stops at the allocated seats and keeps the reason visible", () => {
    setup({ allocatedSeats: 2 });
    fireEvent.click(screen.getByRole("radio", { name: YES }));

    fireEvent.change(screen.getByLabelText(/combien serez-vous/i), { target: { value: "2" } });

    expect(screen.getByRole("button", { name: /une personne de plus/i })).toBeDisabled();
    expect(screen.getByText(/2 places vous sont réservées/i)).toBeInTheDocument();
  });

  it("writes the reserved seats in the singular for a household of one", () => {
    setup({ allocatedSeats: 1 });
    fireEvent.click(screen.getByRole("radio", { name: YES }));

    expect(screen.getByText(/1 place vous est réservée/i)).toBeInTheDocument();
  });

  it("stops at one on the way down", () => {
    setup({ allocatedSeats: 4, defaultConfirmedCount: 1 });
    fireEvent.click(screen.getByRole("radio", { name: YES }));

    expect(screen.getByRole("button", { name: /une personne de moins/i })).toBeDisabled();
  });
});

describe("RsvpForm — la soumission", () => {
  it("sends the count and the note when the household is coming", () => {
    const { onSubmit } = setup({ allocatedSeats: 4, defaultConfirmedCount: 3 });
    fireEvent.click(screen.getByRole("radio", { name: YES }));
    fireEvent.change(screen.getByLabelText(/régime alimentaire/i), {
      target: { value: "  Végétarien  " },
    });

    send();

    expect(onSubmit).toHaveBeenCalledWith({
      status: "CONFIRMED",
      confirmedCount: 3,
      dietaryNotes: "Végétarien",
    });
  });

  // `""` n'est pas `null` : le tableau de bord comptait chaque textarea vide
  // comme un régime alimentaire à prévoir.
  it("omits dietaryNotes entirely when the textarea was left blank", () => {
    const { onSubmit } = setup();
    fireEvent.click(screen.getByRole("radio", { name: YES }));
    send();

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ status: "CONFIRMED", dietaryNotes: undefined }),
    );
  });

  it("omits dietaryNotes when the textarea holds only whitespace", () => {
    const { onSubmit } = setup();
    fireEvent.click(screen.getByRole("radio", { name: YES }));
    fireEvent.change(screen.getByLabelText(/régime alimentaire/i), { target: { value: "   " } });
    send();

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ dietaryNotes: undefined }));
  });

  // Invariant : `confirmedCount` reste nul tant que personne n'a annoncé venir.
  // Envoyer `0` détruirait la distinction « ne vient pas » / « pas répondu ».
  it("sends a refusal without any guest count at all", () => {
    const { onSubmit } = setup();
    fireEvent.click(screen.getByRole("radio", { name: NO }));
    send();

    expect(onSubmit).toHaveBeenCalledWith({ status: "DECLINED" });
  });

  it("stops asking how many and what they eat once the household declines", () => {
    setup();
    fireEvent.click(screen.getByRole("radio", { name: NO }));

    expect(screen.queryByLabelText(/combien serez-vous/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/régime alimentaire/i)).not.toBeInTheDocument();
  });

  it("reopens the details when the household changes its mind back", () => {
    setup();
    fireEvent.click(screen.getByRole("radio", { name: NO }));
    fireEvent.click(screen.getByRole("radio", { name: YES }));

    expect(screen.getByLabelText(/combien serez-vous/i)).toBeInTheDocument();
  });

  it("starts on the answer already recorded so an edit is not a fresh start", () => {
    setup({ defaultStatus: "CONFIRMED", defaultConfirmedCount: 2, defaultDietaryNotes: "Sans gluten" });

    expect(screen.getByRole("radio", { name: YES })).toBeChecked();
    expect(screen.getByLabelText(/régime alimentaire/i)).toHaveValue("Sans gluten");
    expect(screen.getByLabelText(/combien serez-vous/i)).toHaveValue(2);
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
