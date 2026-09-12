# Refonte de l'espace admin — design

**Date :** 2026-09-12. **Arbitré par :** le commanditaire, en séance.
**Statut :** validé en discussion, à exécuter lot par lot.

## Pourquoi maintenant

Le mariage est dans 112 jours, les réponses sont attendues dans 80. La page invité est finie ; l'admin, lui, n'a jamais été dessiné : il porte encore les gris bruts de shadcn (`bg-neutral-900`, `text-neutral-700`, `text-red-600`), aucun jeton du design system, et il lui manque des gestes sans lesquels le mariage ne peut pas s'organiser — copier un lien, saisir les noms des membres d'un foyer, supprimer sans détruire une réponse par mégarde.

Ce n'est pas un travail de finition. **C'est l'outil avec lequel deux personnes vont envoyer une centaine d'invitations et suivre les réponses pendant onze semaines.**

## Ce qui a été arbitré

Ces sept points sont tranchés. Ne pas les rouvrir sans le commanditaire.

1. **Les quatre écrans restent** (Tableau de bord, Foyers, Plan de table, Paramètres). On les rhabille, on ne les recompose pas et on ne repart pas d'une coquille neuve : à trois mois de l'échéance, aucun commit ne doit laisser l'admin inutilisable.
2. **Deux appareils, pour de vrai.** Copie des liens et suivi des réponses au téléphone ; saisie de la liste et plan de table à l'ordinateur. Chaque écran est pensé pour l'appareil où il sert réellement.
3. **15 tables au maximum**, soit de l'ordre de 120 à 150 places et 50 à 80 foyers. À cette échelle : filtrage côté client, pas de pagination, pas de chargement par morceaux.
4. **`dressCode` reste** en base, au contrat et dans les paramètres ; seule la page invité ne l'affiche plus. Pas de migration. Le champ porte la mention « non affiché sur l'invitation » pour que personne ne le remplisse en croyant qu'il s'affiche.
5. **Le détail d'un foyer se déplie sous sa ligne** — membres, régime, message, lien en clair, table. On reste dans la liste et on peut en ouvrir plusieurs à la fois, ce qui est le geste réel quand on dépouille les réponses.
6. **Le plan de table se conduit par un menu « Placer à la table… »**, qui liste les tables avec leurs places restantes et grise les tables pleines. Le glisser-déposer reste sur bureau comme chemin rapide, jamais comme seul chemin.
7. **Ordre d'exécution : A → B → C → D → F → E.** Les primitives d'abord parce que tout s'appuie dessus, le plan de table en dernier parce qu'il ne sert qu'en décembre.

## L'état réel du code, vérifié

Ce que la lecture a établi, et qui change le coût de plusieurs lots :

- **`Household.id` *est* le `linkId`.** `schema.prisma:16` le déclare sans valeur par défaut, `invitation.service.ts:22` cherche le foyer par `where: { id: linkId }`. Le lien se compose donc côté front (`${origin}/i/${h.id}`) — **aucun travail d'API pour la copie du lien**. Il est d'ailleurs déjà affiché en clair dans une colonne ; c'est le geste de copie qui manque.
- **`UpdateHouseholdDto` accepte déjà `dietaryNotes` et `message`** (`packages/shared/src/index.ts:77-85`). Seul le dialogue est en retard.
- **`memberNames` n'est éditable nulle part dans l'interface**, alors que la page invité s'en sert (`RsvpForm.tsx:187`). Aujourd'hui la vraie liste des foyers ne peut être saisie que par le seed. C'est un manque bloquant, pas un confort.
- **`HouseholdFormDialog` édite déjà `status` et `confirmedCount`** en respectant le contrat (`CONFIRMED` exige ≥ 1, `DECLINED` force 0). La correction « ce foyer ne vient qu'en partie » existe donc déjà.
- **Un clic supprime.** `HouseholdsPage.tsx:100` et `TablesPage.tsx:167` appellent `deleteMutation.mutate()` directement depuis le bouton, sans confirmation d'aucune sorte.
- **`@radix-ui/react-dialog` n'est pas installé** : seul `@radix-ui/react-slot` l'est. `HouseholdFormDialog` est un dialogue fait main, en `<label>` et `<select>` bruts, antérieur aux primitives `Field`/`Input`/`Select`.
- **`AdminSettingsDto` se contredit** : `mapUrl`, `dressCode`, `parkingInfo` y sont `?: string` alors que les colonnes sont nullables et que `WeddingInfoDto` les déclare `string | null`.
- **`HouseholdsPage` n'a aucun état de chargement** : l'écran est vide, puis la liste apparaît.

## Les lots

Chacun se commite seul et laisse l'admin utilisable. Ils sont décrits ici dans l'ordre des lettres ; ils s'exécutent dans l'ordre du point 7 — **A → B → C → D → F → E**.

### A — Les primitives

`@radix-ui/react-dialog` et `@radix-ui/react-alert-dialog` à installer. Puis sept composants minces, posés sur les jetons existants, chacun avec son `.test.tsx` à côté :

| Primitive | Ce qu'elle porte |
|---|---|
| `Dialog` | le cadre modal, le focus piégé, la fermeture à l'échappement, le titre lié par `aria-labelledby` |
| `AlertDialog` | même chose, mais le focus d'ouverture va sur **Annuler** et non sur l'action destructrice |
| `Badge` | les trois statuts RSVP, **toujours libellé en plus de la teinte** — jamais la couleur seule |
| `Card` | le conteneur des cartes de foyer sur téléphone et des tuiles du tableau de bord |
| `Table` | l'en-tête, les lignes, la ligne dépliée, **et le repli en cartes sous 768 px, écrit une fois** |
| `Skeleton` | l'attente, aux dimensions du contenu attendu, sans animation qui clignote |
| `EmptyState` | liste vide, recherche sans résultat, aucun foyer en attente |

Le repli en cartes appartient au `Table` et non à chaque écran : trois écrans s'en servent, il ne doit pas être réinventé trois fois.

### B — L'écran Foyers

**C'est le lot qui débloque l'envoi des invitations.** Il vient juste après les primitives.

**La ligne, à l'œil :** le foyer (nom, membres en second rang), les places (`confirmé / alloué`), le statut, la table, les actions. Le régime et le message quittent la vue de liste.

**Le dépli :** un appui sur la ligne ouvre un second rang — membres, régime, message de l'invité, lien en clair avec son bouton de copie, table, date de réponse. Plusieurs lignes peuvent être ouvertes en même temps.

**La copie du lien :** un bouton par ligne copie `${origin}/i/{id}` et le dit — le bouton devient « Copié » deux secondes. Pas de notification volante.
- Le presse-papier exige un **contexte sécurisé** : hors HTTPS (ou si l'API est refusée), on sélectionne le texte du lien pour un `Ctrl+C` manuel et on le dit. **Jamais un échec silencieux** : l'organisateur croirait avoir copié et collerait autre chose dans WhatsApp.
- Sur téléphone, un second geste **Partager** quand `navigator.share` existe — c'est le chemin réel vers WhatsApp, un appui au lieu de trois.

**Le garde-fou de suppression :** un `AlertDialog` qui nomme le foyer et dit ce qui disparaît. Quand le foyer a déjà répondu, il le dit franchement : « Ce foyer a confirmé 4 personnes. Supprimer efface sa réponse, et son lien cessera de fonctionner. » Annuler porte le focus d'ouverture. Même garde-fou sur la suppression d'une table (`TablesPage.tsx:167`), qui déplace des foyers vers les non-placés.

**Le dialogue de foyer :** repris sur `Field`/`Input`/`Select`/`Textarea`, et deux champs ajoutés :
- **les noms des membres** — sans eux la vraie liste n'est pas saisissable ;
- **le régime alimentaire** — sans lui la tuile du tableau de bord affiche `0` pour toujours, le formulaire invité ne le demandant plus.

Le **message de l'invité reste en lecture seule** : c'est son mot, l'admin ne le réécrit pas.

**La recherche :** un champ qui filtre sur le nom du foyer et sur les noms des membres, plus un filtre par statut. Tout côté client.

**Les états :** `Skeleton` au chargement, `EmptyState` quand la recherche ne donne rien, et les erreurs dans un encart aux jetons du design system — le `text-red-600` actuel est hors palette.

### C — La coquille

`AdminLayout` gagne un rail sur bureau (Tableau de bord, Foyers, Plan de table, Paramètres, puis l'adresse connectée et la déconnexion) et des onglets en bas sur téléphone, là où le pouce arrive. Les gris bruts (`bg-neutral-900`, `text-neutral-700`) laissent place aux jetons. **Rien n'anime** : la règle du design system sur l'admin ne bouge pas.

### D — Le tableau de bord

Les tuiles deviennent des rapports, pas des nombres nus :

- « **38 foyers sur 62 ont répondu** », avec une barre — la tuile « déclinés » saute, c'est le complément et la barre le dit déjà ;
- « **124 places confirmées sur 150 prévues** » — le chiffre du traiteur ;
- « **7 régimes particuliers** », qui ne sortira de zéro qu'une fois le lot B livré.

En dessous, **« à relancer »** : les foyers en attente, les plus anciens d'abord, chacun avec son bouton de copie. L'information et le geste qu'elle appelle au même endroit.

### E — Le plan de table

**Le chemin sans glisser :** chaque foyer non placé porte un menu « Placer à la table… » listant les tables avec leurs places restantes, les tables pleines grisées. Un foyer déjà placé porte « Déplacer vers… » et « Retirer ». Le glisser-déposer reste sur bureau, en plus.

Sur téléphone, le plateau devient une liste par table, dépliable, avec les non-placés en tête.

**L'occupation d'une table ne se recalcule pas ici.** `api/src/common/seating.ts` en est la définition unique et c'est l'API qui refuse un placement en trop ; l'affichage des places restantes est une commodité, pas une autorisation. Un menu qui grise une table pleine ne remplace pas le refus du serveur — les deux existent, et c'est le serveur qui tranche.

### F — Les paramètres

Passage aux primitives. `dressCode` conservé, marqué « non affiché sur l'invitation ». Le basculement d'activation du plan de table reste tel quel.

**C'est ici qu'on aligne le contrat :** `AdminSettingsDto.mapUrl`, `.dressCode`, `.parkingInfo` passent de `?: string` à `string | null`, comme les colonnes et comme `WeddingInfoDto`. Le convertisseur `apps/api/src/common/contract.ts` suit.

**Le piège à ne pas manquer :** un champ vidé doit repartir à `null`, jamais à `""`. Une chaîne vide n'est pas un trou — elle traverse le contrat, et la page invité affiche une ligne vide au lieu de ne rien afficher. C'est exactement la classe de bug qui a cassé `confirmedCount` trois fois.

## Ce qui ne change pas

- **Aucune migration Prisma.** Aucun champ n'est ajouté ni retiré en base.
- **Aucune route d'API nouvelle.** Tout ce que les six lots demandent existe déjà côté serveur.
- L'invariant `confirmedCount` : `CONFIRMED` exige ≥ 1, `DECLINED` force 0, `PENDING` remet à `null`. Le dialogue le respecte déjà ; les nouveaux champs ne doivent pas le contourner.
- **L'interface est en français sans exception**, admin compris. Un message d'erreur anglais remonté de l'API et affiché tel quel est un défaut.

## Tests et vérification

Chaque lot porte ses tests à côté du code, comme le reste du dépôt. Ce qui doit être couvert et qu'on oublierait :

- **La copie du lien** : que le texte copié est bien `${origin}/i/{id}` — pas l'id seul, pas un chemin relatif. Et le repli quand le presse-papier est refusé.
- **Le garde-fou** : qu'un clic sur « Supprimer » **n'appelle pas** la mutation, et que seule la confirmation l'appelle. C'est le test qui dit que le garde-fou garde.
- **`Badge`** : que le libellé est présent, pas seulement la couleur.
- **Le menu de placement** : qu'une table pleine est désactivée, et qu'un refus du serveur reste géré même quand le menu l'autorisait.
- **Les paramètres** : qu'un champ vidé envoie `null` et non `""`.
- **Le repli en cartes** : testé sur le `Table`, une fois, pas sur chaque écran.

Et ce qu'aucun test ne verra — ce projet en a déjà fait trois fois les frais : **chaque lot est regardé dans un vrai navigateur avant d'être commité**, et les deux écrans que le commanditaire utilisera au téléphone sont regardés au téléphone.

## Hors périmètre

Le lot 1 (fiabilité : en-têtes de sécurité, révocation à la déconnexion), le lot 2 (CI, durcissement Docker), la saisie de la vraie liste de foyers, et la mise en ligne. Ils sont suivis dans `docs/audit/REPRISE.md`.
