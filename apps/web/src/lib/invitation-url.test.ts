import { describe, expect, it } from "vitest";
import { invitationUrl } from "./invitation-url";

describe("invitationUrl", () => {
  // `Household.id` EST le linkId : la page invité cherche le foyer par
  // `where: { id: linkId }`. L'admin n'a donc rien à demander à l'API.
  it("builds the guest URL from the household id", () => {
    expect(invitationUrl("aZ3k9Lm2", "https://mariage.example")).toBe(
      "https://mariage.example/i/aZ3k9Lm2",
    );
  });

  it("never doubles the slash when the origin carries one", () => {
    expect(invitationUrl("aZ3k9Lm2", "https://mariage.example/")).toBe(
      "https://mariage.example/i/aZ3k9Lm2",
    );
  });

  it("falls back to the window's own origin", () => {
    expect(invitationUrl("aZ3k9Lm2")).toBe(`${window.location.origin}/i/aZ3k9Lm2`);
  });
});
