import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import * as RadixToast from "@radix-ui/react-toast";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * La confirmation d'un geste : placé, retiré, créé, supprimé. Radix, comme les
 * dialogues — il porte la région live, la file et la fermeture au clavier, que
 * réécrire à la main est justement ce qui rate.
 *
 *     const { toast } = useToast();
 *     toast({ message: "Famille Rakoto placée à la table Collègues." });
 *     toast({ message: "Cette table n'a plus assez de places.", tone: "error" });
 *
 * **Rien n'anime** : la règle du design system sur l'admin ne bouge pas. Le
 * message apparaît et disparaît, sans glissement.
 *
 * Un message d'erreur est écrit en français par l'appelant ; on n'affiche
 * jamais le texte brut de l'API ici.
 */
export type ToastTone = "success" | "error";

export interface ToastOptions {
  message: string;
  tone?: ToastTone;
}

interface ToastItem {
  id: number;
  message: string;
  tone: ToastTone;
}

interface ToastContextValue {
  toast: (options: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

/** Quatre secondes : le temps de lire une phrase, sans rester dans le chemin. */
const DUREE_MS = 4000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const prochainId = useRef(0);

  const toast = useCallback(({ message, tone = "success" }: ToastOptions) => {
    setItems((courants) => [...courants, { id: prochainId.current++, message, tone }]);
  }, []);

  const valeur = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={valeur}>
      <RadixToast.Provider duration={DUREE_MS} swipeDirection="right" label="Notifications">
        {children}
        {items.map((item) => (
          <RadixToast.Root
            key={item.id}
            // `foreground` est annoncé tout de suite (une erreur), `background`
            // à la prochaine pause (une confirmation).
            type={item.tone === "error" ? "foreground" : "background"}
            data-tone={item.tone}
            onOpenChange={(ouvert) => {
              if (!ouvert) setItems((courants) => courants.filter((c) => c.id !== item.id));
            }}
            className={cn(
              "flex items-start gap-3 rounded-surface border bg-ivory px-4 py-3 text-sm text-ink shadow-card",
              item.tone === "error" ? "border-danger" : "border-rule",
            )}
          >
            <RadixToast.Description className="flex-1">{item.message}</RadixToast.Description>
            <RadixToast.Close
              aria-label="Fermer"
              className="-mr-1 rounded-control p-1 text-ink-muted hover:bg-cream hover:text-ink"
            >
              <X aria-hidden="true" className="h-4 w-4" />
            </RadixToast.Close>
          </RadixToast.Root>
        ))}
        {/* Haut sur téléphone : les onglets de l'admin occupent le bas de l'écran
            et recouvriraient le message. Bas à droite sur bureau. */}
        <RadixToast.Viewport className="fixed inset-x-4 top-4 z-50 m-0 flex list-none flex-col gap-2 outline-none md:inset-x-auto md:bottom-4 md:right-4 md:top-auto md:w-96" />
      </RadixToast.Provider>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const contexte = useContext(ToastContext);
  if (!contexte) throw new Error("useToast doit être utilisé dans un <ToastProvider>.");
  return contexte;
}
