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

## Lot D — Le tableau de bord — LIVRÉ, VÉRIFICATION NAVIGATEUR DUE

**État au 2026-09-13 :** implémenté, relu et commité (`c0b724c`). **359 tests web** (342 avant), build à exit 0. Les deux accrocs ci-dessous ont été tranchés comme prévu et tiennent.

Livré : trois tuiles-rapports, la section « À relancer » — les `PENDING`, `createdAt` croissant, chacun avec son `CopyLinkButton` — et la grande table de foyers retirée, qui doublait l'écran Foyers sans en avoir ni la recherche, ni le dépli, ni les actions. `DashboardPage.test.tsx` existe enfin : **17 tests**, là où cet écran était le seul de l'admin sans aucun.

**Vérifié par l'architecte, pas sur parole :** la mutation de `?? "—"` en `?? 0` fait tomber exactement un test — celui de l'invariant — et la restauration rend les 17. Le test mord.

**La barre des réponses n'a qu'un segment, et c'est une mesure, pas un raccourci.** La première version la coupait en deux, `status-yes` / `status-no` : les deux jetons ne se distinguent l'un de l'autre que de **1,26:1**, donc sur 8 px c'est un seul aplat coupé en deux et rien ne dit lequel est lequel. Chacun tient pourtant bien contre le fond (6,31:1 et 5,02:1) — **c'est leur écart mutuel qui manque, et aucun de ces deux nombres ne le révèle.** À retenir avant de mettre deux jetons `status-*` bord à bord : ils ont été dessinés pour des pastilles séparées.

**Reste à regarder à l'écran :** la grille des trois tuiles à 375 px, et si la légende « 21 confirmés · 11 déclinés · 8 en attente » tient sur une ligne dans une tuile d'un tiers de largeur.

**Une question de produit, ouverte :** la liste « à relancer » n'est pas tronquée. Huit cartes sur le seed, mais quarante si personne n'a répondu — l'écran devient long au téléphone. La pagination est hors V1 ; c'est au commanditaire de dire si ça le gêne.

### Le piège de test qui a coûté le plus, et qui vaut pour tout cet admin

`await screen.findByRole("region", { name: "À relancer" })` **rend la main immédiatement** : la section et son titre sont rendus dès le premier passage, pendant le chargement. Les assertions portaient donc sur des squelettes.

**Le plus grave n'était pas les deux tests qui échouaient, mais celui qui passait** : « la table de foyers a disparu » vérifiait `queryByRole("table") === null` sur un écran encore vide. Il serait resté vert avec la vieille table toujours en place.

**Règle : n'attendre que du contenu que seule la réponse produit** — une ligne de liste, un état vide, un libellé de tuile. Jamais le titre, jamais la section. Une assertion négative sur un écran vide ne prouve rien.

## Lot F — Les paramètres

**Moitié serveur : livrée et commitée** (`d47950e`). `AdminSettingsDto.mapUrl`, `.dressCode`, `.parkingInfo` sont en `string | null`, comme les colonnes et comme `WeddingInfoDto`. **121 tests api** (109 avant), 18 e2e, `nest build` à exit 0.

Ce que la lecture du code a trouvé et que la spec ne disait pas : **`/admin/settings` ne rencontrait aucun convertisseur** — la route renvoyait la ligne Prisma brute, donc changer la déclaration dans `packages/shared` aurait été purement décoratif. `toAdminSettingsDto` est ce point de confrontation, et deux défauts en sont tombés : `weddingDate` et `rsvpDeadline` partaient en objets `Date` là où le contrat promet de l'ISO, et l'`id` « singleton » ne part plus — le formulaire le chargeait dans son état et le repostait à chaque PATCH, où le `whitelist` du `ValidationPipe` le jetait en silence.

**La porte du `""` est fermée dans le service, avant Prisma** — pas seulement dans le formulaire : un `curl` passe à côté du front. Un champ vidé vaut `null`, une espace seule compte comme vide, un texte renseigné part verbatim (normaliser constate qu'un champ est vide, ça ne réécrit pas ce que l'organisateur a saisi).

**Moitié web : en cours.**

**À arbitrer par le commanditaire :** `venueName` et `address` acceptent aujourd'hui `""`. Colonnes non nullables, donc hors de l'alignement de ce lot, et rien n'y a été touché — mais `@IsString()` seul laisse passer la chaîne vide, et un lieu vidé par mégarde s'afficherait comme un blanc sur l'invitation. Le correctif n'est pas un `null`, c'est un `@IsNotEmpty()`.

## Lot E — Le plan de table

**En cours.** Le brief donné : le chemin sans glisser (menu « Placer à la table… » avec les places restantes, tables pleines grisées ; « Déplacer vers… » et « Retirer » pour un foyer placé), le glisser-déposer conservé sur bureau en plus, et la liste par table dépliable sur téléphone.

**Le point qui commande tout le lot :** le menu grise une table pleine, il n'autorise rien. C'est l'API qui refuse, via `seating.ts`. Entre le chargement de la page et le clic, un autre onglet a pu remplir la table — **un refus du serveur doit rester géré et affiché en français, même sur un placement que le menu présentait comme permis.**

**Et la définition unique, à ne pas multiplier :** `TableBoard.tsx` recopiait déjà `seatsFor` dans une fonction locale `seatsUsed` ; le menu « places restantes » en aurait été la troisième copie. La formule descend dans `packages/shared`, `apps/api/src/common/seating.ts` la réexporte — les trois portes de l'API continuent d'importer le même symbole au même chemin — et le web l'importe au lieu de la réécrire.

## La règle de travail, rappelée

- **Les implémenteurs ne commitent pas.** L'architecte lance la suite et le build lui-même, relit le diff, commite.
- **Chaque lot est regardé dans un vrai navigateur avant d'être commité.** Ce projet a déjà vu trois défauts qu'aucun test ne pouvait voir.
- **Pour tout ce qui touche au focus, c'est le navigateur qui tranche, pas la suite** — une correction est déjà passée verte en étant fausse (ruling R16).
- **Le commanditaire pousse `main` lui-même.** Commiter en local, ne jamais pousser, ne pas glisser de `git pull` dans une fusion.
