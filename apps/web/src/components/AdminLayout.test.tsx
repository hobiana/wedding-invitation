import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AdminLayout } from "./AdminLayout";
import { AuthProvider } from "@/auth/AuthContext";
import * as apiModule from "@/lib/api";

function renderLayout() {
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
  it.each(["Tableau de bord", "Foyers", "Tables", "Paramètres"])(
    "links to %s",
    async (label) => {
      renderLayout();
      expect(await screen.findByRole("link", { name: label })).toBeInTheDocument();
    },
  );

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
