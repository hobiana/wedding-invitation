# ÉTAT — LOT 0 backend (apps/api)

Branche : `fix/lot-0-bloquants`. Document tenu **au fil de l'eau**. Voir « Journal » en bas pour l'horodatage logique.

> **Refactor en cours ?** NON. Aucune extraction ni renommage à mi-chemin à cet instant.
> (Cette ligne est le premier truc à lire après une coupure. La session d'avant s'était
> arrêtée au milieu d'une extraction — `this.seatsTaken()` supprimé, appels remplacés,
> import jamais écrit, cinq tests rouges. Si tu t'interromps pendant une extraction,
> écris-le ICI en clair.)

## 1. Avancement des 4 bloquants

| # | Bloquant | Test écrit | Test rouge vu | Correction | Test vert |
|---|---|---|---|---|---|
| 1 | `confirmedCount` incohérent (admin) | oui | oui | oui | **oui — commité `fe98be1`** |
| 2 | `PATCH /admin/households/:id` contourne la capacité de table | oui | oui | oui | **oui — commité `fe98be1`** |
| 3 | Pas de rate limit sur `/auth/login` | oui | oui | oui | **oui — non commité** |
| 4 | Pas de défense CSRF | oui | oui | oui | **oui — non commité** |

**Bloquants 1 et 2 : terminés et commités (`fe98be1`).** Le refactor `seatsFor`/`seatsTaken`
vers `src/common/seating.ts` est **terminé** : import présent dans `tables.service.ts`, les
deux appels convertis, `incoming` bascule sur `seatsFor(household)`.

**Baseline mesurée à la reprise : 70/70 vert, build exit 0.** `@nestjs/throttler@^6.5.0`
installé, `packageManager` épinglé à la racine.

**Les 4 bloquants sont faits.** Après bloquants 3 et 4 : **14 suites / 99 tests verts**
(+29 tests), `build` exit 0. Le travail des bloquants 3 et 4 est **dans le working tree, non
commité** — Hobiana relit et commite.

## 2. Fichiers

### Déjà commités (`fe98be1`)
- `apps/api/src/households/households.service.ts` + `.spec.ts` — bloquants 1 et 2.
- `apps/api/src/common/seating.ts` (nouveau) — `seatsFor` / `seatsTaken`.
- `apps/api/src/tables/tables.service.ts` — bascule sur le helper partagé.
- `apps/api/package.json`, `pnpm-lock.yaml` — `@nestjs/throttler`.

### Livrés pour les bloquants 3 et 4 (non commités, voir §3 pour le pourquoi)
Nouveaux :
- `apps/api/src/config/frontend-url.ts` — origine autorisée, **source unique** partagée par
  CORS, le guard d'origine et le redirect Google.
- `apps/api/src/config/throttle.config.ts` — les trois configs de limite, importées par le
  module ET par les tests (pas de nombre en dur dupliqué).
- `apps/api/src/common/guards/origin-check.guard.ts` + `.spec.ts` — bloquant 4.
- `apps/api/src/common/configure-app.ts` + `.spec.ts` — extraction de la config Express de
  `main.ts` (`trust proxy`, cookieParser, CORS, ValidationPipe) pour la rendre **testable**.
- `apps/api/src/common/rate-limit.spec.ts` — test d'intégration des vraies routes.

Modifiés :
- `apps/api/src/main.ts` — appelle `configureApp`.
- `apps/api/src/app.module.ts` — `ThrottlerModule.forRoot` + `APP_GUARD` throttler +
  `APP_GUARD` origine.
- `apps/api/src/auth/auth.controller.ts` — `@Throttle` strict sur `POST login`, et
  `frontendUrl()` bascule sur la source unique.
- `apps/api/src/invitation/invitation.controller.ts` — `@Throttle` généreux.

## 3. Décisions non devinables depuis le diff

**CSRF — stratégie retenue : vérification d'en-tête `Origin`, en guard global, sur les
méthodes mutantes.** Validée par l'architecte, avec trois précisions qui sont des choix et
pas des détails :

1. **`Origin` absent ⇒ requête acceptée.** Délibéré. Les navigateurs envoient `Origin` sur
   *toute* requête POST/PATCH/DELETE, y compris l'auto-submit de formulaire cross-site qui
   est précisément l'attaque décrite dans `docs/audit/2026-08-22-securite.md`. L'absence
   d'`Origin` signifie donc « client non-navigateur » (curl, e2e supertest, monitoring) —
   refuser casserait les tests e2e existants et l'outillage sans fermer un seul vecteur
   navigateur. Ne « durcis » pas ce point sans mesurer ce que ça casse.
2. **Portée : toutes les méthodes mutantes, pas seulement `/admin/*` + `/auth/login`.**
   Écart assumé vers le plus large : couvre aussi `POST /auth/logout` (l'audit décrit une
   page tierce qui déconnecte l'organisateur en boucle) et `PATCH /invitation/:linkId/rsvp`.
   Coût client nul : le front envoie toujours `Origin = FRONTEND_URL`, déjà exigé par CORS.
3. **L'origine autorisée doit être *la même valeur* que celle passée à `enableCors`**, d'où
   `config/frontend-url.ts`. Deux sources qui divergent = un guard qui laisse passer ce que
   CORS refuse, ou l'inverse.

**Chiffres de limitation retenus** (`src/config/throttle.config.ts`, fenêtre d'une minute,
**par route et par IP**) : défaut `120`, login `5`, invitation `300`. Le défaut sert la
surface admin protégée par JWT ; `5` rend le brute force en ligne inutile tout en laissant un
humain se tromper de mot de passe ; `300` est délibérément large parce que l'échec coûteux
ici est de refuser un vrai invité — plusieurs foyers partagent une IP derrière une box ou un
NAT d'opérateur — et que contre un nanoid de 21 caractères, 300 essais/minute n'est pas une
menace.

**Ordre des deux `APP_GUARD` : origine AVANT throttler.** La requête forgée part du
navigateur *de la victime*, donc sur *son* IP : la compter permettrait à un attaquant de vider
le quota de la victime et de l'exclure de son propre dashboard.

**Pas de double-submit cookie / jeton anti-CSRF en LOT 0.** La vérification d'`Origin` ferme
la classe. Le jeton est de la défense en profondeur ; il demande un changement côté front,
donc une coordination avec l'agent frontend. LOT suivant. Décision confirmée par l'architecte.

**`trust proxy` : dépendance du bloquant 3, pas du confort.** En production l'API est
derrière un proxy (Railway/Render). Sans `app.set('trust proxy', 1)`, `req.ip` vaut l'IP du
proxy pour *tout le monde* : le throttler range alors l'internet entier dans un seul
compteur. La limite « généreuse » sur `/invitation/:linkId` transformerait le jour d'envoi
des 150 liens en auto-déni de service. La limitation de débit sans `trust proxy` est au
mieux inutile, au pire nuisible.

**Contrat `confirmedCount`** (imposé par l'architecte, le front s'aligne) : `CONFIRMED` ⇒
`confirmedCount >= 1` exigé · `DECLINED` ⇒ forcé à `0` · `PENDING` ⇒ remis à `null`. Le
statut évalué est le statut **résultant** (`dto.status ?? household.status`). *(Livré en
`fe98be1`.)*

**Bloquant 2 — capacité revérifiée sur l'occupation résultante**, pas sur `dto.allocatedSeats`
seul, parce qu'un passage à `PENDING` remet `confirmedCount` à `null` et fait *grimper*
l'occupation. `409 ConflictException`. *(Livré en `fe98be1`.)*

## 4. Reprendre

```
cd C:/Users/Admin/Documents/projects/perso/invitation-app
pnpm --filter @invitation-app/api test
pnpm --filter @invitation-app/api build
```

## 5. Pièges rencontrés / à ne pas repayer

- **`pnpm --filter @invitation-app/api lint` tourne avec `--fix`** (voir
  `apps/api/package.json`) : il modifie le dépôt. Ce n'est pas une commande de vérification.
- **Les tests unitaires (`test`) ne lisent que `src/`** (`rootDir: src`,
  `testRegex: .*\.spec\.ts$`). Les `test/*.e2e-spec.ts` sont une autre config (`test:e2e`) et
  exigent Postgres. Un test de rate limiting écrit en `.e2e-spec.ts` ne tournera **pas** dans
  la commande de vérification → écrire les tests en `src/**/*.spec.ts`, avec un module de
  test Nest + supertest et des services mockés (pas de base requise).
- **`households.service.spec.ts` assère `toHaveBeenCalledWith` en arguments *exacts*.** Toute
  clé ajoutée systématiquement à `data` casse ce test.
- **`@SkipThrottle()` sans argument ne fait rien quand les throttlers sont nommés** (doc
  `@nestjs/throttler` v6, revérifiée via context7). Il faut `@SkipThrottle({ nom: true })`.
- **Vérifié dans la source de `@nestjs/throttler` 6.5.0** (`dist/throttler.guard.js`) :
  - `getTracker(req) => req.ip` — d'où la dépendance à `trust proxy` ;
  - `generateKey` = `sha256("<Classe>-<handler>-<nomThrottler>-<ip>")`, donc **un compteur
    par route et par IP**, pas un compteur global. Les limites se raisonnent donc par
    endpoint, et `/auth/login` ne partage jamais son seau avec `/invitation/:linkId` ;
  - un throttler sans `name` est nommé `'default'` ⇒ l'override de route s'écrit
    `@Throttle({ default: { limit, ttl } })`.
- Le client Prisma est déjà généré ; `RsvpStatus` est un vrai enum Prisma.
- **`AppModule` n'est pas importable depuis un test unitaire tel quel.**
  `ConfigModule.forRoot({ validationSchema })` valide l'environnement **à l'évaluation du
  décorateur `@Module`**, donc à l'*import* du fichier, pas à l'instanciation. Il n'y a pas de
  `apps/api/.env` sur la machine, et aucun `src/**/*.spec.ts` n'importait `AppModule` avant
  (seuls les e2e le font, et ils exigent déjà Postgres) — d'où
  `Config validation error: "DATABASE_URL" is required. "JWT_SECRET" is required`.
  Contournement retenu dans `src/app.module.spec.ts` : poser les deux variables puis
  `require('./app.module')`. Un `import` statique serait hissé au-dessus des affectations et
  ne servirait à rien.
  *(Depuis, `apps/api/.env` existe — créé en dehors de mon périmètre. Le contournement reste
  nécessaire : jest ne charge pas `.env` de lui-même avant ce `require`.)*
- **`process.env` est isolé par fichier de test sous jest.** Vérifié par sonde et non supposé :
  après que `app.module.spec.ts` a posé un `DATABASE_URL` bidon, un autre fichier de test lit
  `undefined`. Le faux `DATABASE_URL` ne peut donc **pas** contaminer
  `prisma/prisma.service.spec.ts`, qui lui se connecte pour de vrai à la base. Confirmé aussi
  en exécution forcée dans un seul processus (`jest --runInBand app.module.spec
  prisma.service.spec` : 3/3 verts).
- **`app.set('trust proxy', 1)` et non `true`.** Vérifié en retournant le test : avec `true`,
  `X-Forwarded-For: 1.2.3.4, 203.0.113.7` donne `req.ip = 1.2.3.4`, donc n'importe qui forge
  son IP et repart avec un compteur neuf — la limitation devient décorative. Avec `1`, seul le
  saut réellement ajouté par le proxy (le plus à droite) compte.
- **Le dépôt est en CRLF alors que prettier attend LF.** `npx eslint "src/**/*.ts"` (sans
  `--fix`) sort ~2000 erreurs `Delete ␍`, y compris sur des fichiers que personne n'a touchés
  (`tables.service.ts` : 97, `dashboard.service.ts` : 41). C'est **préexistant** et hors
  périmètre — ne pas « nettoyer » au passage, ça ferait un diff de tout le dépôt. Conséquence
  pratique : `lint` n'est pas exploitable comme garde-fou tant que ce n'est pas arbitré.

## Journal

- Session 1 : lecture, baseline verte (57/57), `@nestjs/throttler` installé, plan arrêté.
- Session 1 (suite, non journalisée à l'époque) : bloquants 1 et 2 écrits en TDD.
- Session 2 (Hobiana) : refactor `seatsFor` terminé, **commit `fe98be1`**, 70/70 vert.
- **Session 3** : reprise sur bloquants 3 et 4. Skills TDD + domaine invoqués, API throttler
  revérifiée dans la source et via context7, tableau d'avancement corrigé.
  - Bloquant 4 : RED vu (7 échecs « did not throw ForbiddenException ») → GREEN 20/20.
  - `trust proxy` : RED vu (les deux appelants collapsaient sur `::ffff:127.0.0.1`) → GREEN.
  - Bloquant 3 : RED vu (6ᵉ login = 201 au lieu de 429 ; 121ᵉ invitation = 429) → GREEN 5/5.
  - Câblage `APP_GUARD` : RED vu (tableau de gardes globales vide) → GREEN 2/2.
  - **Final mesuré : 14 suites / 100 tests verts, `build` exit 0.**
  - **`test:e2e` relancé aussi** (il tourne depuis `8a4728c`) : **3 suites / 18 tests verts,
    exit 0.** C'est la confirmation empirique du choix « `Origin` absent ⇒ accepté » : les
    deux gardes globales n'ont rien cassé de la suite e2e existante.
  - **Rien n'est commité** (consigne : Hobiana relit et commite).
  - Reste ouvert pour l'architecte, signalé et non traité : les fins de ligne CRLF/LF du
    dépôt (voir §5).
