import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";
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
  beforeEach(() => window.localStorage.clear());
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

  // --- Téléphone : la barre du bas (demande du commanditaire, 2026-10-08) ---

  // L'onglet actif s'annonce, et pas seulement par son aplat bordeaux.
  it("announces the current tab on a phone", async () => {
    renderLayout({ bureau: false });
    const actif = await screen.findByRole("link", { name: "Foyers" });
    expect(actif).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Tableau de bord" })).not.toHaveAttribute("aria-current");
  });

  // « Tableau de bord » passait sur deux lignes : la barre prenait deux hauteurs
  // selon l'onglet. jsdom ne mesure rien ; Chrome a vérifié à 360 et 390 px.
  it("keeps every tab label on a single line", async () => {
    renderLayout({ bureau: false });
    await screen.findByRole("link", { name: "Foyers" });
    for (const label of ["Tableau de bord", "Foyers", "Plan de table", "Paramètres"]) {
      expect(screen.getByText(label)).toHaveClass("whitespace-nowrap");
    }
  });

  // L'aplat actif est collé aux bords de la barre : ni marge autour de la
  // grille, ni rayon sur l'onglet (c'était un bouton arrondi flottant).
  it("draws the active tab as a full-height flat block, edge to edge", async () => {
    renderLayout({ bureau: false });
    const actif = await screen.findByRole("link", { name: "Foyers" });
    const barre = actif.closest("nav")!;
    expect(barre).toHaveClass("grid-cols-4");
    expect(barre.className).not.toMatch(/\b(p|px|py|gap)-\d/);
    expect(actif.className).not.toMatch(/\brounded/);
    expect(actif).toHaveClass("bg-bordeaux-700", "min-h-14");
  });

  // --- Bureau : le rail ---

  it("titles the desktop rail « Mariage » in the display face", async () => {
    renderLayout({ bureau: true });
    const titre = await screen.findByText("Mariage");
    expect(titre).toHaveClass("font-display");
    expect(screen.queryByText("Nos invités")).toBeNull();
  });

  // Le 2 px de `rounded-control` lisait carré ; actif et survol arrondis.
  it("rounds both the active and the hovered rail item", async () => {
    renderLayout({ bureau: true });
    const actif = await screen.findByRole("link", { name: "Foyers" });
    const autre = screen.getByRole("link", { name: "Paramètres" });
    expect(actif).toHaveClass("rounded-button", "bg-bordeaux-700");
    expect(autre).toHaveClass("rounded-button", "hover:bg-cream");
    expect(actif.className).not.toMatch(/rounded-control/);
  });

  it("collapses the rail to icons, each keeping a name and a tooltip", async () => {
    const user = userEvent.setup();
    renderLayout({ bureau: true });
    const bouton = await screen.findByRole("button", { name: "Replier le menu" });
    expect(bouton).toHaveAttribute("aria-expanded", "true");

    await user.click(bouton);

    const deplier = screen.getByRole("button", { name: "Déplier le menu" });
    expect(deplier).toHaveAttribute("aria-expanded", "false");
    for (const label of ["Tableau de bord", "Foyers", "Plan de table", "Paramètres"]) {
      const lien = screen.getByRole("link", { name: label });
      expect(lien).toHaveAttribute("title", label);
    }
    // L'actif reste identifiable, autrement que par la couleur.
    expect(screen.getByRole("link", { name: "Foyers" })).toHaveAttribute("aria-current", "page");
    expect(screen.queryByText("Mariage")).toBeNull();
    expect(screen.getByText("H & L")).toBeInTheDocument();
    expect(bouton.closest("aside")).toHaveClass("w-16");
  });

  it("keeps the account usable when the rail is collapsed", async () => {
    const user = userEvent.setup();
    const logoutSpy = vi.spyOn(apiModule.api, "post").mockResolvedValue({ success: true });
    renderLayout({ bureau: true });
    await user.click(await screen.findByRole("button", { name: "Replier le menu" }));

    // L'adresse reste lisible par un lecteur d'écran et en infobulle.
    expect(await screen.findByTitle("admin@example.com")).toBeInTheDocument();
    const sortir = screen.getByRole("button", { name: "Se déconnecter" });
    expect(sortir).toHaveAttribute("title", "Se déconnecter");
    await user.click(sortir);
    await waitFor(() => expect(logoutSpy).toHaveBeenCalledWith("/auth/logout"));
  });

  it("remembers the collapsed rail across visits", async () => {
    const user = userEvent.setup();
    const premier = renderLayout({ bureau: true });
    await user.click(await screen.findByRole("button", { name: "Replier le menu" }));
    expect(window.localStorage.getItem("admin.rail.replie")).toBe("1");
    premier.unmount();

    renderLayout({ bureau: true });
    expect(await screen.findByRole("button", { name: "Déplier le menu" })).toBeInTheDocument();
  });

  // Navigation privée stricte : l'accès au stockage lève. Le rail s'ouvre
  // déplié et se replie quand même, pour la visite en cours.
  it("works without storage", async () => {
    const user = userEvent.setup();
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    renderLayout({ bureau: true });
    await user.click(await screen.findByRole("button", { name: "Replier le menu" }));
    expect(screen.getByRole("button", { name: "Déplier le menu" })).toBeInTheDocument();
  });
});
