# Lots C et D — état et reprise

**Écrit le 2026-09-12** par l'architecte, à 85 % du budget de session, pour que rien ne dépende de la mémoire de la conversation.

Spec de référence : `docs/superpowers/specs/2026-09-12-admin-refonte-design.md`, sections « C — La coquille » et « D — Le tableau de bord ». L'ordre d'exécution arrêté est **A → B → C → D → F → E** ; A et B sont livrés et fusionnés dans `main`.

## Ce qui est déjà construit et qu'il faut consommer, pas réécrire

Les lots A et B ont livré tout l'outillage dont C et D ont besoin :

`useMediaQuery` (`lib/useMediaQuery.ts`) · `Card` · `Skeleton` · `EmptyState` · `Badge` / `StatusBadge` · `DataTable` · `Dialog` · `AlertDialog` · `Button` · `Field` / `Input` / `Select` / `Textarea` · `CopyLinkButton` · `invitationUrl` · `filterHouseholds` · `useFocusDeRetour`.

**Aucune migration Prisma, aucune route d'API nouvelle** pour ces deux lots.

## Lot C — La coquille — IMPLÉMENTÉ, VÉRIFICATION NAVIGATEUR DUE

**État au 2026-09-12 :** implémenté et commité (`7c523af`). **342 tests verts, build à exit 0 — mais le lot n'a PAS été regardé dans un vrai navigateur**, l'extension Chrome s'étant déconnectée au moment de le faire. C'est une règle du projet et elle n'est pas optionnelle : trois défauts y ont déjà échappé aux tests.

**À faire avant de considérer C comme livré**, et en particulier :

- les onglets du bas ne recouvrent pas la dernière ligne des écrans — le `pb-20` est censé y suffire, ça se vérifie à l'œil sur la liste des foyers ;
- le libellé « Plan de table » ne se coupe pas dans un onglet qui fait le quart d'un écran étroit ;
- le rail tient sans déborder, et l'adresse connectée se tronque proprement si elle est longue ;
- l'anneau de focus reste visible sur les liens du rail comme sur ceux des onglets.

**Fichiers :** `apps/web/src/components/AdminLayout.tsx` et son `AdminLayout.test.tsx`.

Ce que la spec demande :

- Un **rail** de navigation sur bureau ; des **onglets en bas** sur téléphone, là où le pouce arrive. Basculer avec `useMediaQuery`, jamais en rendant les deux et en cachant l'un par CSS — deux rendus simultanés dupliquent chaque libellé dans le DOM et cassent les tests des écrans qui l'entourent (c'est écrit dans la docstring de `useMediaQuery`).
- Les gris bruts `bg-neutral-900` et `text-neutral-700` laissent place aux jetons.
- **Rien n'anime** : la règle du design system sur l'admin ne bouge pas.
- L'adresse connectée et la déconnexion restent accessibles dans les deux dispositions.

**Détail à ne pas rater :** la spec nomme l'entrée « **Plan de table** », le code dit « Tables ». Renommer le libellé, pas la route (`/admin/tables`).

## Lot D — Le tableau de bord

**Fichiers :** `apps/web/src/pages/admin/DashboardPage.tsx` (77 lignes) — et **il n'a aucun fichier de test**, seul écran admin dans ce cas. En créer un.

Ce que la spec demande :

- Trois tuiles qui sont des rapports, pas des nombres nus : « **N foyers sur M ont répondu** » avec une barre (la tuile « déclinés » saute — c'est le complément, et la barre le dit déjà) ; « **N places confirmées sur M prévues** », le chiffre du traiteur ; « **N régimes particuliers** ».
- En dessous, « **à relancer** » : les foyers en attente, les plus anciens d'abord, chacun avec son `CopyLinkButton`. L'information et le geste qu'elle appelle au même endroit.
- La grande table de foyers que la page duplique aujourd'hui **disparaît** — elle fait doublon avec l'écran Foyers. Il y a donc autant de code retiré qu'ajouté.

### Deux accrocs trouvés en lisant le code, absents de la spec

**1. Le « sur M prévues » n'existe pas dans le contrat.** `DashboardStatsDto` porte `totalHouseholds`, `confirmedHouseholds`, `declinedHouseholds`, `pendingHouseholds`, `totalConfirmedGuests`, `dietaryNotesCount` — **pas** le total des places allouées.

*Décision retenue, annoncée au commanditaire sans objection :* le calculer **côté client** en sommant `allocatedSeats` sur la liste des foyers, que la page charge déjà. Zéro changement d'API, conforme au « aucune route nouvelle » de la spec. *Coût si c'est un mauvais choix : un total qui se recalcule à chaque rendu sur 40 à 80 foyers, soit rien ; l'alternative est un champ de plus dans le DTO et son convertisseur.*

**2. « Les plus anciens d'abord » — anciens de quoi ?** Il n'y a pas de `respondedAt` dans `HouseholdAdminDto`, seulement `createdAt` et `updatedAt`.

*Décision retenue, annoncée sans objection :* trier par **`createdAt` croissant** — invités depuis le plus longtemps, toujours silencieux. C'est bien ceux-là qu'on relance en premier. `updatedAt` ne conviendrait pas : il bouge à chaque correction faite depuis l'admin, ce qui ferait remonter un foyer qu'on vient de modifier.

### Ce qu'un test doit couvrir ici et qu'on oublierait

- Qu'un foyer **en attente** affiche `—` et jamais `0` (l'invariant `confirmedCount`, cassé trois fois).
- Que « à relancer » ne liste **que** les `PENDING`, et dans le bon ordre.
- L'état vide : aucun foyer en attente n'est pas la même chose qu'aucun foyer.
- Le `Skeleton` au chargement.

## La règle de travail, rappelée

- **Les implémenteurs ne commitent pas.** L'architecte lance la suite et le build lui-même, relit le diff, commite.
- **Chaque lot est regardé dans un vrai navigateur avant d'être commité.** Ce projet a déjà vu trois défauts qu'aucun test ne pouvait voir.
- **Pour tout ce qui touche au focus, c'est le navigateur qui tranche, pas la suite** — une correction est déjà passée verte en étant fausse (ruling R16).
- **Le commanditaire pousse `main` lui-même.** Commiter en local, ne jamais pousser, ne pas glisser de `git pull` dans une fusion.
