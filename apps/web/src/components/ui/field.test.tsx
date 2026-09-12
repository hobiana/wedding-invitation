import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Field } from "./field";
import { Input } from "./input";

describe("Field", () => {
  // The audit found 11 hand-rolled field blocks; several wired `htmlFor` to an
  // id the caller had to remember to repeat on the control. Generating it is
  // the only way the association cannot be forgotten.
  it("associates the label with the control when no id is supplied", () => {
    render(
      <Field label="Nom du foyer">
        <Input />
      </Field>,
    );
    expect(screen.getByLabelText("Nom du foyer")).toBeInstanceOf(HTMLInputElement);
  });

  it("gives two fields on the same page distinct ids", () => {
    render(
      <>
        <Field label="Prénom">
          <Input />
        </Field>
        <Field label="Nom">
          <Input />
        </Field>
      </>,
    );
    const first = screen.getByLabelText("Prénom");
    const second = screen.getByLabelText("Nom");
    expect(first.id).not.toBe("");
    expect(first.id).not.toBe(second.id);
  });

  it("honours an explicit id so callers can target the control", () => {
    render(
      <Field label="Capacité" id="tableCapacity">
        <Input />
      </Field>,
    );
    expect(screen.getByLabelText("Capacité")).toHaveAttribute("id", "tableCapacity");
  });

  it("marks the control invalid and links the message when there is an error", () => {
    render(
      <Field label="Personnes confirmées" error="Dépasse le nombre de places allouées">
        <Input />
      </Field>,
    );
    const control = screen.getByLabelText("Personnes confirmées");
    expect(control).toHaveAttribute("aria-invalid", "true");
    expect(control).toHaveAccessibleDescription("Dépasse le nombre de places allouées");
  });

  // An error signalled only by a red border is invisible to a colour-blind
  // guest and to a screen reader alike. The message is the information.
  it("renders the error as readable text, not only as a state", () => {
    render(
      <Field label="Email" error="Adresse invalide">
        <Input />
      </Field>,
    );
    expect(screen.getByText("Adresse invalide")).toBeInTheDocument();
  });

  // `aria-describedby` n'est lu qu'au moment où le focus arrive sur le champ.
  // Or l'erreur apparaît sur un clic d'« Enregistrer » : le focus est sur le
  // bouton et n'en bouge pas, donc sans région live le formulaire refuse en
  // silence. L'ancien bloc fait main de HouseholdFormDialog portait ce
  // `role="alert"` ; la primitive l'avait perdu au passage.
  it("announces the error when it appears, rather than refusing in silence", () => {
    const { rerender } = render(
      <Field label="Personnes confirmées">
        <Input />
      </Field>,
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    rerender(
      <Field label="Personnes confirmées" error="Un foyer confirmé compte au moins une personne.">
        <Input />
      </Field>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Un foyer confirmé compte au moins une personne.",
    );
  });

  it("leaves the control unmarked when there is no error", () => {
    render(
      <Field label="Email">
        <Input />
      </Field>,
    );
    const control = screen.getByLabelText("Email");
    expect(control).not.toHaveAttribute("aria-invalid");
    expect(control).not.toHaveAttribute("aria-describedby");
  });

  it("links a hint to the control", () => {
    render(
      <Field label="Message" hint="Il sera lu par les mariés">
        <Input />
      </Field>,
    );
    expect(screen.getByLabelText("Message")).toHaveAccessibleDescription(
      "Il sera lu par les mariés",
    );
  });

  it("announces hint and error together rather than dropping one", () => {
    render(
      <Field label="Places" hint="Entre 1 et 8" error="Trop de places">
        <Input />
      </Field>,
    );
    expect(screen.getByLabelText("Places")).toHaveAccessibleDescription(
      "Entre 1 et 8 Trop de places",
    );
  });

  it("states that a field is required in words, not with a bare asterisk", () => {
    render(
      <Field label="Nom du foyer" required>
        <Input />
      </Field>,
    );
    expect(screen.getByLabelText(/Nom du foyer/)).toBeRequired();
    expect(screen.getByText(/obligatoire/i)).toBeInTheDocument();
  });

  it("wraps a Select as readily as an Input", async () => {
    const { Select } = await import("./select");
    render(
      <Field label="Statut">
        <Select>
          <option value="CONFIRMED">Confirmé</option>
        </Select>
      </Field>,
    );
    expect(screen.getByLabelText("Statut")).toBeInstanceOf(HTMLSelectElement);
  });

  it("wraps a Textarea as readily as an Input", async () => {
    const { Textarea } = await import("./textarea");
    render(
      <Field label="Régime alimentaire">
        <Textarea />
      </Field>,
    );
    expect(screen.getByLabelText("Régime alimentaire")).toBeInstanceOf(HTMLTextAreaElement);
  });
});
