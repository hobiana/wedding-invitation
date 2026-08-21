import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import { Button } from "@/components/ui/button";

const NAV_LINKS = [
  // `end` so /admin isn't highlighted while a child route is active.
  { to: "/admin", label: "Tableau de bord", end: true },
  { to: "/admin/households", label: "Foyers" },
  { to: "/admin/tables", label: "Tables" },
  { to: "/admin/settings", label: "Paramètres" },
];

/**
 * Chrome shared by every admin page. Without it the four admin routes were
 * only reachable by typing URLs, and AuthContext's logout() had no caller.
 */
export function AdminLayout() {
  const { admin, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="min-h-screen">
      <header className="border-b">
        <nav className="flex flex-wrap items-center gap-1 px-8 py-3">
          {NAV_LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                `rounded-md px-3 py-2 text-sm font-medium ${
                  isActive ? "bg-neutral-900 text-white" : "text-neutral-700 hover:bg-neutral-100"
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
          <div className="ml-auto flex items-center gap-3">
            {admin && <span className="text-sm text-neutral-500">{admin.email}</span>}
            <Button type="button" variant="outline" size="sm" onClick={handleLogout}>
              Se déconnecter
            </Button>
          </div>
        </nav>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
