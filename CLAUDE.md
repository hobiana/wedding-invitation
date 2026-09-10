# invitation-app

Application d'invitation et de gestion d'un mariage : **Hobiana T. Razakanaivo & Lovasoa S. Ramarojaona**, le 2 janvier 2027 à Antananarivo. Chaque foyer reçoit un lien unique, découvre les informations, répond ; les organisateurs suivent les réponses et composent le plan de table.

## À LIRE EN PREMIER

**`docs/audit/REPRISE.md`** — l'état réel du projet : ce qui est fait, ce qui reste, les décisions arbitrées par le commanditaire, et les pièges de cet environnement. Il est tenu à jour au fil de l'eau. Commence par là avant toute chose.

Puis, selon ce que tu fais :

| Document | Quand |
|---|---|
| `docs/design/2026-08-23-direction-artistique.md` | avant toute écriture de style, de couleur, de typo ou d'animation |
| `docs/audit/2026-08-22-rapport-architecte.md` | pour comprendre pourquoi une correction est prioritaire |
| `docs/superpowers/specs/2026-08-19-invitation-app-design.md` | la spec fonctionnelle d'origine |

## L'équipe

Six agents spécialisés dans `.claude/agents/` : `backend-nestjs`, `frontend-react`, `ui-ux-designer`, `devops`, `qa-tester`, `security-auditor`. Trois skills projet dans `.claude/skills/` : `invitation-app-domain`, `audit-protocol`, `wedding-design-system`.

**Les sous-agents ignorent `using-superpowers`** — c'est écrit dans le skill lui-même. Chaque définition d'agent nomme donc explicitement les skills qu'il doit invoquer. Si tu écris un nouvel agent, fais pareil, sinon il travaillera sans TDD ni vérification.

Les agents et les skills ne s'enregistrent **qu'au démarrage de la session** : un fichier créé en cours de route n'est pas invocable avant redémarrage.

## Protocole de travail

Le commanditaire arbitre. Les spécialistes auditent ou implémentent, **ne commitent jamais** — l'architecte relit le diff, vérifie lui-même les tests, et commite. C'est ce qui évite les courses sur l'index git quand plusieurs agents travaillent en parallèle.

Chaque agent écrit un fichier d'état dès 60 % de son budget consommé, et le rafraîchit à chaque étape. Les coupures de session sont fréquentes ici ; ce qui n'est pas écrit est perdu.

## Stack

Monorepo pnpm. `apps/api` (NestJS 11, Prisma 7, PostgreSQL), `apps/web` (React 19, Vite 8, Tailwind **v4**, TanStack Query v5, React Router v7, dnd-kit), `packages/shared` pour les types du contrat d'API.

## Architecture

**Deux publics, une seule API.** `/invitation/:linkId` est la seule route publique : le `nanoid(8)` **est** la clé d'accès, il n'y a délibérément aucune garde devant (`api/src/invitation/invitation.controller.ts`). Tout le reste est admin, derrière un cookie JWT `httpOnly`.

**La protection admin est opt-in, contrôleur par contrôleur** — `@UseGuards(JwtAuthGuard)` en tête de classe. Il n'y a pas de garde globale avec échappatoire `@Public()` : **un nouveau contrôleur admin sans le décorateur est public.** Seuls `OriginCheckGuard` (CSRF) puis `ThrottlerGuard` sont globaux, dans cet ordre — `app.module.ts` dit pourquoi l'ordre compte.

**Le contrat traverse `packages/shared`** en TypeScript nu : `main: src/index.ts`, aucun build, aucune génération. Le chemin complet est Prisma → service → DTO partagé → `web/src/lib/api.ts` → composant. Un champ dont la nullabilité se perd en route dans le DTO est perdu pour de bon côté front, qui ne peut plus la rattraper : c'est exactement par là que `confirmedCount` s'est cassé la troisième fois.

**`api/src/common/seating.ts` est la définition unique de l'occupation d'une table.** Trois portes y mènent — placer un foyer, éditer la table, éditer un foyer déjà placé. Si l'une recalcule à sa façon, elle devient une porte dérobée vers un état que les deux autres refusent. On l'importe, on ne la réécrit pas.

## Commandes

Démarrage à froid — sur un clone frais, rien ne compile ni ne tourne avant ces lignes :

```bash
docker compose up -d                                          # Postgres
cp apps/api/.env.example apps/api/.env                        # renseigner DATABASE_URL et JWT_SECRET
pnpm --filter @invitation-app/api exec prisma generate
pnpm --filter @invitation-app/api exec prisma migrate deploy
pnpm --filter @invitation-app/api seed:demo                   # 40 foyers, 6 tables
```

Le seed termine en imprimant les identifiants admin et quelques liens à ouvrir : `http://localhost:5173/i/<linkId>` côté invité, `http://localhost:5173/login` côté admin (`admin@invitation-app.local` / `motdepasse-de-dev`, sauf `ADMIN_SEED_*` dans l'environnement).

Au quotidien :

```bash
pnpm --filter @invitation-app/api test                  # Jest
pnpm --filter @invitation-app/api test:e2e              # exige la base
pnpm --filter @invitation-app/web test -- --run         # Vitest
pnpm --filter @invitation-app/web build                 # inclut le typecheck
pnpm --filter @invitation-app/web lint                  # oxlint, sûr
```

Un seul test :

```bash
pnpm --filter @invitation-app/api test configure-app                            # motif de nom de fichier
pnpm --filter @invitation-app/api test configure-app -t "forwarded client IP"   # un seul cas
pnpm --filter @invitation-app/web test --run src/lib/datetime.test.ts           # un seul fichier
```

**Pas de `--` devant les arguments de Vitest.** pnpm 11 le transmet littéralement et il avale le filtre : `test -- --run src/lib/datetime.test.ts` relance les 20 fichiers et 164 tests au lieu d'un seul fichier et 18 tests, sans rien signaler. La forme `-- --run` ci-dessus reste juste pour la suite entière, mais ne lui ajoute jamais de nom de fichier.

**Jest tourne en `passWithNoTests`** : un motif mal orthographié affiche « No tests found » et sort en **0**. Un run filtré qui ne trouve rien ressemble trait pour trait à un run vert.

**`pnpm --filter @invitation-app/api lint` tourne avec `--fix` et modifie le dépôt.** Ce n'est pas une commande de vérification.

**`prisma generate` ne tourne pas à l'installation** : sur un clone frais, rien ne compile tant qu'on ne l'a pas lancé à la main.

## Conventions

- Les messages de commit sont en anglais, le reste — documents, commentaires destinés à l'équipe, interface — en français.
- **L'interface invité est en français sans exception.** Un message d'erreur anglais remonté de l'API et affiché à un invité est un défaut ; ça s'est déjà produit deux fois.
- Tailwind v4 : la configuration est dans `apps/web/src/index.css`, en `@theme static`. **Il n'y a pas de `tailwind.config.js` et il ne faut pas en créer** — il ne serait pas lu. Le `static` est délibéré : sans lui, les jetons lus en `var()` disparaissent du CSS produit sans qu'aucune erreur ne soit levée.
- Ne jamais nommer un jeton `--container-*` comme un utilitaire `max-w-*` intégré (`prose`, `screen`, `full`…) : l'utilitaire statique masque le jeton en silence.
- Chaque composant a son `.test.tsx` à côté. Les types partagés viennent de `@invitation-app/shared`, jamais redéclarés.

## Les invariants métier

Ils sont détaillés dans le skill `invitation-app-domain`. Les deux qui se cassent le plus souvent :

- **`confirmedCount` est nullable et doit le rester** tant que le foyer est `PENDING`. Écrire `0` détruit la distinction entre « pas encore répondu » et « répond que personne ne vient ». Ce bug est réapparu trois fois par trois chemins différents.
- **Le contrat, à respecter des deux côtés :** `CONFIRMED` exige `confirmedCount >= 1`, `DECLINED` force `0`, `PENDING` remet à `null`.
