import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "@/auth/AuthContext";
import * as apiModule from "@/lib/api";

vi.spyOn(apiModule.api, "get").mockRejectedValue(new Error("not logged in"));

describe("App", () => {
  it("renders the login form at /login", async () => {
    render(
      <MemoryRouter initialEntries={["/login"]}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </MemoryRouter>,
    );

    expect(await screen.findByRole("heading", { name: /connexion organisateurs/i })).toBeInTheDocument();
    expect(screen.queryByText(/notre mariage/i)).not.toBeInTheDocument();
  });
});
