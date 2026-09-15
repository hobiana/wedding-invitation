# Mise en ligne sur Render — la base, puis l'API, puis le front

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mettre l'application en ligne sur Render en trois étages vérifiés l'un après l'autre — la base de données d'abord, l'API ensuite, le front en dernier — de façon qu'à chaque échec on sache exactement quel étage a lâché.

**Architecture:** Un seul `render.yaml` à la racine, **construit en trois fois**. On y ajoute la base, on applique, on vérifie ; on y ajoute l'API, on pousse, on vérifie ; on y ajoute le front, on pousse, on vérifie. Render resynchronise le Blueprint à chaque poussée sur `main`, donc chaque étage arrive seul et se prouve seul. Les migrations et l'amorçage de la base se font **depuis la machine du commanditaire contre l'URL externe**, avant que l'API n'existe : c'est ce qui permet de valider l'étage 1 sans dépendre de l'étage 2.

**Tech Stack:** Render (Blueprint `render.yaml`, PostgreSQL managée, service web Docker, site statique CDN), Docker (`apps/api/Dockerfile`, déjà écrit), Prisma 7 (`migrate deploy`, `db seed`), GitHub (`hobiana/wedding-invitation`).

**Spec:** `docs/audit/2026-09-11-plan-de-mise-en-ligne.md` — comparatif des hébergeurs, budget, sauvegardes, et les sept blocages d'origine. Ce plan en est l'exécution ; il en corrige deux points, signalés plus bas.

## Ce qui a changé depuis la spec du 2026-09-11

- **Blocage 1 levé.** `git remote -v` renvoie maintenant `git@github.com:hobiana/wedding-invitation.git`. Plus rien à créer côté dépôt.
- **Blocage 5 requalifié — le domaine n'est plus facultatif.** `onrender.com` figure sur la *Public Suffix List* (ligne 15457 de la liste officielle) : deux sous-domaines `onrender.com` sont **deux sites distincts** pour un navigateur. Le cookie admin y est donc un cookie tiers, et Safari les bloque tous depuis la 13.1 (« Cookies for cross-site resources are now blocked by default across the board »). Conséquence dans ce code précis : `AuthContext.tsx:26-30` enchaîne `POST /auth/login` puis `GET /auth/me` ; le second part sans cookie, renvoie 401, et `LoginPage.tsx:20-22` affiche **« Email ou mot de passe incorrect. »** sur un mot de passe correct. Le remède est la phase 4, et il ne demande aucune ligne de code.
- **Le front passe sur Render** plutôt que Vercel : le site statique y est gratuit, sur le même CDN, et ça supprime un fournisseur. `vercel.app` est de toute façon sur la même *Public Suffix List* — Vercel n'aurait rien réglé.

## Global Constraints

- **Aucun secret n'entre dans le dépôt.** `JWT_SECRET` est produit par Render (`generateValue: true`) et n'existe nulle part ailleurs. Tout le reste est en `sync: false`, c'est-à-dire saisi dans le tableau de bord et jamais dans un fichier versionné.
- **Le plan gratuit est exclu pour la base et pour l'API.** Une base Postgres gratuite est **supprimée 30 jours après sa création** — provisionnée le 2026-09-15, elle disparaîtrait vers le 15 octobre, avant même l'ouverture des réponses le 1er décembre. Un service web gratuit s'endort après 15 minutes et fait attendre un invité près d'une minute.
- **`region: frankfurt` partout.** L'API et la base doivent être dans la même région, sans quoi il n'y a pas de réseau privé et donc pas de chaîne de connexion interne. Les sites statiques n'ont pas de région : ils sont sur le CDN.
- **La poussée sur `main` appartient au commanditaire.** L'architecte commite en local ; c'est lui qui pousse. Chaque tâche dit qui fait quoi.
- **Windows / PowerShell.** Les variables d'environnement s'écrivent `$env:NOM = "valeur"`, jamais `NOM=valeur commande`.
- **`apps/api/.env` ne prendra pas le dessus.** `prisma.config.ts` fait `import "dotenv/config"`, mais dotenv **n'écrase pas** une variable déjà posée dans le shell. Une `$env:DATABASE_URL` définie avant la commande gagne. Chaque tâche concernée demande malgré tout de **lire l'hôte affiché par Prisma** avant de valider : c'est la seule preuve qu'on a migré la bonne base.
- **Les noms de service deviennent des sous-domaines globalement uniques.** Si `hobiana-lova-api` est déjà pris chez un autre client Render, Render y accole un suffixe aléatoire. **Toujours relever l'URL réelle affichée** plutôt que de la supposer.
- Le budget visé : ≈ 14 $/mois (API *starter* ≈ 7 $ + base *basic-256mb* ≈ 7 $, front gratuit). À reconfirmer sur la page tarifaire au moment de payer — elle n'est pas extractible automatiquement.

---

## File Structure

| Fichier | Responsabilité | Quand |
|---|---|---|
| `render.yaml` (racine) — bloc `databases:` | la base managée | tâche 0.3 |
| `render.yaml` — bloc `services:` + API | le service web Docker | tâche 2.1 |
| `render.yaml` — bloc `services:` + front | le site statique et sa règle SPA | tâche 3.1 |
| `apps/web/vercel.json` | devient inutile si le front reste sur Render | à supprimer en tâche 3.5, pas avant |

Aucun fichier de `apps/api/src/` ni de `apps/web/src/` n'est touché par ce plan. **Si une tâche vous amène à modifier du code applicatif, arrêtez-vous : c'est que le plan est faux.**

---

# Phase 0 — Les préalables

### Tâche 0.1 : Le compte Render et le moyen de paiement

**Qui :** le commanditaire.

- [ ] **Étape 1 :** Créer un compte sur `render.com`, en se connectant **via GitHub** — c'est ce qui donnera à Render l'accès au dépôt `hobiana/wedding-invitation`.
- [ ] **Étape 2 :** Autoriser Render à lire le dépôt (privé) depuis l'écran de connexion GitHub.
- [ ] **Étape 3 :** Renseigner un moyen de paiement dans *Billing*. Le plan gratuit ne convient pas (voir les contraintes globales).

**Vérification :** `dashboard.render.com` affiche un workspace, et *Billing* affiche une carte enregistrée.

**Si ça échoue :** si GitHub ne propose pas le dépôt, c'est que l'installation de l'application Render est limitée à certains dépôts — la corriger dans GitHub → *Settings* → *Applications* → *Render* → *Repository access*.

---

### Tâche 0.2 : Les valeurs de production

**Qui :** le commanditaire. **Rien de ceci ne s'écrit dans un fichier du dépôt.**

- [ ] **Étape 1 :** Choisir le mot de passe admin de production, généré, jamais celui de la démo :

```powershell
# PowerShell
[Convert]::ToBase64String((1..18 | ForEach-Object { Get-Random -Maximum 256 }))
```

Le noter dans un gestionnaire de mots de passe. **Les identifiants de démo (`admin@invitation-app.local` / `motdepasse-de-dev`) sont écrits en clair dans `CLAUDE.md`, donc publics de fait : ils ne doivent exister nulle part en production.**

- [ ] **Étape 2 :** Arrêter les deux adresses e-mail réelles des organisateurs. Elles iront dans `ALLOWED_ADMIN_EMAILS`, séparées par une virgule.

- [ ] **Étape 3 :** Rien à générer pour `JWT_SECRET` — Render le produira lui-même via `generateValue: true`, et personne n'aura jamais à le connaître.

**Vérification :** les trois valeurs (mot de passe admin, deux adresses) sont notées hors du dépôt.

---

### Tâche 0.3 : `render.yaml`, premier état — la base seule

**Fichiers :**
- Créer : `render.yaml` (racine)

**Qui :** l'architecte écrit et commite sur `main` ; le commanditaire pousse.

- [ ] **Étape 1 :** Se placer sur `main` (l'arbre de travail doit être propre) :

```bash
git status --porcelain=v1 -uall   # doit être vide
git switch main
```

- [ ] **Étape 2 :** Créer `render.yaml` avec **uniquement** le bloc de la base :

```yaml
# render.yaml — infrastructure de l'invitation de mariage, sur Render.
#
# Ce fichier est construit en trois fois : la base, puis l'API, puis le front.
# Chaque étage est appliqué et vérifié seul, pour qu'un échec désigne son étage.
#
# Schéma de validation : https://render.com/schema/render.yaml.json

databases:
  - name: hobiana-lova-db
    databaseName: invitation_app
    # `free` est exclu : une base gratuite est SUPPRIMÉE 30 jours après sa
    # création, soit avant l'ouverture des réponses du 1er décembre.
    # `basic-256mb` est le premier palier qui inclut la restauration continue.
    plan: basic-256mb
    region: frankfurt
    # La même version majeure que le docker-compose local, pour que ce qui
    # passe en développement passe en production.
    postgresMajorVersion: "16"
    # `ipAllowList` est volontairement absent : une liste vide fermerait la
    # base à l'extérieur, or les migrations, l'amorçage et les sauvegardes
    # `pg_dump` du commanditaire passent justement par l'URL externe.
```

- [ ] **Étape 3 :** Vérifier la syntaxe. Si le CLI Render est installé :

```bash
render blueprints validate
```

Attendu : validation sans erreur. Sinon, s'appuyer sur le schéma JSON ci-dessus dans l'éditeur. Les valeurs employées ont été vérifiées contre ce schéma : `basic-256mb` et `frankfurt` sont dans les énumérations, `postgresMajorVersion` est bien une **chaîne**, et aucune clé de premier niveau n'est obligatoire — un `render.yaml` sans `services:` est valide.

- [ ] **Étape 4 :** Commiter :

```bash
git add render.yaml
git commit -m "chore(deploy): declare the managed Postgres instance in the Blueprint

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01UdC2zvivaP3WgPmC1Enwpn"
```

- [ ] **Étape 5 :** Le commanditaire pousse : `git push origin main`

**Vérification :** `render.yaml` est visible sur `github.com/hobiana/wedding-invitation` à la racine, sur la branche `main`. **Render lit le fichier depuis le dépôt distant : tant qu'il n'y est pas, l'étape suivante ne peut rien trouver.**

---

# Phase 1 — La base de données

### Tâche 1.1 : Appliquer le Blueprint

**Qui :** le commanditaire.

- [ ] **Étape 1 :** Ouvrir le lien d'application :

```
https://dashboard.render.com/blueprint/new?repo=https://github.com/hobiana/wedding-invitation
```

- [ ] **Étape 2 :** Nommer le Blueprint (`invitation-mariage` par exemple), vérifier que la branche lue est `main`, puis **Apply**.

**Vérification :** au bout de deux à cinq minutes, le tableau de bord affiche une instance PostgreSQL nommée `hobiana-lova-db`, région Frankfurt, statut **Available**.

**Si ça échoue :**
- « No render.yaml found » → le fichier n'est pas poussé, ou pas sur `main` : revoir la tâche 0.3 étape 5.
- Une erreur sur le plan ou la région → une valeur a été modifiée depuis ; la recomparer à l'énumération du schéma JSON.

---

### Tâche 1.2 : Prouver que la base répond depuis l'extérieur

**Qui :** le commanditaire, depuis sa machine.

- [ ] **Étape 1 :** Dans le tableau de bord, ouvrir la base → onglet *Connect* → copier l'**External Database URL** (pas l'interne : l'interne n'est joignable que depuis Render).

- [ ] **Étape 2 :** La poser dans le shell, sans jamais l'écrire dans un fichier :

```powershell
# `?sslmode=require` n'est PAS optionnel : sans lui, tout ce qui passe par le
# client Prisma échoue en `P1010 — User was denied access on the database`.
# node-postgres n'active TLS que si la chaîne porte un paramètre `ssl*`
# (pg-connection-string/index.js:77) et Render refuse l'externe en clair. Le CLI
# Prisma et libpq, eux, négocient TLS seuls — d'où un `migrate deploy` qui passe
# et un `db seed` qui échoue sur la même URL. Constaté le 2026-09-15.
$env:DATABASE_URL = "postgresql://...@...frankfurt-postgres.render.com/invitation_app?sslmode=require"
```

- [ ] **Étape 3 :** Interroger la base. Si `psql` n'est pas installé, Docker suffit :

```powershell
docker run --rm postgres:16 psql "$env:DATABASE_URL" -c "select version();"
```

Attendu : une ligne commençant par `PostgreSQL 16.`

**Si ça échoue :**
- Erreur TLS → ajouter `?sslmode=require` à la fin de l'URL. Render chiffre toujours les connexions externes et refuse `sslmode=disable`.
- Connexion refusée → la base n'est pas encore *Available*, ou un `ipAllowList` a été ajouté par erreur.

---

### Tâche 1.3 : Appliquer les migrations

**Qui :** le commanditaire, depuis sa machine, `$env:DATABASE_URL` toujours posée.

C'est volontairement fait ici et pas par l'API : l'API les rejouerait au démarrage (`apps/api/Dockerfile:34`), mais on veut une base **complète et prouvée avant que l'API n'existe**. `migrate deploy` est idempotent — le rejeu du conteneur ne fera rien.

- [ ] **Étape 1 :**

```powershell
pnpm --filter @invitation-app/api exec prisma migrate deploy
```

- [ ] **Étape 2 : lire l'hôte affiché avant de valider.** Prisma imprime une ligne `Datasource "db": PostgreSQL database "invitation_app" ... at "<hôte>"`. **Cet hôte doit finir par `.render.com`.** S'il dit `localhost`, la variable de shell n'a pas été prise et c'est la base de développement qui vient d'être migrée : arrêter, reposer `$env:DATABASE_URL`, recommencer.

Attendu ensuite : `1 migration found` puis `Applying migration '20260819145910_init'`.

- [ ] **Étape 3 :** Vérifier les tables :

```powershell
docker run --rm postgres:16 psql "$env:DATABASE_URL" -c "\dt"
```

Attendu : `AdminUser`, `Household`, `Table`, `WeddingSettings`, `_prisma_migrations`.

---

### Tâche 1.4 : Amorcer la base — et ceci n'est pas optionnel

**Qui :** le commanditaire, même shell.

`apps/api/src/invitation/invitation.service.ts:26` lit les réglages du mariage avec `findUniqueOrThrow`. **Sans la ligne unique de `WeddingSettings`, chaque lien d'invitation renvoie une erreur.** C'est `seed.ts` qui la crée, en même temps que le compte admin.

- [ ] **Étape 1 :** Poser les identifiants admin décidés en tâche 0.2 :

```powershell
$env:ADMIN_SEED_EMAIL = "<adresse réelle>"
$env:ADMIN_SEED_PASSWORD = "<mot de passe généré>"
```

- [ ] **Étape 2 :**

```powershell
pnpm --filter @invitation-app/api exec prisma db seed
```

Attendu, les deux lignes : `Seeded admin user: <adresse>` et `Seeded default WeddingSettings`.

- [ ] **Étape 3 :** Vérifier, et contrôler au passage que la date est la bonne :

```powershell
# Guillemets simples autour du SQL : PowerShell transmet le contenu tel quel,
# et les guillemets doubles de PostgreSQL arrivent intacts. Les noms de tables
# sont sensibles à la casse — Prisma ne pose aucun @@map sur ce schéma.
docker run --rm postgres:16 psql "$env:DATABASE_URL" -c 'select id, "weddingDate", "rsvpDeadline" from "WeddingSettings";'
docker run --rm postgres:16 psql "$env:DATABASE_URL" -c 'select email from "AdminUser";'
```

Attendu : une ligne `singleton` avec `2027-01-02 06:00:00+00` et `2026-12-01 20:59:59+00` ; une ligne avec l'adresse réelle, et **aucune** trace de `admin@invitation-app.local`.

- [ ] **Étape 4 :** Nettoyer le shell, pour qu'aucune de ces valeurs ne traîne dans une session ouverte :

```powershell
Remove-Item Env:DATABASE_URL, Env:ADMIN_SEED_EMAIL, Env:ADMIN_SEED_PASSWORD
```

**Jalon de la phase 1 :** la base existe, elle est migrée, elle porte les réglages du mariage et un compte admin réel. **L'étage 1 est prouvé sans qu'une seule ligne d'application ne tourne.**

---

# Phase 2 — L'API

### Tâche 2.1 : Ajouter le service API au `render.yaml`

**Fichiers :**
- Modifier : `render.yaml` — ajout du bloc `services:`

**Qui :** l'architecte écrit et commite ; le commanditaire pousse.

- [ ] **Étape 1 :** Ajouter à la fin de `render.yaml` :

```yaml
services:
  # L'API NestJS, construite depuis le Dockerfile déjà présent dans le dépôt.
  - type: web
    name: hobiana-lova-api
    runtime: docker
    region: frankfurt          # la même que la base, sinon pas de réseau privé
    plan: starter              # `free` s'endort après 15 min d'inactivité
    branch: main
    # Le contexte est la RACINE du dépôt, pas apps/api : le Dockerfile copie
    # pnpm-workspace.yaml, packages/shared et le lockfile. C'est aussi la
    # raison d'être du .dockerignore de la racine.
    dockerfilePath: ./apps/api/Dockerfile
    dockerContext: .
    healthCheckPath: /health
    envVars:
      - key: NODE_ENV
        value: production
      # L'URL interne, sur le réseau privé de Frankfurt : elle ne sort jamais.
      - key: DATABASE_URL
        fromDatabase:
          name: hobiana-lova-db
          property: connectionString
      # Produit par Render. Personne n'a à le connaître, ni à le saisir.
      - key: JWT_SECRET
        generateValue: true
      # `sync: false` = saisi dans le tableau de bord, jamais dans ce fichier.
      - key: FRONTEND_URL
        sync: false
      - key: GOOGLE_CLIENT_ID
        sync: false
      - key: GOOGLE_CLIENT_SECRET
        sync: false
      - key: GOOGLE_CALLBACK_URL
        sync: false
      - key: ALLOWED_ADMIN_EMAILS
        sync: false
```

**Pourquoi pas `PORT` :** Render injecte `PORT` lui-même, et `env.validation.ts:34` le lit avec un défaut. Le fixer ici ne ferait qu'ajouter une occasion de se contredire.

**Pourquoi pas `ADMIN_SEED_*` :** l'amorçage a eu lieu en phase 1, depuis la machine du commanditaire. Ces variables n'ont rien à faire dans l'environnement du serveur, où elles resteraient à demeure.

- [ ] **Étape 2 :** Valider si le CLI est installé : `render blueprints validate`

- [ ] **Étape 3 :** Commiter :

```bash
git add render.yaml
git commit -m "chore(deploy): add the API web service to the Blueprint

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01UdC2zvivaP3WgPmC1Enwpn"
```

- [ ] **Étape 4 :** Le commanditaire pousse : `git push origin main`

---

### Tâche 2.2 : Renseigner les variables, avec des valeurs provisoires assumées

**Qui :** le commanditaire, dans le tableau de bord.

Deux variables dépendent d'URL qui n'existent pas encore : `FRONTEND_URL` attend le front (phase 3), `GOOGLE_CALLBACK_URL` attend l'API elle-même. **On pose des valeurs provisoires, et on les corrige en 3.4 et 2.5.** L'API refuse de démarrer si l'une manque (`env.validation.ts:36-40`) — c'est voulu, et c'est pour ça qu'on ne peut pas les laisser vides.

- [ ] **Étape 1 :** Render détecte la poussée et propose de synchroniser le Blueprint. Si rien ne bouge au bout de deux minutes : Blueprint → **Manual Sync**.

- [ ] **Étape 2 :** Dans l'écran de synchronisation, renseigner les cinq variables `sync: false` :

| Variable | Valeur à cette étape |
|---|---|
| `FRONTEND_URL` | `https://hobiana-lova-web.onrender.com` — provisoire, à confirmer en 3.4 |
| `GOOGLE_CLIENT_ID` | `a-configurer` |
| `GOOGLE_CLIENT_SECRET` | `a-configurer` |
| `GOOGLE_CALLBACK_URL` | `https://hobiana-lova-api.onrender.com/auth/google/callback` |
| `ALLOWED_ADMIN_EMAILS` | les deux adresses réelles, séparées par une virgule |

Les valeurs Google factices sont sûres à cette étape : `google.strategy.ts:14-27` documente explicitement qu'un `clientID` vide ferait planter **tout** le module au démarrage, et se rabat sur des marqueurs non vides. Avec `a-configurer`, l'application démarre entièrement ; seul le bouton « Se connecter avec Google » ne marchera pas. La connexion par mot de passe, elle, fonctionne — c'est tout ce dont on a besoin pour valider l'étage 2.

- [ ] **Étape 3 :** Lancer la synchronisation et suivre le journal de construction. **La première construction Docker est longue** (installation pnpm complète, `prisma generate`, `nest build`) : compter dix à vingt minutes.

**Vérification :** le service `hobiana-lova-api` passe en **Live**, et **relever l'URL réelle affichée en haut de sa page** — si `hobiana-lova-api` était pris, Render a ajouté un suffixe, et toutes les URL de la suite changent.

**Si ça échoue :**
- Le conteneur redémarre en boucle avec une erreur Joi → une des cinq variables est vide.
- Erreur Prisma sur `libssl` → le Dockerfile installe déjà OpenSSL aux lignes 14 et 29 ; si cette erreur apparaît, c'est que le Dockerfile a changé.
- Le *health check* échoue → l'application n'écoute pas sur le `PORT` fourni ; vérifier qu'aucune variable `PORT` n'a été ajoutée à la main.

---

### Tâche 2.3 : Prouver que l'API répond

**Qui :** le commanditaire. Remplacer `<API>` par l'URL réelle relevée en 2.2.

- [ ] **Étape 1 :** Le point de santé :

```powershell
curl.exe -s https://<API>/health
```

Attendu, exactement : `{"status":"ok"}`

- [ ] **Étape 2 :** La preuve que la base est bien câblée — une route qui lit réellement la base. La connexion admin fait un aller-retour complet jusqu'à PostgreSQL :

```powershell
# `curl.exe`, pas `curl` : sous PowerShell, `curl` est un alias de
# Invoke-WebRequest, qui ne comprend ni -i ni -d. Et guillemets simples autour
# du JSON, pour que PowerShell le transmette sans y toucher.
curl.exe -i -s -X POST https://<API>/auth/login `
  -H "Content-Type: application/json" `
  -d '{"email":"<adresse réelle>","password":"<mot de passe généré>"}'
```

Attendu : `HTTP/2 201` (ou `200`), un en-tête `set-cookie: access_token=...; HttpOnly; Secure; SameSite=None`, et un corps `{"email":"<adresse réelle>"}`.

**L'absence d'en-tête `Origin` ici n'est pas un oubli** : `origin-check.guard.ts:47-51` laisse délibérément passer une requête sans `Origin`, parce qu'une requête sans `Origin` ne vient pas d'un navigateur et n'est donc pas un vecteur CSRF. Le commentaire du fichier le dit.

- [ ] **Étape 3 :** La preuve que la garde admin tient :

```powershell
curl.exe -i -s https://<API>/admin/dashboard
```

Attendu : `HTTP/2 401`. Si cette route répond `200` sans cookie, **arrêter tout** : un contrôleur a perdu son `@UseGuards(JwtAuthGuard)`.

**Si l'étape 2 échoue en 401 :** le compte admin n'est pas dans cette base — soit la tâche 1.4 a amorcé une autre base (relire l'hôte), soit le mot de passe diffère.

---

### Tâche 2.4 : Vérifier la sauvegarde automatique

**Qui :** le commanditaire.

- [ ] **Étape 1 :** Sur la page de la base, onglet *Recovery* : confirmer que la restauration continue (*point-in-time recovery*) est active, et relever la fenêtre annoncée (3 jours sur un workspace Hobby).

**Pourquoi maintenant :** à partir d'ici, des données réelles vont entrer. Les réponses des invités ne se redemandent pas.

---

### Tâche 2.5 : L'application Google OAuth (peut attendre)

**Qui :** le commanditaire. **Cette tâche n'est pas sur le chemin critique** — la connexion par mot de passe suffit à tout le reste du plan. À faire quand les deux URL réelles sont connues, donc après la phase 3.

- [ ] **Étape 1 :** Console Google Cloud → nouveau projet → *Identifiants* → *ID client OAuth* → type **Application Web**.
- [ ] **Étape 2 :** URI de redirection autorisée : `https://<API>/auth/google/callback`, avec l'URL **réelle**.
- [ ] **Étape 3 :** Laisser l'écran de consentement en statut **Testing**, et ajouter les deux adresses admin comme testeurs. Un outil à deux utilisateurs n'a aucune raison de passer la revue de sécurité Google, qui prend des jours à des semaines.
- [ ] **Étape 4 :** Reporter `GOOGLE_CLIENT_ID` et `GOOGLE_CLIENT_SECRET` dans les variables du service API, en remplacement des `a-configurer`. Render redéploie tout seul.

**Vérification :** depuis `/login`, « Se connecter avec Google » aboutit au tableau de bord.

---

# Phase 3 — Le front

### Tâche 3.1 : Ajouter le site statique au `render.yaml`

**Fichiers :**
- Modifier : `render.yaml` — second service

**Qui :** l'architecte écrit et commite ; le commanditaire pousse.

- [ ] **Étape 1 :** Ajouter le bloc suivant sous le service API. **Aucune URL n'y figure en dur** : `VITE_API_URL` est en `sync: false` précisément pour que l'adresse de l'API ne soit pas figée dans le dépôt — elle se saisit au tableau de bord en tâche 3.2.

```yaml
  # Le front React, servi en statique par le CDN de Render. Gratuit.
  # Pas de `region` : un site statique est distribué partout.
  - type: web
    runtime: static
    name: hobiana-lova-web
    branch: main
    # `SKIP_INSTALL_DEPS` empêche Render de lancer son propre install avant
    # celui-ci ; on veut un install de workspace pnpm, à la racine.
    buildCommand: corepack enable && pnpm install --frozen-lockfile && pnpm --filter @invitation-app/web build
    staticPublishPath: apps/web/dist
    envVars:
      # pnpm 11 exige Node >= 22.13 pour se lancer — la raison même pour
      # laquelle le Dockerfile de l'API est en node:22-slim (ligne 3 à 9).
      - key: NODE_VERSION
        value: 22.16.0
      - key: SKIP_INSTALL_DEPS
        value: "true"
      # Gravée dans le bundle AU BUILD : la changer exige un rebuild, pas un
      # redémarrage. vite.config.ts:40-50 fait échouer le build si elle manque.
      - key: VITE_API_URL
        sync: false
    routes:
      # Le repli SPA, sans lequel un rechargement direct sur /admin/tables
      # renvoie un 404 du CDN. C'est l'équivalent du vercel.json actuel.
      - type: rewrite
        source: /*
        destination: /index.html
```

**Ne pas poser `NODE_ENV: production` sur ce service :** pnpm sauterait les devDependencies, et `tsc -b` — que `apps/web/package.json` appelle dans son `build` — disparaîtrait.

- [ ] **Étape 2 :** Valider : `render blueprints validate`

- [ ] **Étape 3 :** Commiter :

```bash
git add render.yaml
git commit -m "chore(deploy): add the static front end to the Blueprint

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01UdC2zvivaP3WgPmC1Enwpn"
```

- [ ] **Étape 4 :** Le commanditaire pousse.

---

### Tâche 3.2 : Construire le front avec la vraie URL d'API

**Qui :** le commanditaire.

- [ ] **Étape 1 :** Synchroniser le Blueprint (automatique, ou *Manual Sync*).
- [ ] **Étape 2 :** Renseigner `VITE_API_URL` avec l'**URL réelle de l'API** relevée en 2.2, sans barre oblique finale : `https://<API>`
- [ ] **Étape 3 :** Suivre la construction.

**Vérification :** le service passe en **Live**, et **relever son URL réelle** — même mise en garde qu'en 2.2 sur le suffixe.

**Si ça échoue :** un message français « VITE_API_URL manque. Le build de production a besoin de l'URL de l'API déployée… » signifie que la variable n'a pas été enregistrée avant la construction. C'est le garde-fou de `vite.config.ts` qui parle, et il fait exactement son travail : sans lui, le front serait parti en production en parlant à `localhost:3000`.

---

### Tâche 3.3 : Vérifier que la page invité s'affiche

**Qui :** le commanditaire. Remplacer `<WEB>` par l'URL réelle du front.

- [ ] **Étape 1 :** Ouvrir `https://<WEB>/login`. Attendu : le formulaire « Connexion organisateurs ». Si un 404 du CDN apparaît, la règle de réécriture SPA n'a pas pris.
- [ ] **Étape 2 :** Ouvrir `https://<WEB>/i/inexistant`. Attendu : un message d'erreur **en français**. Un message anglais remonté de l'API est un défaut à signaler.

---

### Tâche 3.4 : Refermer la boucle — corriger `FRONTEND_URL`

**Qui :** le commanditaire. **C'est l'étape qu'on oublie, et elle casse tout le reste.**

`FRONTEND_URL` sert à deux choses dans le code : l'origine autorisée par CORS (`configure-app.ts:28-31`) et la comparaison anti-CSRF (`origin-check.guard.ts:53`). Tant qu'elle porte une valeur provisoire fausse, **le navigateur ne pourra faire aucune requête vers l'API** et toute écriture sera rejetée en 403.

- [ ] **Étape 1 :** Dans les variables du service API, remplacer `FRONTEND_URL` par l'URL réelle du front, **sans barre oblique finale**.
- [ ] **Étape 2 :** Laisser Render redéployer l'API (automatique après un changement de variable).
- [ ] **Étape 3 :** Vérifier depuis un navigateur, **Chrome ou Firefox sur ordinateur** — pas Safari, pas un iPhone, pour les raisons de la phase 4 : se connecter sur `https://<WEB>/login` avec les identifiants de la tâche 0.2. Attendu : le tableau de bord admin s'affiche.

**Si la page répond « Email ou mot de passe incorrect. » alors que les identifiants sont bons :** c'est presque toujours `FRONTEND_URL` qui ne correspond pas exactement à l'origine du front — une barre oblique finale, un `http` au lieu d'un `https`, un suffixe de sous-domaine oublié. Ouvrir la console réseau : un 403 `Cross-origin request rejected` désigne la garde CSRF, un blocage CORS désigne la même variable.

- [ ] **Étape 4 :** Créer un foyer de test depuis l'admin, copier son lien, **l'ouvrir sur un vrai téléphone** et répondre. Attendu : la réponse se voit dans l'admin. La page invité n'utilise aucun cookie : elle doit fonctionner sur iPhone dès maintenant.

---

### Tâche 3.5 : Retirer `vercel.json`

**Fichiers :**
- Supprimer : `apps/web/vercel.json`

**Qui :** l'architecte, **seulement une fois la tâche 3.4 vérifiée**. Tant que le front n'est pas prouvé sur Render, ce fichier est le filet de repli vers Vercel.

- [ ] **Étape 1 :** `git rm apps/web/vercel.json`
- [ ] **Étape 2 :** Mettre à jour `apps/web/.env.example`, dont le commentaire dit encore « Production deployment (Vercel) » — il désigne maintenant Render.
- [ ] **Étape 3 :** Commiter.

**Jalon de la phase 3 :** les trois étages tournent, l'admin est utilisable depuis un ordinateur, et un invité peut répondre depuis son téléphone.

---

# Phase 4 — Le domaine (à lancer tôt, en parallèle)

**Pourquoi c'est ici et pas en option :** sans domaine, le front et l'API sont sur deux sites distincts au sens des navigateurs, et **la connexion admin est impossible sur Safari et sur tout iPhone** (voir « Ce qui a changé » en tête de plan). Les phases 1 à 3 n'en dépendent pas — d'où cette phase à part — mais elle a le seul délai que personne ne contrôle : la propagation DNS. **À commencer dès la phase 0 si possible.**

### Tâche 4.1 : Acheter le domaine

**Qui :** le commanditaire.

- [ ] **Étape 1 :** Choisir et acheter un nom chez un registrar. Ordre de grandeur 10 à 20 €/an — ce n'est pas un prix que j'ai fait vérifier, contrairement aux tarifs d'hébergement.

---

### Tâche 4.2 : Attacher les deux sous-domaines

**Qui :** le commanditaire.

- [ ] **Étape 1 :** Sur le service **front**, *Settings* → *Custom Domains* → ajouter `mariage.<domaine>` (ou l'apex).
- [ ] **Étape 2 :** Sur le service **API**, ajouter `api.mariage.<domaine>` — **le même domaine enregistrable que le front, c'est tout l'enjeu.**
- [ ] **Étape 3 :** Créer chez le registrar les enregistrements DNS que Render affiche (un CNAME par sous-domaine ; un enregistrement A ou ALIAS si l'apex est utilisé).
- [ ] **Étape 4 :** Attendre l'émission automatique des certificats TLS par Render.

**Vérification :** `https://mariage.<domaine>` et `https://api.mariage.<domaine>/health` répondent, en HTTPS, sans avertissement de certificat.

---

### Tâche 4.3 : Basculer les trois variables

**Qui :** le commanditaire. **Trois variables, aucune ligne de code.**

- [ ] **Étape 1 :** Sur l'API : `FRONTEND_URL` = `https://mariage.<domaine>`
- [ ] **Étape 2 :** Sur l'API : `GOOGLE_CALLBACK_URL` = `https://api.mariage.<domaine>/auth/google/callback`, et ajouter cette URI dans la console Google (garder l'ancienne le temps de la bascule).
- [ ] **Étape 3 :** Sur le front : `VITE_API_URL` = `https://api.mariage.<domaine>`, puis **redéployer le front** — cette variable est gravée à la construction, un simple redémarrage ne suffit pas.

- [ ] **Étape 4 : la vérification qui justifie toute la phase.** Se connecter à l'admin **depuis un iPhone, en Safari**. Attendu : le tableau de bord s'affiche.

C'est le seul test que ni les tests unitaires, ni la relecture de code, ni un navigateur de bureau ne peuvent remplacer. **À faire avant d'envoyer la moindre invitation.**

**Note pour plus tard, vérifiée :** Safari applique une seconde défense aux sous-domaines qui pointent par CNAME vers un autre domaine — ce que sera `api.mariage.<domaine>` → `hobiana-lova-api.onrender.com`. Elle plafonne à 7 jours la durée de vie des cookies posés par ce sous-domaine. Or `auth.controller.ts` pose déjà `maxAge: 7 * 24 * 60 * 60 * 1000`, soit exactement 7 jours : aucun effet aujourd'hui. **Mais si quelqu'un allonge un jour `JWT_EXPIRES_IN` au-delà de 7 jours, Safari ignorera silencieusement la rallonge**, et seuls les iPhone redemanderont le mot de passe chaque semaine.

---

# Phase 5 — Les vraies données et la sauvegarde

### Tâche 5.1 : La vraie liste des foyers

**Qui :** le commanditaire.

- [ ] **Étape 1 :** Saisir les foyers depuis l'écran admin — c'est le chemin sûr, il applique les invariants métier (`confirmedCount` reste `null` tant qu'un foyer n'a pas répondu).
- [ ] **Étape 2 :** **Ne pas lancer `seed:demo` contre la production.** Il crée 40 foyers fictifs, et rien ne distingue ensuite un foyer fictif d'un vrai.

**Vérification :** le nombre de foyers dans l'admin correspond à la liste réelle, et aucun nom de démonstration n'y figure.

---

### Tâche 5.2 : La sauvegarde indépendante

**Qui :** le commanditaire, chaque semaine pendant la période de réponses, et après tout changement notable.

La restauration continue de Render couvre l'erreur humaine sur trois jours. Elle ne couvre pas un problème de compte — carte expirée, workspace suspendu — qui emporterait la base et ses sauvegardes ensemble.

- [ ] **Étape 1 :**

```powershell
$env:DATABASE_URL = "<External Database URL>"
docker run --rm -v "${PWD}/.db-backups:/out" postgres:16 `
  pg_dump "$env:DATABASE_URL" -f "/out/$(Get-Date -Format yyyy-MM-dd)-production.sql"
```

- [ ] **Étape 2 :** Copier le fichier **hors de Render et hors de la machine** — Drive, disque externe. `.db-backups/` est ignoré par git, et doit le rester.

---

## Ce que ce plan ne couvre pas, explicitement

- **La construction Docker n'a jamais été exécutée.** Docker Desktop ne répondait pas lors de l'audit du 2026-09-11, et je ne l'ai pas lancée non plus. Le `Dockerfile` a été relu ligne à ligne ; la tâche 2.2 est la première exécution réelle. C'est l'étape la plus susceptible de surprendre, et c'est pour ça qu'elle est isolée dans sa propre phase.
- **Les tarifs** viennent de la spec du 2026-09-11 ; la page `render.com/pricing` n'est pas extractible automatiquement. À reconfirmer au moment de payer.
- **Le comportement du cookie sur un vrai Safari** n'a pas pu être observé : il n'existe pas encore de déploiement pour l'observer. La tâche 4.3 étape 4 est la vérification, pas un acquis.
- **Aucune CI.** Le dépôt n'a pas de `.github/workflows`. Render construit à chaque poussée sur `main` sans qu'aucun test ne tourne avant. C'est acceptable pour ce projet et ce calendrier, mais ça veut dire qu'**une poussée sur `main` déploie**.

## Ordre de grandeur

| Phase | Effort | Attente |
|---|---|---|
| 0 — préalables | 30 min | — |
| 1 — la base | 20 min | 5 min de provisionnement |
| 2 — l'API | 20 min | 10 à 20 min de construction Docker |
| 3 — le front | 20 min | 5 min de construction |
| 4 — le domaine | 30 min | quelques heures de DNS |
| 5 — les données | variable | — |

Un après-midi pour les phases 0 à 3, sauf surprise à la construction Docker. La phase 4 se lance en parallèle dès que le domaine est acheté.
