# Design — Application d'invitation & de gestion de mariage

Date : 2026-08-19
Statut : Validé pour passage au plan d'implémentation
Source : `cahier-de-charge/cahier-des-charges-mariage.pdf` (v0.1, août 2026)

## 1. Contexte et objectif

Remplacer les invitations papier par une invitation numérique personnalisée, accessible via un lien unique par foyer. L'app doit :

- informer chaque invité des détails du mariage ;
- recueillir sa réponse (RSVP) et le nombre de personnes présentes ;
- centraliser les réponses pour les organisateurs (dashboard) ;
- permettre l'organisation d'un plan de table, rendu visible aux invités une fois activé.

Ce document couvre uniquement le **périmètre V1** défini dans le cahier des charges (section 4). Les fonctionnalités V2/V3 (export CSV, relance, export PDF du plan, cagnotte, multilingue, suggestion automatique de répartition) sont explicitement différées.

## 2. Décisions de cadrage

Ces points étaient ouverts dans le cahier des charges (section 7) ou non couverts ; ils ont été tranchés en amont de ce design :

| Sujet | Décision |
|---|---|
| Stack technique | React (Vite) frontend + NestJS backend + PostgreSQL |
| Verrou RSVP | Date limite stricte côté invité (lecture seule après) ; l'admin peut toujours modifier depuis le dashboard, sans restriction de date |
| Authentification invité | Aucune — le lien unique (nanoid) fait office de clé d'accès |
| Prénoms des membres du foyer | Facultatifs, jamais bloquants pour valider le RSVP |
| Authentification admin | Email + mot de passe **et** OAuth Google, pas d'inscription publique |
| Déploiement cible | Frontend sur Vercel, backend sur Railway/Render, Postgres managée |

## 3. Hors périmètre (V1)

Repris du cahier des charges section 8, plus les fonctionnalités classées V2/V3 en section 4 :

- Paiement en ligne / cagnotte
- Application mobile native
- Gestion multi-événements
- Export CSV, relance des sans-réponse, export PDF du plan de table, suggestion automatique de répartition, message personnel libre, version multilingue, liste de cadeaux

## 4. Architecture

Monorepo pnpm workspaces :

```
invitation-app/
├── apps/
│   ├── api/          # NestJS
│   └── web/          # React + Vite
├── packages/
│   └── shared/        # types/DTOs/enums partagés front <-> back
├── docs/
└── cahier-de-charge/
```

**Pourquoi un monorepo** : partager les types (statut de réponse, formes de DTO RSVP, etc.) entre `api` et `web` évite la duplication et les désynchronisations de contrat d'API, sans le coût d'un vrai backend distribué (une seule app, un seul mariage).

- **ORM** : Prisma — typage généré, migrations versionnées, bonne intégration NestJS via `@nestjs/prisma` ou service maison.
- **UI** : Tailwind CSS + shadcn/ui pour une base de composants cohérente rapidement (le thème visuel définitif — couleurs, photo du couple — reste à affiner séparément, cf. cahier des charges section 7).
- **Data fetching** : TanStack Query côté `web`.
- **Drag & drop plan de table** : dnd-kit.
- **Routing** : React Router — zone publique `/i/:linkId`, zone admin `/admin/*` (protégée).

## 5. Modèle de données (Prisma)

```prisma
model Household {
  id              String   @id @default(nanoid()) // utilisé dans le lien /i/:id
  displayName     String
  allocatedSeats  Int
  memberNames     String[] @default([])
  status          RsvpStatus @default(PENDING)
  confirmedCount  Int?
  dietaryNotes    String?
  message         String?
  table           Table?   @relation(fields: [tableId], references: [id])
  tableId         String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

enum RsvpStatus {
  PENDING
  CONFIRMED
  DECLINED
}

model Table {
  id          String      @id @default(cuid())
  name        String
  capacity    Int         @default(10)
  households  Household[]
}

model AdminUser {
  id            String   @id @default(cuid())
  email         String   @unique
  passwordHash  String?  // nullable si connexion Google uniquement
  googleId      String?  @unique
  createdAt     DateTime @default(now())
}

model WeddingSettings {
  id                    String   @id @default("singleton")
  weddingDate           DateTime
  venueName             String
  address               String
  mapUrl                String?
  dressCode             String?
  parkingInfo           String?
  rsvpDeadline          DateTime
  seatingPlanActivated  Boolean  @default(false)
}
```

`WeddingSettings` est une table à une seule ligne (config globale du mariage), lue par la page d'invitation publique et éditable depuis l'admin.

Contrainte métier `confirmedCount <= allocatedSeats` validée côté API (DTO + service), pas en contrainte SQL.

## 6. API (NestJS)

### Publique (aucune auth)

- `GET /invitation/:linkId` → détails du foyer + infos du mariage (`WeddingSettings`) + table assignée et voisins de table **si** `seatingPlanActivated = true`, sinon champ `seatingPlan: null`.
- `PATCH /invitation/:linkId/rsvp` → soumet/modifie la réponse (status, confirmedCount, memberNames, dietaryNotes, message). Rejette avec `403` si `now() > rsvpDeadline`.

### Admin (JWT requis, cookie httpOnly)

- `POST /auth/login` (email + mot de passe)
- `GET /auth/google` + `GET /auth/google/callback` (redirige, vérifie whitelist d'emails via variable d'env `ALLOWED_ADMIN_EMAILS`)
- `GET/POST/PATCH/DELETE /admin/households` — CRUD foyers + génération auto du `linkId` à la création
- `GET /admin/dashboard` — vue d'ensemble (compteurs par statut, total confirmé, régimes spéciaux)
- `GET/POST/PATCH/DELETE /admin/tables` — configuration des tables
- `PATCH /admin/households/:id/assign-table` — place/déplace un foyer sur une table, refuse si dépassement de capacité (`409`)
- `PATCH /admin/settings` — édite `WeddingSettings`, y compris le toggle `seatingPlanActivated`

## 7. Logique métier clé

- **Deadline RSVP** : vérifiée uniquement sur l'endpoint public `PATCH`. Les routes admin ne sont jamais bloquées par la date.
- **Activation du plan de table** : entièrement manuelle (`seatingPlanActivated`), aucun déclenchement automatique lié à une date, conformément au cahier des charges.
- **Capacité de table** : vérification bloquante côté API au moment de l'assignation (pas seulement côté UI) pour rester cohérent même en cas d'appels API directs.
- **Foyers en attente dans le plan de table** : l'admin peut assigner un foyer `PENDING` à une table (le cahier des charges section 4.2 le permet explicitement pour ne pas bloquer sur les retardataires).

## 8. Authentification admin

- Email/mot de passe : hash via bcrypt, stratégie Passport `local` + JWT.
- Google OAuth : stratégie Passport `google-oauth20`. Au callback, si l'email n'est pas dans `ALLOWED_ADMIN_EMAILS`, refus (403) sans créer de compte.
- Pas d'endpoint d'inscription public : le premier admin est créé via script de seed (`prisma/seed.ts`) lisant email/mot de passe depuis l'environnement.
- JWT stocké en cookie httpOnly, `SameSite=Lax`, secret via variable d'env.

## 9. Tests

- **Backend** : Jest unitaire sur les services (validation capacité de table, deadline RSVP, whitelist Google) + tests e2e sur les endpoints publics et admin critiques.
- **Frontend** : Vitest + React Testing Library sur le formulaire RSVP (validation nombre de personnes ≤ places allouées) et sur la logique de capacité dans l'interface de placement des tables.

## 10. Déploiement

- `apps/api` : Dockerfile pour déploiement Railway/Render, variables d'env pour `DATABASE_URL`, `JWT_SECRET`, `GOOGLE_CLIENT_ID/SECRET`, `ALLOWED_ADMIN_EMAILS`.
- `apps/web` : build statique Vite déployé sur Vercel, variable d'env `VITE_API_URL`.
- Postgres managée (Railway/Render/Neon) — pas de setup manuel de serveur DB.
- En local : `docker-compose.yml` pour Postgres uniquement (le reste tourne en dev via pnpm).

## 11. Découpage indicatif (détaillé dans le plan d'implémentation)

1. Scaffolding monorepo (pnpm workspaces, NestJS app, Vite app, Prisma + docker-compose Postgres local)
2. Modèle de données + migrations Prisma
3. Auth admin (email/mdp + Google OAuth + whitelist)
4. CRUD foyers + génération de lien (admin)
5. Page d'invitation publique + formulaire RSVP
6. Dashboard admin (suivi réponses, statuts visuels)
7. Configuration des tables + assignation drag-and-drop + alertes de cohérence
8. Activation du plan de table + vue plan de table côté invité
9. Tests, polish, configuration de déploiement
