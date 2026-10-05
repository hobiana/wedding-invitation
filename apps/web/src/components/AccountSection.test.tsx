import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AccountSection } from "./AccountSection";
import { AuthProvider } from "@/auth/AuthContext";
import * as apiModule from "@/lib/api";

function rendre() {
  vi.spyOn(apiModule.api, "get").mockResolvedValue({ id: "u1", email: "admin@example.com" });
  return render(
    <MemoryRouter initialEntries={["/admin/settings"]}>
      <AuthProvider>
        <Routes>
          <Route path="/admin/settings" element={<AccountSection />} />
          <Route path="/login" element={<p>Page de connexion</p>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe("AccountSection", () => {
  afterEach(() => vi.restoreAllMocks());

  // Sur téléphone la barre du haut a disparu : c'est ici que l'organisateur
  // retrouve l'adresse avec laquelle il est connecté.
  it("says who is signed in", async () => {
    rendre();
    expect(await screen.findByText("admin@example.com")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Compte" })).toBeInTheDocument();
  });

  it("logs out and sends the admin back to the login page", async () => {
    const post = vi.spyOn(apiModule.api, "post").mockResolvedValue({});
    rendre();

    await userEvent.setup().click(await screen.findByRole("button", { name: /se déconnecter/i }));

    await waitFor(() => expect(post).toHaveBeenCalledWith("/auth/logout"));
    expect(await screen.findByText("Page de connexion")).toBeInTheDocument();
  });
});
