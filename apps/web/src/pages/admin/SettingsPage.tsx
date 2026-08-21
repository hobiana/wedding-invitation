import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AdminSettingsDto } from "@invitation-app/shared";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";

export function SettingsPage() {
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: ["settings"],
    queryFn: () => api.get<AdminSettingsDto>("/admin/settings"),
  });
  const [form, setForm] = useState<AdminSettingsDto | null>(null);

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  const updateMutation = useMutation({
    mutationFn: (dto: Partial<AdminSettingsDto>) => api.patch("/admin/settings", dto),
    // Refetch from the server rather than trusting the local form state, so the
    // activate/deactivate button always reflects what actually landed in the DB.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["settings"] }),
  });

  if (!form) return <div className="p-8">Chargement…</div>;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (form) updateMutation.mutate(form);
  }

  function toggleSeatingPlan() {
    if (!form) return;
    updateMutation.mutate({ seatingPlanActivated: !form.seatingPlanActivated });
  }

  return (
    <div className="p-8 max-w-lg space-y-6">
      <h1 className="text-2xl font-semibold">Paramètres du mariage</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Lieu" value={form.venueName} onChange={(v) => setForm({ ...form, venueName: v })} />
        <Field label="Adresse" value={form.address} onChange={(v) => setForm({ ...form, address: v })} />
        <Field
          label="Lien vers la carte"
          value={form.mapUrl ?? ""}
          onChange={(v) => setForm({ ...form, mapUrl: v })}
        />
        <Field
          label="Code vestimentaire"
          value={form.dressCode ?? ""}
          onChange={(v) => setForm({ ...form, dressCode: v })}
        />
        <Field
          label="Informations parking"
          value={form.parkingInfo ?? ""}
          onChange={(v) => setForm({ ...form, parkingInfo: v })}
        />
        <Button type="submit" disabled={updateMutation.isPending}>
          Enregistrer
        </Button>
        {updateMutation.isError && (
          <p className="text-sm text-red-600">{(updateMutation.error as Error).message}</p>
        )}
      </form>
      <div className="border-t pt-4 flex items-center justify-between">
        <div>
          <p className="font-medium">Plan de table visible par les invités</p>
          <p className="text-sm text-neutral-500">Activation entièrement manuelle.</p>
        </div>
        <Button
          type="button"
          variant={form.seatingPlanActivated ? "destructive" : "default"}
          disabled={updateMutation.isPending}
          onClick={toggleSeatingPlan}
        >
          {form.seatingPlanActivated ? "Désactiver" : "Activer"}
        </Button>
      </div>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium">{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} className="w-full border rounded-md px-3 py-2" />
    </div>
  );
}
