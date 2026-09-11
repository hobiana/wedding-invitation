import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { InvitationHeader } from "./InvitationHeader";

describe("InvitationHeader", () => {
  // Anglais assumé : le commanditaire a tranché pour garder l'expression de son
  // design, passée dans le vocabulaire français du mariage. C'est la seule
  // exception à la règle « interface invité en français sans exception », et ce
  // test est là pour qu'on ne la « corrige » pas un jour par réflexe.
  it("keeps the client's Save the date, the one sanctioned English phrase", () => {
    render(<InvitationHeader />);

    expect(screen.getByText("Save the date")).toBeInTheDocument();
  });

  it("puts the couple's given names in the page's only first-level heading", () => {
    render(<InvitationHeader />);

    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toHaveTextContent("Hobiana");
    expect(heading).toHaveTextContent("Lovasoa");
  });

  it("carries the verse and says where it comes from", () => {
    render(<InvitationHeader />);

    expect(screen.getByText(/ils ne sont plus deux/i)).toBeInTheDocument();
    expect(screen.getByText("Matthieu 19:6")).toBeInTheDocument();
  });

  /**
   * La distinction qui compte dans cet en-tête : la photo montre les mariés et
   * doit se décrire, l'enveloppe et les fleurs ne montrent rien et doivent se
   * taire. Une aquarelle annoncée à voix haute avant les prénoms, c'est le
   * genre de détail qui rend une page pénible à écouter.
   */
  it("describes the photograph of the couple", () => {
    render(<InvitationHeader />);

    const photo = screen.getByRole("img", { name: /hobiana et lovasoa/i });
    expect(photo).toBeInTheDocument();
  });

  it("keeps the envelope and the flowers silent", () => {
    const { container } = render(<InvitationHeader />);

    const muettes = container.querySelectorAll('img[alt=""]');
    // L'enveloppe ouverte, la branche fleurie, et le socle de fleurs.
    expect(muettes).toHaveLength(3);
    muettes.forEach((image) => expect(image).toHaveAttribute("aria-hidden", "true"));
  });

  // Le JPEG reste le `src` du `<img>` : c'est le seul format que tout
  // navigateur décode. Un `<img>` en AVIF n'afficherait rien là où il manque.
  it("falls back to JPEG for the photograph", () => {
    render(<InvitationHeader />);

    expect(screen.getByRole("img", { name: /hobiana et lovasoa/i })).toHaveAttribute(
      "src",
      expect.stringContaining(".jpg"),
    );
  });
});
