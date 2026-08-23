---
name: wedding-design-system
description: Système de design de l'invitation de mariage — palette bordeaux/ivoire, typographie, échelle d'espacement, langage d'animation et règles d'accessibilité. À invoquer avant toute écriture de JSX stylé, de CSS, de token de thème ou d'animation dans apps/web.
---

# Design system — bordeaux & ivoire

**État : squelette.** Les valeurs marquées `PROVISOIRE` sont des points de départ posés par l'architecte ; le designer les arrête en phase 3, avec les vraies photos et le vrai contenu. Les règles **non** marquées sont des contraintes d'ingénierie : elles ne bougent pas.

## Contrainte technique — Tailwind v4

`apps/web` utilise **Tailwind 4.3** via `@tailwindcss/vite`. Il n'y a **pas** de `tailwind.config.js` et il ne doit pas y en avoir. Les tokens se déclarent dans un bloc `@theme` de `src/index.css` :

```css
@import "tailwindcss";

@theme {
  --color-bordeaux-700: #6E1F35;
  --font-display: "Cormorant Garamond", Georgia, serif;
}
```

Tailwind génère alors `bg-bordeaux-700`, `font-display`, etc. Écrire un `tailwind.config.js` dans ce projet ne produira rien — c'est une erreur silencieuse coûteuse.

Aujourd'hui `index.css` contient une seule ligne (`@import "tailwindcss"`). Tout est à poser.

## Palette — PROVISOIRE

| Token | Valeur | Usage |
|---|---|---|
| `--color-ink` | `#2A2124` | Texte courant, noir chaud plutôt que pur |
| `--color-bordeaux-900` | `#3E1220` | Titres, aplats profonds |
| `--color-bordeaux-700` | `#6E1F35` | **Primaire** — boutons, liens, accents forts |
| `--color-bordeaux-500` | `#8E3A50` | États survol, bordures actives |
| `--color-bordeaux-200` | `#E8CDD4` | Séparateurs, fonds de badge |
| `--color-bordeaux-50` | `#F9EFF1` | Fonds de section très légers |
| `--color-ivory` | `#FBF8F4` | **Fond principal** de l'app |
| `--color-cream` | `#F2EAE0` | Fond secondaire, cartes |
| `--color-gold` | `#AC784C` | Accent, filets, ornements — relevé sur le faire-part du commanditaire |

**Règle d'accessibilité non négociable :** `--color-gold` sur ivoire mesure **3,58:1** — il franchit le seuil de 3:1 des éléments **non textuels**, donc il peut porter un filet, une bordure, une icône décorative. Il ne porte pour autant **jamais de texte** : le seuil du texte est 4,5:1. (Le jeton précédent, `#B08D57`, échouait à 2,92:1 ; celui-ci vient de la référence papier du commanditaire et se trouve être le plus conforme des deux.) Il reste **ornemental** — filets, ornements, icônes non porteuses de sens. Jamais de texte courant, jamais un libellé de bouton, jamais un état d'erreur. Le bordeaux 700 sur ivoire dépasse largement 7:1 : c'est lui qui porte le texte et les actions.

Statuts RSVP : ne pas coder l'information par la seule couleur. `CONFIRMED` / `DECLINED` / `PENDING` portent toujours un libellé ou une icône en plus de la teinte.

## Typographie — PROVISOIRE

- **Display** : `Cormorant Garamond` — titres, prénoms des mariés, date. Serif, contrasté, élégant.
- **Texte** : `Inter` — corps, formulaires, tout l'admin. Neutre et lisible à petite taille.
- Échelle : 12 · 14 · 16 · 20 · 24 · 32 · 48 · 64.
- Le corps de texte ne descend jamais sous 16px sur mobile.
- Les polices se chargent en `font-display: swap` avec une pile de repli réelle (`Georgia, serif` / `system-ui, sans-serif`). Une page d'invitation qui reste blanche parce qu'une police n'a pas chargé est un échec.

## Espacement

Base 4px. Échelle : 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96.

Le registre « épuré » se joue ici bien plus que dans la palette : **de l'air**. Sur la page d'invitation, une section respire à 64 ou 96px de ses voisines, pas à 24.

## Langage d'animation

C'est le cœur de la page d'invitation. Trois régimes de durée :

| Régime | Durée | Pour quoi |
|---|---|---|
| Micro | 120–180 ms | Survol, focus, bascule d'état |
| Transition | 240–320 ms | Apparition d'un bloc, changement de vue |
| Scène | 600–1200 ms | Narratif : ouverture d'enveloppe, dévoilement |

Easings : entrée `cubic-bezier(0.22, 1, 0.36, 1)` · sortie `cubic-bezier(0.4, 0, 1, 1)`. Pas de `linear` sur du mouvement visible, pas de rebond sur une invitation de mariage — le registre est élégant, pas ludique.

### Les cinq règles qui ne bougent pas

1. **Aucune information n'existe uniquement dans l'animation.** Si le JS échoue ou si l'animation ne joue pas, le contenu reste lisible et le formulaire RSVP reste utilisable. L'enveloppe est un habillage, jamais une porte.
2. **`prefers-reduced-motion: reduce` est respecté partout.** Dans ce mode, l'enveloppe ne s'anime pas : le contenu est simplement là. Ce n'est pas une version dégradée, c'est une version directe.
3. **On n'anime que `transform` et `opacity`.** Animer `width`, `height`, `top` ou `box-shadow` déclenche des recalculs de layout et fait chuter le framerate sur les téléphones d'entrée de gamme — or ces invités-là existent.
4. **L'animation d'ouverture ne se joue qu'une fois par session.** Un invité qui revient trois fois pour vérifier l'adresse ne doit pas re-subir douze secondes de mise en scène. Mémoriser dans `sessionStorage`, prévoir un moyen de la rejouer.
5. **Rien n'anime dans l'admin.** L'espace organisateur est un outil de travail : transitions micro uniquement. Le spectacle est réservé aux invités.

## Décisions arrêtées

Tranchées par le commanditaire le 2026-08-22, après l'audit. Ne pas les rouvrir sans lui.

- **Le doré est `#AC784C`**, relevé sur le faire-part papier du commanditaire. À 3,58:1 il franchit le seuil des éléments non textuels, mais ne porte jamais de texte. Le bordeaux porte tout ce qui doit être lu.
- **L'ornement vient des broderies malgaches du couple** : le motif d'ourlet de la robe devient un tracé SVG et sert de signature, les rayures du lamba (rythme 1/2/5/2/1) deviennent le filet de section. Les aquarelles florales et le cadre hexagonal de la référence papier sont écartés — la densité est bon marché sur papier et chère sur un téléphone.
- **L'ouverture est une pochette à encoche**, pas une enveloppe à rabat : la carte coulisse verticalement. Aucune transformation 3D, CSS pur, aucune librairie d'animation.
- **Typographie : Marcellus** (display) et **Source Sans 3** (texte), auto-hébergées, 42,3 Ko au total. Choix arrêté sur la hauteur d'x mesurée, pas sur le goût — ne pas revenir à Cormorant.
- **Les prénoms des mariés et la photo sont des constantes de build**, pas des champs en base. Le produit est mono-événement par construction ; pas de migration, pas d'édition dans l'admin.
- **Les primitives d'interface s'appuient sur Radix** (`@radix-ui/react-dialog` et sœurs), cohérent avec le shadcn/ui déjà en place. Ne pas repartir sur `<dialog>` natif.

## Périmètre

Ce système couvre `apps/web`. La page publique `/i/:linkId` porte l'identité complète ; l'admin `/admin/*` réutilise les mêmes tokens dans un registre sobre et dense.
