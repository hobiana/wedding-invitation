---
name: audit-protocol
description: Grille commune d'audit technique — échelle de sévérité, format de constat, règles de preuve, destination du rapport. À invoquer avant de commencer un audit de code, de sécurité, de tests, d'infrastructure ou de design, et avant de rédiger un rapport de constats.
---

# Protocole d'audit

Cinq spécialistes auditent en parallèle. L'architecte consolide. Si chacun rapporte à sa façon, rien n'est comparable et rien n'est priorisable. D'où ce format unique.

## Règle numéro un : lecture seule

Pendant un audit, tu **ne modifies aucun fichier applicatif**. Pas de « je corrige au passage, c'est trivial ». Tu écris exactement un fichier : ton rapport. Les corrections viennent après arbitrage humain.

Tu peux exécuter des commandes de lecture et de vérification : tests, typecheck, lint, build, `git log`, requêtes de lecture. Rien qui écrive dans le dépôt.

## Règle numéro deux : la preuve avant l'affirmation

Un constat sans preuve est une opinion. Chaque constat cite **`chemin/fichier.ts:ligne`** et montre soit l'extrait de code fautif, soit la sortie de commande qui le démontre.

Interdit : « les tests semblent insuffisants », « il pourrait y avoir un problème de performance », « ce n'est pas une bonne pratique ». Autorisé : « `tables.service.ts:78` lit la capacité avant la transaction et l'écrit après ; deux assignations concurrentes dépassent la capacité — voici le scénario exact ».

Si tu soupçonnes sans pouvoir prouver, classe en **Piste** (voir plus bas) et dis franchement ce qu'il faudrait pour trancher.

## Échelle de sévérité

| Niveau | Définition | Exemples |
|---|---|---|
| **BLOQUANT** | Exploitable, corrompt des données, ou empêche la mise en production. Se corrige avant tout le reste. | Route admin non protégée, secret en dur, invariant métier contournable, build cassé |
| **MAJEUR** | Bug réel visible par un utilisateur, ou dette qui coûtera cher très vite. | Message d'erreur anglais affiché à un invité, état de chargement absent sur une mutation, race condition improbable mais réelle |
| **MINEUR** | Défaut de qualité sans impact utilisateur immédiat. | Duplication, nommage incohérent, `any` évitable, test qui teste l'implémentation |
| **PISTE** | Soupçon non prouvé, ou amélioration qui mérite discussion. | « la stratégie de cache TanStack Query mériterait un examen », choix d'architecture discutable |

Sois avare de BLOQUANT. Tout classer en bloquant revient à ne rien prioriser.

## Format d'un constat

```markdown
### [BLOQUANT] Titre court et factuel

**Où :** `apps/api/src/tables/tables.service.ts:78-92`

**Constat :** ce qui est vrai dans le code, sans interprétation.

**Preuve :**
```ts
// extrait, ou sortie de commande
```

**Impact :** ce qui casse concrètement, pour qui, dans quelles conditions.

**Correction proposée :** en deux ou trois phrases. Pas de code complet — l'implémentation viendra après arbitrage.

**Effort :** S (moins d'une heure) · M (une demi-journée) · L (au-delà)
```

## Structure du rapport

Fichier : `docs/audit/2026-08-22-<domaine>.md` où `<domaine>` ∈ {`backend`, `frontend`, `design`, `devops`, `qa`}.

```markdown
# Audit <domaine> — 2026-08-22

**Périmètre audité :** les chemins et fichiers réellement lus.
**Méthode :** commandes lancées, ce que tu as vérifié à la main.
**Non couvert :** ce que tu n'as pas pu examiner, et pourquoi. Sois honnête ici.

## Synthèse
Trois à cinq phrases. L'état réel du domaine. Un architecte doit pouvoir décider en lisant ce seul paragraphe.

## Décompte
| Sévérité | Nombre |
|---|---|
| BLOQUANT | n |
| MAJEUR | n |
| MINEUR | n |
| PISTE | n |

## Constats
(par sévérité décroissante, format ci-dessus)

## Ce qui est bien fait
Deux ou trois points. Ce n'est pas de la politesse : l'architecte doit savoir ce qui ne mérite pas d'être touché.
```

## Honnêteté

Si tu n'as pas pu lancer les tests, écris-le. Si un module n'a pas été lu, écris-le. Un audit qui prétend à une couverture qu'il n'a pas est pire qu'un audit partiel assumé — il crée une fausse confiance.

Ne gonfle pas le nombre de constats. Cinq vrais problèmes valent mieux que trente remarques cosmétiques qui noient les cinq.
