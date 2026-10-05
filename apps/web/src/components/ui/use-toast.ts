import { createContext, useContext } from "react";

/**
 * Le contrat du toast, séparé de `toast.tsx` : un fichier qui exporte à la fois
 * un composant et un hook casse le rechargement à chaud de Vite
 * (`react/only-export-components`), comme le reste du dépôt le sait déjà.
 */
export type ToastTone = "success" | "error";

export interface ToastOptions {
  message: string;
  tone?: ToastTone;
}

export interface ToastContextValue {
  toast: (options: ToastOptions) => void;
}

export const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const contexte = useContext(ToastContext);
  if (!contexte) throw new Error("useToast doit être utilisé dans un <ToastProvider>.");
  return contexte;
}
