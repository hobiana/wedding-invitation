import { useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import { Button } from "@/components/ui/button";

/**
 * Qui est connecté, et le moyen de se déconnecter.
 *
 * Sur téléphone la barre du haut de l'admin (adresse + déconnexion) a disparu :
 * elle mangeait de la hauteur sur chaque écran, dont le plan de table qui en a
 * le plus besoin. Ces deux éléments vivent donc ici, dans Paramètres. Sur
 * bureau le rail les porte déjà, et cette section n'y est pas montée.
 */
export function AccountSection() {
  const { admin, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <section aria-labelledby="titre-compte" className="space-y-3 border-t border-rule pt-4">
      <h2 id="titre-compte" className="font-medium text-ink">
        Compte
      </h2>
      {admin && (
        <p className="text-sm text-ink-muted">
          Connecté en tant que <span className="break-all text-ink">{admin.email}</span>
        </p>
      )}
      <Button type="button" variant="outline" onClick={handleLogout} className="w-full">
        Se déconnecter
      </Button>
    </section>
  );
}
