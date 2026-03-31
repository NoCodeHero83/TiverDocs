import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { SecurityChallengeDialog } from "./SecurityChallengeDialog";

/**
 * Req 3/4: Modal que aparece cuando la sesión expira por inactividad.
 * Permite reautenticarse sin perder el contexto de la aplicación.
 */
export const SessionExpiredModal = () => {
  const { sessionExpired, clearSessionExpired, lastUserEmail } = useAuth();

  useEffect(() => {
    if (sessionExpired) {
      // Prevenir volver atrás
      window.history.pushState(null, "", window.location.href);
      const handlePopState = () => {
        window.history.pushState(null, "", window.location.href);
      };
      window.addEventListener("popstate", handlePopState);
      return () => window.removeEventListener("popstate", handlePopState);
    }
  }, [sessionExpired]);

  const handleLogout = () => {
    clearSessionExpired();
    // Recargar para llegar al login limpio
    window.location.href = "/";
  };

  return (
    <SecurityChallengeDialog
      isOpen={sessionExpired}
      onOpenChange={(open) => {
        if (!open) handleLogout();
      }}
      onSuccess={clearSessionExpired}
      showLogout={true}
      onLogout={handleLogout}
      title="Sesión expirada"
      description={`Tu sesión se cerró por inactividad (1 minuto) para el usuario ${lastUserEmail}. Ingresa tu contraseña para continuar.`}
      actionLabel="Reanudar sesión"
    />
  );
};
