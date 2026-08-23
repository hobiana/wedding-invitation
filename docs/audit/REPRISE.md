# Où on en est — reprise de session

**Dernière mise à jour :** 2026-08-23, par l'architecte.
À lire en premier si tu reprends ce projet sans le contexte de la conversation précédente.

## L'état en une phrase

L'audit est livré, les décisions sont prises, le **lot 0 est terminé et fusionné**. Le **lot 3 — la refonte design — vient de s'ouvrir**, en attente de la direction artistique et des photos du couple.

## Le dépôt

**`main` est la seule branche** et porte tout. Aucun remote.

L'application vivait dans `.worktrees/feature-invitation-app-v1` ; elle a été fusionnée et le worktree supprimé. `master` a été renommée `main` le 2026-08-23, et `develop`, `feature/invitation-app-v1` et `fix/lot-0-bloquants` supprimées après vérification qu'elles étaient intégralement contenues dans `main`.

## L'équipe

**Six agents** dans `.claude/agents/` : `backend-nestjs`, `frontend-react`, `ui-ux-designer`, `devops`, `qa-tester`, `security-auditor`.

Chacun **nomme explicitement** les skills superpowers qu'il doit invoquer. C'est indispensable : `using-superpowers` ordonne aux sous-agents de l'ignorer, donc rien ne se charge tout seul de l'autre côté de la frontière.

Chacun porte aussi la règle de **sauvegarde d'état à 60 % du budget** — écrire où on en est avant la coupure, pas pendant.

**Trois skills** dans `.claude/skills/` : `invitation-app-domain` (les 8 invariants métier), `audit-protocol` (grille d'audit commune), `wedding-design-system` (tokens, règles de mouvement, et les décisions arrêtées en fin de fichier).

## Les décisions du commanditaire — ne pas les rouvrir

1. **Prénoms des mariés et photo** : constantes de build, pas de champs en base.
2. **Le doré `#B08D57` reste tel quel**, cantonné au filet décoratif — mesuré à 2,92:1, il ne portera jamais de texte.
3. **Les primitives d'interface s'appuient sur Radix**, pas sur `<dialog>` natif.
4. **Le lot 3 est découpé en petites tâches** commitables une par une, pour suivre l'avancement.

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
| 1 | Direction artistique : palette, typographies, chorégraphie de l'enveloppe | — |
| 2 | Fondations : tokens `@theme`, polices, espacement | 1 |
| 3 | `index.html` : `lang="fr"`, titre, image de partage | 2 |
| 4 | Primitives de saisie : `Field`, `Input`, `Textarea`, `Select` | 2 |
| 5 | Primitives de dialogue : `Dialog`, `AlertDialog` via Radix | 2 |
| 6 | Primitives d'affichage : `Badge`, `Card`, `Table`, `Skeleton`, `EmptyState` | 2 |
| 7 | Invitation : composition et respiration | 2, 4 |
| 8 | Invitation : la mise en scène d'enveloppe | 7 |
| 9 | Admin : navigation, tableau de bord en ratios | 4, 6 |
| 10 | Admin : foyers, copie du lien, recherche | 4, 5, 6 |
| 11 | Admin : plan de table utilisable au doigt, chemin sans glisser | 6 |

**Les photos du couple sont attendues** pour les tâches 7 et 8. Portrait ou carré, haute résolution.

## Trouvé en faisant tourner l'app — à traiter au lot 1

**[MAJEUR] L'heure du mariage s'affiche dans le fuseau de l'invité, pas dans celui du lieu.**

`weddingDate` est un timestamp UTC rendu par `toLocaleString` sans `timeZone`. Une cérémonie enregistrée à `2027-06-12T15:00:00Z` se lit 18:00 à Antananarivo, 19:00 à Maurice, 17:00 à Paris, 11:00 à Montréal. Un invité en France lit donc 17:00 pour un mariage à 18:00. Même problème sur `rsvpDeadline`, qui affiche « 04:00 » là où la base porte minuit.

Aucun test ne pouvait l'attraper — ils s'exécutent tous dans le fuseau de la machine — et l'audit ne l'a pas vu faute de données. C'est apparu à la première exécution réelle.

Correction attendue : figer le fuseau du lieu et le passer explicitement à tous les rendus de date, côté invité comme côté admin.

## Ce qui reste après le lot 3

| Lot | Contenu | Effort |
|---|---|---|
| 1 | Fiabilité produit — états de chargement, confirmations avant suppression, messages en français, fuseau horaire, révocation à la déconnexion, en-têtes de sécurité | 3 – 4 j |
| 2 | Chaîne de livraison — `postinstall` Prisma, CI, durcissement Docker, échec bruyant si `VITE_API_URL` manque | 1,5 – 2 j |

## Pièges connus

- `pnpm --filter @invitation-app/api lint` tourne avec **`--fix`** et modifie le dépôt. Ce n'est pas une commande de vérification. Le lot 2 doit le corriger.
- **`prisma generate` ne tourne pas à l'installation** (ni `postinstall` ni `prepare`). Sur un clone frais, rien ne compile tant qu'on ne l'a pas lancé à la main.
- **Les fins de ligne ne sont pas normalisées** : un `eslint` en lecture seule sort environ 2 000 erreurs `Delete ␍`, presque toutes préexistantes. Il faut un `.gitattributes` décidé une fois — pas au coup par coup, sinon un `--fix` réécrit le dépôt entier et noie toute relecture.
- **Les agents et les skills ne s'enregistrent qu'au démarrage de la session.** Un fichier d'agent créé en cours de route n'est pas invocable avant redémarrage.
- **Les captures d'écran ne fonctionnent pas** dans cet environnement (le panneau navigateur ne composite pas). Utiliser `read_page`, `get_page_text` et `getComputedStyle`.
- Quand un agent travaille dans l'arbre, **ne pas faire de `git checkout` qui change les fichiers sous lui**. Pour avancer une branche en retard, déplacer son pointeur (`git branch -f`) plutôt que la sortir.
