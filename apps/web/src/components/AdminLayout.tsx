import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { LayoutDashboard, Users, Armchair, Settings } from "lucide-react";
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
 * Rien n'anime, hors la micro-transition de couleur : la règle du design system
 * sur l'admin ne bouge pas.
 */
export function AdminLayout() {
  const { admin, logout } = useAuth();
  const navigate = useNavigate();
  const bureau = useMediaQuery("(min-width: 768px)");

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  const lienClasses = (isActive: boolean, vertical: boolean) =>
    cn(
      "flex items-center gap-3 rounded-control text-sm font-medium transition-colors duration-(--duration-micro) ease-(--ease-in)",
      vertical ? "px-3 py-2" : "flex-col gap-1 px-2 py-2 text-xs",
      isActive ? "bg-bordeaux-700 text-on-bordeaux" : "text-ink hover:bg-cream",
    );

  if (bureau) {
    return (
      <div className="flex min-h-screen bg-page">
        <aside className="flex w-60 shrink-0 flex-col gap-6 border-r border-rule bg-ivory px-4 py-6">
          <nav className="flex flex-col gap-1">
            {NAV_LINKS.map(({ to, label, icone: Icone, end }) => (
              <NavLink key={to} to={to} end={end} className={({ isActive }) => lienClasses(isActive, true)}>
                <Icone aria-hidden="true" className="h-4 w-4 shrink-0" />
                {label}
              </NavLink>
            ))}
          </nav>

          <div className="mt-auto space-y-3">
            {admin && <p className="truncate text-sm text-ink-muted">{admin.email}</p>}
            <Button type="button" variant="outline" size="sm" onClick={handleLogout} className="w-full">
              Se déconnecter
            </Button>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-page">
      <header className="flex items-center justify-between gap-3 border-b border-rule bg-ivory px-4 py-3">
        {admin && <p className="truncate text-sm text-ink-muted">{admin.email}</p>}
        <Button type="button" variant="outline" size="sm" onClick={handleLogout}>
          Se déconnecter
        </Button>
      </header>

      {/* `pb-20` réserve la hauteur des onglets : sans elle, ils recouvrent la
          dernière ligne de chaque écran, qui est justement là où se trouvent
          les foyers les plus récents. */}
      <main className="min-w-0 flex-1 pb-20">
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 grid grid-cols-4 gap-1 border-t border-rule bg-ivory px-2 py-1.5">
        {NAV_LINKS.map(({ to, label, icone: Icone, end }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => lienClasses(isActive, false)}>
            <Icone aria-hidden="true" className="h-5 w-5 shrink-0" />
            <span className="text-center leading-tight">{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
