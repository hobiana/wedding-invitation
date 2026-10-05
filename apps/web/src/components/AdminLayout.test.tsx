import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AdminLayout } from "./AdminLayout";
import { AuthProvider } from "@/auth/AuthContext";
import * as apiModule from "@/lib/api";

/**
 * Un `matchMedia` pilotable. La coquille rend **soit** le rail **soit** les
 * onglets, jamais les deux : deux navigations simultanées dupliqueraient chaque
 * libellé dans le DOM et `getByRole("link", …)` trouverait deux éléments là où
 * l'écran n'en montre qu'un.
 */
function ecran(bureau: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: bureau,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;
}

function renderLayout({ bureau = true }: { bureau?: boolean } = {}) {
  ecran(bureau);
  vi.spyOn(apiModule.api, "get").mockResolvedValue({ id: "u1", email: "admin@example.com" });
  return render(
    <MemoryRouter initialEntries={["/admin/households"]}>
      <AuthProvider>
        <Routes>
          <Route element={<AdminLayout />}>
            <Route path="/admin/households" element={<p>Contenu foyers</p>} />
          </Route>
          <Route path="/login" element={<p>Page de connexion</p>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe("AdminLayout", () => {
  afterEach(() => vi.restoreAllMocks());

  // Before this layout existed, the four admin pages were only reachable by
  // typing their URLs.
  it.each(["Tableau de bord", "Foyers", "Plan de table", "Paramètres"])(
    "links to %s",
    async (label) => {
      renderLayout();
      expect(await screen.findByRole("link", { name: label })).toBeInTheDocument();
    },
  );

  // Les deux dispositions portent la même navigation — sur téléphone elle
  // descend sous le pouce. Un seul des deux rendus existe à la fois.
  it("puts the same navigation under the thumb on a phone", async () => {
    renderLayout({ bureau: false });
    for (const label of ["Tableau de bord", "Foyers", "Plan de table", "Paramètres"]) {
      expect(await screen.findByRole("link", { name: label })).toBeInTheDocument();
    }
  });

  it("never renders both navigations at once", async () => {
    renderLayout({ bureau: true });
    await screen.findByRole("link", { name: "Foyers" });
    expect(screen.getAllByRole("link", { name: "Foyers" })).toHaveLength(1);
  });

  // Au téléphone la barre du haut (adresse + déconnexion) n'existe plus : elle
  // mangeait de la hauteur sur chaque écran. L'adresse et la déconnexion vivent
  // dans Paramètres, section « Compte » (voir AccountSection).
  it("has no top bar on a phone: the account lives in Settings", async () => {
    renderLayout({ bureau: false });
    await screen.findByRole("link", { name: "Foyers" });
    expect(screen.queryByRole("button", { name: /se déconnecter/i })).toBeNull();
    expect(screen.queryByText("admin@example.com")).toBeNull();
    expect(document.querySelector("header")).toBeNull();
  });

  // Le design system interdit l'animation dans l'admin, et les gris bruts
  // sortent de la palette du mariage.
  it("dresses itself in the wedding tokens, not in raw greys", async () => {
    const { container } = renderLayout();
    await screen.findByRole("link", { name: "Foyers" });
    expect(container.innerHTML).not.toMatch(/(bg|text|border)-neutral-\d{2,3}/);
  });

  // Le rail s'étirait sur toute la hauteur de la page : « Se déconnecter », collé
  // en bas du rail, n'apparaissait qu'en bas du contenu (4 000 px sur le plan de
  // table, 930 px dès les Paramètres). jsdom ne calcule aucune mise en page : ce
  // test verrouille les classes qui épinglent le rail à la hauteur de la fenêtre ;
  // que ça tienne à l'écran, c'est Chrome qui le dit.
  it("pins the desktop rail to the window so logout never scrolls away", async () => {
    renderLayout({ bureau: true });
    const bouton = await screen.findByRole("button", { name: /se déconnecter/i });
    const rail = bouton.closest("aside");
    expect(rail).not.toBeNull();
    expect(rail).toHaveClass("sticky", "top-0", "h-screen", "self-start");
  });

  it("renders the nested admin page", async () => {
    renderLayout();
    expect(await screen.findByText("Contenu foyers")).toBeInTheDocument();
  });

  // AuthContext exposed logout() but nothing in the UI ever called it.
  it("logs out and sends the admin back to the login page", async () => {
    const logoutSpy = vi.spyOn(apiModule.api, "post").mockResolvedValue({ success: true });
    renderLayout();

    fireEvent.click(await screen.findByRole("button", { name: /se déconnecter/i }));

    await waitFor(() => expect(logoutSpy).toHaveBeenCalledWith("/auth/logout"));
    expect(await screen.findByText("Page de connexion")).toBeInTheDocument();
  });
});
