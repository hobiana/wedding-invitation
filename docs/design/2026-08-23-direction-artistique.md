# Direction artistique — invitation de mariage

> **AVERTISSEMENT — ce document a été dépassé le 2026-09-10.** Le commanditaire
> a produit son propre design (`images/html/`) et demandé qu'on le reprenne.
> Ce qui suit garde sa valeur de raisonnement, mais plus d'autorité :
>
> - **La date n'est plus le 12 juin 2027 mais le samedi 2 janvier 2027.** Toutes
>   les occurrences de juin ci-dessous sont fausses.
> - **Les typographies ont changé** : Cormorant Garamond, Jost et Parisienne
>   remplacent Marcellus et Source Sans 3.
> - **L'ornement malgache est retiré** — plus de `HemMotif`, plus de filet
>   lamba. Le design ornemente à l'aquarelle de roses, et c'est le choix retenu,
>   à rebours de la piste ouverte au §1.5.
> - **L'or de ce document est périmé** depuis plus longtemps encore : les §1.5.d
>   et §3.2 donnent `#B08D57` (2,92:1), arbitré le 2026-08-22 en faveur de
>   **`#AC784C`** (3,58:1), relevé sur le faire-part papier.
>
> **`apps/web/src/index.css` fait foi**, et `docs/audit/REPRISE.md` dit l'état
> réel du projet.

**Date :** 2026-08-23 · **Lot 3, tâche 1** · **Statut :** proposition, en attente d'arbitrage
**Périmètre :** `apps/web` — page publique `/i/:linkId` et back-office `/admin/*`
**Ce document ne modifie aucun fichier.** Il spécifie. L'intégration est faite par `frontend-react`.

> ### RÉVISION 2 — 2026-08-23, après réception des références et des photos du commanditaire
>
> Le document a d'abord été rédigé **sans** les références ni les photos. Elles sont arrivées ensuite, dans `images/`, et elles **changent trois choses**. Ce bloc les consigne en premier, en cas d'interruption. Les sections concernées plus bas sont mises à jour ; **là où subsiste une divergence, ce bloc fait foi.**
>
> **1. La palette est validée par mesure sur les références du commanditaire — elle ne bouge pas.**
> J'ai échantillonné ses deux photos de faire-part. Les écarts avec les jetons provisoires sont dérisoires :
>
> | Objet mesuré dans sa référence | Relevé | Notre jeton | Écart |
> |---|---|---|---|
> | Velours de la pochette (réf. 2) | `#3E0A17` — H345 S72 L14 | `--color-bordeaux-900 #3E1220` — H341 S55 L16 | 2 pts de valeur |
> | Rabat de la pochette (réf. 1) | `#74222D` — H352 S55 L29 | `--color-bordeaux-700 #6E1F35` — H343 S56 L28 | 1 pt de valeur, saturation identique |
> | Carte ivoire (réf. 1) | `#FCFBF9` | `--color-ivory #FBF8F4` | ΔR 1 ΔG 3 ΔB 5 |
> | Script doré (réf. 2) | `#AC784C` — H27 S39 L49 | `--color-gold #B08D57` — H36 S36 L52 | 9° de teinte |
>
> **Et le rouge de leurs broderies est notre bordeaux.** Relevé sur le `lamba` : `#8B011B` — **H 349° S 99 % L 27 %**. Notre `bordeaux-700 #6E1F35` : **H 343° S 56 % L 28 %**. *Même teinte, même valeur, deux fois moins de saturation.* Ce n'est pas une coïncidence heureuse à raconter : c'est la garantie chiffrée que la photo ne se battra pas avec la page. `#8B011B` sur ivoire mesure 9,37:1, notre bordeaux 10,38:1.
>
> **2. L'enveloppe C6 à rabat est remplacée par une POCHETTE À ENCOCHE (réf. 2).** Décision structurante, détaillée au §8 réécrit. En une phrase : une pochette portrait dont la carte **monte** par une encoche en demi-lune. Cela supprime `rotateX`, `perspective`, `preserve-3d`, `backface-visibility`, le scintillement à 180° et la re-rastérisation WebKit — **toute la classe de risque 3D disparaît**, il ne reste que des `translateY`. Et le geste est vertical, comme le pouce et comme le défilement qui suit.
>
> **3. Les broderies malgaches sont exploitables — oui, et mieux que je ne l'espérais.** Voir §1.5. En résumé : le motif d'ourlet est **déjà un trait d'épaisseur constante**, donc il se transpose en SVG sans rien perdre ; les rayures du `lamba` sont de la géométrie pure et pèsent zéro octet. Les aquarelles de roses de la référence roumaine sont abandonnées.
>
> **État d'avancement au moment de la révision 2 :** §1 à §7 et §9 à §12 sont à jour et complets. Le §8 (chorégraphie) est **réécrit ci-dessous en version pochette** ; l'ancienne version enveloppe est conservée en annexe B comme trace du raisonnement. Le §10 (photos) est réécrit. Les arbitrages 9 à 12 sont ajoutés au §12.

---

## 0. Ce que j'ai regardé avant de proposer

L'app tourne (API 3000, web 5173), la base porte 40 foyers et 6 tables avec tous les champs optionnels remplis. Mesures relevées sur `/i/:linkId` à 375 × 812 :

| Mesure | Valeur relevée | Commentaire |
|---|---|---|
| Hauteur du document | 882 px | 1,09 écran — la page tient presque dans un écran |
| Largeur de contenu | 375 px | aucune gouttière, le texte touche les bords |
| Fond de `html` et `body` | `rgba(0,0,0,0)` | rien n'est peint, on hérite du blanc navigateur |
| `color-scheme` | `normal` | non déclaré → exposé à l'inversion auto de Chrome Android |
| `lang` | `en` | sur une interface intégralement française |
| `<title>` | `web` | et aucun `theme-color`, aucun aperçu de lien |
| `h1` | 24 px / 32 px, `rgb(0,0,0)`, pile système | noir pur, sans-serif système |

Charge utile de l'API pour un foyer : `displayName`, `memberNames[]`, `allocatedSeats`, `status`, `confirmedCount`, `dietaryNotes`, `message` · côté mariage : `weddingDate`, `venueName`, `address`, `mapUrl`, `dressCode`, `parkingInfo`, `rsvpDeadline`, `seatingPlanActivated`.

Deux champs sont **payés par l'organisateur et jamais montrés à l'invité** :

- **`allocatedSeats`** — c'est pourtant la première question de tout invité (« on peut venir à combien ? »). Aujourd'hui il n'existe que comme `max` silencieux sur le champ nombre : l'invité découvre la limite en se cognant dedans. La composition ci-dessous l'affiche en clair.
- **`message`** — présent dans la charge utile publique, jamais rendu. Voir §11, arbitrage n° 5.

---

## 1. La recherche

Le commanditaire l'a demandée. Voici ce que j'ai regardé et ce que j'en retire — des principes, pas une maquette. Aucun de ces sites n'est recopié.

### 1.1 Les deux produits qui ont industrialisé l'enveloppe numérique

**Paperless Post.** Le geste central n'est pas l'animation : c'est **le nom du destinataire écrit sur l'enveloppe**. La documentation du produit et les revues insistent toutes sur le même point — l'invité ouvre le lien et voit son propre nom sur un rabat fermé, puis la carte sort. L'effet rapporté est comportemental : l'invitation est traitée comme du courrier, pas comme une notification d'agenda. Le produit vend ensuite des enveloppes, des **doublures** (le papier imprimé de l'intérieur), des timbres et des fonds.

> **Ce que j'en retiens.** Le levier n'est pas la rotation 3D, c'est l'adressage nominatif. Nous avons `household.displayName` — « Famille Raveloson ». Il doit être sur le rabat, et il doit être **la première ligne de la page** une fois l'enveloppe partie. C'est la seule information de la page qui soit unique à ce lien ; c'est elle qui transforme une page web en courrier.
> **Ce que je ne reprends pas :** l'inventaire d'options (timbres, fonds, doublures à motifs). C'est un catalogue de e-commerce, pas une identité. Nous avons un mariage, un couple, une enveloppe.

**Greenvelope.** Même mécanique — l'enveloppe s'ouvre, la carte glisse, la doublure personnalisée apparaît — plus **une musique de fond**. Un point technique remonte dans les retours utilisateurs : *l'animation ne tourne pas aussi bien sur iOS Safari que sur Chrome desktop*.

> **Ce que j'en retiens.** Deux choses.
> 1. **La musique est rejetée sans discussion.** Un son qui démarre seul sur un téléphone est hostile, et de toute façon bloqué par les politiques d'autoplay ; on ajouterait une dépendance et un bouton « couper le son » pour un résultat que la moitié des invités n'entendra jamais.
> 2. **Le symptôme iOS a une cause identifiable** : une carte qui porte du texte et qui subit une rotation 3D est re-rastérisée à chaque image sur WebKit. C'est exactement ce que la règle n° 3 du design system interdit d'ignorer. Conséquence directe sur ma chorégraphie (§8) : **le rabat tourne, la carte ne tourne jamais** — elle translate.

### 1.2 Les tutoriels CSS d'enveloppe, et ce qu'ils omettent

J'ai lu la mise en œuvre décrite par **Saahil Jaffer** (« How I Designed a Digital Invitation That Opens Like a Real Card »), la plus détaillée techniquement de celles trouvées : trois temps — le rabat s'ouvre, la carte sort, la carte pivote — avec `rotateX` de 180° à 0° en trois paliers (120°, 60°), `transform-origin: center top`, `transformStyle: 'flat'`, et un empilement de `z-index`. Les tutoriels type CodePen (`MrBlank/JjXxovL`, `robsonsilva/OWeNRL`) reposent sur le même squelette : `.top-part` en rabat, faces gauche/droite détourées pour simuler le volume.

> **Ce que j'en retiens.** Le squelette DOM est juste et je le reprends : un panneau arrière, une carte, un panneau avant opaque qui sert de poche, un rabat à deux faces. **Ce que tous omettent est exactement ce qui compte ici** : aucune durée, aucun easing, aucun `prefers-reduced-motion`, aucun garde-fou si l'animation ne se déclenche pas, aucune sortie possible. Ce sont des démonstrations, pas des produits. La partie du travail qui a de la valeur est celle qu'ils ne font pas — et c'est le §8.
> **Ce que je rejette explicitement :** la rotation de la carte (cause du symptôme iOS), et le `rotateX` jusqu'à 180° pile (à 180° le rabat devient coplanaire avec le dos de l'enveloppe et produit un scintillement de tri de profondeur sur WebKit).
> **Note de révision 2 :** ce paragraphe et le précédent décrivent l'état de mon raisonnement avant réception des références du commanditaire. La version retenue (§8) est une **pochette à encoche** : elle n'a plus de rabat du tout, donc plus de `rotateX`, plus de coplanarité, plus de re-rastérisation. Le raisonnement ci-dessus reste consigné parce qu'il explique **pourquoi** le mécanisme sans 3D a été préféré dès qu'il a été proposé.

### 1.3 Les palettes bordeaux / ivoire de la papeterie imprimée

Recherche sur les suites d'invitation letterpress et dorure. Les valeurs qui reviennent gravitent autour de `#722F37`–`#6D2B3D` pour le bordeaux, `#F5F0E8` pour l'ivoire, `#C9A55A` pour l'or chaud. Le procédé décrit — encre bordeaux pressée dans un carton coton ivoire de 600 g, dorure à chaud en accent — donne deux enseignements de composition :

1. **L'ivoire est le support, le bordeaux est l'encre.** Jamais l'inverse. Sur les suites haut de gamme, les aplats bordeaux pleine page sont rares et courts : un dos de carte, une bande, une doublure d'enveloppe. Le corps de l'invitation est de l'encre sur du papier clair.
2. **La dorure ne porte jamais de texte courant.** Elle sert le filet, le monogramme, la bordure. Sur papier, une dorure sur ivoire est lisible parce qu'elle **réfléchit** ; sur écran elle ne réfléchit rien, et c'est précisément pourquoi notre or mesure 2,92:1. La contrainte physique explique la contrainte numérique : on ne peut pas transposer la dorure telle quelle, on ne peut transposer que son **rôle**.

> **Ce que j'en retiens et que j'applique.** Notre bordeaux `#6E1F35` est plus profond que le `#722F37` du marché (il tient 10,38:1 sur ivoire contre ~8,9:1) : je le garde tel quel, c'est un avantage d'accessibilité offert. L'or reste au filet — le §2 le confirme chiffre en main. Et la doublure bordeaux glimpsée à l'intérieur de l'enveloppe, motif de papeterie classique, devient le seul endroit où l'or est réellement lumineux (5,18:1 sur bordeaux 900).

> **Ce que je refuse dans ce corpus :** la floraison. Toutes les suites « burgundy & gold » vendues en ligne sont couvertes d'aquarelles florales et de scripts. C'est le « générique mariée » que le brief écarte. On garde le procédé (encre profonde, papier chaud, un filet doré) et on jette l'illustration.

### 1.4 La question que j'avais laissée ouverte à l'audit

*« Comment la papeterie haut de gamme gère-t-elle le rapport entre le nom des mariés et l'information pratique ? »*

Réponse observée, constante sur les suites imprimées : **par la séparation physique**. Le carton principal porte les noms, la date, le lieu — centrés, aérés, presque rien d'autre. Les informations pratiques (accès, tenue, hébergement, parking) sont sur un **carton séparé, plus petit, composé en fer à gauche**, souvent dans un corps plus petit et une graisse différente.

> **Ce que j'en retiens, et c'est la décision de composition la plus structurante du document :** la page reproduit cette séparation par **l'alignement**. Le héros est **centré** — c'est le carton de cérémonie. Tout ce qui suit est **aligné à gauche** — ce sont les cartons d'information. Le basculement d'axe fait à lui seul le travail que des ornements feraient mal. Aucune ligne décorative n'est nécessaire pour dire « on change de registre ».

### 1.5 Les références du commanditaire, et ses photos

Ajouté en révision 2. J'ai ouvert les six fichiers de `images/`, échantillonné les couleurs au pixel et recadré les détails pour les regarder de près.

#### a) `WhatsApp…09.34.56.jpeg` — la pochette à trois volets

Ce que je vois : une pochette bordeaux mat à rabat triangulaire, fermée par un **cachet de cire doré** embossé, ouverte sur deux panneaux ivoire. Sur le volet gauche, les prénoms en script doré, encadrés en haut-gauche et bas-droite par des **aquarelles florales** (roses bordeaux, roses poudrées, eucalyptus). Sur le volet droit, le texte, entouré d'un **cadre heptagonal en filet doré fin**. Une carte de remerciement assortie, plus petite, avec les mêmes coins fleuris.

Relevés : bordeaux du rabat `#74222D`, bordeaux du haut `#5B1014`, carte `#FCFBF9`, cachet de cire `#A25421`.

> **Ce que je prends.** Le **cachet de cire** — ma « pastille dorée » du §8 était déjà à cet endroit, elle est maintenant justifiée par sa propre référence. Et le rapport de matières : bordeaux mat profond contre ivoire vif, qui est ce qu'on ressent en tenant l'objet et qui est parfaitement « épuré ».
> **Ce que je laisse.** Les **aquarelles florales** : ce sont des roses de banque d'images sur un modèle du commerce roumain, elles ne racontent rien d'eux. Le **cadre heptagonal** : un cadre géométrique fermé est un dispositif d'imprimé, il suppose un format de coupe fixe ; sur une page fluide de 320 à 1440 px, il rogne le texte ou l'écrase à chaque point de rupture. C'est un piège de mise en page, pas un ornement.
> **Le problème que ça pose.** Les prénoms y sont **en doré**. C'est de la dorure à chaud : elle est lisible parce qu'elle *réfléchit*. Un écran ne réfléchit rien, notre or mesure 2,92:1, et la règle arrêtée tient. Voir §1.5.d pour l'équivalent écran que je propose.

#### b) `WhatsApp…09.34.56 (1).jpeg` — la pochette de velours à encoche

Ce que je vois : une pochette **portrait** en velours bordeaux, script doré à chaud, et une **carte ivoire qui coulisse hors de la pochette** par une **encoche en demi-lune** découpée dans le panneau avant. Un gland de fil doré passé dans un œillet sert de tirette. La pochette est posée sur un papier beige clair, pas sur un fond sombre.

Relevés : velours `#3E0A17` / `#3F0915` / `#420915` (mat, moucheté, éclairé par le haut), script `#AC784C`.

> **Ce que je prends, et c'est la découverte de la révision 2 :** **le mécanisme**. Le coordinateur a raison, et l'argument est plus fort que le goût. Comparaison chiffrée avec l'enveloppe C6 de la v1 :
>
> | | Enveloppe C6 (v1) | **Pochette à encoche (v2)** |
> |---|---|---|
> | Orientation | paysage 1,42:1 → 311 × 219 | **portrait 1:1,4 → 280 × 392** |
> | Part de l'écran mobile occupée | 219/812 = **27 %** | 392/812 = **48 %** |
> | Transformations requises | `rotateX`, `perspective`, `preserve-3d`, `backface-visibility` | **`translateY` seul** |
> | Classes de risque | scintillement de tri de profondeur à 180°, re-rastérisation du texte sur WebKit, coût de compositing 3D | **aucune** |
> | Éléments animés | 5 | **3** |
> | Sens du geste | bascule horizontale | **montée verticale — celle du pouce, et celle du défilement qui suit** |
>
> La dernière ligne est décisive. Le rabat qui bascule est un geste de page horizontale importé sur un écran vertical. La carte qui monte hors de sa pochette est le geste que l'écran demande.
> **Ce que je prends aussi :** le **fond clair**. Sa référence photographie la pochette sur un papier beige. Ma v1 posait une surcouche bordeaux plein écran ; je l'abandonne pour un champ crème `#F2EAE0`. C'est sa référence, c'est plus net (9,22:1 de séparation contre 1,46:1 d'une pochette bordeaux sur fond bordeaux), et le fondu final devient invisible (crème → ivoire = 1,13:1). Le bordeaux profond garde sa scène : la bande de pied de page.
> **Ce que je laisse.** Le **gland**. Sur écran c'est un objet pendant qu'il faudrait dessiner, animer et justifier ; l'encoche suffit à dire « ça se tire ». Et la **texture de velours photographique** : je la suggère par un seul dégradé radial statique (§8.1), pas par une image.

#### c) Les photos du couple

`DSC_3541.jpg` (6016 × 4016, paysage) et `DSC_3536.jpg` (4016 × 6016, portrait) sont des portraits de fiançailles professionnels. `DSC_2817.jpg` (6016 × 4016) est du même reportage. Les deux instantanés de plage `(2)` et `(3)` sont écartés : dominante bleu-vert, t-shirts blancs, registre en conflit frontal avec un bordeaux profond.

Ce que je vois sur `DSC_3541`, en recadrant : tenues traditionnelles malgaches **ivoire**, avec **ceinture tissée bordeaux** à motif de vigne, **broderies bordeaux** sur la jupe et à l'ourlet, **`lamba` rayé rouge et blanc** porté à l'épaule, pochette de costume bordeaux. **La palette du mariage est déjà dans leurs vêtements**, et elle y arrive avec ses propres motifs.

**Les deux difficultés, dites franchement :**

1. **Le couple est petit dans le cadre.** Sur `DSC_3541`, il occupe environ 19 % de la largeur. Un recadrage serré est indispensable, et un seul recadrage ne servira pas à la fois le portrait mobile et le paysage bureau. Il faut **deux recadrages art-dirigés**, pas un `object-position`.
2. **La dominante est franchement froide.** Un bandeau LED magenta baigne la verrière, le ciel est en heure bleue, les haies sont très vertes. Preuve chiffrée : le tissu ivoire de la robe s'échantillonne à **`#C8C5CC`** — bleu-magenta et sous-exposé, là où il devrait être un ivoire chaud autour de `#F4F0EA`. Un `filter` CSS ne corrige pas ça : appliqué à une photo de personnes, il déplace les carnations. **Il faut un étalonnage réel, livré en JPEG.** Voir §10 réécrit.

#### d) Les broderies : exploitables, et voici comment

Réponse courte : **oui**, et par deux dispositifs, pas par un.

**Le motif d'ourlet — le bon.** En recadrant l'ourlet de la robe, on découvre que le motif n'est **pas une broderie pleine mais un tracé au fil d'épaisseur constante** : une longue tige ondulante qui court le long de l'ourlet, une petite vrille en spirale, et une fleur stylisée à cinq ou six pétales pointus **dessinée en contour, pas remplie**.

> C'est le cas rare où un motif textile se transpose à l'écran **sans rien perdre** : un trait d'épaisseur constante *est* un `stroke` SVG. Pas de remplissage à approximer, pas de dégradé, pas de matière. Et sa structure — une longue ligne fine ponctuée d'une forme — **est déjà celle d'un filet éditorial**. C'est le motif que je propose comme **signature**, à la place du filet doré nu de la v1.
>
> **Spécification.** SVG en ligne, `aria-hidden="true"`, `focusable="false"`. Largeur 96 px (mobile) / 128 px (≥768). `stroke-width: 1.25`, `stroke-linecap: round`, `fill: none`, `vector-effect: non-scaling-stroke`. **Bicolore :** la tige en **`#B08D57`** (or, décoratif, discret comme une vraie dorure) et la fleur en **`#6E1F35`** (bordeaux 700, **10,38:1** — la partie visible du motif est celle qui porte le contraste). C'est la réponse à la dorure de sa référence : on garde le geste doré, la lisibilité passe par le bordeaux. Cible de poids : **< 900 octets** non compressés.
> **Ce dont j'ai besoin pour le dessiner correctement :** **une photo à plat de l'ourlet brodé** — vêtement posé, lumière égale, prise perpendiculaire, ~2000 px de large. Le portrait est à grande ouverture et le motif y est légèrement flou ; tracer là-dedans donnerait une approximation de leur vraie robe, ce qui est pire que de ne rien faire. À défaut, je trace depuis `DSC_3541` et j'assume une lecture stylisée — à dire au commanditaire.

**Les rayures du `lamba` — le second, et il est gratuit.** En échantillonnant une ligne de pixels en travers de la bande à `y = 2500` sur `DSC_3541`, le rythme se lit directement : **4 / 8 / 28 / 8 / 4** pixels (rouge / vide / rouge large / vide / rouge), soit normalisé **1 / 2 / 5 / 2 / 1**. Rouge relevé `#8B011B`.

> Une rayure est de la géométrie pure : elle se reproduit **exactement**, en un `linear-gradient`, pour **zéro octet**. Rien n'est perdu à la traduction. Je la propose comme **filet de section**, à la place du trait neutre de la v1 :
>
> ```css
> --rule-lamba: linear-gradient(to bottom,
>   var(--color-bordeaux-700) 0 1px,  transparent 1px 3px,
>   var(--color-bordeaux-700) 3px 6px, transparent 6px 8px,
>   var(--color-bordeaux-700) 8px 9px);
> /* hauteur 9 px, rythme 1/2/3/2/1 — relevé sur le lamba de DSC_3541 */
> ```
> Largeur **64 px**, pas la colonne entière : un onglet tissé, pas un surligneur. Sous chaque titre de section, 16 px en dessous.

**La vigne de la ceinture — celui que je laisse.** Le motif de la ceinture tissée est une frise de volutes claires sur fond cramoisi. Contrairement à l'ourlet, c'est une forme **pleine et tissée**, pas un trait. Un SVG plat en donnerait une imitation de clipart, et à 1 px elle se boucherait. **On prend le dispositif qui survit au médium, on laisse celui qui n'y survit pas.**

#### e) La tension « épuré » contre une référence chargée — comment je la tranche

Le commanditaire dit **épuré**. Sa référence a huit ornements : coins fleuris sur trois panneaux, cadre heptagonal, script doré, cachet de cire, carte assortie fleurie. Ce n'est pas épuré, c'est dense. **Je ne fais pas la moyenne.** Je regarde à quoi il réagit dans cette référence, et ce n'est presque jamais la quantité d'ornement :

| Ce à quoi il réagit | Reproductible ? | Décision |
|---|---|---|
| Le contraste de matières — bordeaux mat profond contre ivoire vif | Oui, et c'est **déjà épuré** | **Pris intégralement** |
| L'or comme métal — le cachet, le filet fin | Oui, en **un** élément et non cinq | **Pris, rationné** |
| Le geste — un objet qui s'ouvre | Oui, c'est tout le §8 | **Pris intégralement** |
| Les fleurs à l'aquarelle | Oui, mais c'est du stock roumain | **Remplacées par leurs propres broderies** |

**La réconciliation n'est pas « moins d'ornement que sa référence ». C'est *un* ornement au lieu de huit, et cet ornement est le sien.** L'argument à lui donner tel quel : la densité est bon marché sur papier — on tient l'objet, on voit tout d'un coup ; elle est chère sur un téléphone — on défile, et chaque ornement coûte un écran d'attention. Un motif tiré de la robe de sa fiancée bat une rose de banque d'images, et il en aura *plus*, pas moins.

**Budget d'ornement de toute la page — quatre dispositifs, pas un de plus :**

| # | Dispositif | Où | Combien de fois |
|---|---|---|---|
| 1 | Le filet doré 1 px en retrait sur la pochette, et l'arc doré du bord de l'encoche | scène uniquement | 2, pendant 2,5 s |
| 2 | La pastille dorée — le cachet de cire | scène uniquement | 1, pendant 200 ms |
| 3 | **Le motif d'ourlet** — or + bordeaux, 96 px | héros, sous les prénoms | **1** — la signature |
| 4 | **Le filet `lamba`** — bordeaux, 64 × 9 px | sous chaque titre de section | n — c'est un dispositif **structurel**, et sa répétition est ce qui le rend structurel plutôt que décoratif |
| 5 | Un filet doré nu 64 × 1 px | pied de page bordeaux 900 | 1 — le seul endroit où l'or est lumineux (**5,18:1**) |

Les dispositifs 3 et 4 sortent du **même vêtement** : ils se lisent comme un système, pas comme deux ornements. Le 4 est ce qui porte l'identité **sous la ligne de flottaison**, sur une page de quatre écrans où un unique ornement dans le héros laisserait trois écrans nus.

---

## 2. Le parti pris

> **Le mariage est une inscription, pas un bouquet.**
> Les noms sont gravés, l'information est imprimée, et l'or ne fait qu'une chose : une ligne.

Trois conséquences tenues d'un bout à l'autre :

1. **Une capitale romaine, pas une anglaise.** La famille display est lapidaire, dérivée de la lettre gravée, pas de la plume. Elle dit cérémonie, pas romance. C'est la sortie la plus courte hors du « générique mariée », et elle ne coûte rien en lisibilité (§3 le mesure).
2. **Un seul ornement, et il est déposé par l'animation.** Le filet doré sous les prénoms se **trace** au dernier temps de la scène. C'est ce que l'enveloppe laisse derrière elle. Un ornement qui a une origine narrative n'est plus une décoration.
3. **L'axe raconte le registre.** Cérémonie centrée, information alignée à gauche. Rien d'autre ne signale le changement de section — pas de trait, pas de fond, pas d'icône.

**Le risque assumé** (il en faut un) : le héros mobile est **presque vide**. Un écran entier de 812 px pour environ 280 px de contenu, dont 96 px de filet doré large d'un pixel. Sur un catalogue ce serait une faute. Sur une invitation c'est le sujet : le vide est ce qu'on achète quand on achète du papier épais.

---

## 3. Palette définitive

### 3.1 Ce que je confirme, ce que je corrige

La palette provisoire est **saine et je la garde en valeurs**. Trois corrections et quatre ajouts, tous motivés par une mesure.

| Décision | Détail |
|---|---|
| **Confirmé** | Les six bordeaux, l'ivoire, la crème, l'encre, l'or. Aucune valeur ne change. |
| **Corrigé 1** | **La crème `#F2EAE0` cesse d'être « fond de carte »** et devient un **remplissage de bloc**. Motif : `ivory` sur `cream` mesure **1,13:1** — une carte crème sur page ivoire (ou l'inverse) est invisible sur un téléphone en plein jour. Une hiérarchie de surfaces à 1,13:1 n'existe pas. La page d'invitation est **ivoire de bout en bout** ; la crème remplit la bande « informations pratiques » en pleine largeur, où sa faiblesse de contraste n'est pas un problème puisqu'elle ne délimite rien. |
| **Corrigé 2** | **`bordeaux-200 #E8CDD4` n'est plus un séparateur.** Mesuré à 1,41:1 sur ivoire, il ne peut pas délimiter quoi que ce soit, et sa teinte (343°, rose poudré) est exactement le glissement « générique mariée » que le brief écarte. Il reste **uniquement** en remplissage de puce, où l'encre tient 10,52:1 dessus. |
| **Corrigé 3** | **Pas de second rouge.** La variante `destructive` actuelle (`red-600`) jure frontalement avec `#6E1F35`. Elle disparaît. Voir §3.4. |
| **Ajout 1** | `--color-ink-muted #6B5B60` — texte secondaire chaud, 6,03:1 sur ivoire. Évite le gris pâle « élégant ». |
| **Ajout 2** | `--color-rule #E1D5C4` — filet **décoratif** (1,37:1). Ne délimite jamais un contrôle. |
| **Ajout 3** | `--color-rule-strong #8C7A68` — bordure de **contrôle de formulaire**, 3,89:1 sur ivoire et 3,46:1 sur crème : au-dessus du seuil 3:1 de la WCAG 1.4.11 sur **les deux** fonds. C'est la valeur la plus claire qui y parvient. |
| **Ajout 4** | Trois teintes de statut **réservées à l'admin** — `#3F5D45`, `#8E3A50`, `#6E635A`. Jamais sur la page invité. Voir §3.5. |

### 3.2 Les tokens

```css
@theme {
  /* Encre */
  --color-ink:            #2A2124;   /* texte courant */
  --color-ink-muted:      #6B5B60;   /* texte secondaire, libellés */

  /* Bordeaux */
  --color-bordeaux-900:   #3E1220;   /* titres, aplats profonds, scène, pied de page */
  --color-bordeaux-700:   #6E1F35;   /* PRIMAIRE — boutons, liens, focus */
  --color-bordeaux-500:   #8E3A50;   /* survol, doublure d'enveloppe */
  --color-bordeaux-200:   #E8CDD4;   /* remplissage de puce UNIQUEMENT */
  --color-bordeaux-50:    #F9EFF1;   /* fond de bloc très léger, état sélectionné */

  /* Papier */
  --color-ivory:          #FBF8F4;   /* FOND DE PAGE, partout */
  --color-cream:          #F2EAE0;   /* remplissage de bande, en-tête de tableau */
  --color-rule:           #E1D5C4;   /* filet décoratif, 1 px */
  --color-rule-strong:    #8C7A68;   /* bordure de contrôle, 1 px */

  /* Or — DÉCORATIF UNIQUEMENT */
  --color-gold:           #B08D57;

  /* Statuts — ADMIN UNIQUEMENT */
  --color-status-yes:     #3F5D45;
  --color-status-pending: #8E3A50;
  --color-status-no:      #6E635A;
  --color-status-yes-bg:     #E4EAE2;
  --color-status-pending-bg: #F5E4E8;
  --color-status-no-bg:      #EDE7DE;
}
```

### 3.3 Ratios mesurés — tous les couples d'usage

Calcul WCAG 2.1 (luminance relative), vérifié par script.

**Texte sur fond clair** — seuil AA 4,5:1 · AAA 7:1

| Avant-plan | Fond | Ratio | Verdict | Usage |
|---|---|---|---|---|
| `ink #2A2124` | `ivory #FBF8F4` | **14,79** | AAA | Corps de texte, page invité et admin |
| `ink` | `cream #F2EAE0` | **13,14** | AAA | Corps dans la bande crème |
| `ink-muted #6B5B60` | `ivory` | **6,03** | AA | Libellés, texte secondaire |
| `ink-muted` | `cream` | **5,36** | AA | Libellés dans la bande crème |
| `bordeaux-900 #3E1220` | `ivory` | **15,12** | AAA | Prénoms, titres de section |
| `bordeaux-900` | `cream` | **13,43** | AAA | Titres dans la bande crème |
| `bordeaux-700 #6E1F35` | `ivory` | **10,38** | AAA | Liens, boutons texte, anneau de focus |
| `bordeaux-700` | `cream` | **9,22** | AAA | Liens dans la bande crème |
| `bordeaux-700` | `bordeaux-50 #F9EFF1` | **9,76** | AAA | Texte sur bloc d'erreur / carte sélectionnée |
| `bordeaux-500 #8E3A50` | `ivory` | **6,91** | AA | Nuance intermédiaire disponible |
| `ink` | `bordeaux-200 #E8CDD4` | **10,52** | AAA | Puce à remplissage bordeaux |

**Texte sur fond sombre**

| Avant-plan | Fond | Ratio | Verdict | Usage |
|---|---|---|---|---|
| `ivory` | `bordeaux-900` | **15,12** | AAA | Pied de page, texte de la scène, anneau de focus sur sombre |
| `ivory` | `bordeaux-700` | **10,38** | AAA | Libellé de bouton primaire |
| `cream` | `bordeaux-900` | **13,43** | AAA | Texte secondaire du pied de page |
| `blanc #FFFFFF` | `bordeaux-700` | 10,99 | AAA | *Non utilisé — l'ivoire est préféré, il est plus chaud* |
| `blanc` | `bordeaux-900` | 16,00 | AAA | *Non utilisé* |

**L'or — la contrainte, chiffrée**

| Couple | Ratio | Statut |
|---|---|---|
| `gold` sur `ivory` | **2,92** | ÉCHEC 3:1 — décoratif seulement |
| `gold` sur `cream` | **2,59** | ÉCHEC — décoratif seulement |
| `gold` sur `bordeaux-500` | **2,37** | ÉCHEC — **le filet doré est interdit sur bordeaux 500** |
| `gold` sur `bordeaux-700` | **3,56** | Passe 3:1 graphique · échoue en texte |
| `gold` sur `bordeaux-900` | **5,18** | Passe AA texte — **le seul endroit où l'or est lumineux** |
| `blanc` sur `gold` | 3,09 | Non utilisé |
| `ink` sur `gold` | 5,06 | Non utilisé |

> **Règle d'emploi de l'or, exhaustive.** Trois usages, aucun autre.
> 1. Un filet horizontal de 1 px sous les prénoms (héros et pied de page).
> 2. Un filet de 1 px en retrait de 12 px sur le panneau avant de l'enveloppe, pendant la scène.
> 3. Une pastille pleine de 24 px — le cachet de cire — posée sur l'encoche de la pochette, qui se retire au premier temps de la scène.
> 4. La tige du motif d'ourlet, 1 px, dans le héros. La fleur, elle, est en bordeaux (10,38:1) : la partie signifiante du motif ne repose jamais sur l'or.
>
> **Interdits, pour mémoire, y compris quand ça sera tentant :** icône signifiante, anneau de focus, bordure d'état actif, texte de tout corps, libellé de bouton, séparateur porteur de structure, **et filet sur `bordeaux-500` (2,37:1)**. La décision arrêtée le 2026-08-22 est confirmée sans réserve : la mesure la soutient.

**Bordures et surfaces non textuelles** — seuil WCAG 1.4.11 : 3:1

| Couple | Ratio | Verdict |
|---|---|---|
| `rule-strong #8C7A68` sur `ivory` | **3,89** | Conforme — bordure de champ, de carte-choix, de tableau |
| `rule-strong` sur `cream` | **3,46** | Conforme |
| `rule #E1D5C4` sur `ivory` | 1,37 | **Décoratif uniquement.** Jamais seul délimiteur d'un contrôle. |
| `rule` sur `cream` | 1,21 | Décoratif |
| `rule` sur `bordeaux-900` | 11,06 | Filet clair sur bande sombre — conforme |
| `ivory` sur `cream` | 1,13 | **Ne distingue pas deux surfaces.** Motif du correctif n° 1. |

### 3.4 L'action destructive : pas de second rouge

Le bordeaux **est** notre rouge. Ajouter un `red-600` à côté de `#6E1F35` met deux rouges voisins et discordants sur le même écran, et c'est précisément le défaut relevé à l'audit.

**Décision :** le danger est porté par la **friction et les mots**, pas par une seconde teinte.

| Élément | Traitement |
|---|---|
| Bouton `Supprimer` dans une ligne | Contour `1px solid #8C7A68`, libellé `ink #2A2124` (14,79:1), fond transparent. Aucun remplissage : il ne ressemble en rien au bouton primaire. |
| Dialogue de confirmation | Radix `AlertDialog`. Titre Marcellus 24 px `bordeaux-900`. Corps : la conséquence en clair — « Le lien de ce foyer cessera de fonctionner. Cette action est définitive. » |
| Bouton de confirmation | **Seul** aplat `bordeaux-900 #3E1220`, texte `ivory` (15,12:1), libellé **`Supprimer définitivement`**. |
| Bouton d'annulation | Contour, libellé `Annuler`, et c'est lui qui reçoit le focus à l'ouverture. |

Le bouton de confirmation est le seul aplat bordeaux 900 de tout l'admin. Cette unicité **est** le signal.

### 3.5 Les statuts RSVP

Une teinte est ajoutée, l'olive `#3F5D45`. C'est une exception contenue, et elle est justifiée : sur un tableau de 40 foyers, la teinte est le canal de balayage le plus rapide, et coder trois statuts en trois nuances de bordeaux les rend indiscernables. **Cette exception ne franchit jamais la frontière du back-office** — sur la page invité, le statut est du texte.

Conformément à la règle du design system, **jamais la couleur seule** : chaque puce porte un libellé, et une forme distinguable en niveaux de gris.

| Statut | Libellé | Forme (8 px) | Texte | Fond | Ratio |
|---|---|---|---|---|---|
| `CONFIRMED` | `Confirmé` | disque plein | `#3F5D45` | `#E4EAE2` | **6,00** |
| `PENDING` | `Sans réponse` | anneau creux 1,5 px | `#8E3A50` | `#F5E4E8` | **8,97** (mesuré `#6E1F35` sur `#F5E4E8`) |
| `DECLINED` | `Ne vient pas` | tiret de 8 × 1,5 px | `#6E635A` | `#EDE7DE` | **4,75** |

> Note : `PENDING` en bordeaux plutôt qu'en gris est délibéré — un foyer sans réponse est une **action en attente pour l'organisateur**, pas une donnée neutre. La teinte de marque le remonte dans le balayage.
> `DECLINED` en taupe et non en rouge est délibéré aussi : décliner une invitation n'est pas une erreur. Le peindre en rouge est un contresens sémantique que l'on trouve partout.

### 3.6 Le focus

```css
:focus-visible {
  outline: 2px solid var(--color-bordeaux-700);   /* 10,38:1 sur ivoire */
  outline-offset: 2px;
}
/* Sur bande bordeaux 900 : la scène, le pied de page */
.on-dark :focus-visible {
  outline-color: var(--color-ivory);              /* 15,12:1 sur bordeaux 900 */
}
```

L'`outline-offset: 2px` est nécessaire, pas cosmétique : sur un bouton bordeaux plein, un anneau bordeaux collé serait invisible. Le décalage laisse passer 2 px de page ivoire, et c'est **l'anneau contre la page** qui mesure 10,38:1.

`outline: none` est interdit partout, sans exception.

### 3.7 Le chrome du document

```css
html {
  background-color: #FBF8F4;   /* jamais le blanc navigateur */
  color-scheme: light;         /* neutralise l'inversion auto de Chrome Android */
}
```

Plus `<html lang="fr">`, `<meta name="theme-color" content="#FBF8F4">`, et un `<title>` réel : `Invitation — [Prénom] & [Prénom], 12 juin 2027`. **Le nom du foyer ne va pas dans le titre** : il apparaîtrait dans les captures d'écran partagées.

---

## 4. Typographie

### 4.1 Le couple retenu

| Rôle | Famille | Graisses | Source | Poids latin woff2 **mesuré** |
|---|---|---|---|---|
| **Display** | **Marcellus** | 400 (unique) | Google Fonts, v14 | **14 552 o — 14,2 Ko** |
| **Texte** | **Source Sans 3** | variable 400 → 700 | Google Fonts, v19 | **28 740 o — 28,1 Ko** |
| | | | **Total** | **43 292 o — 42,3 Ko** |

**42,3 Ko sur un budget de 120 Ko — 35 %.** 77,7 Ko de marge. Aucune italique n'est chargée (voir §4.5).

Tailles obtenues par téléchargement effectif des fichiers servis par `fonts.gstatic.com` pour le sous-ensemble `latin`, pas par estimation. Le sous-ensemble `latin` (U+0000–00FF) couvre l'intégralité du français (`é è ê à ç ù î ô û œ`) et du malgache. `latin-ext` n'est pas chargé.

### 4.2 Pourquoi ce couple, et pas les serifs de mariage qu'on voit partout

**Le couple par défaut de la catégorie est documenté : Cormorant Garamond + Montserrat.** C'est la recommandation qui sort en tête de toutes les listes de polices de faire-part. C'est exactement ce que le brief demande d'éviter — non par snobisme, mais parce qu'un défaut n'est pas un choix.

Trois arguments, tous mesurés, plutôt que trois adjectifs.

**a) Cormorant Garamond est un piège de lisibilité sur téléphone.** J'ai mesuré la hauteur d'x et la hauteur de capitale de chaque candidate au canevas, à 100 px :

| Famille | Hauteur d'x | Hauteur de cap. | x / cap. | Largeur de `samedi 12 juin 2027 à 18 h 00` |
|---|---|---|---|---|
| **Cormorant Garamond** | **39** | 63 | **0,619** | 1 102 |
| **Marcellus** | **50** | 70 | **0,714** | 1 356 |
| Inter | 55 | 73 | 0,753 | 1 391 |
| Source Sans 3 | 49 | 66 | 0,742 | 1 205 |
| Libre Franklin | 53 | 75 | 0,707 | 1 371 |

La minuscule de Cormorant est **28 % plus courte** que celle de Marcellus à corps égal. Composé à 44 px, un prénom en Cormorant a une bas-de-casse de 17,2 px là où Marcellus donne 22 px. Sur un téléphone tenu à bout de bras, en extérieur, cette différence est visible. Cormorant est vendu comme un caractère de labeur ; à ces proportions c'en est un de titrage, et il faut le savoir avant de composer un corps de texte avec.

**b) Marcellus dégrade sans bouger la page.** Si la police ne charge pas, le repli est Georgia. Mesures comparées :

| | Hauteur d'x | Hauteur de cap. | Largeur de la ligne de date |
|---|---|---|---|
| Marcellus | 50 | 70 | 1 356 |
| Georgia | 48 | 69 | 1 317 |
| **Écart** | **4 %** | **1,4 %** | **2,9 %** |

Georgia est un substitut quasi parfait de Marcellus. Avec `size-adjust: 104%` (§4.5), le remplacement est **imperceptible** : pas de saut de mise en page, pas de reflow, pas de « flash de texte non stylé » visible. Pour Cormorant, il aurait fallu `size-adjust: 81%` — un écart de 19 % qui fait bouger toute la page au moment du swap. **Le repli est un critère de choix, pas une réparation après coup.**

**c) Le registre est juste.** Marcellus dérive de la capitale romaine inscriptionnelle — la lettre gravée dans la pierre, pas tracée à la plume. Le mariage se tient au Domaine d'Ambohimanga ; le registre lapidaire y est plus juste que le registre calligraphique, et il sort d'emblée du champ « faire-part floral ». Il n'a **ni gras ni italique** : c'est une contrainte, et c'est la bonne. Elle interdit de fabriquer de la hiérarchie par la graisse et oblige à la faire par la taille, l'espacement et le blanc — exactement la discipline que « épuré » exige.

**Pourquoi Source Sans 3 et pas Inter** (que le design system proposait) :

| Critère | Inter | Source Sans 3 | Écart |
|---|---|---|---|
| Poids latin variable 400–700 | 47,1 Ko | **28,1 Ko** | **−19,0 Ko, −40 %** |
| Largeur de la ligne de date | 1 391 | **1 205** | **−13,4 %** |
| x / cap. | 0,753 | 0,742 | négligeable |
| Squelette | néo-grotesque, fermé | **humaniste, ouvert** | — |

Les 19 Ko comptent : les invités sont pour partie sur réseau mobile malgache. Et le squelette humaniste de Source Sans 3 descend des mêmes proportions Renaissance que la bas-de-casse de Marcellus — le couple lit comme une voix à deux températures, pas comme deux documents agrafés. Inter, dessiné pour être neutre et anhistorique, ferait sonner la page « produit SaaS » sous une capitale romaine.

**Le coût honnête :** la hauteur d'x de Source Sans 3 (49) est inférieure à celle d'Inter (55). Pour une lisibilité optiquement équivalente, il faut composer **+12 %**. C'est pourquoi le corps invité est à **17 px et non 16**, et le corps admin à **16 px et non 14**. La largeur reste malgré tout inférieure à Inter à taille optique égale (1 205 × 0,18 = 217 px contre 1 391 × 0,16 = 223 px). Le gain de compacité survit à la compensation.

**Repli si le commanditaire rejette Marcellus** (arbitrage n° 1) : **Cormorant Garamond** reste défendable si l'on accepte le corps 20 px minimum pour le texte et un `size-adjust` de repli à 81 %. Je ne le recommande pas, mais la palette et la chorégraphie tiennent sans changement.

### 4.3 L'échelle

Le design system proposait 12 · 14 · 16 · 20 · 24 · 32 · 48 · 64. Je garde les ancrages et je corrige aux deux extrémités, avec les motifs.

**Échelle texte — Source Sans 3**

| Jeton | Taille / interligne | Graisse | Interlettrage | Usage |
|---|---|---|---|---|
| `label` | 12 / 1,0 | 500 | **+0,16 em** | Libellés en capitales uniquement (`QUAND`, `OÙ`). Jamais de bas-de-casse à 12 px. |
| `xs` | 13 / 1,4 | 400 | 0 | Métadonnée admin uniquement |
| `sm` | 14 / 1,5 | 400 | 0 | Cellule de tableau admin |
| `base` | 16 / 1,6 | 400 | 0 | Corps admin, **tous les champs de saisie** |
| `lg` | **17** / 1,55 | 400 | 0 | **Corps invité — l'unique taille de corps de la page publique** |
| `xl` | 20 / 1,45 | 400 | 0 | Paragraphe d'attaque invité |

> **17 px, pas 16 :** compense la hauteur d'x de Source Sans 3 (§4.2). Le plancher de 16 px du design system est respecté et dépassé.
> **Champs de saisie à 16 px minimum, sans exception :** en dessous, iOS Safari zoome automatiquement au focus et déplace la page sous le doigt de l'invité.

**Échelle display — Marcellus 400**

| Jeton | Taille / interligne | Interlettrage | Usage |
|---|---|---|---|
| `d-xs` | 20 / 1,4 | +0,01 em | Ligne de date du héros |
| `d-sm` | 24 / 1,3 | +0,01 em | Titre de page admin, noms du pied de page, bloc « adressée à » |
| `d-md` | 28 / 1,25 | 0 | Titre de section invité (mobile) |
| `d-lg` | 32 / 1,2 | 0 | Titre de section invité (≥ 768) |
| `d-xl` | **44** / 1,05 | +0,01 em | Prénoms du héros (mobile) |
| `d-2xl` | **56** / 1,05 | 0 | Prénoms du héros (≥ 520) |
| `d-3xl` | **72** / 1,05 | −0,005 em | Prénoms du héros (≥ 768) |

**Pourquoi 44 / 56 / 72 et pas 48 / 64.** Parce que la taille du héros mobile n'est pas un goût : elle dépend de la longueur des prénoms, qui ne sont pas encore connus. J'ai mesuré Marcellus sur des prénoms malgaches réels (largeur en px) :

| Corps | `Tiana` (5) | `Hobiana` (7) | `Fanantenana` (11) | `Andriamahefa` (12) |
|---|---|---|---|---|
| 44 px | 106 | 165 | 250 | **279** |
| 48 px | 116 | 180 | 273 | **304** |
| 56 px | 135 | 210 | 319 | 355 |
| 72 px | 174 | 270 | 410 | 456 |

Mesure utile sur le plus petit téléphone visé (360 px de large, gouttières 24 px) : **312 px**.

- **44 px passe pour n'importe quel prénom jusqu'à 12 caractères** (279 px, 33 px de marge).
- 48 px passe pour 12 caractères avec **8 px de marge** — trop juste, une lettre de plus et ça casse.

**Règle de dimensionnement du héros, à appliquer une fois les prénoms connus :**

> `corps max = plancher( 312 / (0,53 × nombre de caractères du plus long prénom) )`, arrondi au palier inférieur de l'échelle.
> `0,53 em` est la largeur moyenne par caractère mesurée sur Marcellus pour ces chaînes.
> Si les deux prénoms font **8 caractères ou moins**, monter le mobile à **56 px**. Sinon rester à **44 px**.
> Un prénom ne se coupe jamais et ne se réduit jamais en `font-size: min()` fluide : deux prénoms de tailles différentes sur le héros serait une faute.

À titre de contrôle, `Informations pratiques` en Marcellus 28 px mesure **284 px** : il tient sur une ligne dans 312 px. Les titres de section à 28 px sont sûrs sur tous les téléphones visés.

### 4.4 Les chiffres

`font-variant-numeric: tabular-nums` **obligatoire** sur : toute colonne numérique de l'admin, le compteur du sélecteur de convives, les compteurs du tableau de bord. Source Sans 3 porte `tnum`. Sans cela, les colonnes « 3 / 4 » d'un tableau de 40 lignes ne s'alignent pas et l'œil ne peut plus balayer.

Sur la page invité, `tabular-nums` est **désactivé** : la date en chiffres proportionnels est mieux dessinée.

### 4.5 Chargement — la partie qui décide si la page est lisible ou non

**Auto-hébergement, pas le CDN Google.** Trois raisons concrètes :

1. **Vie privée.** Le CDN Google reçoit l'adresse IP de chaque invité qui ouvre son lien. Pour une liste d'invités de mariage, c'est une divulgation gratuite à un tiers, sans contrepartie.
2. **Latence.** `fonts.googleapis.com` puis `fonts.gstatic.com` coûtent deux résolutions DNS et deux poignées TLS supplémentaires, en série avant le premier octet de police. Sur un réseau mobile malgache c'est plusieurs centaines de millisecondes payées deux fois.
3. **Contrôle.** On maîtrise le `font-display`, le `preload` et le cache.

**Mise en œuvre — aucune dépendance npm.** Deux fichiers déposés dans `apps/web/public/fonts/` :

```
marcellus-latin-400.woff2         14 552 o
source-sans-3-latin-var.woff2     28 740 o
```

```html
<!-- index.html, dans <head>, avant tout CSS -->
<link rel="preload" href="/fonts/marcellus-latin-400.woff2"     as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/fonts/source-sans-3-latin-var.woff2" as="font" type="font/woff2" crossorigin>
```

`crossorigin` est requis même en même origine : les polices sont toujours récupérées en mode CORS. L'oublier fait télécharger le fichier **deux fois**.

```css
@font-face {
  font-family: "Marcellus";
  src: url("/fonts/marcellus-latin-400.woff2") format("woff2");
  font-weight: 400; font-style: normal; font-display: swap;
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+2000-206F, U+20AC, U+2122, U+2212;
}
@font-face {
  font-family: "Source Sans 3";
  src: url("/fonts/source-sans-3-latin-var.woff2") format("woff2-variations");
  font-weight: 400 700; font-style: normal; font-display: swap;
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+2000-206F, U+20AC, U+2122, U+2212;
}
```

**Les métriques de repli — la page reste lisible et ne bouge pas.** Valeurs calculées depuis les métriques mesurées (§4.2) :

```css
@font-face {
  font-family: "Marcellus Fallback";
  src: local("Georgia"), local("Noto Serif"), local("Times New Roman");
  size-adjust: 104%;        /* hauteur d'x 48 -> 50 */
  ascent-override: 93%;     /* 97 / 1,04 */
  descent-override: 27%;    /* 28 / 1,04 */
  line-gap-override: 0%;
}
@font-face {
  font-family: "Source Sans Fallback";
  src: local("Segoe UI"), local("Roboto"), local("Helvetica Neue"), local("Arial");
  size-adjust: 98%;         /* hauteur d'x 50 -> 49 */
  ascent-override: 104%;    /* 102 / 0,98 */
  descent-override: 41%;    /* 40 / 0,98 */
  line-gap-override: 0%;
}

@theme {
  --font-display: "Marcellus", "Marcellus Fallback", Georgia, serif;
  --font-sans:    "Source Sans 3", "Source Sans Fallback", system-ui, sans-serif;
}
```

Avec ces surcharges, l'écart de hauteur de ligne entre l'état de repli et l'état chargé est **inférieur à 2 %**. Le `swap` n'est pas un accident visuel, c'est une substitution silencieuse.

```css
* { font-synthesis: none; }
```

Aucune graisse ni italique synthétique : Marcellus n'a qu'un poids, et un faux gras de capitale romaine est laid. Là où il faut appuyer, on change de taille ou on passe en Source Sans 3 600.

**Critère de recette :** couper le réseau après le HTML, recharger `/i/:linkId`. La page doit être **entièrement lisible et le formulaire utilisable**, en Georgia et Segoe UI, avec une hauteur de document à ±2 % de la version chargée.

---

## 5. Espacement, grille, rayons

**Base 4 px**, échelle du design system conservée : `4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96`.

**Rythme vertical de la page invité — non négociable, c'est là que se joue « épuré » :**

| Relation | Valeur |
|---|---|
| Entre deux sections de premier niveau | **96 px** (mobile) · **128 px** (≥ 768) |
| Titre de section → premier contenu | **32 px** |
| Entre deux entrées d'une même liste de définitions | **32 px** |
| Libellé → valeur (`dt` → `dd`) | **8 px** |
| Padding interne d'une bande pleine largeur | **64 px** vertical · **24 px** horizontal |
| Gouttière de page | **24 px** (mobile) · **32 px** (≥ 520) |

**Colonne de texte :** `max-width: 520px`, centrée. À 17 px en Source Sans 3, cela donne **≈ 63 caractères** par ligne. Le héros a droit à `640px` pour le display.

**Rayons :**

| Jeton | Valeur | Usage |
|---|---|---|
| `--radius-none` | 0 | Filets, bandes pleine largeur, images |
| `--radius-control` | **2px** | Boutons, champs, cartes-choix, puces |
| `--radius-surface` | **4px** | Dialogue, carte de l'enveloppe |

2 px et non 0 : un rayon nul lit « journal », et un rayon nul se comporte mal sur les densités de pixels non entières. 2 px et non 8 : au-delà de 4 px on quitte le registre de l'imprimé pour celui de l'application.

**Ombres :** une seule, statique, **jamais animée** (règle n° 3).
`--shadow-card: 0 1px 2px rgba(42,33,36,.06), 0 8px 24px rgba(42,33,36,.08)`
Deux usages : la carte pendant la scène, le dialogue Radix. Nulle part ailleurs.

---

## 6. Le mouvement, en général

Reprise stricte du design system.

| Régime | Durée | Easing | Pour quoi |
|---|---|---|---|
| Micro | **140 ms** | `cubic-bezier(0.4, 0, 1, 1)` | Survol, focus, bascule d'état |
| Transition | **280 ms** | `cubic-bezier(0.22, 1, 0.36, 1)` | Apparition d'un bloc, changement de vue |
| Scène | **600–1200 ms** | selon sens, ci-dessous | Ouverture d'enveloppe |

```css
@theme {
  --ease-in:  cubic-bezier(0.22, 1, 0.36, 1);   /* entrée : quelque chose arrive */
  --ease-out: cubic-bezier(0.4, 0, 1, 1);       /* sortie : quelque chose part */
  --duration-micro: 140ms;
  --duration-transition: 280ms;
}
```

Aucun `linear` sur du mouvement visible. Aucun rebond. **Aucune animation dans l'admin** en dehors du régime micro sur `background-color`, `border-color`, `color`, `outline-color`. En particulier : **pas de squelette scintillant** au chargement — un bloc crème `#F2EAE0` immobile aux bonnes dimensions, c'est tout.

---

## 7. Le fond de scène : ce que l'enveloppe doit être pour que la règle n° 1 tienne

Avant la chorégraphie, la décision qui la conditionne, et qui se prend maintenant ou se paye trois fois.

**L'enveloppe est une surcouche `position: fixed` posée par-dessus une page déjà complète, déjà rendue, déjà défilable.** Elle n'est pas un état de l'application. Il n'existe pas de branche « avant ouverture » qui rendrait autre chose. `InvitationPage` rend exactement le même arbre que l'enveloppe joue ou non ; `<EnvelopeScene>` est un frère monté en plus.

Trois conséquences directes, à vérifier en revue de code :

1. Aucune donnée n'est chargée par la scène. La requête `["invitation", linkId]` est déjà résolue quand la scène démarre.
2. La surcouche est `pointer-events: none` **dès la première image**, sauf le bouton « Passer ». Un défilement, une touche, un doigt passent au travers et **interrompent la scène**.
3. Le défilement du corps n'est **jamais** verrouillé. Pas de `overflow: hidden` sur `body`.

**Le truc de composition qui fait tenir tout le reste :** la carte qui sort de l'enveloppe porte **exactement** le contenu du héros de la page — mêmes prénoms, même corps, même couleur, même fond ivoire, même position verticale. À la dernière image, la carte s'efface sur un héros qui lui est identique. Il n'y a pas de raccord à réussir : **il n'y a pas de raccord**. C'est ce qui distingue une mise en scène d'un générique de début.

---

## 8. La chorégraphie, image par image — **version pochette (révision 2)**

> Remplace la version « enveloppe C6 à rabat » de la révision 1, conservée en **annexe B**. Motif du changement : §1.5.b.

### 8.1 La scène

- **Surcouche** : `position: fixed; inset: 0; background: #F2EAE0` (crème), `display: grid; place-items: center`, `contain: layout paint`, `pointer-events: none`.
  *Champ clair, pas sombre* — c'est la composition de sa référence (pochette bordeaux posée sur papier beige). Séparation pochette/fond : **9,22:1**. Une pochette bordeaux sur champ bordeaux n'aurait mesuré que **1,46:1**.
- **Pochette** : rapport **1:1,4**, **portrait**.

| | Mobile (< 768) | ≥ 768 |
|---|---|---|
| Pochette | **280 × 392** | **380 × 532** |
| Carte à l'intérieur | 256 × 368 | 348 × 500 |
| Rayon de l'encoche | **44** | 56 |
| **Course de montée de la carte** | **−140 px** | **−190 px** |
| Pastille dorée (cachet) | 24 px | 28 px |

**Géométrie verticale, et pourquoi elle n'est pas centrée.** Sur 375 × 812, le centre du viewport est à `y = 406`. La carte doit **finir centrée** pour se confondre avec le héros. Elle monte de 140 px, donc :

```
carte au repos      : top = 362   (y 362 → 730)
carte à l'arrivée   : top = 222   (y 222 → 590)  ← centrée
pochette            : top = 350   (y 350 → 742)  ← 70 px du bas de l'écran
encoche             : centrée sur y = 350, rayon 44
```

La pochette est donc **tenue basse**, et tout le tiers supérieur de l'écran est vide au premier plan. Ce vide n'est pas un défaut de composition : **c'est la place que la carte va occuper.** Le vide est une promesse.

**Les couches, de l'arrière vers l'avant :**

| z | Élément | Traitement |
|---|---|---|
| 1 | Dos de la pochette | `#6E1F35` |
| 2 | Ombre portée de la carte | Élément **séparé**, même géométrie que la carte, portant `--shadow-card`. Séparé **exprès** : l'ombre doit pouvoir s'effacer en `opacity` (règle n° 3 interdit d'animer `box-shadow`). |
| 3 | **La carte** | `#FBF8F4`, `--radius-surface` 4 px |
| 4 | **Le panneau avant, avec l'encoche** | voir ci-dessous |
| 5 | L'arc doré du bord de l'encoche | cercle de 88 px, `border: 1px solid #B08D57`, `border-radius: 50%`, débordement masqué par le panneau — seul l'arc visible apparaît. **3,56:1 sur bordeaux 700**, décoratif, conforme |
| 6 | La pastille dorée | disque plein `#B08D57` de 24 px, centré sur l'encoche, sur le bord supérieur |

**Le panneau avant et son encoche** — c'est le cœur du mécanisme, et il tient en trois lignes :

```css
.pochette-avant {
  background: radial-gradient(120% 80% at 50% 0%, #7E2A3E 0%, #6E1F35 46%, #571828 100%);
  -webkit-mask-image: radial-gradient(circle 44px at 50% 0, transparent 0 44px, #000 44px);
          mask-image: radial-gradient(circle 44px at 50% 0, transparent 0 44px, #000 44px);
}
```

- Le **masque est statique** : rastérisé une fois, jamais animé.
- **Aucun `overflow` n'est nécessaire.** Le panneau ne couvre que le rectangle de la pochette ; au-dessus de son bord supérieur, la carte est libre de monter. Le bas de la carte reste caché derrière le panneau, sauf le croissant visible par l'encoche. Le mécanisme se dessine tout seul, sans une seule règle de découpe.
- **Le dégradé est un modelé de lumière, pas un ornement.** Il suggère le velours de sa référence — une pièce mate éclairée par le haut. Amplitude totale : 8 points de valeur (L 30 % → L 22 %). L'ivoire reste à **8,67:1** au point le plus clair du dégradé. Ce n'est pas un dégradé de marque, c'est une source lumineuse.

**Ce qui est écrit sur la pochette :** `Famille Raveloson` (`household.displayName`), Marcellus 20 px / 1,3, `#FBF8F4` (**8,67 à 12,66:1** selon la zone du dégradé), centré à 40 % de la hauteur du panneau. 12 px plus bas : `INVITATION`, Source Sans 3 500, 11 px, `+0,18 em`, capitales, `#FBF8F4`. *(Pas en or : l'or ne porte jamais de texte — c'est exactement l'écart assumé avec sa référence, où les prénoms sont dorés.)*
Filet doré 1 px en retrait de 12 px du bord du panneau.

**Ce qui est sur la carte :** les deux prénoms en Marcellus 44 px `#3E1220`, le motif d'ourlet 96 px, la ligne de date en Marcellus 20 px `#6E1F35`. **Rien d'autre.** La carte est un fragment ; la page est le tout.

### 8.2 La séquence

Toutes les valeurs sont des `transform` et des `opacity`. **Aucune autre propriété n'est animée. Aucune transformation 3D.**

| # | t (ms) | Durée | Ce qui bouge | De → vers | Easing |
|---|---|---|---|---|---|
| 1 | **0** | **320** | La pochette entière (carte comprise) | `opacity 0 → 1` · `scale(0.97) → 1` · `translateY(16px) → 0` | `--ease-in` |
| 2 | **320** | **200** | *Rien* — temps de lecture du nom du foyer | — | — |
| 3 | **520** | **200** | La pastille dorée | `scale(1) → scale(0.5)` · `opacity 1 → 0` | `--ease-out` |
| 4 | **680** | **640** | **La carte monte** | `translateY(0) → translateY(-140px)` mobile · `-190px` ≥768 | `--ease-in` |
| 5 | **1320** | **160** | *Rien* — temps de lecture des prénoms | — | — |
| 6 | **1480** | **600** | La pochette, l'ombre de la carte **et** le champ crème | pochette `opacity 1 → 0` et `translateY(0) → 48px` · ombre `opacity 1 → 0` · surcouche `opacity 1 → 0` | `--ease-out` |
| 7 | **2080** | **160** | La carte | `opacity 1 → 0` | `--ease-out` |
| 8 | **2240** | **320** | **Le motif d'ourlet**, sur la page | conteneur `overflow: hidden` · SVG `translateX(-100%) → 0` | `--ease-in` |
| — | **2560** | — | Surcouche retirée du DOM | — | — |

**Trois éléments animés au total** (la pochette, la carte, la pastille), contre cinq en v1. Deux temps de lecture. 2 560 ms.

### 8.3 Ce que l'invité voit, et pourquoi

**Image 1 — 0 à 320 ms. « C'est pour moi. »**
Il ne voit jamais un champ vide : la pochette arrive dès la première image, portant **son propre nom de famille**. C'est le seul enseignement de Paperless Post que je reprends, et c'est le plus important. Le croissant d'ivoire visible par l'encoche annonce déjà qu'il y a quelque chose dedans.

**Image 2 — 320 à 520 ms. Le temps mort.**
200 ms où rien ne bouge. Délibéré, et c'est la partie que tous les tutoriels sautent. Sans cette pause, la séquence est lue comme un indicateur de chargement — ce que la machine fait pendant qu'on attend. Avec elle, elle est lue comme un objet qu'on vous tend. 200 ms est l'ordre de grandeur d'une fixation de lecture sur un nom court.

**Image 3 — 520 à 720 ms. Le cachet se retire.**
Le disque doré de 24 px posé sur l'encoche rétrécit à 50 % et disparaît. C'est **le cachet de cire de sa référence n° 1**, réduit à sa forme : un disque plein, sans monogramme, sans relief, sans texture. L'usage le plus concentré possible de l'or — un point, et il s'en va.
**Et c'est le signal de causalité :** le cachet ferme la bouche de la pochette. Il part, donc la carte peut monter. Rien dans la scène n'arrive sans cause.

**Image 4 — 680 à 1320 ms. La carte monte.**
Recouvre le cachet de 40 ms : c'est un geste, pas une file d'attente.
**Une seule `translateY`.** Pas de rotation, pas de perspective, pas de `preserve-3d`, pas de `backface-visibility`, pas de `z-index` qui saute en cours de keyframe. C'est la totalité du gain de la version pochette : la classe de risque qui produit le symptôme iOS Safari du §1.1 **n'existe plus**, parce qu'aucun texte n'est jamais soumis à une transformation 3D.
Le bas de la carte reste derrière le panneau, le croissant de l'encoche laisse glisser un fragment du contenu — un détail que sa référence a par accident et qui est joli.
640 ms : dans la bande « Scène » du design system, et c'est le mouvement le plus long de la séquence, ce qui est correct — c'est l'événement principal.

**Image 5 — 1320 à 1480 ms. Le second temps mort.**
160 ms. Les prénoms sont sortis, l'invité les lit, la pochette est encore là. Sans ce battement, l'emballage disparaît avant qu'on ait regardé ce qu'il contenait.

**Image 6 — 1480 à 2080 ms. Tout part sauf la carte.**
Le champ crème s'efface, la pochette s'efface **et descend de 48 px** — elle retombe, elle a fait son travail — et l'ombre de la carte s'efface avec elle. La carte reste **rigoureusement immobile**.
**C'est cette immobilité qui fait la scène.** Tout ce qui part est de l'emballage ; ce qui reste est la chose. Si la carte bougeait aussi, on aurait un générique de début ; comme elle ne bouge pas, on a un objet qu'on vient de sortir de sa pochette.

**Image 7 — 2080 à 2240 ms. La carte se confond avec la page.**
Elle s'efface en 160 ms. Derrière elle, le héros porte les mêmes prénoms, au même corps, à la même place, sur le même ivoire. Le fondu est **doublement** imperceptible : l'ombre est déjà partie, et une carte ivoire sans ombre sur un champ crème mesure **1,13:1**. Il n'y a rien à raccorder.

**Image 8 — 2240 à 2560 ms. Le motif se déroule.**
Le motif d'ourlet — la tige dorée et la fleur bordeaux, 96 px — se **découvre de gauche à droite** : le SVG passe de `translateX(-100%)` à `0` dans un conteneur en `overflow: hidden`.
**Pourquoi pas `stroke-dashoffset`**, qui serait le réflexe pour « tracer » un trait : ce n'est ni `transform` ni `opacity`, c'est une propriété de peinture, et elle force un repaint du tracé à chaque image. La règle n° 3 l'interdit. La translation sous masque produit le même effet **sur le compositeur**.
**C'est la signature.** L'unique ornement du héros est celui que la pochette dépose en partant, et il est tiré de l'ourlet de sa robe. Un ornement qui a une cause narrative n'est plus une décoration.

**Total : 2 560 ms.** L'invité lit son nom à 0 ms, les prénoms à 1 320 ms. Il n'attend jamais : il regarde.

### 8.4 Les issues de secours — la partie qui décide si la fonctionnalité est acceptable

**Interruption.** Un bouton `Passer l'animation` en haut à droite, présent **dès t = 0**, focusable, cible 44 × 44 px minimum. Le champ étant crème depuis la révision 2 : texte `#6E1F35` sur `#F2EAE0` (**9,22:1**), anneau de focus `#6E1F35`.
Interrompent également : `pointerdown`, `keydown`, `wheel`, `touchmove`, `scroll` sur `window`.
L'interruption applique une classe `.scene-done` : la surcouche passe en `opacity: 0` sur **200 ms**, puis est démontée sur `transitionend`. Le motif d'ourlet de la page apparaît alors **directement en place, sans animation** — l'invité a demandé moins, on lui donne moins.

**`prefers-reduced-motion: reduce`.** La surcouche **n'est pas montée du tout** (test `matchMedia` avant le rendu, pas une animation neutralisée après coup). L'invité arrive sur la page finie, filet doré compris, immédiatement. Ce n'est pas une version dégradée : c'est la même page, sans le préambule. Plus, globalement :

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 1ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 1ms !important;
    scroll-behavior: auto !important;
  }
}
```

**Le garde-fou. C'est la ligne la plus importante de la fonctionnalité.**

```
setTimeout(dismiss, 3200)   // armé au montage, indépendant de tout animationend
```

Si l'animation ne démarre pas, si `animationend` ne se déclenche jamais, si un bug de peinture bloque une image — **la surcouche s'en va quand même à 3 200 ms**. Sans ce filet, un défaut de rendu transforme l'invitation en mur bordeaux et le mariage perd des réponses. Ne pas se reposer sur `animationend` seul.

**Onglet en arrière-plan.** Si `document.visibilityState !== "visible"` au montage, la scène est sautée. Un invité qui ouvre le lien dans un onglet d'arrière-plan reviendrait sur une animation à moitié jouée.

**Une seule fois par session.**
Clé : `sessionStorage["invitation:scene:" + linkId]`, **écrite à t = 0**, pas à la fin. Un rechargement au milieu de la scène ne la rejoue pas.
Clé indexée sur le `linkId` : sur un téléphone partagé, l'ouverture du lien d'un autre foyer rejoue bien sa propre scène.
**Rejeu :** un bouton texte `Revoir l'ouverture` dans le pied de page, Source Sans 3 14 px, `#FBF8F4` souligné sur la bande bordeaux 900. Il vide la clé et remonte la surcouche.

**Performance.**
- **3 éléments animés**, `transform` et `opacity` exclusivement. **Aucune transformation 3D nulle part.**
- `will-change: transform` sur **la carte uniquement**, posé au montage et **retiré au démontage**. Un `will-change` laissé en place promeut une couche à vie et coûte de la mémoire sur les téléphones d'entrée de gamme.
- Aucun `filter`, aucun `backdrop-filter` : coût de compositing prohibitif sur iOS.
- `box-shadow` **statique**, portée par un élément séparé dont on anime l'`opacity`. Jamais animée directement.
- Le masque de l'encoche est **statique** : rastérisé une fois.
- `contain: layout paint` sur la surcouche.

**Critère de recette :** en throttling CPU ×6 dans les outils de développement, la scène doit tenir **≥ 50 images/s** et ne provoquer **aucun** événement de layout dans le panneau Performance.

### 8.5 La technique recommandée

**CSS pur — `@keyframes` avec décalage par `animation-delay`. Aucune dépendance.**

Trois raisons, dans l'ordre d'importance :

1. **Une animation CSS tourne sur le fil du compositeur, une animation JS sur le fil principal.** Or au moment exact où la scène démarre, le fil principal de React est occupé à monter la page, hydrater React Query et poser les écouteurs. Sur un Android d'entrée de gamme cela peut monopoliser 300 à 600 ms. Une séquence pilotée en JS **saccade précisément là** ; une séquence CSS ne s'en aperçoit pas. C'est l'argument décisif, et il correspond exactement au symptôme rapporté sur les produits concurrents.
2. **`prefers-reduced-motion` traité en CSS ne peut pas échouer.** Si le JS ne s'exécute pas, la requête média s'applique quand même. Une gestion en JS ajoute un point de rupture au seul endroit où on n'en veut pas.
3. **Le coût.** `motion` (ex-`framer-motion`) v13 pèse **62 Ko gzip / 185 Ko minifiés** en import complet — soit **1,5 fois tout le budget de polices** pour une seule séquence. Réduit au strict minimum (`LazyMotion` + `m`), on reste autour de 18–20 Ko gzip. La séquence est **linéaire, non interactive, non interruptible en cours de geste, jouée une fois** : aucune des capacités que la bibliothèque facture (ressorts, `layout`, gestes, orchestration de sortie, animation de valeurs non composables) n'est utilisée.

**Ce que le JS fait, et rien d'autre** (~40 lignes, dans `EnvelopeScene.tsx`) :
décider du montage (`prefers-reduced-motion`, `sessionStorage`, `visibilityState`) · écrire la clé de session · poser les écouteurs d'interruption · armer le `setTimeout(3200)` · démonter.

**Ce que j'exclus explicitement :**

| Écarté | Motif |
|---|---|
| `motion` / `framer-motion` | 62 Ko gzip pour une séquence linéaire ; tourne sur le fil principal pendant le montage |
| GSAP | Même objection, plus une licence à vérifier |
| Lottie | Un rendu vectoriel piloté en JS pour ce que 5 keyframes CSS font mieux, et impossible à rendre pixel-identique au héros (§7) |
| View Transitions API | Le support Safari est encore inégal et le repli nous ramènerait au CSS de toute façon — autant n'écrire que le CSS |
| Une vidéo / un GIF | Pèse plus que la page, ne peut pas raccorder avec le héros, ne respecte pas `prefers-reduced-motion` |

**Décision qui revient à l'architecte** (arbitrage n° 2) : ma recommandation est **zéro dépendance ajoutée**. Si l'architecte préfère `motion` pour l'homogénéité future de l'app, la chorégraphie ci-dessus se transpose telle quelle — mêmes durées, mêmes easings, mêmes valeurs — mais l'argument n° 1 tombe et il faudra mesurer la scène sur un vrai téléphone d'entrée de gamme avant de la valider.

---

## 9. La composition de la page `/i/:linkId`

Rappel du parti (§1.4) : **le héros est centré, tout ce qui suit est aligné à gauche.** Le basculement d'axe est le seul marqueur de changement de registre.

```
┌──────────────────────────────────────┐
│                                      │  ivoire · 100svh
│         FAMILLE RAVELOSON            │  ← 12px capitales, +0.16em, ink-muted
│                                      │     24px
│              Hobiana                 │  ← Marcellus 44/1.05 · bordeaux-900
│                 &                    │  ← Marcellus 28 · bordeaux-700
│              [Prénom]                │
│                                      │     24px
│         ⌇⌇⌇⌇✿                        │  ← MOTIF D'OURLET 96px  ★ signature
│                                      │     tige or #B08D57 · fleur #6E1F35
│                                      │     24px
│      samedi 12 juin 2027, 18 h       │  ← Marcellus 20 · bordeaux-700
│     Domaine d'Ambohimanga            │  ← Source Sans 16 · ink-muted
│                                      │
│                 │                    │  ← repère de défilement 1×32px, --color-rule
└──────────────────────────────────────┘
                  96px
┌──────────────────────────────────────┐
│  CETTE INVITATION EST ADRESSÉE À     │  ← aligné à gauche à partir d'ici
│  Jean, Marie et Paul                 │  ← Marcellus 24 · bordeaux-900
│  2 places vous sont réservées.       │  ← Source Sans 17 · ink-muted
└──────────────────────────────────────┘
                  96px
┌══════════════════════════════════════┐
║          [ PHOTO DU COUPLE ]         ║  ← pleine largeur, 4/5 mobile · 3/2 ≥768
└══════════════════════════════════════┘     sans texte, sans voile, sans arrondi
                  96px
┌──────────────────────────────────────┐
│  Le jour J                           │  crème · bande pleine largeur
│  ────────────────────────────────    │  ← filet --color-rule 1px
│                                      │     32px
│  QUAND                               │
│  samedi 12 juin 2027 à 18 h 00       │
│  (heure de Madagascar)               │     32px
│  OÙ                                  │
│  Domaine d'Ambohimanga               │
│  Route d'Ambohimanga, Antananarivo   │
│  Voir l'itinéraire →                 │     32px
│  TENUE                               │
│  Tenue de cocktail — teintes claires │     32px
│  STATIONNEMENT                       │
│  Parking gratuit sur place…          │
└──────────────────────────────────────┘
                  96px
┌──────────────────────────────────────┐
│  Votre réponse                       │  ivoire
│  ────────────────────────────────    │
│  Merci de nous répondre avant        │
│  le 1er mai 2027.                    │     32px
│  ┌────────────────────────────────┐  │
│  │ ● Nous serons là               │  │  ← carte-choix sélectionnée
│  └────────────────────────────────┘  │
│  ┌────────────────────────────────┐  │
│  │ ○ Nous ne pourrons pas venir   │  │
│  └────────────────────────────────┘  │     32px
│  COMBIEN SEREZ-VOUS ?                │
│      [ − ]    2    [ + ]             │  ← sélecteur, cibles 44×44
│  2 places vous sont réservées.       │     24px
│  RÉGIME ALIMENTAIRE, ALLERGIES       │
│  ______________________________      │  ← soulignement seul, pas de boîte
│                        facultatif    │     32px
│  ┌────────────────────────────────┐  │
│  │    Envoyer notre réponse       │  │  ← bordeaux-700 plein, h 52px
│  └────────────────────────────────┘  │
└──────────────────────────────────────┘
                  96px  (si seatingPlan ≠ null)
┌──────────────────────────────────────┐
│  À TABLE                             │  crème
│  Table des Baobabs                   │  ← Marcellus 28
│  Famille Rakoto — 4                  │
│  Famille Andria — 2                  │
└──────────────────────────────────────┘
┌══════════════════════════════════════┐
║        Hobiana & [Prénom]            ║  bordeaux-900 · ivoire
║         ──────────                   ║  ← filet doré 64×1px  (5,18:1)
║   12 juin 2027 · Antananarivo        ║
║        Revoir l'ouverture            ║
└══════════════════════════════════════┘
```

### 9.1 Section par section

**§1 — Le héros.** `min-height: 100svh` (`svh`, pas `vh` : la barre d'adresse mobile fausse `vh` et coupe le bas). Fond ivoire. Contenu centré verticalement et horizontalement, `padding: 0 24px`.

L'exergue est **le nom du foyer** — `household.displayName`, en capitales, Source Sans 3 500, 12 px, `+0,16 em`, `ink-muted` (6,03:1). C'est la même chaîne que sur la face de la pochette. La page s'ouvre en nommant son lecteur : c'est la seule information de la page qui soit propre à ce lien, et c'est ce qui fait passer une page web pour du courrier.

Les prénoms : voir la règle de dimensionnement §4.3. L'esperluette sur sa propre ligne, Marcellus 28 px (mobile) / 40 px (≥768), `bordeaux-700`, 8 px d'air au-dessus et au-dessous. *(L'esperluette de Marcellus mesure 0,77 em — c'est un beau dessin, il mérite sa ligne.)*

**Le motif d'ourlet** (révision 2 — remplace le filet doré nu) : SVG en ligne, 96 px de large (128 px ≥ 768), centré, 24 px de part et d'autre. Tige `#B08D57`, fleur `#6E1F35`, `stroke-width: 1.25`, `fill: none`. Spécification complète au §1.5.d. Dans un conteneur `overflow: hidden` ; au repos il est à `translateX(-100%)` si la scène va jouer, à `0` sinon.

La date en Marcellus 20 px `bordeaux-700`, le lieu en Source Sans 3 16 px `ink-muted`.

Le repère de défilement : un trait vertical de 1 × 32 px en `--color-rule`, 24 px du bas. **Il ne bouge pas.** Pas de chevron, pas de « faites défiler », pas de rebond. Une marque qui dit que la page continue.

**§2 — Le bloc d'adressage.** 96 px du héros. Aligné à gauche, dans la colonne de 520 px.
`CETTE INVITATION EST ADRESSÉE À` (libellé 12 px capitales) · les `memberNames` formatés par `Intl.ListFormat("fr-FR")` en Marcellus 24 px `bordeaux-900` · puis `allocatedSeats` en clair : `2 places vous sont réservées.` / `1 place vous est réservée.`
Si `memberNames` est vide : le libellé et les prénoms disparaissent, la ligne de places reste. C'est l'information utile.

**§3 — La photo.** Voir §10. Si aucune photo n'est fournie, **la bande est absente** et les 96 px de part et d'autre fusionnent en 96 px. La page est conçue pour tenir sans elle.

**§4 — Les informations pratiques.** Bande crème `#F2EAE0` **pleine largeur** (bord à bord, elle traverse la gouttière), contenu dans la colonne de 520 px, `padding: 64px 24px`.
Titre `Le jour J` en Marcellus 28/32 px `bordeaux-900`, aligné à gauche, suivi 16 px plus bas du **filet `lamba`** — 64 × 9 px, `--color-bordeaux-700`, rythme 1/2/3/2/1 relevé sur leur `lamba` (§1.5.d). *Révision 2 : remplace le trait `--color-rule` pleine colonne.* Même traitement pour tous les titres de section de la page.
Puis la `<dl>` : `dt` = libellé 12 px capitales `+0,16 em` `ink-muted` · 8 px · `dd` = Source Sans 3 17 px / 1,55 `ink`. **32 px entre les entrées, et aucun filet entre elles** — les capitales structurent déjà.
Les quatre entrées ne sont rendues que si le champ est rempli (comportement actuel, correct, à conserver).

Le lien d'itinéraire : `bordeaux-700`, souligné, `text-underline-offset: 3px`, `text-decoration-thickness: 1px` → `2px` au survol et au focus en 140 ms. `display: inline-block; padding: 10px 0` pour atteindre 44 px de hauteur de cible. Le soulignement ne se retire jamais : c'est le seul lien de la page, il n'y a pas de bleu pour le signaler.

**Deux corrections de contenu, qui relèvent du design parce qu'elles se voient :**
- **`18 h 00`, pas `18:00`.** Convention typographique française, avec espaces insécables fines. La page affiche aujourd'hui `19:00`.
- **`(heure de Madagascar)`, toujours affiché.** Le fuseau doit être celui du lieu (constat MAJEUR du dossier de reprise). Plutôt que d'afficher la mention conditionnellement selon le fuseau du lecteur, l'afficher **systématiquement** : une parenthèse permanente coûte une ligne et supprime toute une classe d'ambiguïté.

**§5 — Votre réponse.** Ivoire, `padding: 96px 24px 64px`. Même traitement de titre qu'au §4.
Deadline : `Merci de nous répondre avant le 1er mai 2027.` **Sans l'heure** — le « 04:00 » actuellement affiché est le bug de fuseau qui affleure, et une heure limite ne veut rien dire pour un invité.

Le formulaire, refondu :

| Élément | Spécification |
|---|---|
| **Le choix** | Deux `radio` en cartes empilées (côte à côte ≥ 520 px). `border: 1px solid #8C7A68` (3,89:1), `radius 2px`, `padding: 20px`, Source Sans 3 500 17 px `ink`. Libellés : `Nous serons là` / `Nous ne pourrons pas venir`. **Poids visuel identique** — le défaut relevé à l'audit (le refus deux fois plus large que l'acceptation) disparaît par construction. |
| **Sélectionné** | `border: 2px solid #6E1F35` · `background: #F9EFF1` · disque plein `bordeaux-700` de 8 px à gauche · `aria-checked`. Trois signaux, jamais la couleur seule. |
| **Le nombre** | Sélecteur `−` / `+`, cibles 44 × 44, valeur entre les deux en Marcellus 28 px. Un vrai `<input type="number" inputMode="numeric">` en dessous pour le clavier et les technologies d'assistance. `min=1`, `max=allocatedSeats`. Au maximum, `+` est `disabled` et la ligne `2 places vous sont réservées.` explique pourquoi. |
| **Le régime** | `<textarea rows=3>`, **soulignement seul** `border-bottom: 1px solid #8C7A68`, pas de boîte, 17 px. Libellé suivi de `facultatif` en 12 px `ink-muted`. |
| **L'envoi** | Un bouton pleine largeur, `Envoyer notre réponse`, aplat `bordeaux-700`, texte `ivory` (10,38:1), hauteur 52 px, `radius 2px`, Source Sans 3 600 17 px `+0,02 em`. Survol `#8E3A50` en 140 ms. |
| **En cours** | Libellé → `Envoi…`, `disabled`, `aria-busy="true"`, `opacity: .7`. **Pas de roue de chargement** : le changement de libellé suffit, et le `disabled` corrige le double envoi relevé à l'audit. |
| **Succès** | Le formulaire est **remplacé**, pas complété. Filet `bordeaux-700` 1 px · `C'est noté.` en Marcellus 24 px `bordeaux-900` · la réponse reformulée en Source Sans 3 17 px · un bouton texte `Modifier notre réponse`. |
| **Erreur** | Bloc `background: #F9EFF1`, `border-left: 2px solid #6E1F35`, texte `bordeaux-900` 17 px (9,76:1), **en français**, jamais la chaîne brute de l'API, plus un bouton `Réessayer`. |
| **Clos** | Toute la section est remplacée : bande crème, `Les réponses sont closes.` en Marcellus 24 px, la réponse enregistrée, la ligne de contact des organisateurs. |

**§6 — Votre table.** Rendu si et seulement si l'API renvoie `seatingPlan ≠ null` (invariant 6 — le masquage reste côté serveur). Bande crème. Exergue `À TABLE`, nom de table en Marcellus 28 px, voisins en liste `list-style: none` Source Sans 3 17 px / 1,7, chaque ligne `Famille X` puis le nombre en `ink-muted` après un tiret demi-cadratin. Pas de puces : une liste de noms n'en a pas besoin.

**§7 — Le pied de page.** Bande `bordeaux-900` pleine largeur, `padding: 64px 24px 48px`, centrée. Les deux prénoms en Marcellus 24 px `ivory` (15,12:1) · filet doré 64 × 1 px (5,18:1 — **le seul endroit où l'or est lumineux**) · `12 juin 2027 · Antananarivo` en Source Sans 3 14 px `+0,08 em` `ivory` · le bouton texte `Revoir l'ouverture`, souligné, focus ivoire.

### 9.2 Le budget vertical

Estimation à 375 × 812, photo comprise :

| Section | Hauteur |
|---|---|
| Héros | 812 (100svh) |
| Adressage | ~180 + 96 d'air |
| Photo (4/5 sur 375) | 469 + 96 |
| Informations pratiques | ~640 + 96 |
| Votre réponse | ~700 + 96 |
| Pied de page | ~300 |
| **Total** | **≈ 3 485 px — 4,3 écrans** |

À comparer aux **882 px / 1,09 écran** d'aujourd'hui. C'est le rythme demandé, pas un gonflement : la page passe de « une fiche » à « un document ».

---

## 10. Les photos — **réécrit en révision 2, les fichiers sont arrivés**

### 10.1 Le choix

| Fichier | Verdict |
|---|---|
| `old images - fiancailles/DSC_3541.jpg` — 6016 × 4016 | **Retenu.** C'est la photo de la page. |
| `old images - fiancailles/DSC_3536.jpg` — 4016 × 6016 | Réserve. Le couple y est encore plus petit dans le cadre, et le bâtiment mange les deux tiers hauts. |
| `old images - fiancailles/DSC_2817.jpg` — 6016 × 4016 | Non examiné en détail, du même reportage. À regarder si `3541` ne suffit pas. |
| `WhatsApp…(2)` et `(3)` — plage | **Écartés de la composition principale.** Dominante bleu-vert, t-shirts blancs, registre d'instantané. Ils se battraient avec le bordeaux et rompraient le registre. Ils pourraient servir ailleurs (un remerciement après le mariage), pas ici. |

### 10.2 Le recadrage — la découverte utile

**Le problème apparent** de `DSC_3541` — verrière baignée de LED magenta, haies très vertes, couple occupant 19 % de la largeur — **disparaît en recadrant serré.** J'ai produit et regardé le recadrage ; à hauteur de buste, il ne reste que des carnations, de l'ivoire et du bordeaux. La verrière devient un flou mauve très désaturé qui fonctionne comme une atmosphère, pas comme une couleur concurrente. Les haies sortent du cadre. **Le recadrage serré est déjà dans la palette.**

**Deux recadrages art-dirigés, pas un `object-position`.** Le couple est trop petit dans le cadre d'origine pour qu'un seul `cover` serve à la fois le portrait mobile et le paysage bureau.

| Sortie | Rapport | Rectangle source dans `DSC_3541.jpg` | Contenu |
|---|---|---|---|
| **Mobile** (< 768) | **3:4** | `x=2860 y=1500 w=1050 h=1400` | Le couple à mi-cuisse. Broderie de ceinture, motif de jupe, `lamba` et pochette tous lisibles. **Recadrage vérifié.** |
| **Bureau** (≥ 768) | **3:2** | à cadrer, base `x≈2100 y≈1450 w≈2550 h≈1700` | Plan plus large. À valider — il réintroduit une partie de la verrière ; réduire encore si la dominante mauve remonte. |

Servis par `<picture>` avec deux `<source media>` — **direction artistique, pas simple redimensionnement**.

### 10.3 L'étalonnage — ce qu'il faut, et qui le fait

**Un `filter` CSS n'est pas une réponse.** Appliqué à une photo de personnes, `sepia()` / `saturate()` / `hue-rotate()` déplace les carnations. Il faut des **JPEG étalonnés**, livrés.

Cibles chiffrées, mesurables après coup :

| Ce qu'il faut corriger | Relevé actuel | Cible |
|---|---|---|
| Balance des blancs et exposition sur le tissu ivoire de la robe | **`#C8C5CC`** — bleu-magenta et sous-exposé | **≈ `#F4F0EA`** — ivoire chaud, L ≈ 93 % |
| Rouge des broderies | `#8B011B` sous la dominante | **≈ `#9C1B33`** — un cramoisi voisin du bordeaux |
| Fond mauve de la verrière | saturé par le bandeau LED | désaturer de **~30 %** |
| Verts des haies | très saturés | **hors cadre** grâce au recadrage 3:4 ; à défaut, désaturer de 30 % |

> **Qui fait l'étalonnage — à trancher.** Le plus propre est de le demander au photographe qui a les fichiers RAW. Sinon, un passage manuel sur les deux recadrages suffit ; ce n'est pas un sauvetage, c'est un réchauffement.

### 10.4 L'emplacement et la production

**Une seule photo, un seul emplacement.** Bande pleine largeur, bord à bord, entre le bloc d'adressage et les informations pratiques. Pas de photo dans le héros : un texte posé sur une image demande un voile, et un voile sur une identité bordeaux/ivoire la salit. **Pas de seconde photo** — on en retire une plutôt que d'en ajouter une.

| Exigence | Valeur |
|---|---|
| **Ce que je produis** | AVIF + WebP + JPEG, trois largeurs (480 / 960 / 1440) pour chacun des deux recadrages, en `<picture>` + `srcset` + `sizes`. Cible **≤ 120 Ko** pour l'AVIF 960. `loading="lazy"`, `decoding="async"`, `width`/`height` déclarés pour réserver la place. |
| **Traitement** | Aucun arrondi, aucune ombre, aucun cadre, aucune légende. |
| **Aperçu de lien** | Un recadrage **1200 × 630** en plus. L'invitation arrive par message : la vignette est la première chose vue, **avant** la page. C'est un livrable à part entière, pas une option. |
| **Ce que je demande en plus** | **Une photo à plat de l'ourlet brodé de la robe** — vêtement posé, lumière égale, prise perpendiculaire, ~2000 px de large. Elle ne va pas dans la page : elle sert à **tracer le motif de signature** (§1.5.d). Sans elle, je trace depuis `DSC_3541` et le motif sera une lecture stylisée, pas un relevé fidèle. |

**Si le commanditaire refuse la photo :** la bande est absente et la page est complète sans elle. Le héros, le motif d'ourlet et le filet `lamba` portent seuls. Ce n'est pas un repli de secours — c'est un état conçu.

---

## 11. L'admin, en une page

Mêmes jetons, registre inversé : **dense, sobre, rien ne bouge.**

| Point | Spécification |
|---|---|
| **Fonds** | Page `ivory #FBF8F4`. En-têtes de tableau et panneaux `cream #F2EAE0`. Filets `--color-rule #E1D5C4`. Bordures de champ `--color-rule-strong #8C7A68`. |
| **Typographie** | **Marcellus uniquement sur le `h1` de page, 24 px.** Rien d'autre. C'est ce qui rattache l'outil au produit sans le costumer. Tout le reste en Source Sans 3. |
| **Échelle** | 12 (libellés capitales) · 14 (cellules) · 16 (corps, **tous** les champs) · 20 (titres de section) · 24 Marcellus (titre de page). |
| **Densité** | Ligne de tableau 44 px, `padding: 12px 16px`, texte 14 px. `tabular-nums` sur toute colonne numérique. |
| **Navigation** | Barre horizontale, lien actif = aplat `bordeaux-700` + texte `ivory` (10,38:1). Elle occupe aujourd'hui 137 px sur trois lignes en mobile : la replier derrière un menu sous 640 px, ou la passer en défilement horizontal d'une seule ligne. |
| **Statuts** | Les trois puces du §3.5 — libellé + forme + teinte, jamais la teinte seule. |
| **Destructif** | Le protocole du §3.4 — pas de second rouge. |
| **Mouvement** | Régime micro (140 ms) sur `background-color`, `border-color`, `color`, `outline-color`. **Rien d'autre.** Pas de transition de page, pas de squelette scintillant : un bloc crème immobile aux bonnes dimensions. |
| **Le lien invité** | Le geste central de l'organisateur. Un bouton `Copier le lien` avec l'icône `lucide-react` `Link`, cible 44 × 44, et une confirmation textuelle `Lien copié` de 2 s en `bordeaux-700` — pas une notification flottante animée. |

---

## 12. Ce qui demande un arbitrage du commanditaire

| # | Question | Ma recommandation | Ce qui est bloqué sans réponse |
|---|---|---|---|
| **1** | **Marcellus** comme famille display ? | Oui. Argumenté et mesuré au §4.2. Repli : Cormorant Garamond, avec corps de texte à 20 px minimum. | Rien à court terme — les jetons peuvent être posés et la famille échangée en une ligne. Mais le héros a été dimensionné sur les métriques de Marcellus. |
| **2** | **Aucune dépendance d'animation** (CSS pur) ? | Oui. Décision qui appartient à l'architecte (§8.5). | L'intégration de la scène. |
| **3** | **Les deux prénoms** : orthographe exacte avec accents, ordre voulu, `&` ou `et`, prénoms seuls ou prénoms + noms. | — | **Le dimensionnement du héros** (§4.3), la carte de la scène, le pied de page, le `<title>`, l'aperçu de lien. C'est le blocage le plus dur. |
| **4** | **La photo** — sera-t-elle fournie, et au format du §10 ? | Une seule, horizontale, 2400 × 1600 minimum, plus un recadrage 1200 × 630 pour l'aperçu. | La bande photo et l'aperçu de lien. La page fonctionne sans. |
| **5** | **Le champ `message`.** Il est dans la charge utile publique et n'est jamais rendu. La spec le liste à la fois **hors périmètre V1** (§ « message personnel libre », ligne 38) **et** comme champ accepté par `PATCH /invitation/:linkId/rsvp` (ligne 124). Contradiction à trancher. | Si `message` est un **mot de l'invité aux mariés** : l'ajouter au formulaire RSVP, `<textarea>`, libellé `Un mot pour les mariés` + `facultatif`, sous le régime alimentaire. C'est trois lignes de composition et une vraie valeur pour le couple. Si c'est un **mot personnalisé de l'organisateur au foyer** : le rendre au §2, sous les prénoms, en Marcellus 20 px, en italique — mais nous n'avons pas d'italique chargée, donc en Source Sans 3 17 px. **Je penche pour la première lecture.** | Une section du formulaire RSVP. |
| **6** | **L'olive `#3F5D45`** ajoutée pour le statut `CONFIRMED` en admin. C'est une quatrième teinte hors palette. | Acceptée, contenue au back-office, jamais côté invité. L'alternative monochrome (trois puces bordeaux différenciées par la forme seule) est possible mais ralentit le balayage d'un tableau de 40 lignes. | Les puces de statut. |
| **7** | **Le fuseau affiché.** `(heure de Madagascar)` en permanence après l'heure. | Oui — permanent plutôt que conditionnel. | Le rendu de la date, qui est déjà à corriger pour le bug de fuseau. |
| **8** | **Afficher `allocatedSeats` à l'invité** (« 2 places vous sont réservées »). Ce n'est aujourd'hui jamais montré. | Oui, à deux endroits : le bloc d'adressage et sous le sélecteur de convives. | Deux lignes de la composition. |

### Arbitrages ajoutés en révision 2

| # | Question | Ma recommandation | Ce qui est bloqué sans réponse |
|---|---|---|---|
| **9** | **Le doré.** La décision arrêtée le 2026-08-22 fixe `#B08D57` et je ne la rouvre pas. Mais j'ai relevé le doré de **sa propre référence** : le script de la pochette de velours est **`#AC784C`**. Il mesure **3,58:1 sur ivoire** là où `#B08D57` échoue à **2,92:1** — il franchit donc le seuil 3:1 des éléments non textuels. En contrepartie il descend à 4,23:1 sur bordeaux 900 (contre 5,18) et reste sous 4,5 : **il ne porterait toujours jamais de texte.** Ce n'est pas « assombrir l'or pour le rendre utilisable » — c'est *son* or, et il se trouve qu'il est plus lisible. | **Signalé, pas décidé.** Ma préférence va à `#B08D57` par respect de la décision arrêtée : `#AC784C` est plus orangé (H 27° contre 36°) et perd un peu du caractère patiné. Mais le commanditaire mérite de savoir que sa propre référence est plus conforme que notre jeton. | Rien. Un changement d'une ligne dans `@theme`, à tout moment. |
| **10** | **La pochette à encoche remplace l'enveloppe à rabat.** Décision technique et de composition, argumentée au §1.5.b. | Oui, sans réserve. Elle supprime toute la classe de risque 3D et le geste est vertical, comme l'écran. | Le §8, donc toute l'intégration de la scène. **À valider avant d'écrire une ligne de CSS.** |
| **11** | **Le motif d'ourlet comme signature**, tiré de la broderie de la robe, en remplacement du filet doré nu. Et le **filet `lamba`** comme filet de section. | Oui aux deux. C'est ce qui distingue leur invitation de tous les faire-part bordeaux du web, et ça ne pèse rien. | Le tracé du motif — et il me faut **une photo à plat de l'ourlet** (§10.4). |
| **12** | **Les aquarelles florales et le cadre heptagonal de sa référence sont abandonnés.** À lui dire explicitement, avec l'argument du §1.5.e : la densité est bon marché sur papier, chère sur un téléphone, et un motif tiré de la robe de sa fiancée bat une rose de banque d'images. | Assumer la conversation plutôt que de livrer un écart silencieux. C'est le point le plus susceptible de le surprendre. | Rien techniquement. Tout, en confiance. |
| **13** | **Qui étalonne les photos** — le photographe sur les RAW, ou nous sur les JPEG ? Cibles chiffrées au §10.3. | Le photographe, si les RAW sont accessibles. | La bande photo. La page fonctionne sans. |

---

## 13. La suite — état au moment de la révision 2

### Ce qui est terminé

§1 recherche · §1.5 références et photos du commanditaire · §2 parti pris · §3 palette complète avec tous les ratios mesurés · §4 typographie complète avec métriques, échelle, chargement et replis · §5 espacement · §6 mouvement · §7 architecture de la scène · §8 chorégraphie version pochette · §10 photos · §11 admin · §12 arbitrages.

Le §9 (composition) a été mis en cohérence avec la révision 2 : le filet doré nu du héros est devenu le motif d'ourlet, et le trait neutre sous les titres de section est devenu le filet `lamba`. **Il ne subsiste aucune contradiction connue dans le document.**

### Ce qui reste à faire, dans l'ordre

1. **Tracer le motif d'ourlet en SVG**, après réception de la photo à plat de l'ourlet (§10.4). Sans elle, tracé stylisé depuis `DSC_3541`, à assumer devant le commanditaire.
2. **Produire les deux recadrages étalonnés** (§10.2, §10.3) et leurs six dérivés AVIF/WebP/JPEG, plus la vignette 1200 × 630.
3. **Valider le recadrage 3:2 bureau** — le rectangle donné au §10.2 est une base, pas un relevé : il réintroduit une partie de la verrière mauve. Le 3:4 mobile, lui, est vérifié.
4. **Faire valider les arbitrages 3, 10, 11 et 12** — ce sont les quatre qui bloquent réellement. Le n° 3 (les prénoms exacts) est le plus dur : il conditionne le dimensionnement du héros, la carte de la scène, le pied de page, le `<title>` et l'aperçu de lien.
5. **Annexe B** — la chorégraphie « enveloppe C6 à rabat » de la révision 1 n'a pas été recopiée en annexe faute de budget. Elle est intégralement récupérable dans l'historique git de ce fichier (premier commit de `docs/design/`). Son intérêt est documentaire : elle explique *pourquoi* la version pochette a été préférée, argument par argument, au §1.5.b — lequel suffit en pratique.

### Les décisions qui ne se devinent pas en relisant le document

Cinq raisonnements qui ont coûté cher à établir et qu'un relecteur pressé défera sans le savoir.

1. **La carte de la scène et le héros de la page sont le même dessin, à la même place.** Ce n'est pas une coïncidence de maquette : c'est ce qui permet au fondu final de n'avoir *rien à raccorder*. Si quelqu'un « améliore » le héros sans toucher la carte, ou l'inverse, la scène se met à sauter et personne ne comprendra pourquoi. **Les deux doivent partager le même composant.**
2. **La pochette est tenue basse, pas centrée.** `top: 350` sur 812, soit 70 px du bas. C'est calculé pour que la carte, après ses 140 px de montée, **finisse centrée**. Recentrer la pochette « parce que c'est plus propre » casse le point n° 1.
3. **L'ombre de la carte est un élément séparé.** Elle n'est pas un `box-shadow` sur la carte. Elle est isolée pour pouvoir s'effacer en `opacity`, la règle n° 3 interdisant d'animer une ombre. Fusionner les deux éléments « pour simplifier le DOM » réintroduit une animation de peinture.
4. **Le champ de la scène est crème, pas bordeaux.** J'ai écrit la v1 avec une surcouche bordeaux plein écran, puis je l'ai abandonnée en voyant sa référence : elle photographie la pochette **sur un papier beige**. Le champ clair donne 9,22:1 de séparation contre 1,46:1, et rend le fondu final invisible. Le bordeaux profond n'a pas disparu — il est au pied de page, où l'or mesure 5,18:1.
5. **Le `setTimeout(dismiss, 3200)` n'est pas une ceinture et bretelles.** C'est ce qui empêche un défaut de peinture de transformer l'invitation en écran bloqué. `animationend` n'est pas garanti. **Ne pas le retirer**, même si les tests passent sans lui.

### Les pièges de cet environnement, pour le suivant

- **Les captures d'écran ne fonctionnent pas.** Tout ce qui est mesuré ici l'a été par `getComputedStyle`, par canevas via `javascript_tool`, et par téléchargement effectif des fichiers de police. C'est plus fiable qu'une capture, mais plus lent à écrire.
- **Ni Python, ni ImageMagick, ni `sharp`.** Pour recadrer et échantillonner les photos, j'ai appelé `System.Drawing` depuis PowerShell (`powershell.exe -NoProfile -Command`). Ça marche bien, y compris `GetPixel` pour l'échantillonnage. Le `convert` du `PATH` est l'outil de disque Windows, pas ImageMagick.
- **Les polices ne se chargent pas via un `<link>` injecté** dans la page de dev — `document.fonts.check` renvoie `false`. Il faut passer par l'API `FontFace` avec l'URL `gstatic` directe, puis `document.fonts.add`.
- **Je ne me suis pas connecté à l'admin** — je ne saisis pas de mot de passe dans un formulaire. Le §11 est établi depuis les sources et l'API, ce qui suffit largement pour un registre sobre et dense.

---

## Annexe — sources consultées

- [Paperless Post — Online Invitations](https://www.paperlesspost.com/online-invitations) et [How to Customize Your Paperless Post Invitations](https://www.paperlesspost.com/blog/how-to-customize-your-online-invitations/) — l'enveloppe nominative, les doublures, le catalogue d'options
- [Woman Getting Married — Paperless Post Review 2026](https://www.womangettingmarried.com/paperless-post/) — l'effet comportemental de l'adressage nominatif
- [Greenvelope — What Is an Animated Envelope Invitation?](https://www.greenvelope.com/resources/animated-envelope-invitations) et [Greenvelope](https://www.greenvelope.com/) — la séquence, la doublure, la musique de fond
- [InviteDrop — Greenvelope comparison](https://www.invitedrop.com/blog/specialty-invites-vs-greenvelope) — le symptôme de fluidité sur iOS Safari
- [Saahil Jaffer — How I Designed a Digital Invitation That Opens Like a Real Card](https://www.saahiljaffer.com/articles/how-i-designed-a-digital-invitation-that-opens-like-a-real-card) — la mise en œuvre CSS la plus détaillée trouvée : paliers de `rotateX`, `transform-origin`, empilement `z-index`
- [CodeWebStack — 3D Envelope Animation using HTML CSS](https://codewebstack.com/3d-envelope-animation-using-html-css/) — le squelette DOM à quatre panneaux
- [CodePen — MrBlank / JjXxovL](https://codepen.io/MrBlank/pen/JjXxovL) et [robsonsilva / OWeNRL](https://codepen.io/robsonsilva/pen/OWeNRL) — variantes du même squelette
- [Paperlust — Burgundy and Blush Wedding](https://paperlust.co/blog/burgundy-and-blush-wedding/) et [burgundy and gold invitations](https://paperlust.co/browse/wedding-invitations/burgundy-and-gold/) — letterpress bordeaux sur coton ivoire, dorure à chaud
- [Plan The Aisle — Burgundy & Gold Wedding Color Palette](https://plantheaisle.com/colors/burgundy-and-gold) — les valeurs de référence du marché (`#722F37`, `#F5F0E8`, `#C9A55A`)
- [Paperlust — Wedding Invitation Fonts](https://paperlust.co/blog/wedding-invitation-fonts/) et [The Denizen Co. — 8 Font Pairings For Your Wedding Website](https://www.thedenizenco.com/journal/font-pairings-for-your-wedding-website) — la confirmation que Cormorant Garamond + Montserrat est le couple par défaut de la catégorie
- [MadeGoodDesigns — Best Wedding Fonts 2026](https://madegooddesigns.com/wedding-fonts/) — Marcellus, ses serifs, ses appariements usuels

**Mesures faites moi-même, non issues d'une source :** tous les ratios de contraste (script WCAG 2.1), toutes les métriques de police (canevas, à 100 px, polices chargées via `FontFace`), tous les poids de fichiers (téléchargement effectif depuis `fonts.gstatic.com`), le poids de `framer-motion` v13 (API Bundlephobia : 62 054 o gzip / 185 337 o), et les mesures de la page actuelle (`getComputedStyle` sur `/i/:linkId` à 375 × 812).

---

## ADDENDUM — 2026-08-23, après visionnage de la vidéo de référence

La vidéo que le commanditaire citait a été décomposée avec `ffmpeg` (planches dans `images/video/`, non versionnées). **Elle ne contient aucune enveloppe.**

Sa séquence d'ouverture, relevée à 2 images/seconde :

1. **0 → 1,5 s** — la photo du couple se dévoile par un **balayage vertical**, un voile blanc descendant du haut vers le bas
2. **1,5 → 4,5 s** — le titre puis les prénoms **s'écrivent trait par trait**, en calligraphie, par-dessus la photo. Ce n'est pas un fondu : le tracé se dépose comme sous une main
3. En parallèle, le bloc de date et la ligne de présentation apparaissent en fondu simple

**La conséquence pour ce projet.** Le motif brodé de l'ourlet est lui aussi un tracé — tige ondulante, fleur en contour, épaisseur constante. La technique qui écrit les prénoms (`stroke-dasharray` / `stroke-dashoffset` sur un tracé SVG) est **exactement** celle qui brode le motif. Un seul geste peut donc porter toute la page : elle s'écrit et se brode, comme la robe l'a été.

**Décision du commanditaire :** les deux mises en scène seront construites et comparées sur pièce.

- **Version A — la pochette** (§8 ci-dessus, inchangé) : la carte coulisse hors de sa pochette bordeaux. **À construire en premier.**
- **Version B — le tracé** : balayage de la photo, puis prénoms et motif brodé qui s'écrivent.

Les deux partagent la même page composée (§9) ; elles ne diffèrent que par la surcouche. C'est ce qui rend la comparaison honnête et le travail non perdu : la composition sert dans les deux cas.
