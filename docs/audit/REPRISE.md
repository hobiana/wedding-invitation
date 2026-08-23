# Où on en est — reprise de session

**Dernière mise à jour :** 2026-08-22, par l'architecte.
À lire en premier si tu reprends ce projet sans le contexte de la conversation précédente.

## L'état en une phrase

L'audit est terminé et livré ; les décisions sont prises ; le **lot 0** (correction des 5 bloquants) est **en cours** sur la branche `fix/lot-0-bloquants`.

## Ce qui est fait

- **`master`** porte l'application. Elle vivait dans `.worktrees/feature-invitation-app-v1` ; merge fast-forward de 33 commits, worktree supprimé, branche `feature/invitation-app-v1` et `develop` entièrement contenues dans `master`.
- **Six agents** dans `.claude/agents/` : `backend-nestjs`, `frontend-react`, `ui-ux-designer`, `devops`, `qa-tester`, `security-auditor`. Chacun nomme explicitement les skills superpowers qu'il doit invoquer — les sous-agents ignorent `using-superpowers`, donc c'est le seul mécanisme qui traverse la frontière.
- **Trois skills** dans `.claude/skills/` : `invitation-app-domain` (les 8 invariants), `audit-protocol` (grille d'audit commune), `wedding-design-system` (tokens et règles de mouvement, avec les décisions arrêtées en fin de fichier).
- **L'audit** : 6 rapports dans `docs/audit/`, 86 constats, consolidés dans `2026-08-22-rapport-architecte.md`. Publié aussi comme artifact.

## Les décisions du commanditaire — ne pas les rouvrir

Arbitrées le 2026-08-22 :

1. **Lot 0 seul**, puis point d'étape. Pas de refonte design en parallèle.
2. **Prénoms des mariés et photo** : constantes de build, pas de champs en base.
3. **Le doré `#B08D57` reste tel quel**, cantonné au filet décoratif (mesuré 2,92:1, ne portera jamais de texte).
4. **Les primitives d'interface s'appuient sur Radix** (`@radix-ui/react-dialog`), pas sur `<dialog>` natif.

## Lot 0 — 3 bloquants sur 5 corrigés

Mise à jour du 2026-08-23. Branche `fix/lot-0-bloquants`.

| # | Bloquant | État |
|---|---|---|
| 1 | Un foyer confirmé occupe zéro siège | **fait** — `fe98be1` (api) + `296b487` (web) |
| 2 | Capacité contournable en une requête | **fait** — `fe98be1` |
| 5 | L'invitation ne dit pas quand venir | **fait** — `296b487` |
| 3 | Force brute sur `/auth/login` | en cours |
| 4 | Aucune défense CSRF | en cours |

Suites vertes : **70 tests backend** (57 avant), **58 frontend** (44 avant), **18 e2e**, build à exit 0.

### La base de données locale tourne — les e2e aussi

Le rapport d'audit dit que les tests e2e n'ont jamais été exécutés. **Ce n'est plus vrai depuis le 2026-08-23** : Postgres tourne via le `docker-compose.yml` du dépôt, et les 18 tests passent. On sait donc à l'exécution, et plus seulement par lecture du code, que les 13 routes admin refusent un accès non authentifié. Le constat MAJEUR du QA sur ce point est levé.

Pour remonter l'environnement depuis zéro :

```
docker compose up -d
cp apps/api/.env.example apps/api/.env      # puis renseigner DATABASE_URL et JWT_SECRET
cd apps/api && npx prisma migrate deploy
pnpm --filter @invitation-app/api test:e2e
```

`apps/api/.env` est ignoré par git et ne contient que des valeurs de développement local, alignées sur le `docker-compose.yml`. Le rapport d'audit reste tel qu'il a été écrit : c'était un instantané exact à sa date.

Piège payé une fois, à ne pas repayer : la coupure a surpris l'agent backend **au milieu d'un refactor**. `tables.service.ts` appelait `seatsTaken()` sans import et `this.seatsTaken()` alors que la méthode venait d'être supprimée — cinq tests rouges pour deux lignes manquantes. D'où la règle de sauvegarde d'état à 60 % du budget, désormais inscrite dans les six définitions d'agents.

## Historique — lot 0 au démarrage

Branche `fix/lot-0-bloquants`, partant de `5cafe2f`.

Deux agents ont travaillé en parallèle, **sans commiter** (l'architecte relit et commite, pour éviter les courses sur l'index git) :

- **`backend-nestjs`** — 4 bloquants : cohérence de `confirmedCount` sur les écritures admin · capacité de table contournable par `PATCH /admin/households/:id` · limitation de débit sur le login et sur l'invitation · défense CSRF derrière `SameSite=None`. État détaillé dans `ETAT-lot0-backend.md` s'il a eu le temps de l'écrire.
- **`frontend-react`** — 2 bloquants : le dialogue d'édition qui fait occuper zéro siège à un foyer confirmé · les cinq champs de l'invitation jamais affichés. État détaillé dans `ETAT-lot0-frontend.md`.

**Contrat imposé aux deux, à respecter de part et d'autre :**
`CONFIRMED` exige `confirmedCount >= 1` · `DECLINED` force `0` · `PENDING` remet à `null`.

**Attention :** le travail des agents peut être **non commité** dans l'arbre. Vérifie `git status` avant toute opération destructive. Un agent a déjà écrasé une modification du `.gitignore` avec un `git checkout` trop large — ne fais pas confiance à un arbre propre sans l'avoir regardé.

## Ce qui vient après

Ordre validé, détaillé dans le rapport consolidé :

| Lot | Contenu | Effort |
|---|---|---|
| 1 | Fiabilité produit — états de chargement, confirmations, messages en français, révocation à la déconnexion, en-têtes | 3 – 4 j |
| 2 | Chaîne de livraison — `postinstall` Prisma, CI, durcissement Docker, `VITE_API_URL` bruyant | 1,5 – 2 j |
| 3 | Refonte design — fondations, 12 primitives, invitation et ouverture d'enveloppe, admin | 14,5 – 18 j |

Le commanditaire fournira **les vraies photos au démarrage du lot 3**. Ne pas figer l'identité visuelle avant de les avoir.

## Pièges connus de cet environnement

- `pnpm --filter @invitation-app/api lint` tourne avec **`--fix`** et modifie le dépôt. Ce n'est pas une commande de vérification.
- **`prisma generate` ne tourne pas à l'installation** (ni `postinstall` ni `prepare`). Sur un clone frais, rien ne compile tant qu'on ne l'a pas lancé à la main. C'est un constat du lot 2.
- Les **tests e2e** exigent `DATABASE_URL` et `JWT_SECRET` ; ils n'ont jamais été exécutés dans cet audit.
- Les agents et skills ne sont **enregistrés qu'au démarrage de la session**. Un fichier d'agent créé en cours de route n'est pas invocable avant redémarrage.
