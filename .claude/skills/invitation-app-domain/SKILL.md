---
name: invitation-app-domain
description: Règles métier et invariants de l'app d'invitation de mariage (RSVP, foyers, plan de table, périmètre V1). À invoquer avant toute modification de logique métier, tout audit fonctionnel, ou dès qu'une décision dépend du comportement attendu côté invité ou côté admin.
---

# Domaine — invitation de mariage V1

Source de vérité : `docs/superpowers/specs/2026-08-19-invitation-app-design.md` et le cahier des charges PDF. Ce document en est le condensé opérationnel. **En cas de contradiction, la spec gagne** — et signale la contradiction dans ton rapport.

## Le produit en une phrase

Chaque foyer invité reçoit un lien unique. Il ouvre sa page, découvre les infos du mariage, répond (présent/absent + nombre de personnes). Les organisateurs suivent les réponses sur un dashboard et composent le plan de table, qu'ils rendent visible aux invités quand ils le décident.

## Les huit invariants

Un invariant cassé est un bug, pas une préférence.

1. **Le lien nanoid EST l'authentification invité.** Aucun mot de passe, aucun compte côté invité. Conséquence : `linkId` ne doit jamais fuiter dans une réponse d'API publique autre que celle du foyer concerné, ni dans une URL de log.
2. **La deadline RSVP ne bloque QUE le public.** `PATCH /invitation/:linkId/rsvp` renvoie `403` après `WeddingSettings.rsvpDeadline`. Les routes admin ne sont **jamais** contraintes par la date — l'organisateur saisit une réponse reçue par téléphone la veille du mariage.
3. **`confirmedCount <= allocatedSeats`.** Validé côté API (DTO + service), pas en contrainte SQL. Un foyer ne peut pas confirmer plus de personnes que de places allouées.
4. **La capacité de table est vérifiée serveur.** `PATCH /admin/households/:id/assign-table` renvoie `409` en cas de dépassement. La vérification côté UI est un confort, jamais la garantie.
5. **Les prénoms des membres du foyer sont facultatifs.** Ils ne bloquent jamais la soumission d'un RSVP. Ne jamais les rendre requis « pour la qualité de la donnée ».
6. **Le plan de table s'affiche aux invités si et seulement si `seatingPlanActivated = true`.** Bascule **manuelle** par l'admin. Aucun déclenchement automatique par date. Quand c'est `false`, l'API publique renvoie `seatingPlan: null` — elle ne renvoie pas les données en laissant le front les masquer.
7. **Un foyer a un seul `tableId`.** Par construction il ne peut pas être scindé sur deux tables ; aucune vérification supplémentaire n'est nécessaire au-delà de la capacité.
8. **Un foyer `PENDING` peut être assigné à une table.** C'est explicitement voulu (cahier des charges 4.2) : on ne bloque pas le plan de table sur les retardataires.

## Authentification admin

- Email + mot de passe (bcrypt, Passport local) **et** Google OAuth (`google-oauth20`).
- **Aucun endpoint d'inscription publique.** Le premier admin naît du seed (`prisma/seed.ts`), lisant ses identifiants dans l'environnement.
- Google : l'email doit figurer dans `ALLOWED_ADMIN_EMAILS`, sinon `403` **sans création de compte**.
- JWT en cookie httpOnly.

## Modèle de données

`Household` (id nanoid = lien, displayName, allocatedSeats, memberNames[], status, confirmedCount?, dietaryNotes?, message?, tableId?) · `Table` (name, capacity=10) · `AdminUser` (email, passwordHash?, googleId?) · `WeddingSettings` (ligne unique `id="singleton"` : date, lieu, adresse, mapUrl?, dressCode?, parkingInfo?, rsvpDeadline, seatingPlanActivated).

`RsvpStatus` = `PENDING` | `CONFIRMED` | `DECLINED`.

Piège connu : `confirmedCount` est **nullable** et doit le rester tant que le foyer est `PENDING`. Écrire `0` à la place de `null` casse la distinction « pas encore répondu » / « répond que personne ne vient ». Un commit a déjà corrigé exactement ce bug — ne le réintroduis pas.

## Hors périmètre V1 — ne pas construire

Export CSV · relance des sans-réponse · export PDF du plan · suggestion automatique de répartition · cagnotte ou paiement · liste de cadeaux · multilingue · app mobile native · multi-événements.

Si une tâche semble en exiger un, **arrête-toi et signale-le** plutôt que de l'implémenter.

## Langue

L'interface invité est en **français**, sans exception. Un message d'erreur anglais renvoyé par l'API et affiché tel quel à un invité est un défaut — il y a déjà eu ce cas sur la deadline RSVP.
