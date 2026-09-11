# Plan de mise en ligne — 2026-09-11

**Auteur :** agent devops (sous-agent, session du 2026-09-11).
**Statut :** Livrable 1 (ce document) et Livrable 2 (trois corrections indépendantes de l'hébergeur) terminés et vérifiés dans la même session — voir le résumé des trois corrections en fin de document, et `docs/audit/ETAT-mise-en-ligne.md` pour le détail des vérifications.

## Pourquoi ce document passe devant tout le reste

Le mariage a lieu le **samedi 2 janvier 2027** — dans **113 jours** à la date d'écriture. Les réponses des invités sont attendues avant le **1er décembre 2026** — dans **81 jours**. L'application ne tourne aujourd'hui que sur la machine du commanditaire : pas de CI, pas d'hébergement, pas de domaine, pas de base en ligne. Une invitation parfaite sur `localhost` n'envoie rien à personne. C'est le risque numéro un du projet, devant le design et devant le plan de table (qui ne sert qu'en décembre, une fois les invités placés).

## Méthode — ce qui a été vérifié, et comment

Tout ce qui suit a été lu ou exécuté dans ce dépôt, pas supposé :

- `git remote -v` → sortie vide. `git branch -a` → une seule branche, `main`. Confirmé : **aucun remote**.
- `docker version` et `docker compose ps` échouent avec `failed to connect to the docker API at npipe:////./pipe/dockerDesktopLinuxEngine` — **Docker Desktop ne répond pas**, comme signalé. Je n'ai donc **pas pu construire l'image `apps/api/Dockerfile`** ni lancer Postgres en local. Ce qui suit sur le Dockerfile est une lecture, pas une exécution — je le dis explicitement à chaque fois que ça compte.
- `node -v` → `v22.16.0`, `pnpm -v` → `11.22.0`. Cohérent avec le commentaire du Dockerfile (`node:22-slim`, justifié par le besoin de pnpm ≥ 11 lui-même exigeant Node ≥ 22.13) et avec `packageManager` du `package.json` racine.
- `pnpm --filter @invitation-app/api test` → **15 suites, 109 tests, tous verts**. Conforme à la référence.
- `pnpm --filter @invitation-app/web test -- --run` → **20 fichiers, 172 tests, tous verts**. Conforme à la référence.
- `pnpm --filter @invitation-app/web build` (sans `VITE_API_URL` positionnée dans le shell) → **exit 0**, build produit (`369 Ko` JS avant gzip, `115 Ko` gzip) — **sans le moindre avertissement** sur l'absence de la variable. C'est la preuve directe du problème visé par le Livrable 2 point 2.
- `pnpm --filter @invitation-app/api exec tsc --noEmit` → exit 0.
- **`test:e2e` n'a pas été lancé** : il exige Postgres, Docker Desktop est indisponible. Non couvert, je ne l'affirme pas.
- Le dépôt est propre (`git status --porcelain=v1 -uall` vide) et `HEAD` est à `86ed1cd` — le lot 3 (refonte du front) avance en parallèle pendant l'écriture de ce document ; je n'ai touché à rien sous `apps/web/src/`.
- Prix d'hébergement : cherchés sur le web le jour même (voir sources en bas de chaque section), pas récités de mémoire — ma connaissance s'arrête à janvier 2026 et ces grilles tarifaires bougent.

---

## 1. Quel hébergement

La cible n'est pas entièrement ouverte : `CLAUDE.md` fixe déjà `apps/web` en statique sur **Vercel**, et `apps/api` en conteneur sur **Railway ou Render**, avec PostgreSQL managée. Le travail ici est de trancher Railway contre Render, avec des prix réels, et de dire pourquoi.

### Ce qui existe déjà dans le dépôt pour cette cible

Bonne surprise en auditant : le terrain a déjà été préparé, il y a plusieurs semaines (`fa26b28`, `cda7108`, `513550b`, `fe17014`) — probablement par une session antérieure, avant la coupure qui a interrompu ce plan lui-même. Je n'ai pas eu à écrire ceci, seulement à le vérifier :

- `apps/api/Dockerfile` : build multi-stage, `node:22-slim`, OpenSSL installé pour la détection Prisma, `pnpm install --frozen-lockfile`, `prisma generate` puis `nest build`. Le conteneur de production lance `prisma migrate deploy && node apps/api/dist/src/main.js` **au démarrage** (`apps/api/Dockerfile:34`) — c'est bien `migrate deploy`, jamais `migrate dev` ni `db push`.
- `.dockerignore` à la racine (pas dans `apps/api/`, avec un commentaire qui explique pourquoi l'emplacement compte) exclut `.git`, `**/.env`, `**/node_modules` — aucun secret ne peut entrer dans une couche d'image.
- `apps/api/src/config/env.validation.ts` : `DATABASE_URL` et `JWT_SECRET` sont requis dans **tous** les environnements, sans repli ; `FRONTEND_URL`, `GOOGLE_CLIENT_ID/SECRET`, `GOOGLE_CALLBACK_URL`, `ALLOWED_ADMIN_EMAILS` requis dès que `NODE_ENV=production`. Un déploiement mal configuré **refuse de démarrer**, comme demandé.
- `apps/api/src/common/configure-app.ts` : `trust proxy` réglé à `1` (le hop du proxy Railway/Render, pas toute la chaîne), CORS avec `origin` = `FRONTEND_URL` validée et `credentials: true`.
- `apps/api/src/auth/auth.controller.ts:38-39` : le cookie JWT est `SameSite=None; Secure` en production, `SameSite=Lax` sans `Secure` en développement — exactement ce que le cross-site (front et API sur deux domaines) exige.
- `apps/api/src/app.module.ts` : `OriginCheckGuard` (anti-CSRF) puis `ThrottlerGuard`, dans cet ordre, en gardes globales — commentaire en tête expliquant pourquoi l'ordre compte (ne pas laisser une requête forgée consommer le quota de débit de sa victime).
- `apps/web/vercel.json` : rewrite SPA (`/(.*)` → `/index.html`), nécessaire pour que React Router fonctionne sur un rechargement direct d'URL.
- `apps/api/.env.example` et `apps/web/.env.example` documentent déjà, en commentaire, quelles variables doivent être posées dans Railway/Render et dans Vercel — sans jamais porter de valeur réelle.
- `apps/api/src/health/health.controller.ts` : `GET /health` répond `{status: "ok"}`, exploitable comme *health check* par l'hébergeur.

Donc l'essentiel du travail de préparation est déjà fait et je l'ai vérifié en le lisant. Ce qui manque : le choix tranché entre Railway et Render, et la levée des blocages listés en section 2 — dont aucun n'est du code.

### Comparatif Railway vs Render, prix vérifiés le jour même

| | **Render** (recommandé) | Railway |
|---|---|---|
| Plan de base | Workspace *Hobby* : $0/mois | Plan *Hobby* : $5/mois (inclut $5 de crédit d'usage) |
| Web service (API, toujours actif, pas de veille) | *Starter* : **$7/mois** (512 Mo RAM, 0,5 vCPU) | Facturé à l'usage : ≈ $10/vCPU/mois + $10/Go RAM/mois — pas de palier fixe |
| PostgreSQL managée, toujours active | *Basic-256mb* : **≈ $7/mois** (1 Go de stockage inclus, 256 Mo RAM) | Facturé à l'usage (CPU + RAM + $0,15/Go de volume/mois) ; une petite base toujours active coûte en pratique **$10 à $20/mois** d'après les retours d'utilisateurs |
| **Total estimé, toujours actif** | **≈ $14/mois** (≈ 13 €) | **≈ $15 à 30/mois**, moins prévisible |
| Sauvegarde automatique incluse | **Oui** : *point-in-time recovery* continu sur tout plan payant — 3 jours de fenêtre sur workspace Hobby, 7 jours sur Pro — plus une sauvegarde logique conservée 7 jours, sans rien configurer | Pas de PITR natif en production à ce jour (en cours de déploiement d'après leur changelog) ; les sauvegardes passent par un service tiers communautaire (ex. modèle Railway "Postgres Daily Backups") à déployer et surveiller soi-même |
| Prévisibilité budgétaire | Paliers fixes, facture stable | Facturation à l'usage : une fuite de connexions ou un pic de trafic fait varier la facture |
| Piège du plan gratuit | Web service gratuit ($0) **s'endort après 15 minutes d'inactivité** (redémarrage ≈ 1 minute) ; **la base Postgres gratuite est supprimée 30 jours après sa création**, avec 14 jours de grâce pour upgrader avant suppression définitive des données | Plan gratuit retiré depuis 2023 ; le plan payant le moins cher ($5) ne couvre déjà plus le coût réel d'une base Postgres toujours active |

**Recommandation : Render**, pour deux raisons concrètes et propres à ce projet, pas génériques :

1. **La sauvegarde automatique est incluse sans rien configurer.** Le point 5 de ce plan (« les réponses des invités ne se re-demandent pas ») est justement le risque que Render couvre nativement sur son offre payante, alors que Railway le renvoie à un montage tiers que quelqu'un doit déployer et surveiller — un projet d'un mois n'a pas le temps pour ça.
2. **Le prix est prévisible** (≈ 14 $/mois flat) contre un modèle à l'usage chez Railway qui peut dériver sans que personne ne le remarque avant la facture — pour un budget personnel de quelques mois, la prévisibilité vaut plus qu'une éventuelle économie marginale.

**Le piège du gratuit, avec les dates de ce projet précisément :** si la base Postgres gratuite de Render est provisionnée aujourd'hui (11 septembre), elle expire **vers le 11 octobre** — **avant même l'ouverture de la période de réponse** (1er décembre). Combiné à la mise en veille du web service gratuit après 15 minutes, un invité qui ouvre son lien après 23 h attend jusqu'à une minute de démarrage à froid avant de voir quoi que ce soit — pour une invitation de mariage, c'est exactement le genre de première impression qui ne se rattrape pas. Le plan gratuit est à écarter sans hésitation pour la mise en production, y compris pour « juste tester » si des données réelles y sont saisies — elles disparaîtraient avant le 1er décembre sans avertissement.

**Vercel pour `apps/web`** : plan *Hobby* (gratuit), 100 Go de bande passante et 1 million de requêtes *edge* par mois inclus, site statique servi par le CDN sans mise en veille ni cold start — un besoin de site personnel largement dans ce quota. Aucune raison de payer ici.

**Budget total estimé : ≈ 14 $/mois (≈ 13 €), sur la durée du projet (4 à 5 mois jusqu'au mariage) ≈ 55 à 70 € au total.** Le commanditaire peut réduire au *Starter* seul sans upgrader la base si le volume de données reste minuscule (quelques dizaines de foyers), mais je déconseille de descendre en dessous de Basic-256mb pour la base : c'est justement le palier qui inclut le PITR automatique.

Sources consultées le 2026-09-11 : [Render Pricing Plans (docs)](https://docs.railway.com/pricing/plans) *(sic, voir aussi la page équivalente Render)*, [Render Postgres Recovery and Backups](https://render.com/docs/postgresql-backups), [Render — plateformes avec un vrai plan gratuit en 2026](https://render.com/articles/platforms-with-a-real-free-tier-for-developers-in-2026), [Railway Pricing Plans (docs officielle)](https://docs.railway.com/pricing/plans), [Automated PostgreSQL Backups — Railway blog](https://blog.railway.com/p/automated-postgresql-backups), [Render Postgres pricing summary — Kuberns](https://kuberns.com/blogs/render-postgres-pricing-setup-limits/). Les grilles tarifaires changent ; à reconfirmer sur les pages officielles au moment de payer.

---

## 2. Ce qui bloque, dans l'ordre où il faut le lever

Je n'ai **rien créé** en écrivant cette section — je constate et je dis l'implication. Aucune de ces actions n'a été effectuée par moi.

### Blocage 1 — aucun remote git (le plus bloquant, confirmé : `git remote -v` vide)

`main` est purement locale. **Implication concrète :** les deux hébergeurs ciblés (Vercel, Render) fonctionnent nativement par intégration avec un fournisseur Git (GitHub, GitLab, Bitbucket) — c'est ce qui donne le déploiement automatique à chaque `git push`, les URLs de prévisualisation, et la possibilité d'ajouter une CI plus tard. Sans remote :

- **Vercel** propose une alternative : sa CLI (`vercel deploy`) peut déployer directement depuis un dossier local, sans dépôt distant. Ça marche, mais chaque mise à jour du site demande alors une commande manuelle depuis la machine du commanditaire — pas d'auto-déploiement, pas d'historique de déploiement lisible par quelqu'un d'autre.
- **Render** est plus strict : son flux normal exige un dépôt connecté (GitHub/GitLab) pour construire depuis le Dockerfile. Il existe une voie de contournement (pousser une image déjà construite vers un registre de conteneurs), mais elle demande un registre Docker en plus et retire l'intérêt du Dockerfile déjà écrit dans ce dépôt.

**Ce que ça implique en clair :** créer un dépôt distant (GitHub, privé — ce projet contient des noms, des dates, une organisation de mariage réel) est en pratique le préalable le plus simple pour débloquer un déploiement propre sur les deux plateformes, et c'est aussi ce qui permettrait d'ajouter une CI plus tard (l'autre risque cité dans le brief). **Je ne le fais pas** : c'est une commande git qui écrit (`git remote add`, `git push`) et la création d'une ressource (le dépôt GitHub), toutes deux hors de mon mandat. Je la mets en tête de la liste « ce que le commanditaire doit faire lui-même » avec les commandes exactes.

### Blocage 2 — aucun compte sur les plateformes cibles

Vercel, Render, et (pour l'authentification admin par Google) Google Cloud : trois comptes à créer, plus un moyen de paiement à renseigner pour Render (le plan gratuit ne convient pas, section 1). Non bloquant technique — juste une action humaine, quelques minutes chacune, réalisable en parallèle du reste dès ce soir.

### Blocage 3 — les secrets de production n'existent pas encore

`JWT_SECRET` doit être une valeur générée pour la production, différente de `change-me` (la valeur de `.env.example`) et différente de celle utilisée en développement local. `ADMIN_SEED_EMAIL`/`ADMIN_SEED_PASSWORD` ne doivent **jamais** porter les valeurs de démo (`admin@invitation-app.local` / `motdepasse-de-dev`) en production — ce sont les identifiants documentés en clair dans `CLAUDE.md`, donc publics de fait. `ALLOWED_ADMIN_EMAILS` doit contenir les vraies adresses des deux organisateurs.

### Blocage 4 — l'application Google OAuth de production n'existe pas

`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL` sont requis dès que `NODE_ENV=production` (`env.validation.ts`). Il faut un projet Google Cloud avec un écran de consentement OAuth configuré. **Point important pour aller vite :** avec seulement deux comptes admin connus à l'avance, l'application peut rester en statut **« Testing »** dans Google Cloud (les deux emails ajoutés comme testeurs) — ça évite la revue de sécurité Google qui peut prendre des jours à semaines pour une app publiée. Un outil d'administration à deux utilisateurs n'a aucune raison de sortir du mode Testing.

### Blocage 5 — le nom de domaine, non bloquant

Les deux hébergeurs fournissent un sous-domaine gratuit (`*.vercel.app`, `*.onrender.com`) qui suffit techniquement. Un domaine propre est plus présentable sur un faire-part mais n'est pas sur le chemin critique : il peut s'ajouter après coup, la propagation DNS (jusqu'à 24-48 h) tournant pendant que le reste continue.

### Blocage 6 — le point le plus fragile de l'architecture n'a jamais été testé en conditions réelles

Le cookie JWT cross-site (`SameSite=None; Secure`, domaines différents pour le front et l'API) est configuré dans le code et couvert par les tests unitaires, mais **jamais vérifié contre deux vrais domaines HTTPS distincts** — seule une exécution réelle après le premier déploiement le confirmera. C'est un test qui ne peut pas se substituer par de la lecture de code : navigateurs, extensions de blocage de cookies tiers, et versions de Safari/iOS ont des politiques différentes vis-à-vis de `SameSite=None`. **À vérifier explicitement juste après le premier déploiement**, avant d'envoyer la moindre invitation : se connecter en admin depuis un vrai téléphone, pas seulement depuis le poste de développement.

### Blocage 7 — les données de production ne sont pas la liste réelle des invités

`seed:demo` crée 40 foyers fictifs pour le développement. Avant d'envoyer les invitations, quelqu'un doit remplacer ce jeu par la vraie liste des foyers (`seed.ts`, déjà prévu « minimal » pour cet usage selon `docs/audit/REPRISE.md`). Ce n'est pas un blocage technique, c'est un travail de saisie qui prend du temps et peut commencer dès que la base de production existe — en parallèle du reste du développement.

---

## 3. Chemin critique en jours

Le chemin critique n'est presque plus du développement : la majorité du travail restant sur la mise en ligne est des clics et des attentes de propagation, pas du code. J'estime en **jours-effort** (temps de travail réel) distincts des **jours-calendrier** (délais d'attente qui peuvent se recouvrir avec autre chose) :

| # | Étape | Jours-effort | Dépend de | Parallélisable avec le développement ? |
|---|---|---|---|---|
| 1 | Créer le dépôt GitHub, pousser `main` | 0,1 j | — | Oui, dès maintenant |
| 2 | Créer les comptes Vercel / Render / Google Cloud, moyen de paiement Render | 0,25 j | 1 (Vercel/Render se connectent via GitHub) | Oui |
| 3 | Créer le projet OAuth Google (mode Testing, 2 testeurs) | 0,25 j | 2 | Oui |
| 4 | Générer les secrets de production (`JWT_SECRET`, identifiants admin réels) | 0,1 j | — | Oui, dès maintenant |
| 5 | Provisionner Postgres managée sur Render, provisionner le web service API, poser les variables d'environnement | 0,25 j | 1, 2, 3, 4 | Non — c'est la première étape réellement bloquante |
| 6 | Premier déploiement API : build de l'image, `prisma migrate deploy` au démarrage (déjà scripté dans `Dockerfile:34`), vérifier `/health` | 0,25 j | 5 | Non |
| 7 | Déployer `apps/web` sur Vercel avec `VITE_API_URL` pointant vers l'API Render | 0,1 j | 6 | Non |
| 8 | **Vérification réelle du cookie cross-site** : connexion admin depuis un vrai navigateur/téléphone sur les deux vrais domaines | 0,25 j | 7 | Non — c'est le test qui compte le plus, cf. blocage 6 |
| 9 | (optionnel) Nom de domaine : achat, DNS chez les deux hébergeurs | 0,1 j d'effort + jusqu'à 2 j calendaire de propagation | 6, 7 | Oui, la propagation tourne pendant autre chose |
| 10 | Remplacer les données de démonstration par la vraie liste de foyers en production | 0,5 à 1 j (dépend du nombre de foyers) | 6 | Oui, une fois l'étape 6 franchie |
| 11 | Corrections indépendantes de l'hébergeur (Livrable 2 : lint, `VITE_API_URL`, `.gitattributes`) | 0,5 j | — | Oui, en tout temps, y compris avant l'étape 1 |
| 12 | Envoi effectif des invitations | — | 8, 10 | — objectif final |

**Total du chemin critique proprement dit (étapes 1 → 8) : de l'ordre de 1,5 jour-effort**, réparti sur **2 à 4 jours-calendrier** si on laisse la propagation DNS et les délais de validation de compte se dérouler sans les bloquer. Rien n'empêche de tout faire en un seul week-end si le commanditaire bloque le temps ; rien n'oblige non plus à faire vite — la vraie contrainte de calendrier est le **1er décembre** (81 jours), pas une urgence technique.

**Ce qui tourne en parallèle du développement du front, sans le gêner :** tout, sauf les étapes 6 à 8 qui demandent que le code déployé — même incomplet côté design — passe par le pipeline une première fois. Je recommande d'ailleurs de **faire un premier déploiement tôt, avec l'état actuel du front**, précisément pour dérisquer le point 6 (cookie cross-site) pendant qu'il reste du temps pour réagir — ne pas attendre que le design soit fini pour découvrir un problème de CORS ou de `SameSite` à trois semaines de l'échéance.

---

## 4. Ce que le commanditaire doit faire lui-même

Liste courte, ordonnée, traitable en une soirée. Je fournis la commande ou l'action exacte ; **c'est lui qui l'exécute**, pas moi.

1. **Créer un dépôt GitHub privé**, puis :
   ```
   git remote add origin git@github.com:<compte>/invitation-app.git
   git push -u origin main
   ```
   (ou l'équivalent HTTPS si l'authentification SSH n'est pas configurée). Vérifier avant de pousser qu'aucun `.env` n'est suivi — déjà confirmé ici (`git ls-files | grep -i "\.env$"` ne retourne rien) mais à re-vérifier après toute manipulation locale.

2. **Créer un compte Vercel** (connexion via GitHub) et **un compte Render** (connexion via GitHub, plus un moyen de paiement pour le plan payant décrit en section 1).

3. **Générer `JWT_SECRET` de production** — une valeur aléatoire longue, différente de celle du développement, par exemple :
   ```
   openssl rand -base64 48
   ```
   À coller uniquement dans les paramètres d'environnement de Render, jamais dans un fichier du dépôt.

4. **Décider et poser les identifiants admin réels** : les deux adresses email des organisateurs dans `ALLOWED_ADMIN_EMAILS`, et s'assurer qu'aucune trace des identifiants de démo (`admin@invitation-app.local` / `motdepasse-de-dev`, publics dans `CLAUDE.md`) ne subsiste en production.

5. **Créer le projet OAuth Google** (console Google Cloud) : type « Application web », `GOOGLE_CALLBACK_URL` pointant vers l'API une fois son domaine Render connu, écran de consentement laissé en statut **Testing** avec les deux emails admin ajoutés comme testeurs — pas besoin de validation Google pour un usage aussi restreint.

6. **Réserver un nom de domaine**, si souhaité (facultatif, non bloquant — section 2, blocage 5). Un `.mg`, `.com` ou équivalent chez un registrar classique coûte de l'ordre de 10 à 20 €/an ; à vérifier au moment de l'achat, ce n'est pas un prix que j'ai fait vérifier aujourd'hui comme les prix d'hébergement.

7. **Choisir la fréquence de sauvegarde complémentaire** (section 5 ci-dessous) et où la stocker — un espace personnel (Drive, disque externe), pas seulement chez l'hébergeur.

---

## 5. La sauvegarde de la base

Les réponses des invités ne se redemandent pas : si la base est perdue après que des foyers ont répondu, il n'y a aucun moyen de reconstituer qui a confirmé quoi.

**Ce que Render garantit sur l'offre recommandée (Basic-256mb, payante) :**
- *Point-in-time recovery* continu, fenêtre de restauration de **3 jours** glissants sur un plan de workspace Hobby (7 jours sur Pro) — permet de revenir à n'importe quelle seconde des 3 derniers jours, utile contre une erreur humaine (mauvaise commande, migration ratée, suppression accidentelle depuis l'admin).
- Une sauvegarde logique conservée **7 jours**, indépendamment du plan.
- Ces protections sont **incluses et automatiques** sur le plan payant — rien à configurer, contrairement à Railway qui renvoie ça à un montage tiers (section 1).

**Ce que ça ne couvre pas :**
- Un problème côté compte (carte expirée, compte Render suspendu ou fermé) peut entraîner la perte de la base et de ses sauvegardes en même temps — tout reste chez le même fournisseur.
- Au-delà de 7 jours, rien n'est gardé par défaut : une erreur découverte tardivement (un foyer qui se plaint que sa réponse a disparu, remarqué trois semaines plus tard) n'est plus récupérable par ce mécanisme seul.

**Ce qu'il faut ajouter, au-delà de l'offre :** une copie indépendante, hors de Render, à une fréquence adaptée au rythme réel des réponses — plus fréquente à l'approche du 1er décembre. Le dépôt a déjà cette pratique amorcée localement : `.db-backups/2026-08-23-ancienne-base-worktree.sql` existe (ignoré par git, comme il se doit) et montre qu'un export manuel a déjà été fait une fois. Je recommande de **continuer cette pratique contre la base de production**, par exemple :
```
pg_dump "$DATABASE_URL" > .db-backups/AAAA-MM-JJ-production.sql
```
exécuté depuis la machine du commanditaire (la variable `DATABASE_URL` de production, copiée depuis les paramètres Render, jamais commitée), à une cadence hebdomadaire pendant la période de réponse et ponctuellement en cas de changement notable (import de la vraie liste de foyers, par exemple), le fichier rangé dans un espace personnel distinct de Render (Drive, disque externe) — précisément pour ne pas dépendre du même fournisseur que la base elle-même.

---

## Ce que je n'ai pas vérifié, honnêtement

- **Le build Docker n'a pas été exécuté** : Docker Desktop ne répondait pas (`npipe` introuvable). Le Dockerfile a été relu ligne à ligne, pas construit. À construire et tester dès que Docker répond, avant le premier déploiement réel.
- **`test:e2e` n'a pas tourné** (besoin de Postgres, indisponible pour la même raison). Les 15 suites / 109 tests API et 20 fichiers / 172 tests web ont, eux, tourné et sont verts, conformes à la référence.
- **Le comportement réel du cookie cross-site sur deux vrais domaines HTTPS n'a pas pu être observé** — il n'existe pas encore de déploiement pour l'observer. C'est noté comme vérification prioritaire post-déploiement (blocage 6 / étape 8 du chemin critique), pas comme un fait acquis.
- **Les prix Render et Railway** viennent de recherches web du jour et de leurs pages de documentation officielles ; les grilles listées par des sites tiers (blogs de comparatif) ont été recoupées mais pas contre la page `render.com/pricing` elle-même, qui n'a pas pu être extraite (page fortement en JavaScript côté client). À reconfirmer sur les pages officielles avant de payer.
- **Le prix d'un nom de domaine** est un ordre de grandeur générique (marché des registrars), pas une recherche ciblée comme pour l'hébergement — le commanditaire n'a pas encore choisi de nom, la recherche n'aurait rien eu à vérifier de concret.

---

## Livrable 2 — les trois corrections indépendantes de l'hébergeur

Faites dans la même session, après le plan, aucune ne touche `apps/web/src/`.

### 1. `pnpm --filter @invitation-app/api lint` tournait avec `--fix`

`apps/api/package.json` séparait mal vérification et correction : `"lint": "eslint ... --fix"` modifiait le dépôt à chaque exécution, y compris en CI si quelqu'un l'y branchait un jour. Corrigé : `lint` est maintenant une vérification pure, `lint:fix` ajouté pour qui veut encore l'ancien comportement.

**Conséquence à connaître, pas une régression que j'ai introduite** : `lint` sans `--fix` échoue aujourd'hui avec **2 619 erreurs**, presque toutes `Delete ␍` (fins de ligne). C'était masqué depuis toujours par le `--fix` automatique. Voir le point 3.

### 2. `VITE_API_URL` échoue maintenant bruyamment au build si elle manque

Avant : `apps/web/src/lib/api.ts:1` se rabattait silencieusement sur `http://localhost:3000` si la variable n'était pas définie — un build de production ainsi mal configuré compile sans le moindre avertissement (vérifié : `pnpm --filter @invitation-app/web build` sans la variable → exit 0). Corrigé dans `apps/web/vite.config.ts` (hors `apps/web/src/`, donc dans mon périmètre malgré la refonte en cours) : le build (`vite build`, jamais le serveur de dev ni Vitest) lève une erreur explicite si `VITE_API_URL` est absente.

Vérifié dans les deux sens : sans la variable, `pnpm --filter @invitation-app/web build` échoue maintenant en exit 1 avec un message en français renvoyant vers `apps/web/.env.example` ; avec la variable posée, le build réussit normalement. `pnpm --filter @invitation-app/web test -- --run` reste vert (21 fichiers / 178 tests) sans la variable — le garde-fou ne s'applique qu'à la commande `build`.

### 3. `.gitattributes` posé, sans normalisation lancée

Le fichier n'existait pas. Posé à la racine : `* text=auto eol=lf`, plus la liste des extensions binaires réellement versionnées dans ce dépôt (`.jpg`, `.webp`, `.avif`, `.pdf`, `.woff`/`.woff2`, etc., établie via `git ls-files`, pas une liste générique copiée d'ailleurs).

> **Correction de l'architecte, 2026-09-11.** Ce paragraphe affirmait d'abord que 159 des 160 fichiers suivis portaient du CRLF *dans le blob commité*. C'est faux, et c'est un contresens qui aurait fait faire le mauvais geste. Mesure refaite sur les 168 fichiers texte suivis, un par un : **zéro** contient un `\r` dans son blob. `git add --renormalize .` ne produit **aucun** changement — l'historique est en LF depuis le début et il n'y avait rien à renormaliser.
>
> Le CRLF n'était que dans la **copie de travail**, où `core.autocrlf=true` convertit LF → CRLF à chaque checkout. D'où le résultat déroutant : un `eslint` en lecture seule criait 2 576 `Delete ␍` sur des fichiers dont la version commitée est parfaitement propre, et le `--fix` les « corrigeait » en silence, ce qui a caché la cause.
>
> Le remède n'est donc pas une renormalisation de l'historique mais **un simple nouveau checkout** : `eol=lf` prend le pas sur `core.autocrlf`, et les 101 fichiers déjà sortis en CRLF ont été refaits sortir une fois (commit `6013c0a`). Aucune trace dans l'historique, puisque les blobs n'ont jamais différé. `eslint` en lecture seule est passé de **2 576 erreurs à 30**, et ces 30 sont de vraies questions de forme à trancher.

`git check-attr` confirme que les règles s'appliquent correctement : `text: auto`, `eol: lf` sur les sources ; `binary: set` sur les images, polices et PDF.
