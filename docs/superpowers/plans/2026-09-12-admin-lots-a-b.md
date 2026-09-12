# Admin — lots A et B : les primitives et l'écran Foyers

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Donner à l'admin les sept primitives qui lui manquent, puis refaire l'écran Foyers pour qu'on puisse enfin copier un lien d'invitation, saisir les noms des membres d'un foyer, et supprimer sans détruire une réponse par inadvertance.

**Architecture:** On rhabille les écrans existants, on ne les recompose pas. Les primitives arrivent d'abord parce que l'écran Foyers s'appuie dessus ; chaque tâche se termine par un commit qui laisse l'admin utilisable. Aucune migration Prisma, aucune route d'API nouvelle : tout ce que ce plan demande existe déjà côté serveur.

**Tech Stack:** React 19, TypeScript, Vite 8, Tailwind **v4** (configuration en `@theme static` dans `apps/web/src/index.css`, **pas** de `tailwind.config.js`), TanStack Query v5, Radix UI, Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-09-12-admin-refonte-design.md`

## Global Constraints

- **L'interface est en français, sans exception**, admin compris. Un message d'erreur anglais remonté de l'API et affiché tel quel est un défaut.
- **Les commentaires de code sont en français** (règle `CLAUDE.md`). **Les noms de tests restent en anglais** : les 30 fichiers de test existants le sont, et un fichier isolé en français ferait tache.
- **Pas de second rouge dans l'admin.** `red-600`, `red-700`, `green-*`, `amber-*` sont interdits : la direction artistique l'exclut à côté du bordeaux, et `Field` peint déjà ses erreurs en `text-bordeaux-700` pour cette raison. Tout passe par les jetons de `index.css`.
- **Jetons uniquement** : `bordeaux-700`, `bordeaux-900`, `ink`, `ink-muted`, `rule`, `rule-strong`, `cream`, `ivory`, `page`, `on-bordeaux`, `status-yes|pending|no` et leurs `-bg`. Rayons : `rounded-control` (2 px) pour les contrôles, `rounded-surface` (4 px) pour les surfaces. Jamais `rounded-md`.
- **Rien n'anime dans l'admin** hors micro-transitions : `transition-colors duration-(--duration-micro) ease-(--ease-in)`. Pas de squelette qui clignote.
- **`--color-gold` ne porte jamais de texte** (3,26:1). Ornement seulement.
- **L'invariant RSVP** : `CONFIRMED` exige `confirmedCount >= 1`, `DECLINED` force `0`, `PENDING` remet à `null`. `null` n'est jamais écrit `0`.
- **Les types partagés viennent de `@invitation-app/shared`**, jamais redéclarés.
- **Chaque composant a son `.test.tsx` à côté de lui.**
- Lancer un seul fichier de test : `pnpm --filter @invitation-app/web test --run src/chemin/du.test.tsx` — **jamais de `--` devant un nom de fichier**, pnpm le transmet littéralement et le filtre est avalé sans un mot.
- Le build vérifie les types : `VITE_API_URL=http://localhost:3000 pnpm --filter @invitation-app/web build`. Sans la variable il échoue volontairement.
- **Ne jamais créer `tailwind.config.js`** : il ne serait pas lu.

---

## File Structure

**Créés — primitives (lot A)**

| Fichier | Responsabilité |
|---|---|
| `apps/web/src/components/ui/badge.tsx` | une pastille, teintée par jeton de statut, **toujours accompagnée de son libellé** |
| `apps/web/src/components/ui/card.tsx` | la surface qui porte une carte de foyer ou une tuile |
| `apps/web/src/components/ui/skeleton.tsx` | l'attente, aux dimensions du contenu attendu, sans clignotement |
| `apps/web/src/components/ui/empty-state.tsx` | liste vide, recherche sans résultat |
| `apps/web/src/lib/useMediaQuery.ts` | un point de bascule unique, pour ne pas dupliquer le DOM |
| `apps/web/src/components/ui/data-table.tsx` | table sur bureau, cartes sur téléphone, **depuis une seule définition de colonnes**, avec la ligne dépliable |
| `apps/web/src/components/ui/dialog.tsx` | le cadre modal Radix |
| `apps/web/src/components/ui/alert-dialog.tsx` | la confirmation destructive, focus sur **Annuler** |

**Créés — écran Foyers (lot B)**

| Fichier | Responsabilité |
|---|---|
| `apps/web/src/lib/invitation-url.ts` | composer l'URL d'invitation à partir d'un `linkId` |
| `apps/web/src/lib/clipboard.ts` | copier, et **dire** quand ce n'est pas possible |
| `apps/web/src/components/CopyLinkButton.tsx` | le geste de copie et son repli visible |
| `apps/web/src/components/ShareLinkButton.tsx` | le partage natif, quand le navigateur le propose |
| `apps/web/src/lib/filter-households.ts` | filtrer par texte et par statut, sans accent ni casse |
| `apps/web/src/components/HouseholdDetail.tsx` | le contenu du dépli d'une ligne |

**Modifiés**

| Fichier | Changement |
|---|---|
| `apps/web/src/components/ui/button.tsx` | passage aux jetons ; `red-600` retiré |
| `apps/web/src/components/StatusBadge.tsx` | réécrit sur `Badge` ; les call sites ne bougent pas |
| `apps/web/src/pages/admin/HouseholdsPage.tsx` | recomposé sur `DataTable`, recherche, squelette, état vide, garde-fou |
| `apps/web/src/components/HouseholdFormDialog.tsx` | passage aux primitives, + `memberNames`, + `dietaryNotes` |
| `apps/web/src/pages/admin/TablesPage.tsx` | garde-fou sur la suppression d'une table |
| `apps/web/src/pages/admin/DashboardPage.tsx` | *(hors de ce plan — lot D)* |

---

## Task 1: `Badge`, et `StatusBadge` réécrit dessus

**Files:**
- Create: `apps/web/src/components/ui/badge.tsx`
- Create: `apps/web/src/components/ui/badge.test.tsx`
- Modify: `apps/web/src/components/StatusBadge.tsx`

**Interfaces:**
- Consumes: `cn` de `@/lib/utils`, les jetons `--color-status-*` de `index.css`.
- Produces: `Badge({ tone, children, className })` avec `type BadgeTone = "yes" | "pending" | "no" | "neutral"`. `StatusBadge({ status })` garde exactement sa signature actuelle.

- [ ] **Step 1: Write the failing test**

`apps/web/src/components/ui/badge.test.tsx` :

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Badge } from "./badge";
import { StatusBadge } from "@/components/StatusBadge";

describe("Badge", () => {
  it("tints from the status tokens, never from a raw palette colour", () => {
    render(<Badge tone="yes">Confirmé</Badge>);
    const pastille = screen.getByText("Confirmé");
    expect(pastille.className).toContain("text-status-yes");
    expect(pastille.className).toContain("bg-status-yes-bg");
  });

  // La règle du design system : jamais l'information par la seule couleur.
  it.each([
    ["CONFIRMED", "Confirmé"],
    ["DECLINED", "Décliné"],
    ["PENDING", "En attente"],
  ] as const)("spells %s out as %s, so colour is never the only carrier", (status, libelle) => {
    render(<StatusBadge status={status} />);
    expect(screen.getByText(libelle)).toBeInTheDocument();
  });

  // Le rouge et le vert de Tailwind jurent à côté du bordeaux : la direction
  // artistique les exclut, et rien ne le rappellerait sans ce test.
  it.each(["CONFIRMED", "DECLINED", "PENDING"] as const)(
    "keeps %s off the raw palette",
    (status) => {
      const { container } = render(<StatusBadge status={status} />);
      expect(container.innerHTML).not.toMatch(/(red|green|amber|yellow)-\d{2,3}/);
    },
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @invitation-app/web test --run src/components/ui/badge.test.tsx`
Expected: FAIL — `Failed to resolve import "./badge"`.

- [ ] **Step 3: Write minimal implementation**

`apps/web/src/components/ui/badge.tsx` :

```tsx
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Une pastille d'état. Les trois teintes viennent des jetons `--color-status-*`
 * et rien d'autre : le rouge et le vert de Tailwind jurent à côté du bordeaux,
 * et la direction artistique les exclut.
 *
 * `pending` est bordeaux — c'est le seul état qui appelle un geste, relancer
 * le foyer. `no` est un brun éteint : un refus est une information, pas une
 * alerte.
 */
const TONS = {
  yes: "bg-status-yes-bg text-status-yes",
  pending: "bg-status-pending-bg text-status-pending",
  no: "bg-status-no-bg text-status-no",
  neutral: "bg-cream text-ink-muted",
} as const;

export type BadgeTone = keyof typeof TONS;

export interface BadgeProps {
  tone?: BadgeTone;
  className?: string;
  /** Le libellé. Il est obligatoire : la couleur seule ne dit rien. */
  children: ReactNode;
}

export function Badge({ tone = "neutral", className, children }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-control px-2 py-0.5 text-xs font-medium",
        TONS[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
```

`apps/web/src/components/StatusBadge.tsx`, réécrit en entier :

```tsx
import type { RsvpStatus } from "@invitation-app/shared";
import { Badge, type BadgeTone } from "@/components/ui/badge";

const TONS: Record<RsvpStatus, BadgeTone> = {
  CONFIRMED: "yes",
  DECLINED: "no",
  PENDING: "pending",
};

const LIBELLES: Record<RsvpStatus, string> = {
  CONFIRMED: "Confirmé",
  DECLINED: "Décliné",
  PENDING: "En attente",
};

export function StatusBadge({ status }: { status: RsvpStatus }) {
  return <Badge tone={TONS[status]}>{LIBELLES[status]}</Badge>;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @invitation-app/web test --run src/components/ui/badge.test.tsx`
Expected: PASS (7 tests).
Puis la suite entière, parce que `StatusBadge` a trois call sites : `pnpm --filter @invitation-app/web test -- --run` → tout vert.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/ui/badge.tsx apps/web/src/components/ui/badge.test.tsx apps/web/src/components/StatusBadge.tsx
git commit -m "feat(web): tint the status badges from the tokens, not from raw red and green"
```

---

## Task 2: `Card`

**Files:**
- Create: `apps/web/src/components/ui/card.tsx`
- Create: `apps/web/src/components/ui/card.test.tsx`

**Interfaces:**
- Produces: `Card(props: React.HTMLAttributes<HTMLDivElement>)` — une surface `rounded-surface border-rule bg-ivory`.

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Card } from "./card";

describe("Card", () => {
  it("draws the surface radius, not the control radius", () => {
    render(<Card data-testid="carte">Rakotomavo</Card>);
    const carte = screen.getByTestId("carte");
    expect(carte.className).toContain("rounded-surface");
    expect(carte.className).not.toMatch(/rounded-(md|lg|sm|xl|full)\b/);
  });

  it("lets a caller add classes without losing its own", () => {
    render(<Card data-testid="carte" className="p-8">Rakotomavo</Card>);
    const carte = screen.getByTestId("carte");
    expect(carte.className).toContain("p-8");
    expect(carte.className).toContain("border-rule");
  });

  it("forwards the rest of its props to the element", () => {
    render(<Card data-testid="carte" aria-label="Foyer" />);
    expect(screen.getByTestId("carte")).toHaveAttribute("aria-label", "Foyer");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @invitation-app/web test --run src/components/ui/card.test.tsx`
Expected: FAIL — `Failed to resolve import "./card"`.

- [ ] **Step 3: Write minimal implementation**

```tsx
import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * La surface de l'admin : un encart ivoire posé sur le fond, cerné par le
 * filet clair. Pas d'ombre — l'admin est plat, l'ombre est réservée à la carte
 * du faire-part.
 */
export const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("rounded-surface border border-rule bg-ivory p-4", className)}
      {...props}
    />
  ),
);
Card.displayName = "Card";
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @invitation-app/web test --run src/components/ui/card.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/ui/card.tsx apps/web/src/components/ui/card.test.tsx
git commit -m "feat(web): add the admin card surface"
```

---

## Task 3: `Skeleton`

**Files:**
- Create: `apps/web/src/components/ui/skeleton.tsx`
- Create: `apps/web/src/components/ui/skeleton.test.tsx`

**Interfaces:**
- Produces: `Skeleton({ className })` — un bloc `bg-cream` **`aria-hidden`**.

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Skeleton } from "./skeleton";

describe("Skeleton", () => {
  // Un lecteur d'écran n'a rien à annoncer d'une forme d'attente : c'est la
  // région vivante de la page qui dit « Chargement… », une fois.
  it("stays out of the accessibility tree", () => {
    render(<Skeleton className="h-6 w-40" />);
    expect(screen.getByTestId("skeleton")).toHaveAttribute("aria-hidden", "true");
  });

  // La règle du design system : rien n'anime dans l'admin. Un squelette qui
  // pulse est exactement le réflexe qu'elle interdit.
  it("does not pulse", () => {
    render(<Skeleton className="h-6 w-40" />);
    expect(screen.getByTestId("skeleton").className).not.toMatch(/animate-/);
  });

  it("takes the dimensions of what is being waited for", () => {
    render(<Skeleton className="h-6 w-40" />);
    const forme = screen.getByTestId("skeleton");
    expect(forme.className).toContain("h-6");
    expect(forme.className).toContain("w-40");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @invitation-app/web test --run src/components/ui/skeleton.test.tsx`
Expected: FAIL — `Failed to resolve import "./skeleton"`.

- [ ] **Step 3: Write minimal implementation**

```tsx
import { cn } from "@/lib/utils";

/**
 * La forme de l'attente. Elle prend les dimensions de ce qu'on attend — une
 * ligne de tableau, une tuile — pour que rien ne saute quand le contenu
 * arrive.
 *
 * Elle ne pulse pas : l'admin n'anime rien, et un clignotement à dix lignes
 * simultanées est un scintillement, pas une information.
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div data-testid="skeleton" aria-hidden="true" className={cn("rounded-control bg-cream", className)} />
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @invitation-app/web test --run src/components/ui/skeleton.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/ui/skeleton.tsx apps/web/src/components/ui/skeleton.test.tsx
git commit -m "feat(web): add the loading skeleton, silent and still"
```

---

## Task 4: `EmptyState`

**Files:**
- Create: `apps/web/src/components/ui/empty-state.tsx`
- Create: `apps/web/src/components/ui/empty-state.test.tsx`

**Interfaces:**
- Consumes: `Card` (Task 2).
- Produces: `EmptyState({ title, description, action })` où `action?: ReactNode`.

- [ ] **Step 1: Write the failing test**

```tsx
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @invitation-app/web test --run src/components/ui/empty-state.test.tsx`
Expected: FAIL — `Failed to resolve import "./empty-state"`.

- [ ] **Step 3: Write minimal implementation**

```tsx
import type { ReactNode } from "react";
import { Card } from "./card";

/**
 * Un vide expliqué. Trois occasions dans l'admin : aucun foyer encore saisi,
 * une recherche sans résultat, aucun foyer en attente de réponse. Les trois
 * demandent une phrase, pas un tableau à zéro ligne.
 */
export interface EmptyStateProps {
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <Card className="flex flex-col items-center gap-2 px-6 py-12 text-center">
      <p className="font-display text-xl text-ink">{title}</p>
      <p className="text-sm text-ink-muted">{description}</p>
      {action && <div className="mt-2">{action}</div>}
    </Card>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @invitation-app/web test --run src/components/ui/empty-state.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/ui/empty-state.tsx apps/web/src/components/ui/empty-state.test.tsx
git commit -m "feat(web): add the empty state"
```

---

## Task 5: `useMediaQuery`

**Files:**
- Create: `apps/web/src/lib/useMediaQuery.ts`
- Create: `apps/web/src/lib/useMediaQuery.test.tsx`

**Interfaces:**
- Produces: `useMediaQuery(query: string): boolean`. **Renvoie `false` quand `matchMedia` n'existe pas** — le `DataTable` de la tâche 6 s'en sert pour retomber sur la table, jamais sur un écran vide.

- [ ] **Step 1: Write the failing test**

```tsx
import { renderHook, act } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useMediaQuery } from "./useMediaQuery";

type Ecouteur = (evenement: MediaQueryListEvent) => void;

/** Un `matchMedia` pilotable : il retient ses écouteurs et sait les rappeler. */
function stubMatchMedia(matches: boolean) {
  const original = window.matchMedia;
  const ecouteurs: Ecouteur[] = [];
  window.matchMedia = ((query: string) => ({
    matches,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: (_: string, ecouteur: Ecouteur) => ecouteurs.push(ecouteur),
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;
  return {
    change: (nouvelle: boolean) =>
      ecouteurs.forEach((e) => e({ matches: nouvelle } as MediaQueryListEvent)),
    restore: () => {
      window.matchMedia = original;
    },
  };
}

afterEach(() => vi.restoreAllMocks());

describe("useMediaQuery", () => {
  it("reports what the browser says", () => {
    const media = stubMatchMedia(true);
    const { result } = renderHook(() => useMediaQuery("(min-width: 768px)"));
    expect(result.current).toBe(true);
    media.restore();
  });

  it("follows the query when the window changes", () => {
    const media = stubMatchMedia(false);
    const { result } = renderHook(() => useMediaQuery("(min-width: 768px)"));
    expect(result.current).toBe(false);
    act(() => media.change(true));
    expect(result.current).toBe(true);
    media.restore();
  });

  // Un environnement sans matchMedia ne doit pas décider à la place de la page.
  it("answers false when matchMedia is missing", () => {
    const original = window.matchMedia;
    // @ts-expect-error — on simule un environnement qui ne le fournit pas.
    delete window.matchMedia;
    const { result } = renderHook(() => useMediaQuery("(min-width: 768px)"));
    expect(result.current).toBe(false);
    window.matchMedia = original;
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @invitation-app/web test --run src/lib/useMediaQuery.test.tsx`
Expected: FAIL — `Failed to resolve import "./useMediaQuery"`.

- [ ] **Step 3: Write minimal implementation**

```ts
import { useEffect, useState } from "react";

/**
 * Le point de bascule, lu une fois et suivi.
 *
 * Il existe pour que le `DataTable` rende **soit** une table **soit** des
 * cartes, jamais les deux : deux rendus simultanés cachés l'un par CSS
 * dupliquent chaque nom dans le DOM, et tous les tests de la page qui
 * l'emploie se mettent à trouver deux éléments là où il n'y en a qu'un à
 * l'écran.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window !== "undefined" && typeof window.matchMedia === "function"
      ? window.matchMedia(query).matches
      : false,
  );

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const liste = window.matchMedia(query);
    setMatches(liste.matches);
    const suivre = (evenement: MediaQueryListEvent) => setMatches(evenement.matches);
    liste.addEventListener("change", suivre);
    return () => liste.removeEventListener("change", suivre);
  }, [query]);

  return matches;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @invitation-app/web test --run src/lib/useMediaQuery.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/useMediaQuery.ts apps/web/src/lib/useMediaQuery.test.tsx
git commit -m "feat(web): add the media query hook the admin table folds on"
```

---

## Task 6: `DataTable` — table sur bureau, cartes sur téléphone

**Files:**
- Create: `apps/web/src/components/ui/data-table.tsx`
- Create: `apps/web/src/components/ui/data-table.test.tsx`

**Interfaces:**
- Consumes: `useMediaQuery` (Task 5), `Card` (Task 2), `cn`.
- Produces:

```ts
export interface Column<T> {
  id: string;
  header: string;
  cell: (ligne: T) => ReactNode;
}

export interface DataTableProps<T> {
  caption: string;
  columns: Column<T>[];
  rows: T[];
  rowKey: (ligne: T) => string;
  /** Rendu sous la ligne quand elle est dépliée. Sans lui, rien ne se déplie. */
  detail?: (ligne: T) => ReactNode;
  /** Libellé accessible du bouton de dépli, par ligne. */
  detailLabel?: (ligne: T) => string;
}
```

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DataTable, type Column, type DataTableProps } from "./data-table";

interface Foyer {
  id: string;
  nom: string;
  places: string;
}

const FOYERS: Foyer[] = [
  { id: "a1", nom: "Rakotomavo", places: "4 / 4" },
  { id: "b2", nom: "Andriamanana", places: "2 / 3" },
];

const COLONNES: Column<Foyer>[] = [
  { id: "nom", header: "Foyer", cell: (f) => f.nom },
  { id: "places", header: "Places", cell: (f) => f.places },
];

function stubLargeur(bureau: boolean) {
  const original = window.matchMedia;
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
  return () => {
    window.matchMedia = original;
  };
}

afterEach(() => vi.restoreAllMocks());

// Pas de `React.ComponentProps` ici : le fichier n'importe pas le namespace
// React, et l'ajouter pour un type de test le ferait entrer pour rien.
function renderTable(
  extra: Partial<Pick<DataTableProps<Foyer>, "detail" | "detailLabel">> = {},
) {
  return render(
    <DataTable
      caption="Foyers invités"
      columns={COLONNES}
      rows={FOYERS}
      rowKey={(f) => f.id}
      {...extra}
    />,
  );
}

describe("DataTable", () => {
  it("renders a real table on the desktop", () => {
    const restore = stubLargeur(true);
    renderTable();
    const table = screen.getByRole("table", { name: "Foyers invités" });
    expect(within(table).getByText("Rakotomavo")).toBeInTheDocument();
    expect(within(table).getByRole("columnheader", { name: "Places" })).toBeInTheDocument();
    restore();
  });

  // Le point de la primitive : une seule définition de colonnes, deux rendus.
  it("folds into cards on a phone, from the same columns", () => {
    const restore = stubLargeur(false);
    renderTable();
    expect(screen.queryByRole("table")).toBeNull();
    const liste = screen.getByRole("list", { name: "Foyers invités" });
    expect(within(liste).getByText("Rakotomavo")).toBeInTheDocument();
    // L'en-tête devient une étiquette devant la valeur, sinon « 4 / 4 » ne
    // veut rien dire hors de sa colonne.
    expect(within(liste).getAllByText("Places").length).toBe(2);
    restore();
  });

  // Et jamais les deux à la fois : un DOM dupliqué casserait chaque test de
  // page qui cherche un nom de foyer.
  it("never renders both at once", () => {
    const restore = stubLargeur(true);
    renderTable();
    expect(screen.getAllByText("Rakotomavo")).toHaveLength(1);
    restore();
  });

  it("unfolds a row's detail, and folds it back", async () => {
    const restore = stubLargeur(true);
    const utilisateur = userEvent.setup();
    renderTable({
      detail: (f: Foyer) => <p>Régime : sans arachide pour {f.nom}</p>,
      detailLabel: (f: Foyer) => `Détail de ${f.nom}`,
    });

    expect(screen.queryByText(/sans arachide pour Rakotomavo/)).toBeNull();
    await utilisateur.click(screen.getByRole("button", { name: "Détail de Rakotomavo" }));
    expect(screen.getByText(/sans arachide pour Rakotomavo/)).toBeInTheDocument();
    await utilisateur.click(screen.getByRole("button", { name: "Détail de Rakotomavo" }));
    expect(screen.queryByText(/sans arachide pour Rakotomavo/)).toBeNull();
    restore();
  });

  it("keeps several rows open at once", async () => {
    const restore = stubLargeur(true);
    const utilisateur = userEvent.setup();
    renderTable({
      detail: (f: Foyer) => <p>Détail de {f.nom}</p>,
      detailLabel: (f: Foyer) => `Détail de ${f.nom}`,
    });
    await utilisateur.click(screen.getByRole("button", { name: "Détail de Rakotomavo" }));
    await utilisateur.click(screen.getByRole("button", { name: "Détail de Andriamanana" }));
    expect(screen.getByText("Détail de Rakotomavo")).toBeInTheDocument();
    expect(screen.getByText("Détail de Andriamanana")).toBeInTheDocument();
    restore();
  });

  it("announces whether a row is open", async () => {
    const restore = stubLargeur(true);
    const utilisateur = userEvent.setup();
    renderTable({
      detail: (f: Foyer) => <p>Détail de {f.nom}</p>,
      detailLabel: (f: Foyer) => `Détail de ${f.nom}`,
    });
    const bouton = screen.getByRole("button", { name: "Détail de Rakotomavo" });
    expect(bouton).toHaveAttribute("aria-expanded", "false");
    await utilisateur.click(bouton);
    expect(bouton).toHaveAttribute("aria-expanded", "true");
    restore();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @invitation-app/web test --run src/components/ui/data-table.test.tsx`
Expected: FAIL — `Failed to resolve import "./data-table"`.

- [ ] **Step 3: Write minimal implementation**

```tsx
import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMediaQuery } from "@/lib/useMediaQuery";
import { Card } from "./card";

/**
 * La liste de l'admin, définie une fois et rendue deux fois : une vraie table
 * à partir de 768 px, une liste de cartes en dessous.
 *
 * Les deux rendus sortent des **mêmes colonnes**. C'est tout l'intérêt : trois
 * écrans s'en servent, et une table repliée à la main dans chacun d'eux
 * finirait par diverger — l'un afficherait la table, l'autre non.
 *
 * Un seul des deux existe dans le DOM à la fois (voir `useMediaQuery`).
 */
export interface Column<T> {
  id: string;
  header: string;
  cell: (ligne: T) => ReactNode;
}

export interface DataTableProps<T> {
  caption: string;
  columns: Column<T>[];
  rows: T[];
  rowKey: (ligne: T) => string;
  detail?: (ligne: T) => ReactNode;
  detailLabel?: (ligne: T) => string;
}

export function DataTable<T>({
  caption,
  columns,
  rows,
  rowKey,
  detail,
  detailLabel,
}: DataTableProps<T>) {
  const bureau = useMediaQuery("(min-width: 768px)");
  const [ouverts, setOuverts] = useState<ReadonlySet<string>>(() => new Set());

  function basculer(cle: string) {
    setOuverts((precedent) => {
      const suivant = new Set(precedent);
      if (suivant.has(cle)) suivant.delete(cle);
      else suivant.add(cle);
      return suivant;
    });
  }

  function boutonDeDepli(ligne: T, cle: string) {
    if (!detail) return null;
    const ouvert = ouverts.has(cle);
    return (
      <button
        type="button"
        onClick={() => basculer(cle)}
        aria-expanded={ouvert}
        aria-label={detailLabel?.(ligne) ?? "Détail"}
        className="rounded-control p-2 text-ink-muted transition-colors duration-(--duration-micro) ease-(--ease-in) hover:bg-cream hover:text-ink"
      >
        <ChevronDown
          aria-hidden="true"
          className={cn("h-4 w-4 transition-transform duration-(--duration-micro)", ouvert && "rotate-180")}
        />
      </button>
    );
  }

  if (!bureau) {
    return (
      <ul aria-label={caption} className="space-y-3">
        {rows.map((ligne) => {
          const cle = rowKey(ligne);
          return (
            <li key={cle}>
              <Card className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-2">
                    {columns.map((colonne) => (
                      <div key={colonne.id} className="text-sm">
                        <span className="block text-xs uppercase tracking-wide text-ink-label">
                          {colonne.header}
                        </span>
                        <span className="text-ink">{colonne.cell(ligne)}</span>
                      </div>
                    ))}
                  </div>
                  {boutonDeDepli(ligne, cle)}
                </div>
                {detail && ouverts.has(cle) && (
                  <div className="border-t border-rule pt-2">{detail(ligne)}</div>
                )}
              </Card>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <table className="w-full border-collapse text-sm">
      <caption className="sr-only">{caption}</caption>
      <thead>
        <tr className="border-b border-rule text-left">
          {columns.map((colonne) => (
            <th key={colonne.id} scope="col" className="py-2 font-medium text-ink-label">
              {colonne.header}
            </th>
          ))}
          {detail && <th scope="col" className="w-10" aria-label="Détail" />}
        </tr>
      </thead>
      <tbody>
        {rows.map((ligne) => {
          const cle = rowKey(ligne);
          return (
            <Fragment key={cle}>
              <tr className="border-b border-rule align-top">
                {columns.map((colonne) => (
                  <td key={colonne.id} className="py-2 text-ink">
                    {colonne.cell(ligne)}
                  </td>
                ))}
                {detail && <td className="py-1">{boutonDeDepli(ligne, cle)}</td>}
              </tr>
              {detail && ouverts.has(cle) && (
                <tr className="border-b border-rule bg-cream/40">
                  <td colSpan={columns.length + 1} className="px-2 py-3">
                    {detail(ligne)}
                  </td>
                </tr>
              )}
            </Fragment>
          );
        })}
      </tbody>
    </table>
  );
}
```

Ajouter `Fragment` à l'import de React : `import { Fragment, useState, type ReactNode } from "react";`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @invitation-app/web test --run src/components/ui/data-table.test.tsx`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/ui/data-table.tsx apps/web/src/components/ui/data-table.test.tsx
git commit -m "feat(web): one column definition, a table on the desktop and cards on a phone"
```

---

## Task 7: `Dialog` sur Radix

**Files:**
- Modify: `apps/web/package.json` (dépendance)
- Create: `apps/web/src/components/ui/dialog.tsx`
- Create: `apps/web/src/components/ui/dialog.test.tsx`

**Interfaces:**
- Produces: `Dialog({ open, onOpenChange, title, description, children })`. `children` est le contenu ; le cadre, le voile, le titre et la fermeture appartiennent à la primitive.

- [ ] **Step 1: Write the failing test**

D'abord installer la dépendance (elle fait partie de cette tâche, pas d'une tâche à part) :

```bash
pnpm --filter @invitation-app/web add @radix-ui/react-dialog
```

Puis `apps/web/src/components/ui/dialog.test.tsx` :

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Dialog } from "./dialog";

describe("Dialog", () => {
  it("names itself for assistive technology", () => {
    render(
      <Dialog open onOpenChange={() => {}} title="Modifier le foyer">
        <p>Contenu</p>
      </Dialog>,
    );
    expect(screen.getByRole("dialog", { name: "Modifier le foyer" })).toBeInTheDocument();
  });

  it("renders nothing when closed", () => {
    render(
      <Dialog open={false} onOpenChange={() => {}} title="Modifier le foyer">
        <p>Contenu</p>
      </Dialog>,
    );
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("closes on Escape", async () => {
    const onOpenChange = vi.fn();
    const utilisateur = userEvent.setup();
    render(
      <Dialog open onOpenChange={onOpenChange} title="Modifier le foyer">
        <p>Contenu</p>
      </Dialog>,
    );
    await utilisateur.keyboard("{Escape}");
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("offers a labelled close button", async () => {
    const onOpenChange = vi.fn();
    const utilisateur = userEvent.setup();
    render(
      <Dialog open onOpenChange={onOpenChange} title="Modifier le foyer">
        <p>Contenu</p>
      </Dialog>,
    );
    await utilisateur.click(screen.getByRole("button", { name: "Fermer" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @invitation-app/web test --run src/components/ui/dialog.test.tsx`
Expected: FAIL — `Failed to resolve import "./dialog"`.

- [ ] **Step 3: Write minimal implementation**

```tsx
import type { ReactNode } from "react";
import * as RadixDialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";

/**
 * Le cadre modal. Radix, décision arrêtée : le `<dialog>` natif n'a pas le
 * piège de focus, le verrou de défilement et la restitution du focus à la
 * fermeture, et les réécrire à la main est précisément ce qui rate.
 *
 * Le titre est obligatoire et lié par `aria-labelledby` : un dialogue sans nom
 * s'annonce « dialogue », ce qui n'apprend rien.
 */
export interface DialogProps {
  open: boolean;
  onOpenChange: (ouvert: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
}

export function Dialog({ open, onOpenChange, title, description, children }: DialogProps) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 bg-ink/40" />
        <RadixDialog.Content className="fixed left-1/2 top-1/2 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-surface border border-rule bg-ivory p-6 shadow-card">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div className="space-y-1">
              <RadixDialog.Title className="font-display text-xl text-ink">
                {title}
              </RadixDialog.Title>
              {description && (
                <RadixDialog.Description className="text-sm text-ink-muted">
                  {description}
                </RadixDialog.Description>
              )}
            </div>
            <RadixDialog.Close
              aria-label="Fermer"
              className="rounded-control p-1 text-ink-muted transition-colors duration-(--duration-micro) ease-(--ease-in) hover:bg-cream hover:text-ink"
            >
              <X aria-hidden="true" className="h-4 w-4" />
            </RadixDialog.Close>
          </div>
          {children}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @invitation-app/web test --run src/components/ui/dialog.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/web/package.json pnpm-lock.yaml apps/web/src/components/ui/dialog.tsx apps/web/src/components/ui/dialog.test.tsx
git commit -m "feat(web): add the Radix dialog primitive"
```

---

## Task 8: `AlertDialog` — la confirmation destructive

**Files:**
- Modify: `apps/web/package.json` (dépendance)
- Create: `apps/web/src/components/ui/alert-dialog.tsx`
- Create: `apps/web/src/components/ui/alert-dialog.test.tsx`

**Interfaces:**
- Consumes: `Button` (tel qu'il est ; la tâche 9 le retouche sans changer son interface).
- Produces: `AlertDialog({ open, onOpenChange, title, description, confirmLabel, onConfirm })`. `confirmLabel` est le verbe réel — « Supprimer le foyer », jamais « OK ».

- [ ] **Step 1: Write the failing test**

```bash
pnpm --filter @invitation-app/web add @radix-ui/react-alert-dialog
```

```tsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AlertDialog } from "./alert-dialog";

function renderAlerte(onConfirm = vi.fn(), onOpenChange = vi.fn()) {
  render(
    <AlertDialog
      open
      onOpenChange={onOpenChange}
      title="Supprimer le foyer Rakotomavo ?"
      description="Ce foyer a confirmé 4 personnes. Supprimer efface sa réponse, et son lien cessera de fonctionner."
      confirmLabel="Supprimer le foyer"
      onConfirm={onConfirm}
    />,
  );
  return { onConfirm, onOpenChange };
}

describe("AlertDialog", () => {
  it("states what disappears, not just a question", () => {
    renderAlerte();
    expect(screen.getByText(/son lien cessera de fonctionner/)).toBeInTheDocument();
  });

  // Le geste par défaut d'un dialogue destructif est de ne rien détruire :
  // une frappe sur Entrée à l'ouverture doit annuler, pas supprimer.
  it("puts the opening focus on Annuler, never on the destructive action", async () => {
    renderAlerte();
    await waitFor(() => expect(screen.getByRole("button", { name: "Annuler" })).toHaveFocus());
  });

  it("calls back only when the destructive button is pressed", async () => {
    const utilisateur = userEvent.setup();
    const { onConfirm } = renderAlerte();
    await utilisateur.click(screen.getByRole("button", { name: "Annuler" }));
    expect(onConfirm).not.toHaveBeenCalled();
    await utilisateur.click(screen.getByRole("button", { name: "Supprimer le foyer" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("names the action with its verb, so the button alone is unambiguous", () => {
    renderAlerte();
    expect(screen.queryByRole("button", { name: "OK" })).toBeNull();
    expect(screen.getByRole("button", { name: "Supprimer le foyer" })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @invitation-app/web test --run src/components/ui/alert-dialog.test.tsx`
Expected: FAIL — `Failed to resolve import "./alert-dialog"`.

- [ ] **Step 3: Write minimal implementation**

```tsx
import { useRef } from "react";
import * as RadixAlertDialog from "@radix-ui/react-alert-dialog";
import { Button } from "./button";

/**
 * La confirmation avant un geste irréversible.
 *
 * Deux règles y sont câblées plutôt que laissées à l'appelant :
 *
 * 1. **Le focus d'ouverture va sur Annuler.** Il est posé explicitement, sans
 *    se fier au comportement par défaut d'une version de Radix : une frappe
 *    sur Entrée juste après l'ouverture doit annuler, jamais détruire.
 * 2. **Le bouton porte le verbe réel** — « Supprimer le foyer », pas « OK ».
 *    Lu seul par un lecteur d'écran, « OK » ne dit pas ce qui va arriver.
 */
export interface AlertDialogProps {
  open: boolean;
  onOpenChange: (ouvert: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
}

export function AlertDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
}: AlertDialogProps) {
  const annulerRef = useRef<HTMLButtonElement>(null);

  return (
    <RadixAlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixAlertDialog.Portal>
        <RadixAlertDialog.Overlay className="fixed inset-0 bg-ink/40" />
        <RadixAlertDialog.Content
          onOpenAutoFocus={(evenement) => {
            evenement.preventDefault();
            annulerRef.current?.focus();
          }}
          className="fixed left-1/2 top-1/2 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-surface border border-rule bg-ivory p-6 shadow-card"
        >
          <RadixAlertDialog.Title className="font-display text-xl text-ink">
            {title}
          </RadixAlertDialog.Title>
          <RadixAlertDialog.Description className="mt-2 text-sm text-ink-muted">
            {description}
          </RadixAlertDialog.Description>
          <div className="mt-6 flex justify-end gap-3">
            <RadixAlertDialog.Cancel asChild>
              <Button ref={annulerRef} variant="outline">
                Annuler
              </Button>
            </RadixAlertDialog.Cancel>
            <RadixAlertDialog.Action asChild>
              <Button variant="destructive" onClick={onConfirm}>
                {confirmLabel}
              </Button>
            </RadixAlertDialog.Action>
          </div>
        </RadixAlertDialog.Content>
      </RadixAlertDialog.Portal>
    </RadixAlertDialog.Root>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @invitation-app/web test --run src/components/ui/alert-dialog.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/web/package.json pnpm-lock.yaml apps/web/src/components/ui/alert-dialog.tsx apps/web/src/components/ui/alert-dialog.test.tsx
git commit -m "feat(web): add the confirmation dialog, cancel-first"
```

---

## Task 9: `Button` aux jetons

**Files:**
- Modify: `apps/web/src/components/ui/button.tsx`
- Create: `apps/web/src/components/ui/button.test.tsx`

**Interfaces:**
- Produces: `Button` — **même interface qu'aujourd'hui** (`variant: "default" | "outline" | "destructive"`, `size: "default" | "sm" | "lg"`, `asChild`). Seules les classes changent. Les sept call sites existants ne bougent pas.

Rappel : `components/ui/button.tsx` est le registre **admin**. La page invité a ses propres classes dans `components/invitation/guest-styles.ts` et ne doit pas être touchée par cette tâche.

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Button } from "./button";

describe("Button", () => {
  it("carries the admin primary in bordeaux, not in a neutral", () => {
    render(<Button>Enregistrer</Button>);
    const bouton = screen.getByRole("button", { name: "Enregistrer" });
    expect(bouton.className).toContain("bg-bordeaux-700");
    expect(bouton.className).not.toMatch(/bg-neutral-/);
  });

  // La direction artistique interdit un second rouge à côté du bordeaux, et
  // `Field` peint déjà ses erreurs en bordeaux pour cette raison. Le bouton
  // destructif tire donc son autorité de son libellé et du bordeaux profond.
  it("never reaches for a second red on the destructive action", () => {
    render(<Button variant="destructive">Supprimer le foyer</Button>);
    const bouton = screen.getByRole("button", { name: "Supprimer le foyer" });
    expect(bouton.className).not.toMatch(/(red|rose|orange)-\d{2,3}/);
    expect(bouton.className).toContain("bg-bordeaux-900");
  });

  it("uses the control radius", () => {
    render(<Button>Enregistrer</Button>);
    expect(screen.getByRole("button").className).toContain("rounded-control");
  });

  it("still renders as a child element when asked", () => {
    render(
      <Button asChild>
        <a href="/admin">Retour</a>
      </Button>,
    );
    expect(screen.getByRole("link", { name: "Retour" }).className).toContain("bg-bordeaux-700");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @invitation-app/web test --run src/components/ui/button.test.tsx`
Expected: FAIL — le bouton porte encore `bg-neutral-900` et `bg-red-600`.

- [ ] **Step 3: Write minimal implementation**

Dans `apps/web/src/components/ui/button.tsx`, remplacer l'appel à `cva` par :

```tsx
const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-control text-sm font-medium transition-colors duration-(--duration-micro) ease-(--ease-in) disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        // Le registre admin : sobre, dense, aux jetons du mariage. La page
        // invité ne passe pas par ici — voir invitation/guest-styles.ts.
        default: "bg-bordeaux-700 text-on-bordeaux hover:bg-bordeaux-900",
        outline: "border border-rule-strong text-ink hover:bg-cream",
        // Pas de second rouge : le bordeaux profond et le libellé portent le
        // danger. Le geste est de toute façon protégé par un AlertDialog.
        destructive: "bg-bordeaux-900 text-on-bordeaux hover:bg-bordeaux-700",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 px-3",
        lg: "h-12 px-6",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @invitation-app/web test --run src/components/ui/button.test.tsx`
Expected: PASS (4 tests).
Puis la suite entière — sept call sites : `pnpm --filter @invitation-app/web test -- --run`.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/ui/button.tsx apps/web/src/components/ui/button.test.tsx
git commit -m "feat(web): put the admin button on the wedding tokens"
```

---

## Task 10: L'URL d'invitation

**Files:**
- Create: `apps/web/src/lib/invitation-url.ts`
- Create: `apps/web/src/lib/invitation-url.test.ts`

**Interfaces:**
- Produces: `invitationUrl(linkId: string, origin?: string): string`.

- [ ] **Step 1: Write the failing test**

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @invitation-app/web test --run src/lib/invitation-url.test.ts`
Expected: FAIL — `Failed to resolve import "./invitation-url"`.

- [ ] **Step 3: Write minimal implementation**

```ts
/**
 * L'adresse qu'un foyer recevra.
 *
 * `Household.id` **est** la clé d'accès : le `nanoid(8)` sert de clé primaire
 * et l'API cherche l'invitation par `where: { id: linkId }`. Il n'y a donc rien
 * à demander au serveur pour composer ce lien — et rien à inventer non plus :
 * la route est `/i/:linkId`, déclarée dans `App.tsx`.
 */
export function invitationUrl(linkId: string, origin: string = window.location.origin): string {
  return `${origin.replace(/\/+$/, "")}/i/${linkId}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @invitation-app/web test --run src/lib/invitation-url.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/invitation-url.ts apps/web/src/lib/invitation-url.test.ts
git commit -m "feat(web): compose the guest link from the household id"
```

---

## Task 11: Copier, et savoir quand on n'a pas copié

**Files:**
- Create: `apps/web/src/lib/clipboard.ts`
- Create: `apps/web/src/lib/clipboard.test.ts`

**Interfaces:**
- Produces: `copyToClipboard(texte: string): Promise<boolean>` — `true` si le texte est dans le presse-papier, `false` dans tous les autres cas. **Ne lève jamais.**

- [ ] **Step 1: Write the failing test**

```ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { copyToClipboard } from "./clipboard";

function stubPressePapier(writeText: ((texte: string) => Promise<void>) | null, secure = true) {
  const clipboardOriginal = navigator.clipboard;
  const secureOriginal = window.isSecureContext;
  Object.defineProperty(navigator, "clipboard", {
    value: writeText ? { writeText } : undefined,
    configurable: true,
  });
  Object.defineProperty(window, "isSecureContext", { value: secure, configurable: true });
  return () => {
    Object.defineProperty(navigator, "clipboard", { value: clipboardOriginal, configurable: true });
    Object.defineProperty(window, "isSecureContext", { value: secureOriginal, configurable: true });
  };
}

afterEach(() => vi.restoreAllMocks());

describe("copyToClipboard", () => {
  it("copies and says so", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    const restore = stubPressePapier(writeText);
    await expect(copyToClipboard("https://mariage.example/i/aZ3k9Lm2")).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith("https://mariage.example/i/aZ3k9Lm2");
    restore();
  });

  // Hors contexte sécurisé, l'API n'existe pas. Renvoyer `true` ferait croire
  // à l'organisateur qu'il tient le lien, et il collerait autre chose dans
  // WhatsApp — le pire des échecs, celui qu'on ne voit pas.
  it("reports failure outside a secure context instead of pretending", async () => {
    const restore = stubPressePapier(vi.fn().mockResolvedValue(undefined), false);
    await expect(copyToClipboard("peu importe")).resolves.toBe(false);
    restore();
  });

  it("reports failure when the API is absent", async () => {
    const restore = stubPressePapier(null);
    await expect(copyToClipboard("peu importe")).resolves.toBe(false);
    restore();
  });

  it("reports failure when the browser refuses, without throwing", async () => {
    const restore = stubPressePapier(vi.fn().mockRejectedValue(new Error("refusé")));
    await expect(copyToClipboard("peu importe")).resolves.toBe(false);
    restore();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @invitation-app/web test --run src/lib/clipboard.test.ts`
Expected: FAIL — `Failed to resolve import "./clipboard"`.

- [ ] **Step 3: Write minimal implementation**

```ts
/**
 * Copier un texte, et **dire la vérité** sur le résultat.
 *
 * Le presse-papier n'existe qu'en contexte sécurisé, et le navigateur peut
 * refuser même là. Un `false` n'est pas une erreur à avaler : c'est ce qui
 * déclenche le repli visible côté interface. Un organisateur qui croit avoir
 * copié colle autre chose dans WhatsApp, et personne ne le saura avant que le
 * foyer réponde qu'il n'a pas d'invitation.
 */
export async function copyToClipboard(texte: string): Promise<boolean> {
  if (!window.isSecureContext) return false;
  if (typeof navigator.clipboard?.writeText !== "function") return false;
  try {
    await navigator.clipboard.writeText(texte);
    return true;
  } catch {
    return false;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @invitation-app/web test --run src/lib/clipboard.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/clipboard.ts apps/web/src/lib/clipboard.test.ts
git commit -m "feat(web): copy to the clipboard, and admit when it did not"
```

---

## Task 12: `CopyLinkButton`

**Files:**
- Create: `apps/web/src/components/CopyLinkButton.tsx`
- Create: `apps/web/src/components/CopyLinkButton.test.tsx`

**Interfaces:**
- Consumes: `invitationUrl` (Task 10), `copyToClipboard` (Task 11), `Button` (Task 9).
- Produces: `CopyLinkButton({ linkId, householdName })`.

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CopyLinkButton } from "./CopyLinkButton";
import * as pressePapier from "@/lib/clipboard";

afterEach(() => vi.restoreAllMocks());

describe("CopyLinkButton", () => {
  it("copies the full guest URL, not the bare id", async () => {
    const copier = vi.spyOn(pressePapier, "copyToClipboard").mockResolvedValue(true);
    const utilisateur = userEvent.setup();
    render(<CopyLinkButton linkId="aZ3k9Lm2" householdName="Rakotomavo" />);

    await utilisateur.click(screen.getByRole("button", { name: /Copier le lien de Rakotomavo/ }));
    expect(copier).toHaveBeenCalledWith(`${window.location.origin}/i/aZ3k9Lm2`);
  });

  it("confirms in place rather than with a floating notice", async () => {
    vi.spyOn(pressePapier, "copyToClipboard").mockResolvedValue(true);
    const utilisateur = userEvent.setup();
    render(<CopyLinkButton linkId="aZ3k9Lm2" householdName="Rakotomavo" />);

    await utilisateur.click(screen.getByRole("button", { name: /Copier le lien de Rakotomavo/ }));
    await waitFor(() => expect(screen.getByText("Copié")).toBeInTheDocument());
  });

  // Le repli qui compte : quand la copie échoue, le lien doit devenir
  // sélectionnable et le dire, en français. Jamais d'échec muet.
  it("falls back to a selected field the organiser can copy by hand", async () => {
    vi.spyOn(pressePapier, "copyToClipboard").mockResolvedValue(false);
    const utilisateur = userEvent.setup();
    render(<CopyLinkButton linkId="aZ3k9Lm2" householdName="Rakotomavo" />);

    await utilisateur.click(screen.getByRole("button", { name: /Copier le lien de Rakotomavo/ }));

    const champ = await screen.findByLabelText("Lien de Rakotomavo, à copier à la main");
    expect(champ).toHaveValue(`${window.location.origin}/i/aZ3k9Lm2`);
    expect(screen.getByText(/presse-papier n'est pas disponible/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @invitation-app/web test --run src/components/CopyLinkButton.test.tsx`
Expected: FAIL — `Failed to resolve import "./CopyLinkButton"`.

- [ ] **Step 3: Write minimal implementation**

```tsx
import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { copyToClipboard } from "@/lib/clipboard";
import { invitationUrl } from "@/lib/invitation-url";

/**
 * Le geste central de l'organisateur : prendre le lien d'un foyer pour le
 * coller dans WhatsApp.
 *
 * Trois choses délibérées :
 *
 * - la confirmation est **dans le bouton**, deux secondes. Une notification
 *   volante en haut de l'écran se rate d'un coup d'œil et n'existe pas pour un
 *   lecteur d'écran ;
 * - le libellé nomme le foyer. Dans une liste de soixante lignes, « Copier »
 *   répété soixante fois ne dit pas quel lien on prend ;
 * - **en cas d'échec, le lien apparaît sélectionné**, avec la raison. Le
 *   silence ferait croire à une copie réussie.
 */
export interface CopyLinkButtonProps {
  linkId: string;
  householdName: string;
}

export function CopyLinkButton({ linkId, householdName }: CopyLinkButtonProps) {
  const [etat, setEtat] = useState<"repos" | "copie" | "manuel">("repos");
  const champRef = useRef<HTMLInputElement>(null);
  const url = invitationUrl(linkId);

  useEffect(() => {
    if (etat !== "copie") return;
    const minuteur = setTimeout(() => setEtat("repos"), 2000);
    return () => clearTimeout(minuteur);
  }, [etat]);

  useEffect(() => {
    if (etat === "manuel") champRef.current?.select();
  }, [etat]);

  async function copier() {
    setEtat((await copyToClipboard(url)) ? "copie" : "manuel");
  }

  return (
    <div className="space-y-2">
      <Button variant="outline" size="sm" onClick={copier}>
        {etat === "copie" ? (
          <Check aria-hidden="true" className="mr-1.5 h-4 w-4" />
        ) : (
          <Copy aria-hidden="true" className="mr-1.5 h-4 w-4" />
        )}
        <span aria-hidden="true">{etat === "copie" ? "Copié" : "Copier le lien"}</span>
        <span className="sr-only">
          {etat === "copie" ? `Lien de ${householdName} copié` : `Copier le lien de ${householdName}`}
        </span>
      </Button>

      {etat === "manuel" && (
        <div className="space-y-1">
          <p className="text-sm text-bordeaux-700">
            Le presse-papier n'est pas disponible ici. Le lien est sélectionné : copiez-le avec
            Ctrl+C.
          </p>
          <input
            ref={champRef}
            readOnly
            value={url}
            aria-label={`Lien de ${householdName}, à copier à la main`}
            className="w-full rounded-control border border-rule-strong bg-ivory px-2 py-1 text-xs text-ink"
          />
        </div>
      )}
    </div>
  );
}
```

**Attention au libellé accessible :** le bouton porte à la fois un texte visible court (« Copier le lien ») et un `sr-only` qui nomme le foyer. Le test cherche `name: /Copier le lien de Rakotomavo/` — le nom accessible est la concaténation des deux, donc « Copier le lien Copier le lien de Rakotomavo ». Le `aria-hidden="true"` sur le texte visible est ce qui évite la répétition : ne pas l'enlever.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @invitation-app/web test --run src/components/CopyLinkButton.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/CopyLinkButton.tsx apps/web/src/components/CopyLinkButton.test.tsx
git commit -m "feat(web): copy a household's invitation link, with a visible fallback"
```

---

## Task 13: `ShareLinkButton`

**Files:**
- Create: `apps/web/src/components/ShareLinkButton.tsx`
- Create: `apps/web/src/components/ShareLinkButton.test.tsx`

**Interfaces:**
- Consumes: `invitationUrl` (Task 10), `Button` (Task 9).
- Produces: `ShareLinkButton({ linkId, householdName })` — **ne rend rien** si `navigator.share` n'existe pas.

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ShareLinkButton } from "./ShareLinkButton";

function stubPartage(share: ((donnees: ShareData) => Promise<void>) | null) {
  const original = navigator.share;
  Object.defineProperty(navigator, "share", { value: share ?? undefined, configurable: true });
  return () => {
    Object.defineProperty(navigator, "share", { value: original, configurable: true });
  };
}

afterEach(() => vi.restoreAllMocks());

describe("ShareLinkButton", () => {
  it("hands the browser the guest URL to share", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    const restore = stubPartage(share);
    const utilisateur = userEvent.setup();
    render(<ShareLinkButton linkId="aZ3k9Lm2" householdName="Rakotomavo" />);

    await utilisateur.click(screen.getByRole("button", { name: /Partager le lien de Rakotomavo/ }));
    expect(share).toHaveBeenCalledWith(
      expect.objectContaining({ url: `${window.location.origin}/i/aZ3k9Lm2` }),
    );
    restore();
  });

  // Sur un poste de bureau, `navigator.share` n'existe pas : un bouton qui ne
  // fera rien est pire que pas de bouton.
  it("renders nothing when the browser cannot share", () => {
    const restore = stubPartage(null);
    const { container } = render(<ShareLinkButton linkId="aZ3k9Lm2" householdName="Rakotomavo" />);
    expect(container).toBeEmptyDOMElement();
    restore();
  });

  // Fermer la feuille de partage rejette la promesse. Ce n'est pas une erreur.
  it("stays quiet when the organiser dismisses the share sheet", async () => {
    const restore = stubPartage(vi.fn().mockRejectedValue(new DOMException("Abort", "AbortError")));
    const utilisateur = userEvent.setup();
    render(<ShareLinkButton linkId="aZ3k9Lm2" householdName="Rakotomavo" />);

    await utilisateur.click(screen.getByRole("button", { name: /Partager le lien de Rakotomavo/ }));
    expect(screen.queryByRole("alert")).toBeNull();
    restore();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @invitation-app/web test --run src/components/ShareLinkButton.test.tsx`
Expected: FAIL — `Failed to resolve import "./ShareLinkButton"`.

- [ ] **Step 3: Write minimal implementation**

```tsx
import { Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { invitationUrl } from "@/lib/invitation-url";

/**
 * Le chemin réel vers WhatsApp, sur téléphone : un appui au lieu de trois.
 *
 * Le composant ne se rend pas du tout quand le navigateur ne sait pas partager
 * — c'est le cas de tous les navigateurs de bureau. Un bouton présent mais
 * inerte serait pire que son absence.
 */
export interface ShareLinkButtonProps {
  linkId: string;
  householdName: string;
}

export function ShareLinkButton({ linkId, householdName }: ShareLinkButtonProps) {
  if (typeof navigator.share !== "function") return null;

  async function partager() {
    try {
      await navigator.share({
        title: "Invitation au mariage",
        text: `Invitation pour ${householdName}`,
        url: invitationUrl(linkId),
      });
    } catch {
      // Fermer la feuille de partage rejette la promesse. Ce n'est pas un
      // échec : l'organisateur a simplement changé d'avis.
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={partager}>
      <Share2 aria-hidden="true" className="mr-1.5 h-4 w-4" />
      <span aria-hidden="true">Partager</span>
      <span className="sr-only">Partager le lien de {householdName}</span>
    </Button>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @invitation-app/web test --run src/components/ShareLinkButton.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/ShareLinkButton.tsx apps/web/src/components/ShareLinkButton.test.tsx
git commit -m "feat(web): share a household's link through the phone's own sheet"
```

---

## Task 14: Le filtre — texte et statut

**Files:**
- Create: `apps/web/src/lib/filter-households.ts`
- Create: `apps/web/src/lib/filter-households.test.ts`

**Interfaces:**
- Consumes: `HouseholdAdminDto`, `RsvpStatus` de `@invitation-app/shared`.
- Produces: `filterHouseholds(foyers, { query, status })` où `status: RsvpStatus | "ALL"`.

- [ ] **Step 1: Write the failing test**

```ts
import type { HouseholdAdminDto } from "@invitation-app/shared";
import { describe, expect, it } from "vitest";
import { filterHouseholds } from "./filter-households";

function foyer(partiel: Partial<HouseholdAdminDto>): HouseholdAdminDto {
  return {
    id: "a1",
    displayName: "Rakotomavo",
    allocatedSeats: 4,
    memberNames: [],
    status: "PENDING",
    confirmedCount: null,
    dietaryNotes: null,
    message: null,
    tableId: null,
    createdAt: "2026-09-01T08:00:00.000Z",
    updatedAt: "2026-09-01T08:00:00.000Z",
    ...partiel,
  };
}

const FOYERS = [
  foyer({ id: "a1", displayName: "Rakotomavo", status: "CONFIRMED", confirmedCount: 4 }),
  foyer({ id: "b2", displayName: "Andriamanana", memberNames: ["Fara", "Naina"] }),
  foyer({ id: "c3", displayName: "Rasoanaivo", status: "DECLINED", confirmedCount: 0 }),
];

describe("filterHouseholds", () => {
  it("returns everything when nothing is asked", () => {
    expect(filterHouseholds(FOYERS, { query: "", status: "ALL" })).toHaveLength(3);
  });

  it("matches a household name whatever the case", () => {
    const trouve = filterHouseholds(FOYERS, { query: "rakoto", status: "ALL" });
    expect(trouve.map((f) => f.id)).toEqual(["a1"]);
  });

  // On cherche souvent un invité par son prénom, pas par le nom du foyer.
  it("matches a member's first name", () => {
    const trouve = filterHouseholds(FOYERS, { query: "Naina", status: "ALL" });
    expect(trouve.map((f) => f.id)).toEqual(["b2"]);
  });

  // Les noms malgaches et français portent des accents, et personne ne les
  // tape dans un champ de recherche.
  it("ignores accents on both sides", () => {
    const avecAccent = [foyer({ id: "d4", displayName: "Ratsimbazafy Éric" })];
    expect(filterHouseholds(avecAccent, { query: "eric", status: "ALL" })).toHaveLength(1);
    expect(filterHouseholds(avecAccent, { query: "éric", status: "ALL" })).toHaveLength(1);
  });

  it("filters by status", () => {
    expect(filterHouseholds(FOYERS, { query: "", status: "PENDING" }).map((f) => f.id)).toEqual([
      "b2",
    ]);
  });

  it("combines the two", () => {
    expect(filterHouseholds(FOYERS, { query: "ra", status: "DECLINED" }).map((f) => f.id)).toEqual([
      "c3",
    ]);
  });

  it("ignores surrounding spaces in the query", () => {
    expect(filterHouseholds(FOYERS, { query: "  rakoto  ", status: "ALL" })).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @invitation-app/web test --run src/lib/filter-households.test.ts`
Expected: FAIL — `Failed to resolve import "./filter-households"`.

- [ ] **Step 3: Write minimal implementation**

```ts
import type { HouseholdAdminDto, RsvpStatus } from "@invitation-app/shared";

export interface HouseholdFilter {
  query: string;
  status: RsvpStatus | "ALL";
}

/**
 * Replie une chaîne sur sa forme cherchable : sans casse et sans accent.
 *
 * `NFD` sépare la lettre de son accent, et l'intervalle `U+0300-U+036F` est
 * celui des diacritiques combinants. Sans ça, « eric » ne trouve pas « Éric »,
 * et personne ne tape les accents dans un champ de recherche.
 */
function replier(texte: string): string {
  return texte
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/**
 * Le filtrage est côté client, délibérément : 15 tables au plus, donc de
 * l'ordre de 80 foyers. Une recherche serveur coûterait une route, un état de
 * chargement par frappe et une gestion d'annulation, pour un tableau qui tient
 * déjà en mémoire.
 */
export function filterHouseholds(
  foyers: HouseholdAdminDto[],
  { query, status }: HouseholdFilter,
): HouseholdAdminDto[] {
  const recherche = replier(query.trim());

  return foyers.filter((foyer) => {
    if (status !== "ALL" && foyer.status !== status) return false;
    if (recherche === "") return true;
    const matiere = replier([foyer.displayName, ...foyer.memberNames].join(" "));
    return matiere.includes(recherche);
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @invitation-app/web test --run src/lib/filter-households.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/filter-households.ts apps/web/src/lib/filter-households.test.ts
git commit -m "feat(web): filter households by name, member and status, accents folded"
```

---

## Task 15: `HouseholdDetail` — le contenu du dépli

**Files:**
- Create: `apps/web/src/components/HouseholdDetail.tsx`
- Create: `apps/web/src/components/HouseholdDetail.test.tsx`

**Interfaces:**
- Consumes: `CopyLinkButton` (Task 12), `ShareLinkButton` (Task 13), `HouseholdAdminDto`.
- Produces: `HouseholdDetail({ household })`.

- [ ] **Step 1: Write the failing test**

```tsx
import type { HouseholdAdminDto } from "@invitation-app/shared";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HouseholdDetail } from "./HouseholdDetail";

function foyer(partiel: Partial<HouseholdAdminDto> = {}): HouseholdAdminDto {
  return {
    id: "aZ3k9Lm2",
    displayName: "Rakotomavo",
    allocatedSeats: 4,
    memberNames: ["Fara", "Naina"],
    status: "CONFIRMED",
    confirmedCount: 4,
    dietaryNotes: "sans arachide",
    message: "Merci, on a hâte !",
    tableId: null,
    createdAt: "2026-09-01T08:00:00.000Z",
    updatedAt: "2026-11-12T19:30:00.000Z",
    ...partiel,
  };
}

describe("HouseholdDetail", () => {
  it("shows what the row had no room for", () => {
    render(<HouseholdDetail household={foyer()} />);
    expect(screen.getByText("Fara, Naina")).toBeInTheDocument();
    expect(screen.getByText("sans arachide")).toBeInTheDocument();
    expect(screen.getByText("Merci, on a hâte !")).toBeInTheDocument();
  });

  it("shows the link in full, next to the gesture that copies it", () => {
    render(<HouseholdDetail household={foyer()} />);
    expect(screen.getByText(`${window.location.origin}/i/aZ3k9Lm2`)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Copier le lien de Rakotomavo/ })).toBeInTheDocument();
  });

  // Un foyer sans réponse n'a ni régime ni message : une étiquette suivie d'un
  // blanc se lit comme une donnée perdue.
  it("drops the empty lines instead of printing a dash", () => {
    render(
      <HouseholdDetail household={foyer({ dietaryNotes: null, message: null, memberNames: [] })} />,
    );
    expect(screen.queryByText("Régime alimentaire")).toBeNull();
    expect(screen.queryByText("Message du foyer")).toBeNull();
    expect(screen.queryByText("Membres")).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @invitation-app/web test --run src/components/HouseholdDetail.test.tsx`
Expected: FAIL — `Failed to resolve import "./HouseholdDetail"`.

- [ ] **Step 3: Write minimal implementation**

```tsx
import type { ReactNode } from "react";
import type { HouseholdAdminDto } from "@invitation-app/shared";
import { CopyLinkButton } from "@/components/CopyLinkButton";
import { ShareLinkButton } from "@/components/ShareLinkButton";
import { invitationUrl } from "@/lib/invitation-url";

/**
 * Ce que la ligne n'a pas la place de porter. Il se déplie sous elle, et
 * plusieurs foyers peuvent rester ouverts en même temps — c'est le geste réel
 * quand on dépouille les réponses.
 */
function Ligne({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-0.5 sm:grid-cols-[10rem_1fr] sm:gap-4">
      <span className="text-xs uppercase tracking-wide text-ink-label">{label}</span>
      <span className="text-sm text-ink">{children}</span>
    </div>
  );
}

export function HouseholdDetail({ household }: { household: HouseholdAdminDto }) {
  return (
    <div className="space-y-3">
      {household.memberNames.length > 0 && (
        <Ligne label="Membres">{household.memberNames.join(", ")}</Ligne>
      )}
      {household.dietaryNotes && (
        <Ligne label="Régime alimentaire">{household.dietaryNotes}</Ligne>
      )}
      {household.message && <Ligne label="Message du foyer">{household.message}</Ligne>}
      <Ligne label="Lien d'invitation">
        <code className="break-all text-xs text-ink-muted">{invitationUrl(household.id)}</code>
      </Ligne>
      <div className="flex flex-wrap gap-2 pt-1">
        <CopyLinkButton linkId={household.id} householdName={household.displayName} />
        <ShareLinkButton linkId={household.id} householdName={household.displayName} />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @invitation-app/web test --run src/components/HouseholdDetail.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/HouseholdDetail.tsx apps/web/src/components/HouseholdDetail.test.tsx
git commit -m "feat(web): unfold a household's detail under its row"
```

---

## Task 16: L'écran Foyers, recomposé

**Files:**
- Modify: `apps/web/src/pages/admin/HouseholdsPage.tsx`
- Modify: `apps/web/src/pages/admin/HouseholdsPage.test.tsx`

**Interfaces:**
- Consumes: `DataTable` + `Column` (Task 6), `filterHouseholds` (Task 14), `HouseholdDetail` (Task 15), `Skeleton` (Task 3), `EmptyState` (Task 4), `StatusBadge` (Task 1), `Field`/`Input`/`Select`.
- Produces: rien de nouveau à l'extérieur. Le garde-fou de suppression arrive à la tâche 17 ; **cette tâche laisse le bouton Supprimer tel qu'il est**, pour que le diff reste lisible.

Lire `HouseholdsPage.test.tsx` avant de commencer : les tests existants doivent continuer à passer, ou être réécrits sciemment.

- [ ] **Step 1: Write the failing test**

Ajouter à `apps/web/src/pages/admin/HouseholdsPage.test.tsx` :

```tsx
it("waits with skeletons rather than with an empty screen", () => {
  // Requête qui ne répond pas : l'écran doit montrer l'attente, pas du vide.
  renderPage({ households: "pending" });
  expect(screen.getAllByTestId("skeleton").length).toBeGreaterThan(0);
  expect(screen.getByRole("status")).toHaveTextContent("Chargement des foyers…");
});

it("filters the list as the organiser types", async () => {
  const utilisateur = userEvent.setup();
  renderPage({ households: [foyer({ displayName: "Rakotomavo" }), foyer({ id: "b2", displayName: "Andriamanana" })] });

  await screen.findByText("Rakotomavo");
  await utilisateur.type(screen.getByLabelText("Rechercher un foyer"), "andria");

  expect(screen.queryByText("Rakotomavo")).toBeNull();
  expect(screen.getByText("Andriamanana")).toBeInTheDocument();
});

it("says so when the search finds nothing, instead of showing an empty table", async () => {
  const utilisateur = userEvent.setup();
  renderPage({ households: [foyer({ displayName: "Rakotomavo" })] });

  await screen.findByText("Rakotomavo");
  await utilisateur.type(screen.getByLabelText("Rechercher un foyer"), "zzz");

  expect(screen.getByText("Aucun foyer ne correspond")).toBeInTheDocument();
});

it("offers the copy gesture on every row, named after the household", async () => {
  renderPage({ households: [foyer({ displayName: "Rakotomavo", id: "aZ3k9Lm2" })] });
  expect(
    await screen.findByRole("button", { name: /Copier le lien de Rakotomavo/ }),
  ).toBeInTheDocument();
});
```

`renderPage` et `foyer` sont les aides du fichier existant ; les étendre si nécessaire plutôt que d'en créer d'autres.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @invitation-app/web test --run src/pages/admin/HouseholdsPage.test.tsx`
Expected: FAIL — pas de champ de recherche, pas de squelette, pas de bouton de copie.

- [ ] **Step 3: Write minimal implementation**

Recomposer le rendu de `HouseholdsPage` (la partie `return`, les mutations ne changent pas) :

```tsx
const [recherche, setRecherche] = useState("");
const [statut, setStatut] = useState<RsvpStatus | "ALL">("ALL");

const { data: households, isPending } = useQuery({
  queryKey: ["households"],
  queryFn: () => api.get<HouseholdAdminDto[]>("/admin/households"),
});

const visibles = useMemo(
  () => filterHouseholds(households ?? [], { query: recherche, status: statut }),
  [households, recherche, statut],
);

const colonnes: Column<HouseholdAdminDto>[] = [
  { id: "nom", header: "Foyer", cell: (h) => <span className="font-medium">{h.displayName}</span> },
  { id: "places", header: "Places", cell: (h) => `${h.confirmedCount ?? "—"} / ${h.allocatedSeats}` },
  { id: "statut", header: "Statut", cell: (h) => <StatusBadge status={h.status} /> },
  {
    id: "actions",
    header: "Actions",
    cell: (h) => (
      <div className="flex flex-wrap gap-2">
        <CopyLinkButton linkId={h.id} householdName={h.displayName} />
        <Button variant="outline" size="sm" onClick={() => setEditing(h)}>
          Modifier
        </Button>
        <Button variant="destructive" size="sm" onClick={() => deleteMutation.mutate(h.id)}>
          Supprimer
        </Button>
      </div>
    ),
  },
];
```

Et le corps :

```tsx
return (
  <div className="space-y-6 p-6 md:p-8">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h1 className="font-display text-2xl text-ink">Foyers invités</h1>
      <Button onClick={() => setDialogOpen(true)}>Ajouter un foyer</Button>
    </div>

    {error && (
      <p role="alert" className="rounded-surface border border-bordeaux-700 bg-bordeaux-50 px-4 py-3 text-sm text-bordeaux-700">
        {error}
      </p>
    )}

    <div className="grid gap-3 sm:grid-cols-[1fr_12rem]">
      <Field label="Rechercher un foyer">
        <Input
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          placeholder="Nom du foyer ou d'un invité"
        />
      </Field>
      <Field label="Statut">
        <Select value={statut} onChange={(e) => setStatut(e.target.value as RsvpStatus | "ALL")}>
          <option value="ALL">Tous</option>
          <option value="PENDING">En attente</option>
          <option value="CONFIRMED">Confirmés</option>
          <option value="DECLINED">Déclinés</option>
        </Select>
      </Field>
    </div>

    {isPending ? (
      <div className="space-y-2">
        <p role="status" className="sr-only">Chargement des foyers…</p>
        {Array.from({ length: 5 }, (_, index) => (
          <Skeleton key={index} className="h-12 w-full" />
        ))}
      </div>
    ) : visibles.length === 0 ? (
      <EmptyState
        title={households?.length ? "Aucun foyer ne correspond" : "Aucun foyer"}
        description={
          households?.length
            ? "Essayez un autre nom, ou remettez le statut sur « Tous »."
            : "Ajoutez le premier foyer pour commencer à distribuer les invitations."
        }
        action={!households?.length && <Button onClick={() => setDialogOpen(true)}>Ajouter un foyer</Button>}
      />
    ) : (
      <DataTable
        caption="Foyers invités"
        columns={colonnes}
        rows={visibles}
        rowKey={(h) => h.id}
        detail={(h) => <HouseholdDetail household={h} />}
        detailLabel={(h) => `Détail de ${h.displayName}`}
      />
    )}

    {/* Les deux dialogues existants restent tels quels. */}
  </div>
);
```

Imports à ajouter : `useMemo`, `RsvpStatus`, `Column`, `DataTable`, `filterHouseholds`, `HouseholdDetail`, `CopyLinkButton`, `Skeleton`, `EmptyState`, `Field`, `Input`, `Select`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @invitation-app/web test --run src/pages/admin/HouseholdsPage.test.tsx`
Expected: PASS.
Puis : `pnpm --filter @invitation-app/web test -- --run` et `VITE_API_URL=http://localhost:3000 pnpm --filter @invitation-app/web build`.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/pages/admin/HouseholdsPage.tsx apps/web/src/pages/admin/HouseholdsPage.test.tsx
git commit -m "feat(web): rebuild the households screen on the primitives, with search and copy"
```

---

## Task 17: Le garde-fou de suppression

**Files:**
- Modify: `apps/web/src/pages/admin/HouseholdsPage.tsx`
- Modify: `apps/web/src/pages/admin/HouseholdsPage.test.tsx`

**Interfaces:**
- Consumes: `AlertDialog` (Task 8).

- [ ] **Step 1: Write the failing test**

```tsx
// LE test de cette tâche : un clic sur « Supprimer » ne supprime pas.
it("never deletes on the first click", async () => {
  const utilisateur = userEvent.setup();
  const supprimer = vi.fn();
  renderPage({ households: [foyer({ displayName: "Rakotomavo" })], onDelete: supprimer });

  await utilisateur.click(await screen.findByRole("button", { name: "Supprimer" }));
  expect(supprimer).not.toHaveBeenCalled();
  expect(screen.getByRole("alertdialog")).toBeInTheDocument();
});

it("deletes only once the confirmation is pressed", async () => {
  const utilisateur = userEvent.setup();
  const supprimer = vi.fn();
  renderPage({ households: [foyer({ displayName: "Rakotomavo" })], onDelete: supprimer });

  await utilisateur.click(await screen.findByRole("button", { name: "Supprimer" }));
  await utilisateur.click(screen.getByRole("button", { name: "Supprimer le foyer" }));
  expect(supprimer).toHaveBeenCalledTimes(1);
});

it("cancels without deleting", async () => {
  const utilisateur = userEvent.setup();
  const supprimer = vi.fn();
  renderPage({ households: [foyer({ displayName: "Rakotomavo" })], onDelete: supprimer });

  await utilisateur.click(await screen.findByRole("button", { name: "Supprimer" }));
  await utilisateur.click(screen.getByRole("button", { name: "Annuler" }));
  expect(supprimer).not.toHaveBeenCalled();
});

// Ce qui distingue ce garde-fou d'un « Êtes-vous sûr ? » : il dit ce qu'on perd.
it("spells out what is lost when the household has already answered", async () => {
  const utilisateur = userEvent.setup();
  renderPage({
    households: [foyer({ displayName: "Rakotomavo", status: "CONFIRMED", confirmedCount: 4 })],
  });

  await utilisateur.click(await screen.findByRole("button", { name: "Supprimer" }));
  expect(screen.getByText(/a confirmé 4 personnes/)).toBeInTheDocument();
  expect(screen.getByText(/son lien cessera de fonctionner/)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @invitation-app/web test --run src/pages/admin/HouseholdsPage.test.tsx`
Expected: FAIL — le premier clic appelle encore la mutation, et aucun `alertdialog` n'existe.

- [ ] **Step 3: Write minimal implementation**

Dans `HouseholdsPage` :

```tsx
const [aSupprimer, setASupprimer] = useState<HouseholdAdminDto | null>(null);

/**
 * Ce que la suppression détruit, dit en toutes lettres. Un foyer qui a répondu
 * emporte sa réponse, et sa réponse ne se redemande pas : c'est la phrase qui
 * distingue ce garde-fou d'un « Êtes-vous sûr ? ».
 */
function descriptionDeSuppression(foyer: HouseholdAdminDto): string {
  const lien = "Son lien d'invitation cessera de fonctionner.";
  if (foyer.status === "CONFIRMED" && foyer.confirmedCount !== null) {
    return `Ce foyer a confirmé ${foyer.confirmedCount} personnes. Supprimer efface sa réponse, et son lien cessera de fonctionner.`;
  }
  if (foyer.status === "DECLINED") {
    return `Ce foyer a décliné l'invitation. Supprimer efface sa réponse, et son lien cessera de fonctionner.`;
  }
  return `Ce foyer n'a pas encore répondu. ${lien}`;
}
```

Le bouton de la colonne d'actions ouvre le dialogue au lieu de supprimer :

```tsx
<Button variant="destructive" size="sm" onClick={() => setASupprimer(h)}>
  Supprimer
</Button>
```

Et en fin de rendu :

```tsx
{aSupprimer && (
  <AlertDialog
    open
    onOpenChange={(ouvert) => !ouvert && setASupprimer(null)}
    title={`Supprimer le foyer ${aSupprimer.displayName} ?`}
    description={descriptionDeSuppression(aSupprimer)}
    confirmLabel="Supprimer le foyer"
    onConfirm={() => {
      deleteMutation.mutate(aSupprimer.id);
      setASupprimer(null);
    }}
  />
)}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @invitation-app/web test --run src/pages/admin/HouseholdsPage.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/pages/admin/HouseholdsPage.tsx apps/web/src/pages/admin/HouseholdsPage.test.tsx
git commit -m "feat(web): ask before deleting a household, and say what is lost"
```

---

## Task 18: Le même garde-fou sur les tables

**Files:**
- Modify: `apps/web/src/pages/admin/TablesPage.tsx:167`
- Modify: `apps/web/src/pages/admin/TablesPage.test.tsx`

**Interfaces:**
- Consumes: `AlertDialog` (Task 8).

- [ ] **Step 1: Write the failing test**

```tsx
it("never deletes a table on the first click", async () => {
  const utilisateur = userEvent.setup();
  const supprimer = vi.fn();
  renderPage({ tables: [table({ name: "Table 1" })], onDeleteTable: supprimer });

  await utilisateur.click(await screen.findByRole("button", { name: "Supprimer" }));
  expect(supprimer).not.toHaveBeenCalled();
});

// Supprimer une table ne détruit pas les foyers : elle les renvoie aux non
// placés. Le dire évite de croire qu'on perd des invités.
it("says where the seated households go", async () => {
  const utilisateur = userEvent.setup();
  renderPage({ tables: [table({ name: "Table 1", households: [{ id: "a1", displayName: "Rakotomavo", seats: 4 }] })] });

  await utilisateur.click(await screen.findByRole("button", { name: "Supprimer" }));
  expect(screen.getByText(/reviendront aux foyers non placés/)).toBeInTheDocument();
});
```

Adapter `renderPage` et `table` aux aides déjà présentes dans le fichier.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @invitation-app/web test --run src/pages/admin/TablesPage.test.tsx`
Expected: FAIL — le premier clic supprime encore.

- [ ] **Step 3: Write minimal implementation**

Même forme qu'à la tâche 17 :

```tsx
const [tableASupprimer, setTableASupprimer] = useState<TableDto | null>(null);
```

Bouton :

```tsx
<Button size="sm" variant="destructive" onClick={() => setTableASupprimer(table)}>
  Supprimer
</Button>
```

Dialogue :

```tsx
{tableASupprimer && (
  <AlertDialog
    open
    onOpenChange={(ouvert) => !ouvert && setTableASupprimer(null)}
    title={`Supprimer ${tableASupprimer.name} ?`}
    description={
      tableASupprimer.households.length > 0
        ? `Les ${tableASupprimer.households.length} foyers placés à cette table reviendront aux foyers non placés. Aucun foyer n'est supprimé.`
        : "Cette table est vide."
    }
    confirmLabel="Supprimer la table"
    onConfirm={() => {
      deleteTable.mutate(tableASupprimer.id);
      setTableASupprimer(null);
    }}
  />
)}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @invitation-app/web test --run src/pages/admin/TablesPage.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/pages/admin/TablesPage.tsx apps/web/src/pages/admin/TablesPage.test.tsx
git commit -m "feat(web): ask before deleting a table, and say where its households go"
```

---

## Task 19: Le dialogue de foyer, aux primitives, avec les deux champs manquants

**Files:**
- Modify: `apps/web/src/components/HouseholdFormDialog.tsx`
- Modify: `apps/web/src/components/HouseholdFormDialog.test.tsx`

**Interfaces:**
- Consumes: `Dialog` (Task 7), `Field`/`Input`/`Textarea`/`Select`, `Button`.
- Produces: `HouseholdFormValues` étendu de deux champs :

```ts
export interface HouseholdFormValues extends CreateHouseholdDto {
  status?: RsvpStatus;
  confirmedCount?: number;
  dietaryNotes?: string;
}
```

`memberNames` vient déjà de `CreateHouseholdDto` (`memberNames?: string[]`), et `UpdateHouseholdDto` accepte déjà `dietaryNotes` : **aucun changement de contrat, aucune migration.**

- [ ] **Step 1: Write the failing test**

```tsx
// Sans ce champ, la vraie liste des foyers n'est saisissable que par le seed —
// et la page invité n'a alors aucun nom à afficher.
it("captures the member names, one per line", async () => {
  const utilisateur = userEvent.setup();
  const onSubmit = vi.fn();
  render(<HouseholdFormDialog onSubmit={onSubmit} onClose={() => {}} />);

  await utilisateur.type(screen.getByLabelText(/Nom du foyer/), "Rakotomavo");
  await utilisateur.type(screen.getByLabelText(/Noms des invités/), "Fara\nNaina\n\n  Tiana  ");
  await utilisateur.click(screen.getByRole("button", { name: "Enregistrer" }));

  expect(onSubmit).toHaveBeenCalledWith(
    expect.objectContaining({ memberNames: ["Fara", "Naina", "Tiana"] }),
  );
});

// Sans ce champ, la tuile « Régimes particuliers » du tableau de bord affiche
// 0 pour toujours : le formulaire invité ne demande plus le régime.
it("lets an admin record a dietary note", async () => {
  const utilisateur = userEvent.setup();
  const onSubmit = vi.fn();
  render(<HouseholdFormDialog initial={foyer()} onSubmit={onSubmit} onClose={() => {}} />);

  await utilisateur.clear(screen.getByLabelText(/Régime alimentaire/));
  await utilisateur.type(screen.getByLabelText(/Régime alimentaire/), "sans arachide");
  await utilisateur.click(screen.getByRole("button", { name: "Enregistrer" }));

  expect(onSubmit).toHaveBeenCalledWith(
    expect.objectContaining({ dietaryNotes: "sans arachide" }),
  );
});

// Le mot de l'invité appartient à l'invité.
it("shows the guest's message without letting the admin rewrite it", () => {
  render(
    <HouseholdFormDialog initial={foyer({ message: "Merci, on a hâte !" })} onSubmit={vi.fn()} onClose={() => {}} />,
  );
  expect(screen.getByText("Merci, on a hâte !")).toBeInTheDocument();
  expect(screen.queryByLabelText(/Message/)).toBeNull();
});

// L'invariant, qui a déjà cassé trois fois : il ne bouge pas en passant aux
// primitives.
it("still refuses a confirmation without a count", async () => {
  const utilisateur = userEvent.setup();
  const onSubmit = vi.fn();
  render(<HouseholdFormDialog initial={foyer({ status: "PENDING" })} onSubmit={onSubmit} onClose={() => {}} />);

  await utilisateur.selectOptions(screen.getByLabelText("Statut"), "CONFIRMED");
  await utilisateur.clear(screen.getByLabelText(/Personnes confirmées/));
  await utilisateur.click(screen.getByRole("button", { name: "Enregistrer" }));

  expect(onSubmit).not.toHaveBeenCalled();
  expect(screen.getByText(/au moins une personne/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @invitation-app/web test --run src/components/HouseholdFormDialog.test.tsx`
Expected: FAIL — ni « Noms des invités » ni « Régime alimentaire » n'existent.

- [ ] **Step 3: Write minimal implementation**

Remplacer le cadre fait main (`<div className="fixed inset-0 …">` et son `<form>`) par la primitive `Dialog`, et chaque bloc `<div className="space-y-1"><label…` par un `Field` :

```tsx
const [memberNames, setMemberNames] = useState(initial?.memberNames.join("\n") ?? "");
const [dietaryNotes, setDietaryNotes] = useState(initial?.dietaryNotes ?? "");

/**
 * Une ligne, un nom. Les lignes vides et les espaces de bord sautent : on
 * colle souvent ces listes depuis un message, et elles arrivent sales.
 */
function nomsSaisis(brut: string): string[] {
  return brut
    .split("\n")
    .map((ligne) => ligne.trim())
    .filter((ligne) => ligne !== "");
}
```

Les champs, dans le `<form>` :

```tsx
<Field label="Nom du foyer" required>
  <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
</Field>

<Field label="Nombre de places" hint="Le nombre de personnes invitées dans ce foyer.">
  <Input
    type="number"
    min={1}
    value={allocatedSeats}
    onChange={(e) => setAllocatedSeats(Number(e.target.value))}
  />
</Field>

<Field
  label="Noms des invités"
  hint="Un nom par ligne. Ils s'affichent sur l'invitation du foyer."
>
  <Textarea rows={4} value={memberNames} onChange={(e) => setMemberNames(e.target.value)} />
</Field>

<Field label="Régime alimentaire" hint="Allergies, régimes — pour le traiteur.">
  <Textarea rows={2} value={dietaryNotes} onChange={(e) => setDietaryNotes(e.target.value)} />
</Field>
```

Le message de l'invité, en lecture seule, seulement à l'édition et seulement s'il existe :

```tsx
{isEdit && initial?.message && (
  <div className="space-y-1">
    <span className="block text-sm font-medium text-ink">Message du foyer</span>
    <p className="rounded-surface border border-rule bg-cream px-3 py-2 text-sm text-ink">
      {initial.message}
    </p>
  </div>
)}
```

Et la soumission porte les deux nouveaux champs :

```tsx
onSubmit({
  displayName,
  allocatedSeats,
  memberNames: nomsSaisis(memberNames),
  ...(isEdit && { status, dietaryNotes }),
  ...(status === "CONFIRMED" && { confirmedCount }),
  ...(status === "DECLINED" && { confirmedCount: 0 }),
});
```

**Ne pas toucher à la validation existante de `confirmedCount`** : elle tient l'invariant qui a déjà cassé trois fois. Le champ « Personnes confirmées » passe à `Field` + `Input`, son `error` vient de l'état `countError` déjà en place.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @invitation-app/web test --run src/components/HouseholdFormDialog.test.tsx`
Expected: PASS.
Puis la suite entière et le build.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/HouseholdFormDialog.tsx apps/web/src/components/HouseholdFormDialog.test.tsx
git commit -m "feat(web): let an admin enter member names and dietary notes"
```

---

## Task 20: Vérification dans un vrai navigateur

**Files:** aucun — c'est une tâche de vérification, et elle est obligatoire.

Ce projet a déjà vu trois défauts que les tests ne pouvaient pas voir : l'heure affichée dans le fuseau du lecteur, la carte de partage restée au 12 juin, et un voisin sans réponse affiché « 0 ». Une suite verte n'est pas une livraison.

- [ ] **Step 1: Lancer l'application**

```bash
docker compose up -d
pnpm --filter @invitation-app/api seed:demo
pnpm --filter @invitation-app/api start:dev
pnpm --filter @invitation-app/web dev
```

- [ ] **Step 2: Sur l'écran Foyers, vérifier une à une**

- [ ] La copie d'un lien met bien l'URL complète dans le presse-papier — coller dans un champ texte pour le voir de ses yeux, pas se fier au « Copié ».
- [ ] Le dépli d'une ligne montre membres, régime, message et lien ; plusieurs lignes restent ouvertes ensemble.
- [ ] La recherche trouve un foyer par le prénom d'un membre, accents ou non.
- [ ] Le bouton Supprimer ouvre le dialogue ; Échap et Annuler ne suppriment rien ; la confirmation supprime.
- [ ] Un foyer confirmé affiche bien son nombre dans l'avertissement.
- [ ] Un foyer **en attente** affiche `—` et non `0` dans la colonne Places. *(L'invariant `confirmedCount` nullable : il a cassé trois fois, par trois chemins.)*

- [ ] **Step 3: Réduire la fenêtre sous 768 px**

- [ ] La table devient des cartes, chaque valeur précédée de son étiquette.
- [ ] Les cibles tactiles restent confortables, le dialogue de confirmation tient à l'écran.

- [ ] **Step 4: Au clavier seul**

- [ ] On atteint le bouton de dépli, la recherche, chaque action de ligne.
- [ ] À l'ouverture du dialogue de suppression, **le focus est sur Annuler** ; Entrée annule.
- [ ] L'anneau de focus est visible partout — il est peint en `bordeaux-700` dans `index.css`, aucune primitive ne doit l'avoir supprimé.

- [ ] **Step 5: Consigner**

Mettre à jour `docs/audit/REPRISE.md` : lots A et B livrés, ce qui a été vérifié à l'écran et ce qui ne l'a pas été. Commit :

```bash
git add docs/audit/REPRISE.md
git commit -m "docs: record the admin primitives and the households screen"
```

---

## Self-review

**Couverture de la spec.** Lot A : les sept primitives sont aux tâches 1 à 8, plus `useMediaQuery` (tâche 5) que la spec ne nommait pas mais qu'impose son exigence « le repli en cartes est écrit une fois ». Le retokenisation de `Button` (tâche 9) n'était pas nommée non plus : elle est requise par la contrainte « pas de second rouge », que le `red-600` actuel viole dans chaque bouton Supprimer. Lot B : copie (10-12), partage (13), recherche (14), dépli (15), écran (16), garde-fous (17-18), dialogue et champs manquants (19). La vérification navigateur exigée par la spec est la tâche 20.

**Reste hors de ce plan, comme prévu :** la coquille et la navigation (lot C), le tableau de bord (lot D), les paramètres et l'alignement de `AdminSettingsDto` (lot F), le plan de table (lot E). Ils feront l'objet des deux plans suivants.

**Cohérence des types.** `Column<T>` et `DataTableProps<T>` (tâche 6) sont consommés tels quels en tâche 16. `invitationUrl` (10) est appelé par `CopyLinkButton` (12), `ShareLinkButton` (13) et `HouseholdDetail` (15) avec la même signature. `BadgeTone` (1) n'est utilisé que par `StatusBadge`. `HouseholdFormValues` (19) étend `CreateHouseholdDto` sans redéclarer `memberNames`, qui s'y trouve déjà.

**Un point à trancher à l'écran, pas dans un test :** le bouton destructif en `bordeaux-900` se distingue-t-il assez du bouton primaire en `bordeaux-700` ? Les deux teintes sont proches. Le garde-fou et le libellé portent le sens, donc rien n'est ambigu fonctionnellement — mais si, à l'œil, la nuance ne se voit pas, la réponse est un bouton destructif **en contour** (`border-bordeaux-900 text-bordeaux-900`), le plein étant réservé à la confirmation dans l'`AlertDialog`. À regarder en tâche 20.
