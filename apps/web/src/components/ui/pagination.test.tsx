import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Pagination, type PaginationProps } from "./pagination";

function renderPagination(props: Partial<PaginationProps> = {}) {
  const onOffsetChange = vi.fn();
  const onLimitChange = vi.fn();
  render(
    <Pagination
      label="Pages des foyers"
      total={40}
      offset={0}
      limit={25}
      onOffsetChange={onOffsetChange}
      onLimitChange={onLimitChange}
      {...props}
    />,
  );
  return { onOffsetChange, onLimitChange };
}

const precedent = () => screen.getByRole("button", { name: "Page précédente" });
const suivant = () => screen.getByRole("button", { name: "Page suivante" });

describe("Pagination", () => {
  it("is a named navigation landmark", () => {
    renderPagination();
    expect(screen.getByRole("navigation", { name: "Pages des foyers" })).toBeInTheDocument();
  });

  it("says which rows are shown out of how many", () => {
    renderPagination({ offset: 0, limit: 25, total: 40 });
    expect(screen.getByText("1–25 sur 40")).toBeInTheDocument();
  });

  it("stops the range at the total on the last page", () => {
    renderPagination({ offset: 25, limit: 25, total: 40 });
    expect(screen.getByText("26–40 sur 40")).toBeInTheDocument();
  });

  it("does not write a range of one row as « 1–1 »", () => {
    renderPagination({ offset: 0, limit: 25, total: 1 });
    expect(screen.getByText("1 sur 1")).toBeInTheDocument();
  });

  it("announces the range politely when the page changes", () => {
    renderPagination();
    expect(screen.getByText("1–25 sur 40")).toHaveAttribute("aria-live", "polite");
  });

  it("labels the buttons in French, visibly and for screen readers", () => {
    renderPagination({ offset: 25 });
    expect(precedent()).toHaveTextContent("Précédent");
    expect(suivant()).toHaveTextContent("Suivant");
  });

  // `aria-disabled` plutôt que `disabled` : un bouton qui devient `disabled`
  // sous le focus le perd, et le focus retombe sur <body>. L'organisateur au
  // clavier qui vient d'atteindre la dernière page reste ainsi sur le bouton.
  it("marks Précédent unavailable on the first page, and ignores it", async () => {
    const utilisateur = userEvent.setup();
    const { onOffsetChange } = renderPagination({ offset: 0 });
    expect(precedent()).toHaveAttribute("aria-disabled", "true");
    expect(suivant()).not.toHaveAttribute("aria-disabled", "true");
    await utilisateur.click(precedent());
    expect(onOffsetChange).not.toHaveBeenCalled();
  });

  it("marks Suivant unavailable on the last page, and ignores it", async () => {
    const utilisateur = userEvent.setup();
    const { onOffsetChange } = renderPagination({ offset: 25 });
    expect(suivant()).toHaveAttribute("aria-disabled", "true");
    expect(precedent()).not.toHaveAttribute("aria-disabled", "true");
    await utilisateur.click(suivant());
    expect(onOffsetChange).not.toHaveBeenCalled();
  });

  it("asks for the next and previous offsets", async () => {
    const utilisateur = userEvent.setup();
    const { onOffsetChange } = renderPagination({ offset: 25, limit: 10, total: 60 });
    await utilisateur.click(suivant());
    expect(onOffsetChange).toHaveBeenLastCalledWith(35);
    await utilisateur.click(precedent());
    expect(onOffsetChange).toHaveBeenLastCalledWith(15);
  });

  it("never asks for a negative offset", async () => {
    const utilisateur = userEvent.setup();
    const { onOffsetChange } = renderPagination({ offset: 5, limit: 25, total: 40 });
    await utilisateur.click(precedent());
    expect(onOffsetChange).toHaveBeenLastCalledWith(0);
  });

  it("is usable from the keyboard alone", async () => {
    const utilisateur = userEvent.setup();
    const { onOffsetChange } = renderPagination({ offset: 0 });
    suivant().focus();
    await utilisateur.keyboard("{Enter}");
    expect(onOffsetChange).toHaveBeenCalledWith(25);
  });

  it("offers 10, 25, 50 and 100 per page, behind a real label", () => {
    renderPagination();
    const taille = screen.getByLabelText("Par page");
    expect(taille).toHaveValue("25");
    expect(Array.from((taille as HTMLSelectElement).options).map((o) => o.value)).toEqual([
      "10",
      "25",
      "50",
      "100",
    ]);
  });

  it("reports the chosen page size as a number", async () => {
    const utilisateur = userEvent.setup();
    const { onLimitChange } = renderPagination();
    await utilisateur.selectOptions(screen.getByLabelText("Par page"), "50");
    expect(onLimitChange).toHaveBeenCalledWith(50);
  });

  it("speaks of no rows when there are none", () => {
    renderPagination({ total: 0 });
    expect(screen.getByText("0 sur 0")).toBeInTheDocument();
    expect(suivant()).toHaveAttribute("aria-disabled", "true");
  });
});

// Le téléphone : « ‹ 1–10 sur 40 › ». La taille de page est dans la barre
// d'outils, pas ici ; les deux flèches restent des boutons nommés.
describe("Pagination compacte", () => {
  it("shows the range between two arrows, without the page size", () => {
    renderPagination({ variant: "compact", offset: 0, limit: 10, total: 40 });
    expect(screen.getByRole("navigation", { name: "Pages des foyers" })).toBeInTheDocument();
    expect(screen.getByText("1–10 sur 40")).toBeInTheDocument();
    expect(screen.queryByLabelText("Par page")).toBeNull();
  });

  it("names its arrows for screen readers, without visible words", () => {
    renderPagination({ variant: "compact", offset: 10, limit: 10, total: 40 });
    expect(precedent()).not.toHaveTextContent("Précédent");
    expect(suivant()).not.toHaveTextContent("Suivant");
  });

  it("offers 40 px targets to the thumb", () => {
    renderPagination({ variant: "compact" });
    expect(precedent()).toHaveClass("h-10", "w-10");
    expect(suivant()).toHaveClass("h-10", "w-10");
  });

  it("pages and stops at the ends like the full one", async () => {
    const utilisateur = userEvent.setup();
    const { onOffsetChange } = renderPagination({ variant: "compact", offset: 0, limit: 10, total: 40 });
    expect(precedent()).toHaveAttribute("aria-disabled", "true");
    await utilisateur.click(precedent());
    expect(onOffsetChange).not.toHaveBeenCalled();
    await utilisateur.click(suivant());
    expect(onOffsetChange).toHaveBeenLastCalledWith(10);
  });
});
