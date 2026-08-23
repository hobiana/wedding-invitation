# État LOT 0 — frontend (fichier de reprise)

Branche `fix/lot-0-bloquants`. **Rien n'est commité** (consigne de l'architecte).
Dernière mise à jour : bloquant 1 terminé, bloquant 2 non commencé.

## 1. Avancement des deux bloquants

| Bloquant | État |
|---|---|
| **1. `confirmedCount = 0` sur PENDING → CONFIRMED** (`HouseholdFormDialog`) | **TERMINÉ ET VERT.** 6 tests écrits, vus rouges, correction faite, tous verts. Suite complète : **50/50**. |
| **2. Champs jamais rendus sur l'invitation** (`InvitationPage`) | **NON COMMENCÉ.** Aucun test écrit, aucune ligne de production touchée. |

Cycle TDD du bloquant 1, effectivement déroulé :
1. 6 tests ajoutés → `Tests 6 failed | 44 passed (50)`. La 4e assertion imprimait le bug mot pour mot : `{status: "CONFIRMED", confirmedCount: 0}`.
2. Correction → `Tests 50 passed (50)`.

## 2. Fichiers

Modifiés (bloquant 1) :
- `apps/web/src/components/HouseholdFormDialog.tsx`
- `apps/web/src/components/HouseholdFormDialog.test.tsx`

À modifier (bloquant 2, rien de fait) :
- `apps/web/src/pages/InvitationPage.tsx` — rendre l'heure, `mapUrl`, `dressCode`, `parkingInfo`, `rsvpDeadline`, `memberNames`
- `apps/web/src/pages/InvitationPage.test.tsx` — l'helper `invitation()` ne sait pas encore surcharger l'objet `wedding`, c'est le premier geste à faire

Ce fichier-ci. Aucun autre. `apps/api`, `packages/shared` et `index.css` non touchés.

## 3. Décisions non devinables à la lecture du diff

- **L'état `confirmedCount` est passé de `number` à `number | null`**, initialisé à `initial?.confirmedCount ?? null`. C'est le cœur du correctif : le `?? 0` transformait « pas de réponse » en « zéro personne ».
- **Le champ compteur ne s'affiche plus que pour `CONFIRMED`** (avant : tout sauf `DECLINED`). Motif : pour un foyer `PENDING`, le champ était éditable mais sa valeur était jetée au submit — une saisie silencieusement perdue. `DECLINED` vaut toujours 0, `PENDING` n'a pas de compteur.
- **Pas de garde JS sur la borne haute** (`confirmedCount <= allocatedSeats`). Tentée, puis retirée : `max={allocatedSeats}` déclenche la validation native, qui bloque le submit **avant** le handler. Le code était inatteignable. Le test correspondant a été conservé mais reformulé pour documenter la garantie native et empêcher qu'on retire `max`.
- **`PENDING` continue d'omettre le champ** au lieu d'envoyer `null`. L'architecte demande « PENDING remet à `null` » : **impossible côté web seul**, `UpdateHouseholdDto.confirmedCount` est typé `number | undefined` dans `packages/shared`, hors de mon périmètre. Conséquence restante à arbitrer : un foyer `CONFIRMED 3` repassé en `PENDING` garde `3` en base. À traiter avec l'agent backend en rendant le champ nullable dans le type partagé.
- Message d'erreur en français, `role="alert"`, `aria-invalid` et `aria-describedby` sur le champ : l'information n'est pas portée par la seule couleur.

## 4. Reprendre

```
pnpm --filter @invitation-app/web test -- --run     # 50 passed (50) à l'instant où j'écris
pnpm --filter @invitation-app/web build             # pas encore relancé depuis la correction
```

Point de départ du bloquant 2 : écrire d'abord les tests rouges dans `InvitationPage.test.tsx`
(heure visible, deadline visible avant réponse, rubriques optionnelles absentes non rendues,
`memberNames` listés), les voir échouer, puis seulement toucher `InvitationPage.tsx`.

## 5. Pièges déjà payés

- **Validation native jsdom.** `fireEvent.click` sur le bouton submit ne déclenche **pas** le handler si un champ viole `min`/`max`/`required`. Un test qui attend un message d'erreur applicatif dans ce cas échouera avec « Unable to find role alert » alors que la logique est correcte. Ne pas écrire de garde JS derrière un attribut natif.
- **Narrowing TypeScript.** `...(status === "CONFIRMED" && { confirmedCount })` ne compile pas : au point de jonction le type redevient `number | null` alors que le DTO attend `number`. Il faut sortir par un `onSubmit(...); return;` à l'intérieur de la branche.
- **`toLocaleDateString` refuse `timeStyle`** (TypeError). Pour afficher date + heure, c'est `toLocaleString`. C'est exactement le piège qui a produit le bloquant 2.
- **Fuseau horaire dans les tests.** Aucun `TZ` n'est fixé par la config Vitest : ne pas asserter une heure en dur, utiliser une regex (`/12 juin 2027.+\d{1,2}:\d{2}/`) et une date UTC en milieu de journée.
