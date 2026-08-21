import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { CurrentAdminDto, LoginDto } from "@invitation-app/shared";
import { api } from "@/lib/api";

interface AuthContextValue {
  admin: CurrentAdminDto | null;
  isLoading: boolean;
  login: (credentials: LoginDto) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<CurrentAdminDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api
      .get<CurrentAdminDto>("/auth/me")
      .then(setAdmin)
      .catch(() => setAdmin(null))
      .finally(() => setIsLoading(false));
  }, []);

  async function login(credentials: LoginDto) {
    await api.post("/auth/login", credentials);
    const me = await api.get<CurrentAdminDto>("/auth/me");
    setAdmin(me);
  }

  async function logout() {
    await api.post("/auth/logout");
    setAdmin(null);
  }

  return <AuthContext.Provider value={{ admin, isLoading, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
