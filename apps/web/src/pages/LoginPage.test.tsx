import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { LoginPage } from "./LoginPage";
import { AuthProvider } from "@/auth/AuthContext";
import * as apiModule from "@/lib/api";

vi.spyOn(apiModule.api, "get").mockRejectedValue(new Error("not logged in"));

describe("LoginPage", () => {
  it("calls login with entered credentials on submit", async () => {
    const loginSpy = vi.spyOn(apiModule.api, "post").mockResolvedValue({ email: "a@b.com" });

    render(
      <MemoryRouter>
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      </MemoryRouter>,
    );

    fireEvent.change(await screen.findByLabelText(/email/i), { target: { value: "a@b.com" } });
    fireEvent.change(screen.getByLabelText(/mot de passe/i), { target: { value: "secret123" } });
    fireEvent.click(screen.getByRole("button", { name: /se connecter/i }));

    await waitFor(() => {
      expect(loginSpy).toHaveBeenCalledWith("/auth/login", { email: "a@b.com", password: "secret123" });
    });
  });
});
