import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { LayoutDashboard, Users, Armchair, Settings, ChevronsLeft, ChevronsRight, LogOut } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useAuth } from "@/auth/AuthContext";
import { useMediaQuery } from "@/lib/useMediaQuery";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface LienNav {
  to: string;
  label: string;
  icone: LucideIcon;
  end?: boolean;
}

const NAV_LINKS: LienNav[] = [
  // `end` so /admin isn't highlighted while a child route is active.
  { to: "/admin", label: "Tableau de bord", icone: LayoutDashboard, end: true },
  { to: "/admin/households", label: "Foyers", icone: Users },
  // Le libellé dit « Plan de table », la route reste `/admin/tables` : c'est le
  // mot que le commanditaire emploie, pas l'entité de la base.
  { to: "/admin/tables", label: "Plan de table", icone: Armchair },
  { to: "/admin/settings", label: "Paramètres", icone: Settings },
];

const CLE_RAIL = "admin.rail.replie";

/** Le stockage peut lever (navigation privée stricte) : le rail s'ouvre alors déplié. */
function railRetenuReplie(): boolean {
  try {
    return window.localStorage.getItem(CLE_RAIL) === "1";
  } catch {
    return false;
  }
}

function retenirRail(replie: boolean) {
  try {
    window.localStorage.setItem(CLE_RAIL, replie ? "1" : "0");
  } catch {
    // Sans stockage, le choix vaut pour cette visite seulement.
  }
}

/**
 * Chrome shared by every admin page. Without it the four admin routes were
 * only reachable by typing URLs, and AuthContext's logout() had no caller.
 *
 * Deux dispositions, **et une seule montée à la fois** : un rail à gauche sur
 * bureau, des onglets en bas sur téléphone — là où le pouce arrive, et non en
 * haut de l'écran où il faut changer de prise. Rendre les deux et en cacher une
 * par CSS dupliquerait chaque libellé dans le DOM ; c'est la raison d'être de
 * `useMediaQuery`, sa docstring le dit.
 *
 * Le rail se replie en colonne d'icônes (demande du commanditaire du
 * 2026-10-08) ; le choix est retenu dans `localStorage`. Seule la largeur du
 * rail bouge, en régime micro, et la règle `prefers-reduced-motion` de
 * `index.css` la coupe comme tout le reste.
 */
export function AdminLayout() {
  const { admin, logout } = useAuth();
  const navigate = useNavigate();
  const bureau = useMediaQuery("(min-width: 768px)");
  const [replie, setReplie] = useState(railRetenuReplie);

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  function basculerRail() {
    setReplie((avant) => {
      retenirRail(!avant);
      return !avant;
    });
  }

  if (bureau) {
    return (
      <div className="flex min-h-screen bg-page">
        {/* Épinglé à la hauteur de la fenêtre : étiré sur toute la page, le rail
            repoussait « Se déconnecter » tout en bas du contenu (4 000 px sur le
            plan de table). `self-start` retire l'étirement du flex parent.
            `overflow-x-hidden` : pendant la transition de largeur, rien ne
            déborde en ascenseur horizontal. */}
        <aside
          id="rail-admin"
          className={cn(
            "sticky top-0 flex h-screen shrink-0 flex-col gap-6 self-start overflow-y-auto overflow-x-hidden border-r border-rule bg-ivory py-6",
            "transition-[width] duration-(--duration-micro) ease-(--ease-in)",
            replie ? "w-16 px-3" : "w-60 px-4",
          )}
        >
          <div className={cn("flex items-center", replie ? "flex-col gap-3" : "justify-between gap-2 pl-3")}>
            {replie ? (
              // Les initiales tiennent dans 40 px ; elles disent « c'est le même
              // menu » sans prétendre être un titre.
              <span aria-hidden="true" className="whitespace-nowrap font-display text-base leading-none text-ink">
                H & L
              </span>
            ) : (
              <p className="font-display text-3xl leading-none text-ink">Mariage</p>
            )}
            <button
              type="button"
              onClick={basculerRail}
              aria-expanded={!replie}
              aria-controls="rail-admin"
              aria-label={replie ? "Déplier le menu" : "Replier le menu"}
              title={replie ? "Déplier le menu" : "Replier le menu"}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-button text-ink-muted transition-colors duration-(--duration-micro) ease-(--ease-in) hover:bg-cream hover:text-ink"
            >
              {replie ? (
                <ChevronsRight aria-hidden="true" className="h-4 w-4" />
              ) : (
                <ChevronsLeft aria-hidden="true" className="h-4 w-4" />
              )}
            </button>
          </div>

          <nav className="flex flex-col gap-1">
            {NAV_LINKS.map(({ to, label, icone: Icone, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                aria-label={replie ? label : undefined}
                title={replie ? label : undefined}
                className={({ isActive }) =>
                  cn(
                    "flex h-10 items-center gap-3 whitespace-nowrap rounded-button text-sm font-medium transition-colors duration-(--duration-micro) ease-(--ease-in)",
                    replie ? "justify-center" : "px-3",
                    isActive ? "bg-bordeaux-700 text-on-bordeaux" : "text-ink hover:bg-cream",
                  )
                }
              >
                <Icone aria-hidden="true" className="h-4 w-4 shrink-0" />
                {replie ? <span className="sr-only">{label}</span> : label}
              </NavLink>
            ))}
          </nav>

          {replie ? (
            <div className="mt-auto flex flex-col items-center gap-3">
              {admin && (
                <span
                  title={admin.email}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-cream font-display text-lg uppercase leading-none text-ink"
                >
                  <span aria-hidden="true">{admin.email.charAt(0)}</span>
                  <span className="sr-only">{admin.email}</span>
                </span>
              )}
              <Button
                type="button"
                variant="outline"
                onClick={handleLogout}
                aria-label="Se déconnecter"
                title="Se déconnecter"
                className="h-10 w-10 px-0"
              >
                <LogOut aria-hidden="true" className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="mt-auto space-y-3">
              {admin && <p className="truncate text-sm text-ink-muted">{admin.email}</p>}
              <Button type="button" variant="outline" size="sm" onClick={handleLogout} className="w-full">
                Se déconnecter
              </Button>
            </div>
          )}
        </aside>

        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-page">
      {/* `pb-20` réserve la hauteur des onglets : sans elle, ils recouvrent la
          dernière ligne de chaque écran, qui est justement là où se trouvent
          les foyers les plus récents. */}
      <main className="min-w-0 flex-1 pb-20">
        <Outlet />
      </main>

      {/* Quatre colonnes égales, sans marge ni espace : l'onglet actif est un
          aplat collé aux bords de la barre, pas un bouton qui flotte dedans.
          L'anneau de focus est rentré dans l'onglet (`-outline-offset`) : collée
          au bas de l'écran, la barre couperait un anneau extérieur. */}
      <nav className="fixed inset-x-0 bottom-0 grid grid-cols-4 border-t border-rule bg-ivory">
        {NAV_LINKS.map(({ to, label, icone: Icone, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                "flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 px-1 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] text-xs font-medium transition-colors duration-(--duration-micro) ease-(--ease-in) focus-visible:-outline-offset-4",
                isActive
                  ? "bg-bordeaux-700 text-on-bordeaux focus-visible:outline-on-bordeaux"
                  : "text-ink hover:bg-cream",
              )
            }
          >
            <Icone aria-hidden="true" className="h-5 w-5 shrink-0" />
            <span className="whitespace-nowrap leading-tight">{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
