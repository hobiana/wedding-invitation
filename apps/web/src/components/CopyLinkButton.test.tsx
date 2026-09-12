import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CopyLinkButton } from "./CopyLinkButton";
import { copyToClipboard } from "@/lib/clipboard";

vi.mock("@/lib/clipboard", () => ({ copyToClipboard: vi.fn() }));
const copier = vi.mocked(copyToClipboard);

beforeEach(() => copier.mockReset());

describe("CopyLinkButton", () => {
  it("copies the full guest URL, not the bare id", async () => {
    copier.mockResolvedValue(true);
    const utilisateur = userEvent.setup();
    render(<CopyLinkButton linkId="aZ3k9Lm2" householdName="Rakotomavo" />);

    await utilisateur.click(screen.getByRole("button", { name: /Copier le lien de Rakotomavo/ }));
    expect(copier).toHaveBeenCalledWith(`${window.location.origin}/i/aZ3k9Lm2`);
  });

  it("confirms in place rather than with a floating notice", async () => {
    copier.mockResolvedValue(true);
    const utilisateur = userEvent.setup();
    render(<CopyLinkButton linkId="aZ3k9Lm2" householdName="Rakotomavo" />);

    await utilisateur.click(screen.getByRole("button", { name: /Copier le lien de Rakotomavo/ }));
    await waitFor(() => expect(screen.getByText("Copié")).toBeInTheDocument());
  });

  // Le repli qui compte : quand la copie échoue, le lien doit devenir
  // sélectionnable et le dire, en français. Jamais d'échec muet.
  it("falls back to a selected field the organiser can copy by hand", async () => {
    copier.mockResolvedValue(false);
    const utilisateur = userEvent.setup();
    render(<CopyLinkButton linkId="aZ3k9Lm2" householdName="Rakotomavo" />);

    await utilisateur.click(screen.getByRole("button", { name: /Copier le lien de Rakotomavo/ }));

    const champ = await screen.findByLabelText("Lien de Rakotomavo, à copier à la main");
    expect(champ).toHaveValue(`${window.location.origin}/i/aZ3k9Lm2`);
    const explication = screen.getByText(/presse-papier n'est pas disponible/i);
    expect(explication).toBeInTheDocument();
    // Le champ pointe l'explication : un lecteur d'écran qui atterrit dessus
    // doit entendre pourquoi la copie automatique a échoué, pas seulement le
    // label du champ.
    expect(champ).toHaveAttribute("aria-describedby", explication.id);
  });
});
