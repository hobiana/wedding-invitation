# Rapport d'audit consolidé — invitation-app

**Date :** 2026-08-22 · **Commit audité :** `3ae8ecc` · **Consolidé par :** l'architecte

Six spécialistes ont audité en parallèle, en lecture seule : backend, frontend, design/UX, DevOps, QA et sécurité. Ils ont produit **86 constats sur 2 754 lignes**. Ce document les déduplique, arbitre les désaccords de sévérité, et propose un ordre de traitement.

Les rapports sources restent la référence détaillée — chaque constat y porte sa preuve `fichier:ligne` :
[backend](2026-08-22-backend.md) · [frontend](2026-08-22-frontend.md) · [design](2026-08-22-design.md) · [devops](2026-08-22-devops.md) · [qa](2026-08-22-qa.md) · [sécurité](2026-08-22-securite.md)

---

## Verdict

**L'application est fonctionnellement complète et son socle de sécurité est sain. Elle n'est pas prête à recevoir de vrais invités.**

Les fondations sont bonnes et il faut le dire avant la liste des problèmes : les 13 routes admin sont gardées sans exception, aucun secret n'est en dur, `linkId` ne fuite nulle part, les 8 invariants métier sont implémentés dans les services et non seulement dans les DTO, et les 101 tests unitaires passent. Le cookie JWT cross-site — le point que je redoutais le plus dans cette architecture — est correctement traité.

Ce qui manque n'est pas structurel, c'est du travail de finition qui n'a jamais été fait : personne ne peut deviner l'heure du mariage en lisant son invitation, un organisateur qui saisit une réponse par téléphone corrompt silencieusement son plan de table, et le mot de passe de l'admin tombe en douze heures de force brute.

---

## Mes arbitrages

Trois fois, j'ai modifié la sévérité donnée par un spécialiste. Chacun voit son domaine ; l'impact réel se juge en croisant les six.

**`prisma generate` absent : BLOQUANT → MAJEUR.** Le backend a raison sur les faits — un clone frais ne compile pas, `apps/api/package.json` n'a ni `postinstall` ni `prepare`. Mais la production n'est pas touchée (`Dockerfile:24` génère le client) et il n'y a pas de CI à casser. Ce qui casse, c'est l'arrivée de tout nouveau développeur. Grave, pas bloquant.

**`PATCH /admin/households/:id` sans revérification de capacité : MAJEUR → BLOQUANT.** Le backend le classait MAJEUR, le QA BLOQUANT. Je tranche pour le QA : aucune concurrence n'est nécessaire, c'est une action d'admin parfaitement normale, la corruption est silencieuse, et la conséquence est physique — une table de 10 avec 12 personnes assises le jour même.

**Plan de table inutilisable au doigt : BLOQUANT → MAJEUR (haut).** Le designer a mesuré `touch-action: auto` là où dnd-kit exige `none` : le glissement est mort sur mobile, et aucun chemin alternatif n'existe pour assigner un foyer. Mais un organisateur compose son plan de table sur un ordinateur, où la souris fonctionne. Je le descends d'un cran — **avec cette réserve : il redevient bloquant le jour où tu travailles sur tablette.**

---

## Les bloquants — 5 après déduplication

### 1. Un foyer confirmé par l'organisateur occupe zéro siège

*Frontend BLOQUANT + backend MAJEUR-3 — deux moitiés d'un même défaut.*

L'organisateur reçoit une réponse par téléphone, ouvre le dialogue d'édition, passe le foyer de `PENDING` à `CONFIRMED`. `HouseholdFormDialog.tsx:34` a initialisé le compteur à `0`, la garde ligne 50 ne couvre que le `PENDING` sortant, et l'API ne rattrape pas : `households.service.ts:47-52` ne valide que la borne haute. Le foyer occupe alors zéro siège dans le plan de table (`tables.service.ts:64`).

Le symétrique existe côté `DECLINED` : l'admin décline un foyer, `confirmedCount` reste intact, et le dashboard compte des convives fantômes.

Le correctif `4f5574f` avait fermé le chemin `PENDING→PENDING`. Le commentaire de son propre test décrit mot pour mot la panne restée ouverte sur `PENDING→CONFIRMED`.

**Corriger des deux côtés** : l'UI ne doit pas pré-remplir `0`, et l'API doit refuser `CONFIRMED` avec `confirmedCount` nul ou absent, comme le fait déjà le chemin public (`invitation.service.ts:63-66`).

### 2. La capacité d'une table est contournable en une requête

*QA BLOQUANT, backend MAJEUR-2.*

`PATCH /admin/households/:id` laisse augmenter `allocatedSeats` d'un foyer **déjà assis** sans revérifier la table qui l'accueille. La porte symétrique avait pourtant été fermée dans `TablesService.update`. Aucun test ne couvre ce chemin.

### 3. Le mot de passe admin tombe en douze heures

*Sécurité BLOQUANT.*

Aucune limitation de débit sur `POST /auth/login`, aucun verrouillage, aucune alerte. L'auditeur a mesuré bcrypt à 40 ms par hash, soit environ 2,1 millions d'essais par jour : le top 1 M des mots de passe passe en moins de douze heures. L'`API_URL` se lit dans le bundle public et l'email de l'organisateur se devine.

Ce qu'obtient l'attaquant : `GET /admin/households` lui rend **tous les foyers avec leurs `linkId`, régimes alimentaires et messages personnels**.

### 4. Aucune défense CSRF, alors que le cookie est `SameSite=None`

*Sécurité BLOQUANT, backend PISTE.*

En production, le cookie est `SameSite=None` — nécessaire pour l'architecture Vercel + Railway, mais cela retire la protection du navigateur sans rien mettre à la place. Une page HTML statique visitée par l'organisateur connecté peut auto-soumettre des écritures vers `POST /admin/tables` : la requête est « simple » au sens CORS, donc aucune pré-vérification n'a lieu.

L'auditeur a honnêtement borné le rayon d'action : `PATCH` et `DELETE` sont hors d'atteinte (préflight correctement bloqué), et `POST /admin/households` échoue par accident de typage, pas par défense. **C'est une classe entière de protection qui manque**, et c'est à ce titre que je retiens le bloquant.

### 5. L'invitation ne dit pas à quelle heure venir

*Design BLOQUANT-1.*

`InvitationPage.tsx:36-41` rend trois lignes. `dateStyle: "long"` perd l'heure. Quatre champs saisis dans l'admin ne sont **jamais lus** : `mapUrl`, `dressCode`, `parkingInfo`, `rsvpDeadline` — plus `memberNames`.

Un invité reçoit son lien et ne sait ni à quelle heure arriver, ni comment s'y rendre, ni comment s'habiller, ni où se garer, ni jusqu'à quand répondre. Ce n'est pas un défaut esthétique, c'est le produit qui ne remplit pas sa fonction.

---

## Plan de traitement

| Lot | Contenu | Effort |
|---|---|---|
| **0 — Intégrité & sécurité** | Les 5 bloquants ci-dessus | **2 – 3 j** |
| **1 — Fiabilité produit** | États de chargement (8 mutations sans retour, double soumission = doublons de `linkId`) · confirmation avant suppression (détruit un lien déjà envoyé) · messages d'erreur en français · distinguer « lien invalide » de « serveur injoignable » · révocation à la déconnexion · `helmet` et en-têtes · limitation de débit sur `/invitation/:linkId` · transaction sur l'assignation de table | **3 – 4 j** |
| **2 — Chaîne de livraison** | `postinstall` Prisma · échec bruyant si `VITE_API_URL` manque sur Vercel · CI qui rejoue tests et build · Docker : `USER` non-root, multi-étapes réel, `.dockerignore`, `packageManager` épinglé · `lint` sans `--fix` | **1,5 – 2 j** |
| **3 — Refonte design** | Fondations (tokens, polices) → primitives (12 composants) → invitation et mise en scène → admin | **14,5 – 18 j** |
| | | **21 – 27 j** |

Le lot 3 a un ordre imposé par le designer : les fondations avant tout, les primitives et l'invitation en parallèle, l'admin en dernier.

---

## Ce qui est sain — ne pas y toucher

- **Les gardes admin**, vérifiées contrôleur par contrôleur : 13 routes, aucun trou. `invitation.controller.ts` est le seul non gardé et l'assume par commentaire.
- **`linkId` ne fuite pas.** Le calcul des voisins de table projette explicitement `displayName` et `confirmedCount`, jamais l'`id` — et un test verrouille ce comportement.
- **L'énumération des liens n'est pas réaliste** : 48 bits d'entropie mesurés, soit une soixantaine d'années à 1 000 requêtes par seconde.
- **Pas d'IDOR, pas de XSS, pas de fuite par les logs** — les trois vérifiés et documentés comme négatifs.
- **Le cookie cross-site** : `SameSite=None; Secure` en production, `Lax` en local, mêmes attributs au `clearCookie`, origine unique validée. Complet.
- **Les migrations** passent par `migrate deploy`, jamais `db push`.
- **Les commentaires des correctifs précédents** expliquent le *pourquoi* de chaque garde-fou. C'est ce qui a rendu cet audit rapide.

---

## Ce que l'audit n'a pas couvert

- **Les tests e2e n'ont jamais tourné** — `DATABASE_URL` et `JWT_SECRET` absents de l'environnement local. Les 18 tests de `admin-auth.e2e-spec.ts`, seule preuve bout-en-bout que les 13 routes admin renvoient 401, restent non exécutés. La vérification des gardes est statique et exhaustive, mais elle ne prouve pas le runtime.
- **Aucune capture d'écran** — le panneau navigateur ne compositait pas d'images. Le designer et le frontend ont compensé par des mesures `getComputedStyle` et `getBoundingClientRect` sur le DOM réel en 375 × 812, y compris sur un jeu stubbé de 40 foyers. Plus précis qu'une image pour ce qu'ils avaient à établir, mais sans preuve visuelle d'ensemble.
- **Le constat tactile sur le plan de table** est une déduction solide (propriété CSS mesurée, contrainte dnd-kit documentée), pas un essai au doigt sur un appareil réel.
- **Le Dockerfile n'a pas été construit** faute de Docker actif ; l'audit de l'image est statique.

---

## Décisions qui t'appartiennent

1. **Les prénoms des mariés et la photo n'existent nulle part** dans le schéma. Or ils sont le sujet principal de la typographie d'une invitation. Constantes de build, ou champs en base ? *Avis du designer et le mien : constantes, le produit est mono-événement par construction.*
2. **Le doré `#B08D57` échoue au contraste** — 2,92:1 sur ivoire, mesuré. Le cantonner au filet décoratif pur, ou l'assombrir vers `#8A6D3B` en lui faisant perdre son caractère patiné ?
3. **L'ordre.** Lots 0 à 2 avant la refonte, ou refonte en parallèle ? *Mon avis : le lot 0 d'abord, sans discussion. Les lots 1 et 2 peuvent avancer pendant que le designer pose les fondations.*
4. **La modale accessible** : ajouter `@radix-ui/react-dialog` (cohérent avec shadcn, `react-slot` déjà installé) ou utiliser `<dialog>` natif, sans coût de dépendance ?
