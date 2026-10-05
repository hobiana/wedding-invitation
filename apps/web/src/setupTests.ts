import "@testing-library/jest-dom";

/**
 * jsdom n'implémente pas la capture du pointeur, que Radix appelle dès qu'un
 * clic traverse un de ses composants à gestes (le toast, qui se ferme au
 * balayage). Sans ces trois méthodes, `userEvent.click` lève une erreur non
 * gérée après des tests pourtant verts. Elles ne simulent rien : l'élément
 * ne capture jamais.
 */
if (typeof Element !== "undefined") {
  Element.prototype.hasPointerCapture ??= () => false;
  Element.prototype.setPointerCapture ??= () => {};
  Element.prototype.releasePointerCapture ??= () => {};
}
