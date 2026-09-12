# Où on en est — reprise de session

**Dernière mise à jour :** 2026-09-12, par l'architecte.
À lire en premier si tu reprends ce projet sans le contexte de la conversation précédente.

## L'état en une phrase

**Le mariage est dans 113 jours** (2 janvier 2027), les réponses sont attendues dans 81 (1er décembre 2026). C'est le fait qui commande tout le reste : l'application ne tourne encore que sur la machine du commanditaire, et une invitation sur `localhost` n'envoie rien à personne. **La mise en ligne est passée devant le plan de table**, qui ne sert qu'en décembre.

L'audit est livré, le **lot 0 est terminé**, le **contrat partagé est désormais vérifié à la compilation** (`6582760`), et le **lot 3 est repris sur le design que le commanditaire a lui-même produit** (`images/html/`). Ce design remplace le découpage d'origine des tâches 1 à 11 : voir « Le nouveau découpage » plus bas.

## Le dépôt

**`main` est la branche de référence** et porte tout. Elle vit sur `github.com/hobiana/wedding-invitation`, et `origin/main` est à jour : la refonte de l'admin y est, poussée par le commanditaire le 2026-09-12.

**Qui pousse : lui, et lui seul.** La question est tranchée depuis le 2026-09-12. L'architecte commite en local, fusionne les branches quand elles sont prêtes, et **ne pousse jamais** — le `git pull` lui appartient aussi, donc pas de `pull` glissé dans une procédure de fusion. Le corollaire à garder en tête : entre deux de ses poussées, le dépôt local est le seul exemplaire du travail. Le lui signaler quand l'écart devient gros, sans jamais pousser à sa place.

L'application vivait dans `.worktrees/feature-invitation-app-v1` ; elle a été fusionnée et le worktree supprimé. `master` a été renommée `main` le 2026-08-23, et `develop`, `feature/invitation-app-v1` et `fix/lot-0-bloquants` supprimées après vérification qu'elles étaient intégralement contenues dans `main`.

## L'équipe

**Six agents** dans `.claude/agents/` : `backend-nestjs`, `frontend-react`, `ui-ux-designer`, `devops`, `qa-tester`, `security-auditor`.

Chacun **nomme explicitement** les skills superpowers qu'il doit invoquer. C'est indispensable : `using-superpowers` ordonne aux sous-agents de l'ignorer, donc rien ne se charge tout seul de l'autre côté de la frontière.

Chacun porte aussi la règle de **sauvegarde d'état à 60 % du budget** — écrire où on en est avant la coupure, pas pendant.

**Trois skills** dans `.claude/skills/` : `invitation-app-domain` (les 8 invariants métier), `audit-protocol` (grille d'audit commune), `wedding-design-system` (tokens, règles de mouvement, et les décisions arrêtées en fin de fichier).

## Les décisions du commanditaire — ne pas les rouvrir

1. **Prénoms des mariés et photo** : constantes de build, pas de champs en base.
2. **Le doré est `#AC784C`** (3,58:1), relevé sur leur faire-part papier — il franchit le seuil des éléments non textuels mais ne porte jamais de texte. Le `#B08D57` qu'on lit encore dans les §1.5.d et §3.2 de la direction artistique est **périmé** ; le jeton `--color-gold` du code fait foi.
3. **Les primitives d'interface s'appuient sur Radix**, pas sur `<dialog>` natif.
4. **Le lot 3 est découpé en petites tâches** commitables une par une, pour suivre l'avancement.

Arbitré le 2026-09-10, à partir du design fourni dans `images/html/` :

5. **Le mariage est le samedi 2 janvier 2027**, pas le 12 juin. Cérémonie à 09h00 à l'Église FJKM Ambatobe, réception à 13h00 à l'Espace Ny Akanintsika, Antananarivo. Réponses attendues avant le 1er décembre 2026. Les seeds portent la nouvelle date ; `weddingDate` est l'heure de la cérémonie, celle à laquelle un invité doit être quelque part.
6. **Confirmer veut dire « nous venons tous ».** L'invité ne saisit pas de nombre : `confirmedCount` prend la valeur de `allocatedSeats` à la confirmation, `0` au refus, et **reste `null` tant que le foyer n'a pas répondu** — l'invariant ne bouge pas. Un foyer qui vient en partie se corrige **depuis l'admin**, et l'invitation invite à téléphoner en cas de changement.
7. **Le formulaire invité ne demande plus le régime alimentaire**, seulement un mot libre (`message`). Conséquence à traiter : plus personne ne peut renseigner `dietaryNotes`, donc la tuile « Régimes particuliers » du tableau de bord affichera `0` indéfiniment tant que le champ n'est pas ajouté au formulaire admin.
8. **Les photos du couple viennent de leurs vraies photos.** Le design fourni en contenait quatre portant une signature de provenance C2PA (images générées) ; elles ne servent que pour le décor — enveloppe, fleurs, texture de papier — là où rien ne prétend représenter les mariés.
9. **L'ornement malgache est retiré.** Le design ornemente à l'aquarelle de roses ; on ne garde que ça. `HemMotif.tsx` — le motif de l'ourlet de leurs tenues — et le jeton `--rule-lamba` sortent. C'est un renversement assumé de la piste ouverte dans la direction artistique du 2026-08-23, qui écartait justement les roses du commerce.
10. **Le carrousel montre les trois vraies photos** de `images/old images - fiancailles/` : `DSC_2817`, `DSC_3536`, `DSC_3541`. Les légendes du design décrivaient les images générées et sont à réécrire d'après ce qu'on voit.

## Point de reprise — 2026-09-12, refonte de l'admin livrée et fusionnée

**Fusionnée dans `main`** le 2026-09-12, en avancement rapide depuis `e465fe3` — `main` n'avait pas bougé, la granularité « une tâche, un commit » est donc intacte et lisible. La branche `feat/admin-lots-a-b` est **conservée** : elle pointe au même endroit que `main`, elle ne coûte rien, et elle se supprime en une ligne une fois la poussée faite.

**Vérifié sur le résultat fusionné**, pas seulement sur la branche : **338 tests web**, **109 api**, **18 e2e** contre la vraie base, les deux builds à exit 0, `lint` web à exit 0 avec les trois mêmes avertissements qu'à la base de la branche.

**Poussée par le commanditaire le 2026-09-12** : `origin/main` et `main` sont tous deux sur `0877382`, vérifié après `fetch`. Les 36 commits qui n'existaient que sur ce disque — toute la refonte de l'admin, la page invité, les métriques de repli des fontes — sont en sécurité.

La partie admin a été conçue puis planifiée avec le commanditaire : **spec** dans `docs/superpowers/specs/2026-09-12-admin-refonte-design.md` (sept décisions arbitrées, à ne pas rouvrir), **plan d'exécution** dans `docs/superpowers/plans/2026-09-12-admin-lots-a-b.md` (vingt tâches). L'exécution se fait par sous-agents, un lot à la fois, et **le registre de progression est `.superpowers/sdd/2026-09-12-admin-lots-a-b/progress.md`** — il porte l'état exact, les décisions prises en cours de route et leur coût si elles sont fausses. C'est lui qu'il faut lire pour reprendre, pas cette section.

**Fait, commité, vérifié, relu** — les 20 tâches, **338 tests verts**, build à exit 0 :

- **Les primitives** : `Badge`, `Card`, `Skeleton`, `EmptyState`, `useMediaQuery`, `DataTable` (table sur bureau, cartes sous 768 px, depuis une seule définition de colonnes), `Dialog` et `AlertDialog` sur Radix, `Button` aux jetons du mariage.
- **Le lien** : `invitationUrl`, `copyToClipboard` qui dit la vérité quand il échoue, et les boutons copier et partager — avec un repli visible, parce qu'un organisateur qui croit avoir copié colle autre chose dans WhatsApp.
- **L'écran Foyers**, recomposé : recherche qui replie les accents et cherche aussi dans les prénoms des membres, filtre par statut, ligne dépliable portant le régime, le message et le lien, squelette au chargement, état vide qui distingue « aucun foyer » de « la recherche ne donne rien ».
- **Les deux garde-fous de suppression** : un clic sur « Supprimer » n'efface plus rien, et la confirmation dit ce qui est perdu — la réponse du foyer et son lien, ou, pour une table, que ses foyers reviennent aux non-placés sans être supprimés.
- **Le dialogue de foyer**, repris aux primitives, portant enfin les noms des membres et le régime alimentaire, et rendant le mot de l'invité en lecture seule.

**Les vingt tâches sont faites**, relues et vérifiées à l'écran. **338 tests verts**, build à exit 0. La tâche 19 a livré le dialogue de foyer repris aux primitives, avec **les noms des membres** — jusque-là saisissables nulle part, alors que la page invité les affiche — et **le régime alimentaire**, sans lequel la tuile du tableau de bord serait restée à zéro pour toujours. La relecture finale est faite : **fusionnable, zéro bloquant**, un constat majeur corrigé avant fusion (`6586754`) — la mémoire du focus se vidait au rendu de la fermeture alors que Radix n'appelle `onCloseAutoFocus` qu'au démontage, donc après ; nos appelants n'y touchaient pas, mais `open` est une prop publique et un dialogue resté monté serait retombé dans le bug que le crochet venait de fermer.

### Ce que la vérification au navigateur a trouvé, et qu'aucun test ne voyait

**[MAJEUR] Le focus ne revenait pas au bouton qui avait ouvert le dialogue.** — corrigé `4185058`.

Radix annule la restitution de son `FocusScope` puis focalise `context.triggerRef` ; nos dialogues sont montés par l'état de la page, **sans `<Trigger>`** — c'est le ruling R8 — donc ce ref vaut `null`, personne ne reprend le focus, et il retombe sur `<body>`. Un organisateur au clavier qui fermait le dialogue d'une ligne devait retraverser les quarante lignes pour revenir où il était. Les deux primitives étaient touchées.

**À retenir, et c'est le vrai enseignement :** la première correction **passait ses tests et ne marchait pas**. Elle mémorisait le focus dans un `useEffect`, or les effets des enfants s'exécutent avant ceux du parent — elle retenait donc le bouton « Annuler » que Radix venait de focaliser. jsdom et Chrome n'ordonnent pas ces deux focalisations de la même façon. La lecture se fait maintenant **pendant le rendu**. *Pour tout ce qui touche au focus dans ce projet, c'est le navigateur qui tranche, pas la suite.*

### Vérifié à l'écran, contre la vraie base

Le lien copié contient bien l'URL complète — collée pour de vrai dans un champ, pas crue sur parole. La recherche trouve « Raïssa » quand on tape « raissa ». Deux lignes restent dépliées ensemble. Un foyer en attente affiche `—`, un foyer décliné `0`. Un foyer créé par le nouveau dialogue arrive en base avec ses noms rognés, ses lignes vides sautées et `confirmedCount: null`. Passer à Confirmé sans nombre refuse, n'envoie rien, et **annonce** le refus. Le régime saisi arrive en base et la tuile du tableau de bord le compte. Le garde-fou dit « a confirmé **1 personne** ». Échap et Annuler ne suppriment rien ; le focus d'ouverture est sur Annuler. En mode carte, chaque valeur porte son étiquette.

### Ce qui reste à regarder sur ton écran et sur ton téléphone

Trois choses que cet environnement ne peut pas juger :

- **L'anneau de focus.** `document.hasFocus()` y vaut `false` : la fenêtre n'est pas au premier plan et Chrome ne peint pas `:focus-visible` dans ce cas. Ce qui a pu être constaté à la place : la règle est bien dans le CSS produit, et **aucun** `outline:none` ni `outline:0` nulle part — aucune primitive ne l'a supprimée.
- **Le repli en cartes sous 768 px.** Le redimensionnement de fenêtre ne change pas le viewport ici. Le mode carte a donc été obtenu en remplaçant `matchMedia` : la table disparaît, les étiquettes sont là, rien ne déborde horizontalement. La mise en page réelle d'un téléphone reste à voir.
- **Les cibles tactiles font 32 px** (le bouton de dépli, 32 × 32). Au-dessus du minimum WCAG (24 px), en dessous des 44 px que recommandent Apple et Google. À juger au doigt.

### Une question de design — tranchée le 2026-09-12

Le plan demandait de vérifier à l'écran si le bouton **Supprimer** (`bordeaux-900`) se distingue assez du bouton primaire (`bordeaux-700`), et prescrivait d'avance de passer le destructif en contour si non. **Mesuré : 1,43:1 entre les deux aplats** — à l'œil, ce sont deux rectangles de la même couleur.

La prescription du plan — passer le destructif en contour — a été appliquée puis retirée, parce que la mesure a montré autre chose que ce que le plan supposait : en contour, « Supprimer » se met à ressembler à « Modifier », son voisin immédiat dans la ligne.

**Le commanditaire a tranché autrement, et plus simplement : le bouton passe au rouge** (`ec661d4`). C'est un **renversement assumé de sa propre règle** « pas de second rouge » du §3.4 de la direction artistique. Le jeton est `--color-danger` (`#c0392b`) : une brique, pas un rouge d'alerte — 2,19:1 contre `bordeaux-700`, donc franchement autre chose, mais assez chaude pour tenir à côté du crème et du sable. Texte ivoire à 5,36:1, 7,44:1 au survol.

**Trois endroits portent ce renversement**, et il en fallait trois : le §3.4 est marqué périmé là où on le lit, le skill `wedding-design-system` porte la décision dans ses « décisions arrêtées », et un test de `button.test.tsx` dit la règle actuelle. Sans ça, le prochain agent qui relit le design system remet du bordeaux en croyant corriger un écart. Ce qui ne change pas : le rouge vient du jeton et de nulle part ailleurs — un `red-600` de Tailwind en dur rouvrirait le défaut que l'ancienne règle visait vraiment, et un test le verrouille.

**Deux règles apprises ici, à ne pas défaire :**

- **Les implémenteurs ne commitent pas.** Le plan les y invitait ; `CLAUDE.md` l'interdit. Ils laissent l'arbre modifié, l'architecte lance la suite et le build lui-même, relit, et commite.
- **`@testing-library/user-event` est entré dans le dépôt** avec le lot 2 : il n'y était pas, et tous les tests du plan s'en servent.

## Le nouveau découpage

| | Étape | État |
|---|---|---|
| 1 | Contrat partagé vérifié à la compilation | ✅ `6582760` |
| — | Date du mariage au 2 janvier 2027 | ✅ `ba888dd` |
| 2a | Décor du design extrait et optimisé | ✅ `7e4d739` |
| 2b | Fondations : trois familles de fontes, palette, trois clartés d'or | ✅ `b93eeff` |
| 2c | La page invité, section par section, et son assemblage | ✅ `2a5387c` → `425806c` |
| 2c bis | Retouches après relecture à l'écran par le commanditaire | ✅ `eb38d3f` → `da1d34c` |
| 2d | L'ouverture : enveloppe et sceau, accessible au clavier | ✅ `d5f58a4` |
| 2d bis | Verrou de défilement, apparition au défilement, pluie de pétales | ✅ `c313247` → `ee1490b` |
| 2e | Métriques de repli des trois fontes, mesurées au navigateur | ✅ `9ddce53` |
| 3 | Mise en ligne — **en parallèle, priorité haute** | plan écrit (`185b911`), en attente du commanditaire |
| 4 | Admin : foyers, copie des liens, champs `dietaryNotes` et `confirmedCount` | ✅ branche `feat/admin-lots-a-b` |
| 5 | Plan de table | en dernier |

**La page invité tourne et a été vérifiée dans un vrai navigateur**, contre la vraie base : un foyer `PENDING` à 4 places confirme, et le serveur écrit `confirmedCount = 4` — la règle « confirmer = tout le monde vient » tient de bout en bout. Les six fontes chargent, les trois clartés d'or se résolvent, le voile de papier ne capte aucun clic, le carrousel avance.

**Ce que l'exécution réelle a attrapé et qu'aucun test ne pouvait voir :** le `<title>`, la description et la carte Open Graph portaient encore « 12 juin 2027 ». Un invité partageant son lien dans un groupe WhatsApp aurait publié un aperçu annonçant juin. Corrigé (`425806c`).

**Les métriques de repli sont posées** (`9ddce53`), mesurées dans Chrome contre les vrais fichiers. Sans elles, `swap` confiait la page à Georgia, Segoe UI et Segoe Script à leurs propres proportions : +14,3 % de largeur et −6,2 % de hauteur de ligne sur Cormorant, +45,8 % et +16,5 % sur Parisienne, un paragraphe 7 à 38 % plus haut — tout ce qui suivait bougeait à l'arrivée de la webfont. Les trois écarts sont maintenant à 0,00 %. Le poids, lui, reste passé de 43 Ko à **186 Ko de latin** — c'est le prix du design, dit une fois pour toutes.

**Un seul `local()` par face de repli**, celui qui a été mesuré. Une liste plus longue appliquerait ces nombres à une police dont ils ne viennent pas. Là où le nom manque — Segoe hors de Windows, les trois sous Android — la face échoue et le nom suivant de la pile sert sans réglage : pas de protection, mais pas de faux réglage non plus. Mesurer les replis d'Android et de macOS demande ces machines ; ça reste ouvert, et sans urgence.

**Retouches du commanditaire après relecture à l'écran** (`eb38d3f` → `da1d34c`) : l'air entre le calendrier et le programme, les deux numéros à appeler, les puces et le champ au design du faire-part, une vraie carte dans le cadre du lieu avec un bouton d'itinéraire discret, la tenue retirée, le stationnement réduit à « Parking disponible sur place ». Il a lui-même commité `653cede` et `1861d9d` ; ce dernier ne retirait que la moitié de la section et laissait la garde lire encore `dressCode` — rattrapé en `da1d34c`.

**La porte est faite** (`d5f58a4`) et elle est transcrite du design du commanditaire, pas de la chorégraphie du §8 de la direction artistique — celle-ci décrit une pochette à encoche dessinée en CSS, avec la police Marcellus et le motif de broderie malgache, trois choses que le design du commanditaire et ses arbitrages ont rendues caduques. **Le §8 est donc périmé ; c'est `EnvelopeGate.tsx` qui fait foi.** Ce qui reste valable du §8, et qui est appliqué : rien n'existe uniquement dans l'animation, `prefers-reduced-motion` ne monte pas la scène du tout, et le voile s'en va sur un `setTimeout` et jamais sur un `animationend`.

**Vérifié comment :** l'onglet piloté est en arrière-plan, donc Chrome y gèle les animations — `getComputedStyle` y lit des valeurs figées et ment. Les temps ont été relevés par `element.getAnimations({subtree:true})`, qui répond sans peinture. **À savoir pour la prochaine animation de ce projet.** Restent à regarder sur un vrai téléphone : la scène sur un écran de moins de 600 px de haut, et la netteté de l'enveloppe (source 500 × 350 affichée à ~370 px, donc légèrement molle en densité double).

**Le verrou de défilement et l'apparition au défilement** (`c313247`) : la porte bloque le défilement tant qu'elle est là, et chaque section sous le premier écran se lève quand l'invité y arrive (`Reveal.tsx`). Deux choses à ne pas défaire :

- **Le contenu est visible par défaut**, et il ne devient invisible qu'une fois `IntersectionObserver` confirmé présent et le mouvement non réduit. L'inverse — masquer en CSS, démasquer en JS — produit une invitation blanche chez l'invité, qui ne le signalera jamais : il ne répondra simplement pas.
- **Le seuil de l'observateur est zéro.** Le bloc du plan de table mesure 0 px de haut tant qu'il n'est pas activé, et une cible sans surface ne franchit aucun seuil positif. Mesuré, pas supposé.

**Second piège d'environnement, du même genre que le premier :** dans cet onglet en arrière-plan, `IntersectionObserver` ne délivre **rien** — un observateur témoin posé sur `<main>`, pourtant pleinement visible, ne tire pas. L'apparition au défilement n'est donc pas vérifiable ici ; elle l'est en tests unitaires avec un faux observateur, et c'est au commanditaire de la regarder sur son écran.

**Les pétales tombent sur toute l'invitation** (`d0cdc54`, `ee1490b`), plus seulement dans la scène d'ouverture. Ils ont quitté `EnvelopeGate` pour `PetalRain`, un calque unique en `z-[60]` — au-dessus du `z-50` de la porte — qui ne s'arrête jamais : il n'y a donc plus de raccord entre les deux moments. **`pointer-events: none` sur ce calque n'est pas du confort** : il couvre la fenêtre entière, formulaire de réponse compris, et sans cette ligne il avale chaque clic et l'invité ne peut plus répondre. Le nombre de pétales suit la largeur de l'écran, borné à 16–34.

**Le plan de mise en ligne est écrit** (`185b911`, `docs/audit/2026-09-11-plan-de-mise-en-ligne.md`) : Render ≈ 14 $/mois + Vercel Hobby, sept bloquants, et une liste de sept choses à faire côté commanditaire. Il n'attend plus que lui.

## Lot 0 — terminé

Les cinq bloquants du rapport d'audit, corrigés et fusionnés dans `main` (`fe98be1` → `fc15f1a`).

| # | Bloquant | Commit |
|---|---|---|
| 1 | Un foyer confirmé occupait zéro siège | `fe98be1` + `296b487` |
| 2 | La capacité de table se contournait en une requête | `fe98be1` |
| 3 | Force brute possible sur `/auth/login` | `fe17014` |
| 4 | Aucune défense CSRF derrière `SameSite=None` | `fe17014` |
| 5 | L'invitation ne disait pas à quelle heure venir | `296b487` |

**Contrat établi entre le front et l'API, à respecter des deux côtés :**
`CONFIRMED` exige `confirmedCount >= 1` · `DECLINED` force `0` · `PENDING` remet à `null`.

Suites : **100 tests backend** (57 avant l'audit), **58 frontend** (44 avant), **18 e2e**, build à exit 0.

## L'environnement de développement

Postgres tourne en local et la base contient un jeu de données réaliste. Pour tout remonter depuis zéro :

```
docker compose up -d
cp apps/api/.env.example apps/api/.env      # renseigner DATABASE_URL et JWT_SECRET
cd apps/api && npx prisma migrate deploy
pnpm --filter @invitation-app/api seed:demo
```

`seed:demo` crée **40 foyers, 6 tables**, tous les champs optionnels remplis, avec deux tiers des foyers placés. Les données respectent les invariants que l'API applique — un jeu incohérent ferait chercher des bugs qui n'existent pas. `seed.ts` reste minimal : c'est lui qui tournera contre le vrai mariage.

- Invitation d'exemple : `http://localhost:5173/i/<linkId>` (les liens s'affichent à la fin du seed)
- Admin : `http://localhost:5173/login` — `admin@invitation-app.local` / `motdepasse-de-dev`
- `apps/api/.env` est ignoré par git et ne contient que des valeurs de développement.

Les tests e2e tournent depuis que la base existe. On sait donc **à l'exécution**, et plus seulement par lecture du code, que les 13 routes admin refusent un accès non authentifié. Le rapport d'audit dit le contraire : il était exact à sa date, il n'a pas été réécrit.

## Lot 3 — en cours

Découpé en onze tâches, chacune commitable seule :

| # | Tâche | Dépend de |
|---|---|---|
| ✅ 1 | Direction artistique : palette, typographies, chorégraphie de l'enveloppe | — |
| ✅ 2 | Fondations : tokens `@theme`, polices, espacement | 1 |
| ✅ 3 | `index.html` : `lang="fr"`, titre, image de partage | 2 |
| ✅ 4 | Primitives de saisie : `Field`, `Input`, `Textarea`, `Select` | 2 |
| 5 | Primitives de dialogue : `Dialog`, `AlertDialog` via Radix | 2 |
| 6 | Primitives d'affichage : `Badge`, `Card`, `Table`, `Skeleton`, `EmptyState` | 2 |
| ✅ 7 | Invitation : composition et respiration | 2, 4 |
| 8a | Invitation : **la pochette qui coulisse** | 7 |
| 8b | Invitation : **le tracé qui s'écrit** | 7 |
| 9 | Admin : navigation, tableau de bord en ratios | 4, 6 |
| 10 | Admin : foyers, copie du lien, recherche | 4, 5, 6 |
| 11 | Admin : plan de table utilisable au doigt, chemin sans glisser | 6 |

**Les photos sont fournies** dans `images/` (ignoré par git). Les portraits de fiançailles sont la matière : tenues traditionnelles malgaches blanches à broderies bordeaux. Le motif de l'ourlet est tracé en SVG dans `components/invitation/HemMotif.tsx` — la palette du mariage vient de leurs propres vêtements. Deux recadrages art-dirigés sont livrés dans `apps/web/public/` : portrait 3:4 pour mobile, paysage 3:2 pour bureau.

## Trouvé en faisant tourner l'app — CORRIGÉ le 2026-08-23 (commit ea5f410)

**[MAJEUR] L'heure du mariage s'affiche dans le fuseau de l'invité, pas dans celui du lieu.**

`weddingDate` est un timestamp UTC rendu par `toLocaleString` sans `timeZone`. Une cérémonie enregistrée à `2027-06-12T15:00:00Z` se lit 18:00 à Antananarivo, 19:00 à Maurice, 17:00 à Paris, 11:00 à Montréal. Un invité en France lit donc 17:00 pour un mariage à 18:00. Même problème sur `rsvpDeadline`, qui affiche « 04:00 » là où la base porte minuit.

Aucun test ne pouvait l'attraper — ils s'exécutent tous dans le fuseau de la machine — et l'audit ne l'a pas vu faute de données. C'est apparu à la première exécution réelle.

**Corrigé** dans `apps/web/src/lib/datetime.ts` : le fuseau `Indian/Antananarivo` est figé et passé explicitement à tous les rendus, et la page affiche « (heure de Madagascar) ». 18 tests simulent trois fuseaux. La correction attendue était : figer le fuseau du lieu et le passer explicitement à tous les rendus de date, côté invité comme côté admin.

## Ce qui reste après le lot 3

| Lot | Contenu | Effort |
|---|---|---|
| 1 | Fiabilité produit — états de chargement, confirmations avant suppression, messages en français, fuseau horaire, révocation à la déconnexion, en-têtes de sécurité | 3 – 4 j |
| 2 | Chaîne de livraison — `postinstall` Prisma, CI, durcissement Docker, échec bruyant si `VITE_API_URL` manque | 1,5 – 2 j |

## Pièges connus

- ~~`pnpm --filter @invitation-app/api lint` tourne avec `--fix`~~ — **corrigé** : `lint` vérifie sans écrire, `lint:fix` corrige. Il échoue aujourd'hui sur une trentaine de vraies questions de forme, restées à trancher.
- ~~`prisma generate` ne tourne pas à l'installation~~ — **corrigé** en `8d59006` : `apps/api/package.json` porte un `postinstall`. `CLAUDE.md` a été rectifié le 2026-09-12 ; il affirmait encore le contraire.
- **Le heredoc de l'outil Bash mange un niveau d'échappement.** Un `\\s` écrit dans un `<<'EOF'` arrive en `\s` dans le fichier — et dans un gabarit JS, `\s` vaut « s ». Le test écrit ainsi comparait sur un motif faux sans rien signaler. Pour tout fichier qui contient des contre-obliques, passer par l'outil Write ou par `node -e`.
- **Mesurer une police avant de l'avoir chargée mesure la police par défaut.** `document.fonts.ready` ne couvre que les familles que la page emploie déjà : une famille absente de l'écran courant donne un écart plausible et faux (−7 % relevé sur Parisienne, qui vaut 0 % une fois `document.fonts.load()` attendu). Charger explicitement chaque famille avant de la comparer.
- **Les fins de ligne ne sont pas normalisées** : un `eslint` en lecture seule sort environ 2 000 erreurs `Delete ␍`, presque toutes préexistantes. Il faut un `.gitattributes` décidé une fois — pas au coup par coup, sinon un `--fix` réécrit le dépôt entier et noie toute relecture.
- **Les agents et les skills ne s'enregistrent qu'au démarrage de la session.** Un fichier d'agent créé en cours de route n'est pas invocable avant redémarrage.
- **Les captures d'écran ne fonctionnent pas** dans cet environnement (le panneau navigateur ne composite pas). Utiliser `read_page`, `get_page_text` et `getComputedStyle`.
- Quand un agent travaille dans l'arbre, **ne pas faire de `git checkout` qui change les fichiers sous lui**. Pour avancer une branche en retard, déplacer son pointeur (`git branch -f`) plutôt que la sortir.

---

## Point de reprise — 2026-08-23, lot 3 tâche 1 en cours

**Le commanditaire a fourni ses références et ses photos**, dans `images/` à la racine (non versionné à ce stade — vérifier avant de supposer).

- `WhatsApp Image ... 09.34.56.jpeg` — faire-part pochette bordeaux, **cachet de cire doré**, intérieur ivoire, aquarelles florales, cadre hexagonal doré, prénoms en script doré. Attention : la dorure du papier brille par réflexion, l'écran ne reproduit pas cet effet au même contraste.
- `WhatsApp Image ... (1).jpeg` — pochette velours bordeaux, **carte ivoire qui coulisse** hors d'une encoche en demi-lune. Mécanisme mieux adapté à un écran vertical qu'un rabat d'enveloppe.
- `(2)` et `(3)` — photos récentes de plage, lumineuses, dominante bleu/vert. **Tonalement en conflit** avec le bordeaux ; déconseillées pour la composition principale.
- `old images - fiancailles/DSC_3536.jpg` (portrait 4016×6016) et `DSC_3541.jpg` (paysage) — **la vraie matière** : portraits professionnels en tenues traditionnelles malgaches blanches à broderies bordeaux. La palette du mariage est déjà dans leurs vêtements.

**Piste ouverte au designer :** tirer l'ornement des broderies malgaches de leurs propres tenues plutôt que des aquarelles de roses de la référence, qui est un modèle du commerce.

**Tension à trancher :** le commanditaire demande « épuré », sa référence est chargée. À concilier explicitement.

**Vidéo de référence** : `https://www.youtube.com/shorts/fYVUDkunFGg` — modèle Canva de faire-part numérique animé avec RSVP. Restée non visionnée, et **sans objet désormais** : le commanditaire a produit son propre design, qui porte sa mise en scène d'ouverture.

**Correction :** `ffmpeg` **est** installé sur cette machine, contrairement à ce que disait ce document. Il a servi à réencoder le décor du design (2,5 Mo → 104 Ko). `convert` répond aussi dans le PATH, mais **c'est l'outil Windows de conversion FAT→NTFS, pas ImageMagick** — ne jamais l'appeler.

**Ce qui bloque quoi :** la tâche 1 (direction artistique) est en cours chez `ui-ux-designer`, livrable attendu dans `docs/design/2026-08-23-direction-artistique.md`. Les tâches 2 à 6 démarrent dès sa validation par le commanditaire. Les tâches 7 et 8 dépendent en plus du choix de photo.

---

## Trouvé pendant la tâche 7 — CORRIGÉ le 2026-09-10 (commit `421aace`)

**[MAJEUR] Au plan de table, un voisin qui n'a pas répondu s'affichait « 0 ».**

`invitation.service.ts` écrivait `confirmedCount: h.confirmedCount ?? 0` en construisant la liste des voisins. Un foyer `PENDING` apparaissait donc à l'invité comme « Fara Rakotomavo — 0 » : on lui prêtait un refus alors qu'il n'avait simplement pas encore répondu. **L'invariant `confirmedCount` nullable cassé une troisième fois**, par un troisième chemin — après le dialogue d'édition et les écritures admin.

**Corrigé des deux côtés**, et il fallait bien les deux : `SeatingNeighborDto.confirmedCount` est nullable dans `packages/shared`, le `?? 0` et le type inline du service ont suivi, et `SeatingPlanSection` n'affiche plus que le nom quand la valeur est `null`. Le tiret étant déjà le séparateur dans le JSX, la seule correction API aurait remplacé un faux refus par un tiret orphelin — « Fara Rakotomavo — ». Le motif `?? "—"` de l'admin ne vaut pas ici, et un libellé « en attente » révélerait à un invité le statut de réponse d'un autre foyer.

Suites après correction : **101 tests backend, 166 frontend**, build à exit 0.

**À savoir pour la prochaine fois — le test exigeait le bug.** L'ancien cas affirmait `confirmedCount: 0` pour un voisin sans réponse, commentaire à l'appui : `// a neighbour who has not answered yet reads as 0, never null`. La régression était écrite comme si c'était la spec ; quiconque corrigeait le service voyait rouge et concluait qu'il se trompait. Les nouveaux tests posent `PENDING → null` et `DECLINED → 0` **dans le même plan de table** : séparés, chacun se laisse satisfaire par un service faux ; côte à côte, non.

**Vérification restante :** le rendu n'a pas été regardé dans le navigateur sur une table mixte (`null` + un nombre + `0` réunis). Les trois états sont couverts unitairement, mais ce projet a déjà vu un défaut n'apparaître qu'à l'exécution réelle.

---

## Fermé — la porte par laquelle cet invariant revenait

**[MAJEUR] Le contrat partagé n'était pas vérifié à la compilation côté API. — CORRIGÉ le 2026-09-10 (`6582760`).**

Aucun DTO de `@invitation-app/shared` n'était importé dans `apps/api/src` : les services décrivaient leur retour avec des types inline écrits à la main, et rien ne les confrontait à `packages/shared`. Le front pouvait typer `number | null` pendant que l'API renvoyait `0` sans qu'aucune compilation ne bronche — le mécanisme même qui a laissé `confirmedCount` casser trois fois.

Annoter les retours ne suffisait pas : TypeScript ne signale les propriétés en trop que sur un **littéral d'objet**. Ce sont donc des convertisseurs écrits à la main, `apps/api/src/common/contract.ts`, qui énumèrent chaque champ Prisma → DTO. Tout nouveau service qui renvoie au front passe par là.

**Ce qui reste ouvert du même genre :** `AdminSettingsDto` se contredit sur trois champs — `mapUrl`, `dressCode`, `parkingInfo` y sont `?: string` alors que les colonnes sont nullables et que `WeddingInfoDto` les déclare `string | null`. À trancher avant de toucher à l'admin.
