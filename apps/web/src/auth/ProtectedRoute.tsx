import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./AuthContext";

export function ProtectedRoute() {
  const { admin, isLoading } = useAuth();
  if (isLoading) return <div className="p-8 text-center">Chargement…</div>;
  if (!admin) return <Navigate to="/login" replace />;
  return <Outlet />;
}
