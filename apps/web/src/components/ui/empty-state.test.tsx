import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EmptyState } from "./empty-state";

describe("EmptyState", () => {
  it("says what is empty and what to do about it", () => {
    render(
      <EmptyState
        title="Aucun foyer"
        description="Ajoutez le premier foyer pour commencer."
        action={<button>Ajouter un foyer</button>}
      />,
    );
    expect(screen.getByText("Aucun foyer")).toBeInTheDocument();
    expect(screen.getByText("Ajoutez le premier foyer pour commencer.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ajouter un foyer" })).toBeInTheDocument();
  });

  it("works without an action", () => {
    render(<EmptyState title="Aucun résultat" description="Essayez un autre nom." />);
    expect(screen.getByText("Aucun résultat")).toBeInTheDocument();
    expect(screen.queryByRole("button")).toBeNull();
  });
});
