import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AdminSettingsDto } from "@invitation-app/shared";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
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

export function SettingsPage() {
  const queryClient = useQueryClient();
  // Téléphone seulement : sur bureau le rail porte déjà la déconnexion.
  const telephone = useMediaQuery("(max-width: 767px)");
  const { data, isError } = useQuery({
    queryKey: ["settings"],
    queryFn: () => api.get<AdminSettingsDto>("/admin/settings"),
  });
  // Initialisé une seule fois : un refetch (après la bascule du plan de table,
  // par exemple) ne doit pas écraser ce que l'organisateur est en train de
  // taper sans l'avoir enregistré.
  const [saisie, setSaisie] = useState<AdminSettingsDto | null>(null);
  const form = saisie ?? data ?? null;
  // Le seuil se garde en texte tant qu'il est saisi : un `number` ne sait pas
  // représenter « 12. » ou « abc », et le refus doit porter sur ce qui est tapé.
  // `null` = pas encore touché, on affiche alors la valeur du serveur.
  const [seuilSaisi, setSeuilSaisi] = useState<string | null>(null);
  const [erreurSeuil, setErreurSeuil] = useState<string | null>(null);

  const updateMutation = useMutation({
    mutationFn: (dto: Partial<AdminSettingsDto>) => api.patch("/admin/settings", dto),
    // Refetch from the server rather than trusting the local form state, so the
    // activate/deactivate button always reflects what actually landed in the DB.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["settings"] }),
  });

  if (isError) {
    return (
      <div className="p-8 max-w-lg">
        <p role="alert" className="font-medium text-bordeaux-700">
          {"Les paramètres n'ont pas pu être chargés. Rechargez la page, et réessayez dans un instant."}
        </p>
      </div>
    );
  }

  if (!form || !data) {
    return (
      <div className="p-8 max-w-lg space-y-4" role="status">
        <span className="sr-only">Chargement des paramètres…</span>
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  // `typeof` plutôt que `=== null` : une API pas encore migrée omet le champ, et
  // la case afficherait alors le mot « undefined ».
  const seuilAffiche =
    seuilSaisi ?? (typeof form.maxGuests === "number" ? String(form.maxGuests) : "");

  function modifier(patch: Partial<AdminSettingsDto>) {
    if (form) setSaisie({ ...form, ...patch });
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form) return;
    const seuil = lireSeuil(seuilAffiche);
    if ("erreur" in seuil) {
      setErreurSeuil(seuil.erreur);
      return;
    }
    // `seatingPlanActivated` reste hors du corps : la bascule est un geste
    // isolé, et un formulaire resté ouvert ne doit pas la réécrire.
    updateMutation.mutate({
      maxGuests: seuil.valeur,
      weddingDate: form.weddingDate,
      rsvpDeadline: form.rsvpDeadline,
      venueName: form.venueName,
      address: form.address,
      mapUrl: blankToNull(form.mapUrl ?? ""),
      dressCode: blankToNull(form.dressCode ?? ""),
      parkingInfo: blankToNull(form.parkingInfo ?? ""),
    });
  }

  function toggleSeatingPlan() {
    updateMutation.mutate({ seatingPlanActivated: !data?.seatingPlanActivated });
  }

  const planActif = data.seatingPlanActivated;

  return (
    <div className="p-8 max-w-lg space-y-6">
      <h1 className="text-2xl font-semibold">Paramètres du mariage</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <DateTimeField
          label="Date du mariage"
          value={form.weddingDate}
          onChange={(v) => modifier({ weddingDate: v })}
        />
        {/* This one field governs the entire public RSVP lock; before this it
            could only be changed with direct SQL. */}
        <DateTimeField
          label="Date limite de réponse (RSVP)"
          value={form.rsvpDeadline}
          onChange={(v) => modifier({ rsvpDeadline: v })}
        />
        <Field label="Lieu" required>
          <Input value={form.venueName} onChange={(e) => modifier({ venueName: e.target.value })} />
        </Field>
        <Field label="Adresse" required>
          <Input value={form.address} onChange={(e) => modifier({ address: e.target.value })} />
        </Field>
        <Field label="Lien vers la carte">
          <Input value={form.mapUrl ?? ""} onChange={(e) => modifier({ mapUrl: e.target.value })} />
        </Field>
        {/* Conservé pour l'organisateur (il répond au téléphone), mais la page
            invité ne l'affiche plus : sans cette mention, il le remplit en
            croyant que ça part sur l'invitation. */}
        <Field label="Code vestimentaire" hint="Non affiché sur l'invitation.">
          <Input
            value={form.dressCode ?? ""}
            onChange={(e) => modifier({ dressCode: e.target.value })}
          />
        </Field>
        <Field label="Informations parking">
          <Textarea
            value={form.parkingInfo ?? ""}
            onChange={(e) => modifier({ parkingInfo: e.target.value })}
          />
        </Field>
        {/* `type="text"` + `inputMode="numeric"` plutôt que `type="number"` : ce
            dernier vide sa valeur sur une saisie invalide (on ne pourrait plus
            dire ce qui est refusé) et la molette le modifie au survol. Pas de
            `pattern` non plus : le message natif suivrait la langue du
            navigateur, pas celle de l'interface. */}
        <Field
          label="Seuil maximum d'invités"
          hint="Laissez vide pour ne fixer aucun seuil."
          error={erreurSeuil}
        >
          <Input
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={seuilAffiche}
            onChange={(e) => {
              setSeuilSaisi(e.target.value);
              setErreurSeuil(null);
            }}
          />
        </Field>
        <Button type="submit" disabled={updateMutation.isPending}>
          Enregistrer
        </Button>
        {updateMutation.isError && (
          // L'interface est en français sans exception : le message de l'API
          // est anglais, il ne se recopie pas à l'écran.
          <p role="alert" className="text-sm font-medium text-bordeaux-700">
            {"Les paramètres n'ont pas pu être enregistrés. Vérifiez les champs et réessayez."}
          </p>
        )}
        {updateMutation.isSuccess && (
          <p role="status" className="text-sm text-ink-muted">
            Paramètres enregistrés.
          </p>
        )}
      </form>
      <div className="border-t pt-4 flex items-center justify-between">
        <div>
          <p className="font-medium">Plan de table visible par les invités</p>
          <p className="text-sm text-ink-muted">Activation entièrement manuelle.</p>
        </div>
        <Button
          type="button"
          variant={planActif ? "destructive" : "default"}
          disabled={updateMutation.isPending}
          onClick={toggleSeatingPlan}
        >
          {planActif ? "Désactiver" : "Activer"}
        </Button>
      </div>
      {telephone && <AccountSection />}
    </div>
  );
}

/**
 * The API stores and returns these as ISO strings, but `datetime-local` only
 * speaks local `YYYY-MM-DDTHH:mm`, so both directions need converting.
 */
function toDateTimeLocal(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function DateTimeField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (isoValue: string) => void;
}) {
  return (
    <Field label={label}>
      <Input
        type="datetime-local"
        value={toDateTimeLocal(value)}
        onChange={(e) => {
          // Ignore a half-typed value rather than pushing an Invalid Date into
          // the form and failing the API's @IsDateString on submit.
          const next = new Date(e.target.value);
          if (!Number.isNaN(next.getTime())) onChange(next.toISOString());
        }}
      />
    </Field>
  );
}
