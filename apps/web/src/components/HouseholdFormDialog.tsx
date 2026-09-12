import { useState, type FormEvent } from "react";
import type { CreateHouseholdDto, HouseholdAdminDto, RsvpStatus } from "@invitation-app/shared";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

/**
 * Creating only ever sends the fields a new household needs. Editing may
 * additionally correct the RSVP itself — the spec requires admins to be able
 * to do that at any time, including past the guest-facing deadline — and the
 * catering note, since the guest form no longer asks for it.
 *
 * Shaped so one value satisfies both CreateHouseholdDto and UpdateHouseholdDto.
 */
export interface HouseholdFormValues extends CreateHouseholdDto {
  status?: RsvpStatus;
  confirmedCount?: number;
  dietaryNotes?: string;
}

interface HouseholdFormDialogProps {
  initial?: HouseholdAdminDto;
  onSubmit: (dto: HouseholdFormValues) => void;
  onClose: () => void;
}

const STATUS_LABELS: Record<RsvpStatus, string> = {
  PENDING: "En attente",
  CONFIRMED: "Confirmé",
  DECLINED: "Décliné",
};

/**
 * Une ligne, un nom. Les lignes vides et les espaces de bord sautent : on
 * colle souvent ces listes depuis un message, et elles arrivent sales.
 */
function nomsSaisis(brut: string): string[] {
  return brut
    .split("\n")
    .map((ligne) => ligne.trim())
    .filter((ligne) => ligne !== "");
}

export function HouseholdFormDialog({ initial, onSubmit, onClose }: HouseholdFormDialogProps) {
  const isEdit = initial !== undefined;
  const [displayName, setDisplayName] = useState(initial?.displayName ?? "");
  const [allocatedSeats, setAllocatedSeats] = useState(initial?.allocatedSeats ?? 1);
  const [memberNames, setMemberNames] = useState(initial?.memberNames.join("\n") ?? "");
  const [dietaryNotes, setDietaryNotes] = useState(initial?.dietaryNotes ?? "");
  const [status, setStatus] = useState<RsvpStatus>(initial?.status ?? "PENDING");
  // null, not 0: a household that never answered has no count, and the input
  // must show an empty field the admin has to fill in deliberately. Defaulting
  // to 0 is what shipped a CONFIRMED household seating nobody.
  const [confirmedCount, setConfirmedCount] = useState<number | null>(initial?.confirmedCount ?? null);
  const [countError, setCountError] = useState<string | null>(null);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const listeMembres = nomsSaisis(memberNames);
    // Le régime ne part que s'il a bougé. Un foyer dont il n'a jamais été
    // renseigné porte `null` ; renvoyer le champ intact écrirait `""` par
    // dessus, et `UpdateHouseholdDto` ne sait pas revenir à `null` ensuite.
    // Seule la garde `NOT [null, '']` du tableau de bord empêche aujourd'hui
    // ces vides de se compter comme des régimes — une garde posée pour un tout
    // autre incident, sur laquelle on ne s'appuie pas.
    const regimeBouge = dietaryNotes !== (initial?.dietaryNotes ?? "");
    const regime = regimeBouge ? { dietaryNotes } : {};
    if (!isEdit) {
      onSubmit({ displayName, allocatedSeats, memberNames: listeMembres });
      return;
    }
    // CONFIRMED requires a count of at least 1 — the API now rejects anything
    // else, and a confirmed household holding zero seats silently disappears
    // from the table plan. Say it in French here rather than let the server's
    // English message surface.
    if (status === "CONFIRMED") {
      if (confirmedCount === null || confirmedCount < 1) {
        setCountError("Indiquez le nombre de personnes : un foyer confirmé compte au moins une personne.");
        return;
      }
      // The upper bound (invariant: confirmedCount <= allocatedSeats) is held
      // by max={allocatedSeats} below — native constraint validation blocks the
      // submit before this handler runs — and by the API. No JS check here: it
      // would be unreachable code.
      setCountError(null);
      onSubmit({
        displayName,
        allocatedSeats,
        memberNames: listeMembres,
        status,
        ...regime,
        confirmedCount,
      });
      return;
    }
    setCountError(null);
    onSubmit({
      displayName,
      allocatedSeats,
      memberNames: listeMembres,
      status,
      ...regime,
      // A declined household seats nobody; the API normalises this too.
      // A still-pending household hasn't confirmed anything — omit the field
      // entirely rather than overwrite its null (no answer yet) with 0, which
      // would make the seating capacity maths treat it as holding zero seats.
      ...(status === "DECLINED" && { confirmedCount: 0 }),
    });
  }

  return (
    <Dialog
      open
      onOpenChange={(ouvert) => !ouvert && onClose()}
      title={isEdit ? "Modifier le foyer" : "Nouveau foyer"}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Nom du foyer" required>
          <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
        </Field>

        <Field label="Nombre de places" hint="Le nombre de personnes invitées dans ce foyer.">
          <Input
            type="number"
            min={1}
            value={allocatedSeats}
            onChange={(e) => setAllocatedSeats(Number(e.target.value))}
          />
        </Field>

        <Field label="Noms des invités" hint="Un nom par ligne. Ils s'affichent sur l'invitation du foyer.">
          <Textarea rows={4} value={memberNames} onChange={(e) => setMemberNames(e.target.value)} />
        </Field>

        {isEdit && (
          <>
            {/*
              Le régime n'existe pas dans CreateHouseholdDto : le contrat ne
              porte la mention qu'à l'édition. L'afficher à la création
              donnerait l'illusion qu'elle est enregistrée alors qu'elle serait
              tue en silence.
            */}
            <Field label="Régime alimentaire" hint="Allergies, régimes — pour le traiteur.">
              <Textarea rows={2} value={dietaryNotes} onChange={(e) => setDietaryNotes(e.target.value)} />
            </Field>

            <Field label="Statut">
              <Select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value as RsvpStatus);
                  setCountError(null);
                }}
              >
                {(Object.keys(STATUS_LABELS) as RsvpStatus[]).map((value) => (
                  <option key={value} value={value}>
                    {STATUS_LABELS[value]}
                  </option>
                ))}
              </Select>
            </Field>

            {/*
              Only CONFIRMED carries a count. DECLINED is always 0 and PENDING
              has none yet, so showing an editable field for those two offered a
              value the form then threw away on submit.
            */}
            {status === "CONFIRMED" && (
              <Field label="Personnes confirmées" error={countError}>
                <Input
                  type="number"
                  min={1}
                  max={allocatedSeats}
                  value={confirmedCount ?? ""}
                  onChange={(e) => {
                    const raw = e.target.value;
                    setConfirmedCount(raw === "" ? null : Number(raw));
                    setCountError(null);
                  }}
                />
              </Field>
            )}

            {/* Le mot du foyer lui appartient : un organisateur le lit, il ne le réécrit pas. */}
            {initial?.message && (
              <div className="space-y-2">
                <span className="block text-sm font-medium text-ink">Message du foyer</span>
                <p className="rounded-surface border border-rule bg-cream px-3 py-2 text-sm text-ink">
                  {initial.message}
                </p>
              </div>
            )}
          </>
        )}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit">Enregistrer</Button>
        </div>
      </form>
    </Dialog>
  );
}
