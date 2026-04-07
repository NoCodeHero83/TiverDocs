import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldCheck, Lock, Loader2, AlertTriangle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getTOTPFactors, verifyTOTPLogin } from "@/services/totpService";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import HCaptcha from "@hcaptcha/react-hcaptcha";

interface SecurityChallengeDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  title?: string;
  description?: string;
  actionLabel?: string;
  showLogout?: boolean;
  onLogout?: () => void;
}

/**
 * Reusable dialog for sensitive operations.
 * Requires either password re-entry or TOTP (if configured).
 */
export const SecurityChallengeDialog = ({
  isOpen,
  onOpenChange,
  onSuccess,
  title = "Verificación de Seguridad",
  description = "Para realizar esta operación sensible, por favor confirma tu identidad.",
  actionLabel = "Confirmar",
  showLogout = false,
  onLogout,
}: SecurityChallengeDialogProps) => {
  const { lastUserEmail, usuario, setMfaPending } = useAuth();
  const { toast } = useToast();
  const [view, setView] = useState<"password" | "totp">("password");
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [totpFactorId, setTotpFactorId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const captcha = useRef<HCaptcha>(null);

  const email = usuario?.email || lastUserEmail;

  // Reset state on open
  useEffect(() => {
    if (isOpen) {
      setView("password");
      setPassword("");
      setTotpCode("");
      setError(null);
    }
  }, [isOpen]);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setIsLoading(true);
    setError(null);
    try {
      console.log("[SecurityChallenge] Validando contraseña para:", email);

      // ACTIVAR mfaPending ANTES del sign-in para evitar que AuthContext
      // nos redirija al login al detectar la sesión parcial (AAL1)
      setMfaPending(true);

      const { data, error: signInError } =
        await supabase.auth.signInWithPassword({
          email,
          password,
          options: {
            captchaToken,
          },
        });

      if (signInError) {
        setMfaPending(false); // Resetear si el login falla
        throw signInError;
      }

      // Un éxito en signInWithPassword nos da una sesión (aal1)
      const session = data.session;
      const factors = session?.user?.factors || [];
      const verifiedFactor = factors.find(
        (f) => f.status === "verified" && f.factor_type === "totp",
      );

      if (verifiedFactor) {
        console.log(
          "[SecurityChallenge] TOTP requerido, manteniendo modo pendiente",
        );
        setTotpFactorId(verifiedFactor.id);
        setView("totp");
      } else {
        console.log(
          "[SecurityChallenge] Contraseña válida, no hay TOTP configurado",
        );
        setMfaPending(false); // Liberar si no hay MFA
        onSuccess();
        onOpenChange(false);
      }
    } catch (err: any) {
      setMfaPending(false);
      setError(err.message || "Contraseña incorrecta");
    } finally {
      setIsLoading(false);
    }
  };

  const handleTOTPSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!totpFactorId || totpCode.length !== 6) return;

    setIsLoading(true);
    setError(null);
    try {
      console.log("[SecurityChallenge] Verificando código TOTP...");
      const result = await verifyTOTPLogin(totpFactorId, totpCode);

      const session = (result as any)?.session;
      if (session) {
        console.log(
          "[SecurityChallenge] TOTP validado exitosamente. Actualizando cliente...",
        );

        // Sincronizar inmediatamente el cliente de Supabase con la nueva sesión AAL2
        // para asegurar que las llamadas posteriores (onSuccess) tengan los permisos correctos.
        await supabase.auth.setSession({
          access_token: session.access_token,
          refresh_token: session.refresh_token,
        });

        // DESACTIVAR mfaPending para que AuthContext procese la sesión completa
        setMfaPending(false);
        onSuccess();
        onOpenChange(false);
      } else {
        // Fallback si no hay sesión explícita en la respuesta
        setMfaPending(false);
        onSuccess();
        onOpenChange(false);
      }
    } catch (err: any) {
      setError(err.message || "Código inválido");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-sm"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="flex justify-center mb-2">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              {view === "password" ? (
                <Lock className="w-6 h-6 text-primary" />
              ) : (
                <ShieldCheck className="w-6 h-6 text-primary" />
              )}
            </div>
          </div>
          <DialogTitle className="text-center">{title}</DialogTitle>
          <DialogDescription className="text-center">
            {view === "password"
              ? description
              : "Ingresa el código de 6 dígitos de tu autenticador"}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 rounded-md">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {view === "password" ? (
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="challenge-password">Contraseña</Label>
              <Input
                id="challenge-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Ingresa tu contraseña"
                autoFocus
              />
            </div>

            <div className="flex flex-col items-center gap-2 mt-2">
              <HCaptcha
                ref={captcha}
                sitekey={
                  import.meta.env.VITE_HCAPTCHA_SITE_KEY ||
                  "10000000-ffff-ffff-ffff-000000000001"
                }
                onVerify={(token) => {
                  setCaptchaToken(token);
                }}
                onExpire={() => setCaptchaToken(null)}
                onError={(err) => {
                  console.error("[SecurityChallenge] hCaptcha Error:", err);
                }}
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-primary"
              disabled={isLoading || !password || !captchaToken}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                actionLabel
              )}
            </Button>
            {showLogout && (
              <Button
                variant="ghost"
                className="w-full text-muted-foreground text-xs"
                onClick={onLogout}
              >
                Cerrar sesión
              </Button>
            )}
          </form>
        ) : (
          <form onSubmit={handleTOTPSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="challenge-totp">Código de Seguridad</Label>
              <Input
                id="challenge-totp"
                inputMode="numeric"
                maxLength={6}
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ""))}
                placeholder="000000"
                className="text-center text-2xl tracking-widest font-mono"
                autoFocus
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-gradient-primary"
              disabled={isLoading || totpCode.length !== 6}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Verificar"
              )}
            </Button>
            <div className="flex flex-col gap-1">
              <Button
                variant="ghost"
                onClick={() => setView("password")}
                className="w-full text-xs"
                disabled={isLoading}
              >
                Volver a contraseña
              </Button>
              {showLogout && (
                <Button
                  variant="ghost"
                  className="w-full text-muted-foreground text-[10px]"
                  onClick={onLogout}
                >
                  Cerrar sesión
                </Button>
              )}
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};
