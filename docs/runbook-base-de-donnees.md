# Runbook — préparer une base de données PostgreSQL

Comment amener une base vide à l'état où l'application peut s'en servir : la créer, la migrer, l'amorcer, la vérifier. Écrit le 2026-09-15 en le faisant, contre une instance Render.

**À relire quand :** on change d'hébergeur, on remplace une base expirée, on monte un second environnement, ou on repart de zéro après une fausse manœuvre.

Les commandes existent en trois versions — **Windows (PowerShell)**, **macOS**, **Linux** — parce que c'est exactement là que ce genre de procédure se casse en silence.

---

## En bref — la séquence complète

<details>
<summary><b>Windows — PowerShell 7</b></summary>

```powershell
$env:DATABASE_URL = "<External Database URL>?sslmode=require"
pnpm --filter @invitation-app/api exec prisma migrate deploy
$env:ADMIN_SEED_EMAIL = "<adresse admin>"
$env:ADMIN_SEED_PASSWORD = "<mot de passe généré>"
pnpm --filter @invitation-app/api exec prisma db seed
Remove-Item Env:DATABASE_URL, Env:ADMIN_SEED_EMAIL, Env:ADMIN_SEED_PASSWORD
```
</details>

<details>
<summary><b>macOS et Linux — bash ou zsh</b></summary>

```bash
export DATABASE_URL="<External Database URL>?sslmode=require"
pnpm --filter @invitation-app/api exec prisma migrate deploy
export ADMIN_SEED_EMAIL="<adresse admin>"
export ADMIN_SEED_PASSWORD="<mot de passe généré>"
pnpm --filter @invitation-app/api exec prisma db seed
unset DATABASE_URL ADMIN_SEED_EMAIL ADMIN_SEED_PASSWORD
```
</details>

Le détail, et surtout les trois pièges, suivent.

---

## Ce qu'il faut sur la machine

| | Windows | macOS | Linux |
|---|---|---|---|
| Node ≥ 22.13 | `winget install OpenJS.NodeJS` | `brew install node` | via nvm ou le gestionnaire de paquets |
| pnpm 11 | `corepack enable` | `corepack enable` | `corepack enable` |
| un client `psql` *(facultatif)* | Docker suffit, voir plus bas | `brew install libpq` | `apt install postgresql-client` |

**pnpm 11 exige Node ≥ 22.13 pour se lancer.** Sur Node 20 il ne démarre pas du tout — c'est aussi la raison pour laquelle le `Dockerfile` de l'API est en `node:22-slim`.

Le client `psql` n'est nécessaire que pour les vérifications et les sauvegardes. Partout, un conteneur fait l'affaire sans rien installer :

```bash
docker run --rm postgres:16 psql "<url>" -c 'select 1;'
```

---

## 1. Créer l'instance

Deux voies, au choix.

**Par le Blueprint** — la base est décrite dans `render.yaml` à la racine, Render la crée en lisant le fichier. C'est la voie retenue ici : la configuration est versionnée, et l'API peut référencer la base par son nom (`fromDatabase`), donc aucun mot de passe ne se recopie à la main.

**À la main dans le tableau de bord** — plus rapide pour un essai. Mais il faudra alors coller l'URL interne soi-même dans les variables de l'API, et **ne pas** décrire la base dans `render.yaml`, sinon Render en créera une seconde et facturera les deux.

Trois réglages sont **immuables après création** — on ne les corrige pas, on recrée : la **région**, le nom de la base (`databaseName`), l'utilisateur, et la version majeure de PostgreSQL. La région doit être la même que celle de l'API, sinon pas de réseau privé entre les deux.

> **Le plan gratuit a une date de péremption.** Une base Render `free` devient inaccessible **30 jours** après sa création, puis Render laisse **14 jours** pour la passer en payant avant de la supprimer avec toutes ses données. Le passage en payant, lui, **conserve les données** — donc « gratuit pour la mise au point, payant avant les vraies données » est une stratégie valable, à condition de tenir la date. Le plan gratuit n'a par ailleurs **aucune sauvegarde** : aucune donnée réelle ne doit y entrer.

---

## 2. Récupérer l'URL — et la bonne

L'hébergeur en propose deux. **Les confondre est le premier piège.**

- **Internal Database URL** — ne résout que depuis un service du même hébergeur, dans la même région. Depuis un poste de travail, elle ne mène nulle part. C'est celle que l'API utilisera en production.
- **External Database URL** — traverse l'Internet public. C'est **celle-ci** pour tout ce qui suit.

### Le paramètre `?sslmode=require` n'est pas optionnel

**À ajouter à la fin de l'URL externe**, toujours.

Sans lui, `prisma db seed` — et tout ce qui passe par le client Prisma — échoue ainsi :

```
PrismaClientKnownRequestError:
  code: 'P1010'
  User was denied access on the database `(not available)`
  driverAdapterError: DriverAdapterError: DatabaseAccessDenied
```

Le message accuse les droits d'accès. **La cause est le chiffrement.** `node-postgres` — qui est le pilote derrière `@prisma/adapter-pg`, donc derrière `PrismaService` comme derrière `seed.ts` — n'active TLS que si la chaîne de connexion porte un paramètre `ssl*` :

```js
// pg-connection-string/index.js:77
if (config.sslcert || config.sslkey || config.sslrootcert || config.sslmode) {
  config.ssl = {}
}
```

Or Render refuse les connexions externes en clair, et un refus de ce type renvoie le code SQL `28000`, que Prisma traduit par `P1010`.

**Ce qui rend le diagnostic déroutant :** le moteur du CLI Prisma et `libpq` (`psql`, `pg_dump`) négocient TLS d'eux-mêmes. Donc `prisma migrate deploy` **réussit** et `prisma db seed` **échoue**, sur exactement la même URL. Constaté le 2026-09-15.

Ce paramètre est inutile ailleurs : en production l'API passe par l'URL interne, où le texte clair est admis, et le Postgres local du `docker-compose` ne fait pas de TLS du tout.

---

## 3. Poser l'URL dans le shell

**Ne jamais l'écrire dans un fichier.** `apps/api/.env` est ignoré par git, mais une URL de production qui y dort finit par partir quelque part.

<table>
<tr><th>Windows — PowerShell</th><th>macOS et Linux — bash, zsh</th></tr>
<tr><td>

```powershell
$env:DATABASE_URL = "postgresql://...?sslmode=require"
```

</td><td>

```bash
export DATABASE_URL="postgresql://...?sslmode=require"
```

</td></tr>
</table>

**Sur macOS et Linux, une variante plus propre :** le préfixe en ligne ne vaut que pour une commande, et rien ne subsiste après.

```bash
DATABASE_URL="postgresql://...?sslmode=require" pnpm --filter @invitation-app/api exec prisma migrate deploy
```

**PowerShell n'a pas d'équivalent** — `VAR=x commande` y est une erreur de syntaxe. Sous Windows on pose la variable, puis on la retire (§ 7).

> **L'URL contient un mot de passe, et elle atterrit dans l'historique du shell.**
> Sur macOS et Linux, une **espace en début de ligne** évite l'enregistrement si `HISTCONTROL=ignorespace` (bash) ou l'option `HIST_IGNORE_SPACE` (zsh) est active — ce n'est pas le défaut partout, à vérifier avant de compter dessus.
> Sur Windows, PSReadLine écrit l'historique dans `$env:APPDATA\Microsoft\Windows\PowerShell\PSReadLine\ConsoleHost_history.txt`. Pour une session sensible : `Set-PSReadLineOption -HistorySaveStyle SaveNothing`.
> Dans tous les cas : si l'URL a fuité quelque part, la vraie réponse est de **faire tourner le mot de passe** chez l'hébergeur, pas de nettoyer un fichier d'historique.

### Le `.env` local ne détournera pas la commande

`apps/api/prisma.config.ts` fait `import "dotenv/config"`, et `apps/api/.env` contient l'URL de développement. **Sans effet : dotenv n'écrase jamais une variable déjà posée dans le shell.** Vérifié :

```
après dotenv, DATABASE_URL = postgresql://sentinelle:x@sentinelle.invalid:5432/sentinelle
```

Ça n'interdit pas de contrôler, voir juste en dessous.

---

## 4. Appliquer les migrations

Identique sur les trois systèmes :

```bash
pnpm --filter @invitation-app/api exec prisma migrate deploy
```

### La ligne à lire avant de se réjouir

```
Datasource "db": PostgreSQL database "invitation_app", schema "public" at "....render.com:5432"
```

**C'est la seule preuve qu'on a migré la bonne base.** Si l'hôte dit `localhost`, la variable n'a pas été prise et c'est la base de développement qui vient d'être touchée. Arrêter, reposer la variable, recommencer.

En cas de succès :

```
1 migration found in prisma/migrations
Applying migration `20260819145910_init`
All migrations have been successfully applied.
```

> **`migrate deploy`, jamais `migrate dev`.**
> `deploy` applique les migrations en attente, rien d'autre, et il est idempotent — le relancer ne fait rien.
> `dev` est un outil de développement : s'il détecte une dérive entre le schéma et la base, **il propose de réinitialiser la base**, c'est-à-dire de tout effacer. Contre une base qui contient les réponses des invités, c'est irréversible.
> C'est pour cette raison que `apps/api/Dockerfile:34` lance `migrate deploy` au démarrage du conteneur.

---

## 5. Amorcer — et ce n'est pas optionnel

Une base migrée est **vide**. Or `apps/api/src/invitation/invitation.service.ts:26` lit les réglages du mariage avec `findUniqueOrThrow` : sans la ligne unique de `WeddingSettings`, **chaque lien d'invitation renvoie une erreur**. `prisma/seed.ts` crée cette ligne, et le compte administrateur avec.

### Générer le mot de passe administrateur

<table>
<tr><th>Windows — PowerShell</th><th>macOS et Linux</th></tr>
<tr><td>

```powershell
$b = [byte[]]::new(18)
[System.Security.Cryptography.RandomNumberGenerator]::Fill($b)
[Convert]::ToBase64String($b)
```

</td><td>

```bash
openssl rand -base64 18
```

</td></tr>
</table>

Sous Windows, ne pas utiliser `Get-Random` : ce n'est pas un générateur cryptographique.

**Ne jamais réutiliser `admin@invitation-app.local` / `motdepasse-de-dev`** : ces identifiants de démonstration sont écrits en clair dans `CLAUDE.md`, donc publics de fait.

### Lancer l'amorçage

<table>
<tr><th>Windows</th><th>macOS et Linux</th></tr>
<tr><td>

```powershell
$env:ADMIN_SEED_EMAIL = "<adresse>"
$env:ADMIN_SEED_PASSWORD = "<mot de passe>"
pnpm --filter @invitation-app/api exec prisma db seed
```

</td><td>

```bash
export ADMIN_SEED_EMAIL="<adresse>"
export ADMIN_SEED_PASSWORD="<mot de passe>"
pnpm --filter @invitation-app/api exec prisma db seed
```

</td></tr>
</table>

Attendu :

```
Seeded admin user: <adresse>
Seeded default WeddingSettings
```

> **Le mot de passe se choisit une fois.** `prisma/seed.ts:17-21` fait un `upsert` avec `update: {}` : si le compte existe déjà, **relancer l'amorçage ne change rien** — ni le mot de passe, ni rien d'autre. Le modifier plus tard demande une requête SQL, pas une commande. Poser tout de suite celui qu'on garde.

Si les deux variables sont absentes, le seed le dit et passe son chemin (`ADMIN_SEED_EMAIL/ADMIN_SEED_PASSWORD not set, skipping admin seed`) : la ligne `WeddingSettings` est créée quand même, mais **aucun compte n'existera pour se connecter**.

---

## 6. Vérifier

Partout, via Docker si `psql` n'est pas installé :

```bash
docker run --rm postgres:16 psql "$DATABASE_URL" -c '\dt'
```

Sous PowerShell, la variable s'écrit différemment :

```powershell
docker run --rm postgres:16 psql "$env:DATABASE_URL" -c '\dt'
```

Attendu : `AdminUser`, `Household`, `Table`, `WeddingSettings`, `_prisma_migrations`.

Puis le contenu qui compte :

```bash
docker run --rm postgres:16 psql "$DATABASE_URL" -c 'select id, "weddingDate", "rsvpDeadline" from "WeddingSettings";'
docker run --rm postgres:16 psql "$DATABASE_URL" -c 'select email from "AdminUser";'
```

Attendu : une ligne `singleton` portant `2027-01-02 06:00:00+00` et `2026-12-01 20:59:59+00` ; une ligne avec l'adresse réelle, et **aucune** trace de `admin@invitation-app.local`.

> **Les guillemets doubles autour des noms sont obligatoires** : Prisma ne pose aucun `@@map` sur ce schéma, donc les tables et colonnes gardent leur casse (`"WeddingSettings"`, `"weddingDate"`). Sans eux, PostgreSQL passe tout en minuscules et ne trouve rien.
> Et **entourer le SQL de guillemets simples** : sur les trois plateformes, c'est ce qui transmet les guillemets doubles intacts au programme.

---

## 7. Nettoyer le shell

<table>
<tr><th>Windows</th><th>macOS et Linux</th></tr>
<tr><td>

```powershell
Remove-Item Env:DATABASE_URL, Env:ADMIN_SEED_EMAIL, Env:ADMIN_SEED_PASSWORD
```

</td><td>

```bash
unset DATABASE_URL ADMIN_SEED_EMAIL ADMIN_SEED_PASSWORD
```

</td></tr>
</table>

---

## 8. La sauvegarde, une fois qu'il y a des données

Les réponses des invités ne se redemandent pas. L'hébergeur sauvegarde peut-être — pas sur un plan gratuit — mais un problème de compte emporterait la base et ses sauvegardes en même temps. **Il faut une copie ailleurs.**

<table>
<tr><th>Windows</th><th>macOS et Linux</th></tr>
<tr><td>

```powershell
docker run --rm -v "${PWD}/.db-backups:/out" postgres:16 `
  pg_dump "$env:DATABASE_URL" `
  -f "/out/$(Get-Date -Format yyyy-MM-dd)-production.sql"
```

</td><td>

```bash
docker run --rm -v "$(pwd)/.db-backups:/out" postgres:16 \
  pg_dump "$DATABASE_URL" \
  -f "/out/$(date +%F)-production.sql"
```

</td></tr>
</table>

`pg_dump` négocie TLS tout seul : `?sslmode=require` n'est pas nécessaire ici, mais ne gêne pas.

`.db-backups/` est ignoré par git, et doit le rester. **Copier le fichier hors de la machine et hors de l'hébergeur** — Drive, disque externe. Une sauvegarde qui vit chez le même fournisseur que la base ne protège que de la moitié des accidents.

---

## 9. Restreindre l'accès réseau

Sans `ipAllowList`, une base Render accepte une connexion depuis **n'importe quelle adresse du monde**, pourvu qu'elle ait les identifiants. C'est le défaut.

C'est tenable tant que la base est un bac à sable vide. Ça cesse de l'être dès qu'elle contient la liste réelle des invités — noms, numéros de téléphone, qui vient et qui ne vient pas. Dans `render.yaml` :

```yaml
    ipAllowList:
      - source: <IP publique>/32
        description: migrations, amorçage et sauvegardes
```

La liste ne concerne que l'accès **externe** : l'API, qui joint la base par le réseau privé, n'est pas affectée. Mais une IP résidentielle change — il faudra la remettre à jour, ou y inscrire la plage du fournisseur d'accès.

Relever son IP publique :

```bash
curl -s https://api.ipify.org     # macOS, Linux
```
```powershell
curl.exe -s https://api.ipify.org  # Windows — `curl` seul est un alias
                                   # de Invoke-WebRequest, qui ne comprend pas -s
```

---

## Les cinq pièges, en une page

| # | Le piège | Le signe | La parade |
|---|---|---|---|
| 1 | URL interne au lieu d'externe | la connexion n'aboutit jamais depuis le poste | prendre l'**External** pour tout travail local |
| 2 | `?sslmode=require` oublié | `P1010 — User was denied access`, alors que `migrate deploy` passait | l'ajouter systématiquement à l'URL externe |
| 3 | on migre la base locale sans le voir | rien — ça réussit | **lire la ligne `Datasource "db": … at "<hôte>"`** |
| 4 | `migrate dev` au lieu de `deploy` | proposition de réinitialiser la base | ne jamais lancer `dev` contre autre chose que le développement |
| 5 | amorçage sauté | chaque lien d'invitation renvoie une erreur | `prisma db seed`, puis vérifier `WeddingSettings` |

---

## Voir aussi

- `docs/superpowers/plans/2026-09-15-mise-en-ligne-render.md` — la mise en ligne complète : base, API, front, domaine.
- `docs/audit/2026-09-11-plan-de-mise-en-ligne.md` — le choix de l'hébergeur, le budget, la stratégie de sauvegarde.
- `apps/api/.env.example` — toutes les variables, et ce qui est requis en production.
