import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AdminSettingsDto } from "@invitation-app/shared";
import { api } from "@/lib/api";
import {
  WEDDING_TIME_ZONE_LABEL,
  WEDDING_UTC_OFFSET_LABEL,
  depuisSaisieMadagascar,
  formatRsvpDeadline,
  versSaisieMadagascar,
} from "@/lib/datetime";
import { MAX_TELEPHONES, erreursTelephones } from "@/lib/telephone";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { AccountSection } from "@/components/AccountSection";
import { useMediaQuery } from "@/lib/useMediaQuery";

/**
 * Un champ facultatif vidé part en `null`, jamais en `""` : une chaîne vide
 * traverse le contrat comme une valeur, et la page invité en ferait une ligne
 * blanche. Le serveur referme la même porte (`blankToNull`) pour un `curl` ;
 * celle-ci évite l'aller-retour. On constate qu'un champ est vide, on ne
 * réécrit pas ce qui est saisi.
 */
function blankToNull(value: string): string | null {
  return value.trim() === "" ? null : value;
}

/** Le plafond de `UpdateSettingsDto.maxGuests` côté API (`@Max(10000)`). */
const SEUIL_PLAFOND = 10000;

/**
 * Lit la saisie du seuil d'invités. Vide = « aucun seuil » = `null`, même règle
 * que `blankToNull` ; jamais `0`, qui voudrait dire « personne ». Les refus sont
 * rédigés ici, en français : le 400 de l'API est en anglais et ne s'affiche pas.
 */
function lireSeuil(saisie: string): { valeur: number | null } | { erreur: string } {
  const texte = saisie.trim();
  if (texte === "") return { valeur: null };
  // Des chiffres seulement : `Number("12.5")`, `Number("1e3")` ou `Number("0x10")`
  // passeraient un contrôle plus lâche.
  const valeur = /^\d+$/.test(texte) ? Number(texte) : Number.NaN;
  if (!Number.isInteger(valeur) || valeur < 1) {
    return { erreur: "Indiquez un nombre entier d'au moins 1, ou laissez le champ vide." };
  }
  if (valeur > SEUIL_PLAFOND) {
    return { erreur: "Le seuil ne peut pas dépasser 10 000 invités." };
  }
  return { valeur };
}

/** Le seuil tel que la case l'affiche quand on n'y a pas touché. */
function seuilEnTexte(maxGuests: number | null | undefined): string {
  // `typeof` plutôt que `=== null` : une API pas encore migrée omet le champ, et
  // la case afficherait alors le mot « undefined ».
  return typeof maxGuests === "number" ? String(maxGuests) : "";
}

/**
 * Ce que « Enregistrer » enverrait, sans le seuil (gardé en texte à part) ni
 * l'interrupteur (qui part seul). Sert à dire si quelque chose a changé : les
 * facultatifs passent par `blankToNull`, donc un `null` du serveur et une case
 * vide à l'écran sont la même valeur — pas de fausse alerte.
 */
function corpsDuFormulaire(s: AdminSettingsDto) {
  return {
    weddingDate: s.weddingDate,
    rsvpDeadline: s.rsvpDeadline,
    venueName: s.venueName,
    address: s.address,
    mapUrl: blankToNull(s.mapUrl ?? ""),
    dressCode: blankToNull(s.dressCode ?? ""),
    parkingInfo: blankToNull(s.parkingInfo ?? ""),
  };
}

function memesValeurs(a: AdminSettingsDto, b: AdminSettingsDto): boolean {
  const ca = corpsDuFormulaire(a);
  const cb = corpsDuFormulaire(b);
  return (Object.keys(ca) as (keyof typeof ca)[]).every((cle) => ca[cle] === cb[cle]);
}

/**
 * Le lien de la carte, s'il peut s'ouvrir sans danger. Un `javascript:` posé en
 * `href` s'exécuterait au clic dans la session de l'organisateur : seuls http
 * et https passent, comme sur la page invité.
 */
function lienOuvrable(saisie: string | null): string | null {
  const texte = (saisie ?? "").trim();
  if (texte === "") return null;
  try {
    const url = new URL(texte);
    return url.protocol === "http:" || url.protocol === "https:" ? texte : null;
  } catch {
    return null;
  }
}

/**
 * Les numéros tels que le serveur les connaît. Une API lancée avant la
 * migration omet le champ : on présente alors une ligne vide plutôt que rien,
 * puisqu'au moins un numéro est exigé.
 */
function telephonesDuServeur(s: AdminSettingsDto): string[] {
  return Array.isArray(s.contactPhones) ? s.contactPhones : [];
}

function memesTelephones(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((t, i) => t === b[i]);
}

/** « Heure de Madagascar (UTC+3) » : la mention posée sous les dates. */
const MENTION_FUSEAU = `${WEDDING_TIME_ZONE_LABEL.charAt(0).toUpperCase()}${WEDDING_TIME_ZONE_LABEL.slice(1)} (${WEDDING_UTC_OFFSET_LABEL})`;

/** La colonne de la maquette : 690 px, centrée, une seule sur téléphone. */
const colonne = "mx-auto w-full max-w-reglages";

export function SettingsPage() {
  const queryClient = useQueryClient();
  // Téléphone seulement : sur bureau le rail porte déjà la déconnexion.
  const telephone = useMediaQuery("(max-width: 767px)");
  const { data, isError } = useQuery({
    queryKey: ["settings"],
    queryFn: () => api.get<AdminSettingsDto>("/admin/settings"),
  });
  // La saisie locale. Elle n'est pas réinitialisée par un refetch (après la
  // bascule du plan de table, par exemple) : il ne doit pas écraser ce que
  // l'organisateur est en train de taper sans l'avoir enregistré.
  const [saisie, setSaisie] = useState<AdminSettingsDto | null>(null);
  const form = saisie ?? data ?? null;
  // Le seuil se garde en texte tant qu'il est saisi : un `number` ne sait pas
  // représenter « 12. » ou « abc », et le refus doit porter sur ce qui est tapé.
  // `null` = pas encore touché, on affiche alors la valeur du serveur.
  const [seuilSaisi, setSeuilSaisi] = useState<string | null>(null);
  const [erreurSeuil, setErreurSeuil] = useState<string | null>(null);
  // Les numéros, gardés à part comme le seuil : une liste ne se compare pas
  // par `===`, et elle ne part dans le PATCH que si elle a changé. `null` =
  // pas encore touchée. Un refetch (bascule du plan de table) ne l'écrase pas.
  const [telephonesSaisis, setTelephonesSaisis] = useState<string[] | null>(null);
  const [erreursTel, setErreursTel] = useState<(string | null)[]>([]);

  const idAideDates = useId();
  const idFuseau = useId();
  const idAideTenue = useId();
  const idAideSeuil = useId();

  // Deux mutations et non une : la bascule du plan de table et l'enregistrement
  // du formulaire ont chacun leur attente et leur échec, et seul le second
  // remet la saisie locale à zéro.
  const enregistrement = useMutation({
    mutationFn: (dto: Partial<AdminSettingsDto>) => api.patch("/admin/settings", dto),
    // On relit le serveur plutôt que de croire la saisie, puis on rend la main
    // aux valeurs relues : la barre dit alors « à jour » sur ce qui est
    // réellement en base. Attendre le refetch évite d'afficher un instant les
    // anciennes valeurs.
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["settings"] });
      setSaisie(null);
      setSeuilSaisi(null);
      setTelephonesSaisis(null);
      setErreursTel([]);
    },
  });

  const bascule = useMutation({
    mutationFn: (actif: boolean) => api.patch("/admin/settings", { seatingPlanActivated: actif }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["settings"] }),
  });

  if (isError) {
    return (
      <div className="px-4 py-6 md:p-8">
        <div className={colonne}>
          <p role="alert" className="font-medium text-bordeaux-700">
            {"Les paramètres n'ont pas pu être chargés. Rechargez la page, et réessayez dans un instant."}
          </p>
        </div>
      </div>
    );
  }

  if (!form || !data) {
    return (
      <div className="px-4 py-6 md:p-8">
        <div className={`${colonne} space-y-4`} role="status">
          <span className="sr-only">Chargement des paramètres…</span>
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="h-44 w-full rounded-card" />
          <Skeleton className="h-56 w-full rounded-card" />
          <Skeleton className="h-56 w-full rounded-card" />
        </div>
      </div>
    );
  }

  const seuilEnregistre = seuilEnTexte(data.maxGuests);
  const seuilAffiche = seuilSaisi ?? seuilEnTexte(form.maxGuests);
  const telephonesEnregistres = telephonesDuServeur(data);
  const telephonesAffiches =
    telephonesSaisis ?? (telephonesEnregistres.length > 0 ? telephonesEnregistres : [""]);
  // Les blancs de bord ne comptent pas : « 034 » et « 034 » plus une espace
  // oubliée sont le même numéro, et c'est la version rognée qui part.
  const telephonesAEnvoyer = telephonesAffiches.map((t) => t.trim());
  const telephonesModifies =
    telephonesSaisis !== null && !memesTelephones(telephonesAEnvoyer, telephonesEnregistres);
  const modifie =
    (saisie !== null && !memesValeurs(saisie, data)) ||
    (seuilSaisi !== null && seuilSaisi.trim() !== seuilEnregistre) ||
    telephonesModifies;

  function modifier(patch: Partial<AdminSettingsDto>) {
    if (form) setSaisie({ ...form, ...patch });
  }

  function changerTelephones(suivants: string[], erreurs: (string | null)[]) {
    setTelephonesSaisis(suivants);
    setErreursTel(erreurs);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form) return;
    const seuil = lireSeuil(seuilAffiche);
    const erreurs = telephonesModifies ? erreursTelephones(telephonesAffiches) : [];
    if ("erreur" in seuil) setErreurSeuil(seuil.erreur);
    setErreursTel(erreurs);
    if ("erreur" in seuil || erreurs.some((m) => m !== null)) return;
    // `seatingPlanActivated` reste hors du corps : la bascule est un geste
    // isolé, et un formulaire resté ouvert ne doit pas la réécrire. Les numéros
    // n'y entrent que s'ils ont changé.
    enregistrement.mutate({
      maxGuests: seuil.valeur,
      ...corpsDuFormulaire(form),
      ...(telephonesModifies ? { contactPhones: telephonesAEnvoyer } : {}),
    });
  }

  // Pendant l'aller-retour, l'interrupteur montre déjà la position demandée :
  // sur une 4G faible, une pastille qui ne bouge pas fait recliquer.
  const planActif =
    bascule.isPending && bascule.variables !== undefined ? bascule.variables : data.seatingPlanActivated;
  const carte = lienOuvrable(form.mapUrl);

  return (
    <div className="flex min-h-full flex-col">
      <form onSubmit={handleSubmit} className="flex flex-1 flex-col">
        <div className="flex-1 px-4 pb-6 md:px-8 md:pt-8">
          <div className={`${colonne} space-y-4 md:space-y-5`}>
            <PageHeader
              title="Paramètres du mariage"
              subtitle="Ces informations alimentent l'invitation et le formulaire de réponse."
              className="border-b-0 pb-2 md:pb-3"
            />

            <Section titre="Dates">
              {/* Le fuseau est dit avant les champs et rattaché aux deux : un
                  organisateur à Maurice ou à Paris saisit l'heure du lieu, pas
                  la sienne. Sans cette mention, la conversion serait invisible
                  et il « corrigerait » une heure juste. */}
              <p id={idFuseau} className="text-sm font-medium text-ink">
                {MENTION_FUSEAU}
              </p>
              <div className="grid gap-4 md:grid-cols-2">
                <DateTimeField
                  label="Date du mariage"
                  value={form.weddingDate}
                  enregistree={data.weddingDate}
                  onChange={(v) => modifier({ weddingDate: v })}
                  describedBy={idFuseau}
                />
                {/* Ce champ gouverne à lui seul le verrou des réponses ; avant
                    lui, il ne se changeait qu'en SQL. La seconde 59 : « 23:59 »
                    couvre la minute entière, comme la limite du seed. */}
                <DateTimeField
                  label="Date limite de réponse (RSVP)"
                  value={form.rsvpDeadline}
                  enregistree={data.rsvpDeadline}
                  seconde={59}
                  onChange={(v) => modifier({ rsvpDeadline: v })}
                  describedBy={`${idFuseau} ${idAideDates}`}
                  apercu={
                    // La date telle que l'invitation l'écrira, avec la même
                    // fonction : tout écart avec ce qu'on croit avoir saisi se
                    // voit ici, avant d'enregistrer.
                    `Affichée aux invités : ${formatRsvpDeadline(form.rsvpDeadline)}`
                  }
                />
              </div>
              <p id={idAideDates} className="text-sm text-ink-muted">
                {"Les invités pourront répondre jusqu'à la date limite."}
              </p>
            </Section>

            <Section titre="Lieu">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Lieu" required>
                  <Input
                    className="rounded-field"
                    value={form.venueName}
                    onChange={(e) => modifier({ venueName: e.target.value })}
                  />
                </Field>
                <Field label="Adresse" required>
                  <Input
                    className="rounded-field"
                    value={form.address}
                    onChange={(e) => modifier({ address: e.target.value })}
                  />
                </Field>
              </div>
              <Field label="Lien vers la carte">
                <div className="flex gap-2">
                  <Input
                    className="min-w-0 flex-1 rounded-field"
                    inputMode="url"
                    autoComplete="off"
                    value={form.mapUrl ?? ""}
                    onChange={(e) => modifier({ mapUrl: e.target.value })}
                  />
                  <BoutonTester lien={carte} />
                </div>
              </Field>
            </Section>

            <Section titre="Informations pratiques">
              {/* Conservé pour l'organisateur (il répond au téléphone), mais la
                  page invité ne l'affiche plus : sans cette mention, il le
                  remplit en croyant que ça part sur l'invitation. Sur bureau la
                  mention se tient à droite du libellé, sur téléphone sous le
                  champ — elle n'aurait pas la place à côté. */}
              <Field label="Code vestimentaire" className="relative">
                <Input
                  className="rounded-field"
                  aria-describedby={idAideTenue}
                  placeholder="ex. Tenue de soirée, tons pastel"
                  value={form.dressCode ?? ""}
                  onChange={(e) => modifier({ dressCode: e.target.value })}
                />
                <p id={idAideTenue} className="text-sm text-ink-muted md:absolute md:right-0 md:top-0 md:mt-0">
                  {"Non affiché sur l'invitation"}
                </p>
              </Field>
              <Field label="Informations parking">
                <Textarea
                  className="rounded-field"
                  rows={3}
                  value={form.parkingInfo ?? ""}
                  onChange={(e) => modifier({ parkingInfo: e.target.value })}
                />
              </Field>
              <BlocTelephones
                telephones={telephonesAffiches}
                erreurs={erreursTel}
                onChange={changerTelephones}
              />
            </Section>

            <Section titre="Invités">
              <div className="grid md:grid-cols-2">
                {/* `type="text"` + `inputMode="numeric"` plutôt que
                    `type="number"` : ce dernier vide sa valeur sur une saisie
                    invalide (on ne pourrait plus dire ce qui est refusé) et la
                    molette le modifie au survol. Pas de `pattern` non plus : le
                    message natif suivrait la langue du navigateur, pas celle de
                    l'interface. L'aide est rattachée par l'id du champ, en
                    premier, et posée sous la case comme sur la maquette. */}
                <Field label="Seuil maximum d'invités" error={erreurSeuil}>
                  <Input
                    className="rounded-field tabular-nums"
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    aria-describedby={idAideSeuil}
                    value={seuilAffiche}
                    onChange={(e) => {
                      setSeuilSaisi(e.target.value);
                      setErreurSeuil(null);
                    }}
                  />
                  <p id={idAideSeuil} className="text-sm text-ink-muted">
                    Laissez vide pour ne fixer aucun seuil.
                  </p>
                </Field>
              </div>
              <div className="border-t border-rule pt-4">
                {/* Part tout de suite, seule, sans « Enregistrer » : ni un seuil
                    invalide ni une saisie en cours ne la retiennent, et elle
                    n'emporte rien d'autre que `seatingPlanActivated`. */}
                <Switch
                  label="Plan de table visible par les invités"
                  description={
                    planActif
                      ? "Visible — activation entièrement manuelle."
                      : "Masqué — activation entièrement manuelle."
                  }
                  checked={planActif}
                  disabled={bascule.isPending}
                  onCheckedChange={(actif) => bascule.mutate(actif)}
                />
                {bascule.isError && (
                  <p role="alert" className="mt-2 text-sm font-medium text-bordeaux-700">
                    {"Le plan de table n'a pas pu être modifié. Réessayez dans un instant."}
                  </p>
                )}
              </div>
            </Section>

            {telephone && <AccountSection />}
          </div>
        </div>

        <BarreEnregistrement
          modifie={modifie}
          enCours={enregistrement.isPending}
          echec={enregistrement.isError}
          reussi={enregistrement.isSuccess}
        />
      </form>
    </div>
  );
}

/** Une carte de la maquette : un titre en police d'affichage, une région nommée. */
function Section({ titre, children }: { titre: string; children: ReactNode }) {
  const idTitre = useId();
  return (
    <Card role="region" aria-labelledby={idTitre} className="space-y-4 rounded-card p-5 md:p-6">
      <h2 id={idTitre} className="font-display text-2xl leading-tight text-ink">
        {titre}
      </h2>
      {children}
    </Card>
  );
}

/**
 * Les numéros où joindre les mariés : la page invité les affiche au formulaire
 * et au pied de page. Au moins un (décision du commanditaire), cinq au plus
 * (plafond de l'API). Les refus sont rédigés à l'enregistrement, en français,
 * ligne par ligne ; corriger une ligne efface son refus.
 *
 * Un `fieldset` plutôt qu'une suite de champs : « Numéros de téléphone » est
 * annoncé en entrant dans le groupe, et chaque case garde son libellé visible
 * « Téléphone N ».
 */
function BlocTelephones({
  telephones,
  erreurs,
  onChange,
}: {
  telephones: string[];
  erreurs: (string | null)[];
  onChange: (telephones: string[], erreurs: (string | null)[]) => void;
}) {
  const idAide = useId();
  const idPlafond = useId();
  const champs = useRef<(HTMLInputElement | null)[]>([]);
  // Le champ à focaliser après un ajout ou un retrait : le bouton cliqué
  // disparaît (retrait) ou le nouveau champ n'existe pas encore (ajout).
  const [aFocaliser, setAFocaliser] = useState<number | null>(null);
  useEffect(() => {
    if (aFocaliser === null) return;
    champs.current[aFocaliser]?.focus();
    setAFocaliser(null);
  }, [aFocaliser]);

  const plein = telephones.length >= MAX_TELEPHONES;
  const seul = telephones.length <= 1;

  function remplacer(i: number, valeur: string) {
    onChange(
      telephones.map((t, j) => (j === i ? valeur : t)),
      erreurs.map((m, j) => (j === i ? null : m)),
    );
  }

  function retirer(i: number) {
    onChange(
      telephones.filter((_, j) => j !== i),
      erreurs.filter((_, j) => j !== i),
    );
    setAFocaliser(Math.max(0, i - 1));
  }

  function ajouter() {
    onChange([...telephones, ""], [...erreurs, null]);
    setAFocaliser(telephones.length);
  }

  return (
    <fieldset aria-describedby={idAide} className="space-y-3 border-t border-rule pt-4">
      <legend className="float-left mb-1 w-full text-sm font-medium text-ink">
        Numéros de téléphone
      </legend>
      <p id={idAide} className="clear-left text-sm text-ink-muted">
        Affichés aux invités pour joindre les mariés.
      </p>
      {telephones.map((numero, i) => (
        // L'index pour clé : deux lignes peuvent porter la même saisie le
        // temps d'une correction, et une ligne vide n'a pas d'identité.
        <Field key={i} label={`Téléphone ${i + 1}`} error={erreurs[i] ?? null}>
          <div className="flex gap-2">
            <Input
              ref={(el) => {
                champs.current[i] = el;
              }}
              className="min-w-0 flex-1 rounded-field tabular-nums"
              type="tel"
              inputMode="tel"
              autoComplete="off"
              aria-describedby={idAide}
              value={numero}
              onChange={(e) => remplacer(i, e.target.value)}
            />
            <Button
              type="button"
              variant="outline"
              className="h-auto shrink-0"
              disabled={seul}
              onClick={() => retirer(i)}
              // Cinq « Retirer » identiques ne disent pas lequel. Le nom
              // commence par le texte visible, pour la commande vocale.
              aria-label={`Retirer le téléphone ${i + 1}`}
            >
              Retirer
            </Button>
          </div>
        </Field>
      ))}
      {seul && <p className="text-sm text-ink-muted">Au moins un numéro est obligatoire.</p>}
      <div className="space-y-2">
        <Button
          type="button"
          variant="outline"
          disabled={plein}
          aria-describedby={plein ? idPlafond : undefined}
          onClick={ajouter}
        >
          Ajouter un numéro
        </Button>
        {plein && (
          <p id={idPlafond} className="text-sm text-ink-muted">
            Cinq numéros au plus : retirez-en un pour en ajouter un autre.
          </p>
        )}
      </div>
    </fieldset>
  );
}

/**
 * « Tester ↗ » : ouvre la carte dans un nouvel onglet, sans `Referer`. Un lien
 * qu'on ne peut pas ouvrir (champ vide, adresse qui n'est pas http(s)) donne un
 * bouton désactivé : un `<a>` n'a pas d'état désactivé.
 */
function BoutonTester({ lien }: { lien: string | null }) {
  const contenu = (
    <>
      Tester
      <span aria-hidden="true" className="ml-1">
        ↗
      </span>
      <span className="sr-only"> le lien vers la carte (nouvel onglet)</span>
    </>
  );
  if (!lien) {
    return (
      <Button type="button" variant="outline" disabled className="h-auto shrink-0">
        {contenu}
      </Button>
    );
  }
  return (
    <Button asChild variant="outline" className="h-auto shrink-0">
      <a href={lien} target="_blank" rel="noreferrer">
        {contenu}
      </a>
    </Button>
  );
}

/**
 * La barre collée en bas : où en est le formulaire, et le bouton pour
 * l'enregistrer. Sur téléphone elle se pose au-dessus des onglets de
 * navigation, pas dessous.
 */
function BarreEnregistrement({
  modifie,
  enCours,
  echec,
  reussi,
}: {
  modifie: boolean;
  enCours: boolean;
  echec: boolean;
  reussi: boolean;
}) {
  const enEchec = echec && !enCours;
  let etat = "";
  if (enCours) etat = "Enregistrement…";
  else if (enEchec) etat = "";
  else if (modifie) etat = "Modifications non enregistrées";
  else if (reussi) etat = "Paramètres enregistrés.";
  else etat = "Tout est à jour";

  return (
    // Téléphone : `bottom-14` (56 px) se pose sur les onglets fixes de
    // `AdminLayout` (57 px mesurés à 390 px, bordure comprise). Pas de
    // `z-index` à cette largeur : les onglets, plus loin dans le DOM, passent
    // donc devant, et le pixel de recouvrement tombe sous leur filet au lieu
    // d'ouvrir un jour où le contenu défilerait. Sur bureau rien ne la couvre.
    <div className="sticky bottom-0 border-t border-rule bg-page px-4 py-3 max-md:bottom-14 md:z-10 md:px-8">
      <div className={`${colonne} flex items-center justify-between gap-4 text-sm text-ink-muted`}>
        <div className="min-w-0">
          {/* Une seule région d'état, montée en permanence : une région live
              créée en même temps que son texte n'est pas toujours annoncée. */}
          <p role="status" className="empty:hidden">
            {etat}
          </p>
          {enEchec && (
            // L'interface est en français sans exception : le message de l'API
            // est anglais, il ne se recopie pas à l'écran.
            <p role="alert" className="font-medium text-bordeaux-700">
              {"Les paramètres n'ont pas pu être enregistrés. Vérifiez les champs et réessayez."}
            </p>
          )}
        </div>
        <Button type="submit" className="shrink-0" disabled={!modifie || enCours}>
          Enregistrer
        </Button>
      </div>
    </div>
  );
}

/**
 * Un `datetime-local` qui parle **l'heure de Madagascar**, quel que soit le
 * fuseau du navigateur. Il lisait et écrivait l'heure de la machine : à
 * Maurice, la date limite du 1er décembre 23:59 s'affichait le 2 à 00:59.
 *
 * Aller-retour : tant qu'on n'y touche pas, la chaîne ISO du serveur reste
 * celle du formulaire, secondes comprises. Retaper ce qui était affiché rend
 * aussi la valeur du serveur telle quelle (`enregistree`) — sinon la seconde 59
 * de la date limite tomberait et la barre dirait « modifié » pour rien. Une
 * vraie modification prend la seconde `seconde` (0 par défaut).
 */
function DateTimeField({
  label,
  value,
  enregistree,
  seconde = 0,
  onChange,
  describedBy,
  apercu,
}: {
  label: string;
  value: string;
  /** La valeur du serveur, rendue intacte si la saisie y revient. */
  enregistree: string;
  seconde?: number;
  onChange: (isoValue: string) => void;
  describedBy?: string;
  /** Une ligne sous le champ, rattachée à lui. */
  apercu?: string;
}) {
  const idApercu = useId();
  const decritPar = [describedBy, apercu ? idApercu : null].filter(Boolean).join(" ") || undefined;
  return (
    <Field label={label}>
      <Input
        className="rounded-field"
        type="datetime-local"
        aria-describedby={decritPar}
        value={versSaisieMadagascar(value)}
        onChange={(e) => {
          const saisie = e.target.value;
          if (saisie === versSaisieMadagascar(enregistree)) {
            onChange(enregistree);
            return;
          }
          // Une saisie à moitié tapée est ignorée plutôt que de pousser une
          // date invalide dans le formulaire, que `@IsDateString` refuserait.
          const iso = depuisSaisieMadagascar(saisie, { seconde });
          if (iso !== null) onChange(iso);
        }}
      />
      {apercu && (
        <p id={idApercu} className="text-sm text-ink-muted">
          {apercu}
        </p>
      )}
    </Field>
  );
}
