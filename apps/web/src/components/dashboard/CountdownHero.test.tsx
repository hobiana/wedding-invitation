import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CountdownHero } from "./CountdownHero";

// Les vraies dates du mariage : cérémonie à 9 h à Antananarivo le 2 janvier
// 2027, réponses attendues avant le 1er décembre 2026.
const MARIAGE = "2027-01-02T06:00:00.000Z";
const LIMITE = "2026-12-01T00:00:00.000Z";
const LE_8_OCTOBRE = new Date("2026-10-08T09:00:00.000Z");

function rendre(props: Partial<Parameters<typeof CountdownHero>[0]> = {}) {
  return render(
    <CountdownHero
      weddingDate={MARIAGE}
      rsvpDeadline={LIMITE}
      foyersSansReponse={8}
      maintenant={LE_8_OCTOBRE}
      {...props}
    />,
  );
}

describe("CountdownHero", () => {
  it("counts the days to the wedding and names its date", () => {
    rendre();
    expect(screen.getByText("J−86")).toBeInTheDocument();
    expect(screen.getByText("avant le mariage · samedi 2 janvier 2027")).toBeInTheDocument();
  });

  it("counts the days left to answer, and how many households are still silent", () => {
    rendre();
    expect(screen.getByText("54 jours")).toBeInTheDocument();
    expect(
      screen.getByText("avant la date limite du 1er décembre 2026, 8 foyers n'ont pas encore répondu"),
    ).toBeInTheDocument();
  });

  it("agrees the sentence with a single silent household", () => {
    rendre({ foyersSansReponse: 1 });
    expect(screen.getByText(/1 foyer n'a pas encore répondu$/)).toBeInTheDocument();
  });

  it("says when every household has answered", () => {
    rendre({ foyersSansReponse: 0 });
    expect(screen.getByText(/tous les foyers ont répondu$/)).toBeInTheDocument();
  });

  // Les chiffres viennent d'une autre requête : tant qu'ils manquent, la phrase
  // s'arrête à la date plutôt que d'annoncer « 0 foyer ».
  it("leaves the household count out while it is unknown", () => {
    rendre({ foyersSansReponse: null });
    expect(screen.getByText("avant la date limite du 1er décembre 2026")).toBeInTheDocument();
  });

  it("draws the timeline from today to the deadline to the wedding, in words", () => {
    rendre();
    const frise = within(screen.getByRole("list", { name: "Calendrier" }));
    const reperes = frise.getAllByRole("listitem").map((li) => li.textContent);
    expect(reperes).toEqual(["Aujourd'hui8 oct.", "Date limite1er déc.", "Mariage2 janv."]);
  });

  // Jamais « −3 jours » : passé la date limite, la phrase le dit, et la frise
  // ne garde que les deux repères qui ont encore un sens.
  it("says the deadline has passed instead of counting negative days", () => {
    rendre({ maintenant: new Date("2026-12-04T09:00:00.000Z") });
    expect(
      screen.getByText("Date limite des réponses passée depuis le 1er décembre 2026"),
    ).toBeInTheDocument();
    expect(screen.queryByText(/-\d+ jours?/)).toBeNull();
    const frise = within(screen.getByRole("list", { name: "Calendrier" }));
    expect(frise.queryByText("Date limite")).toBeNull();
  });

  it("says when the deadline is today", () => {
    rendre({ maintenant: new Date("2026-12-01T09:00:00.000Z") });
    expect(screen.getByText("Date limite des réponses aujourd'hui, 1er décembre 2026")).toBeInTheDocument();
  });

  // Vu au navigateur : le jour même, « Date limite » tombait sur « Aujourd'hui »
  // et sortait du bandeau par la gauche. Les deux repères n'en font qu'un.
  it("merges the deadline into today on the deadline day", () => {
    rendre({ maintenant: new Date("2026-12-01T09:00:00.000Z") });
    const frise = within(screen.getByRole("list", { name: "Calendrier" }));
    expect(frise.getAllByRole("listitem").map((li) => li.textContent)).toEqual([
      "Aujourd'hui1er déc.",
      "Mariage2 janv.",
    ]);
  });

  // Dans les derniers jours, l'étiquette passe au-dessus du trait, dans une
  // place réservée pour elle, et s'aligne sur son repère sans déborder.
  it("lifts the deadline label above the line when it nears today", () => {
    // Deux jours avant la limite, 34 avant le mariage : le repère est à 6 %.
    rendre({ maintenant: new Date("2026-11-29T09:00:00.000Z") });
    const limite = screen.getByText("Date limite").closest("li")!;
    expect(limite).toHaveClass("bottom-[calc(100%+1.75rem)]");
    expect(limite).not.toHaveClass("-translate-x-1/2");
    expect(screen.getByRole("list", { name: "Calendrier" }).parentElement).toHaveClass("pt-10");
  });

  it("reads « Jour J » on the day itself", () => {
    rendre({ maintenant: new Date("2027-01-02T05:00:00.000Z") });
    expect(screen.getByText("Jour J")).toBeInTheDocument();
  });

  // Texte sur bordeaux : les jetons `on-bordeaux*`, jamais le doré.
  it("writes on the bordeaux band with the on-bordeaux tokens only", () => {
    const { container } = rendre();
    const bandeau = container.querySelector("section")!;
    expect(bandeau).toHaveClass("bg-bordeaux-700", "text-on-bordeaux", "rounded-card");
    expect(container.innerHTML).not.toMatch(/text-gold\b/);
  });
});
