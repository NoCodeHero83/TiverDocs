import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ShieldCheck, Loader2, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { verifyTOTPLogin } from "@/services/totpService";

interface TOTPVerificationFormProps {
  factorId: string;
  email: string;
  onVerificationComplete: (session: any, user: any) => void;
  onCancel: () => void;
}

/**
 * Componente para verificar TOTP en el login
 * TOTP es obligatorio para acceder - no es opcional
 */
export const TOTPVerificationForm = ({
  factorId,
  email,
  onVerificationComplete,
  onCancel,
}: TOTPVerificationFormProps) => {
  const { toast } = useToast();
  const [code, setCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [lockoutTimer, setLockoutTimer] = useState(0);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (lockoutTimer > 0) {
      interval = setInterval(() => {
        setLockoutTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [lockoutTimer]);

  const handleVerify = async () => {
    if (lockoutTimer > 0) return;

    if (code.length !== 6) {
      setError("El código debe tener exactamente 6 dígitos");
      return;
    }

    setIsVerifying(true);
    setError(null);

    try {
      console.log('[TOTPVerificationForm] Verificando código TOTP...');
      const { session, user } = await verifyTOTPLogin(factorId, code);
      
      console.log('[TOTPVerificationForm] Código verificado correctamente');
      toast({
        title: "Acceso concedido",
        description: "Verificación de 2 factores exitosa.",
      });
      
      onVerificationComplete(session, user);
    } catch (err: any) {
      const errorMsg = err.message || "Código inválido o expirado";
      setError(errorMsg);
      console.error("[TOTPVerificationForm] Error en verificación:", err);
      
      setAttempts(prev => {
        const newAttempts = prev + 1;
        if (newAttempts >= 3) {
          setLockoutTimer(30);
          toast({
            title: "Múltiples intentos fallidos",
            description: "Demasiados intentos. Por favor espera 30 segundos.",
            variant: "destructive",
          });
          return 0;
        }
        return newAttempts;
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && code.length === 6 && !isVerifying) {
      handleVerify();
    }
  };

  return (
    <Card className="shadow-elevated border-0 bg-gradient-card">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-2">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6 text-primary" />
          </div>
        </div>
        <CardTitle className="text-2xl">Verificación de Seguridad</CardTitle>
        <CardDescription>
          Ingresa el código de 6 dígitos de tu autenticador
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert className="bg-blue-50 border-blue-200">
          <ShieldCheck className="w-4 h-4 text-blue-600" />
          <AlertDescription className="text-blue-900 text-sm">
            Requiere verificación de 2 factores. Usa tu app de autenticación.
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <Label htmlFor="totp-code" className="text-sm font-medium">
            Código de Autenticación (6 dígitos)
          </Label>
          <Input
            id="totp-code"
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder="000000"
            value={code}
            onChange={(e) => {
              setCode(e.target.value.replace(/\D/g, ""));
              setError(null);
            }}
            onKeyDown={handleKeyDown}
            disabled={isVerifying || lockoutTimer > 0}
            className="text-center text-2xl tracking-widest font-mono bg-background/50 border-primary/20 focus:border-primary"
            autoFocus
          />
          <p className="text-xs text-muted-foreground text-center">
            El código cambia cada 30 segundos
          </p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="w-4 h-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {lockoutTimer > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="w-4 h-4" />
            <AlertDescription>
              Demasiados intentos. Intenta de nuevo en {lockoutTimer}s.
            </AlertDescription>
          </Alert>
        )}

        {attempts > 0 && lockoutTimer === 0 && (
          <Alert className="bg-amber-50 border-amber-200">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <AlertDescription className="text-amber-900 text-sm">
              {attempts} {attempts === 1 ? "intento fallido" : "intentos fallidos"}. A los 3 intentos se bloqueará temporalmente.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Button
            className="w-full bg-gradient-primary hover:opacity-90"
            onClick={handleVerify}
            disabled={code.length !== 6 || isVerifying || lockoutTimer > 0}
          >
            {isVerifying ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Verificando...
              </>
            ) : (
              "Verificar Acceso"
            )}
          </Button>

          <Button
            variant="outline"
            className="w-full"
            onClick={onCancel}
            disabled={isVerifying || attempts >= 5}
          >
            Cancelar
          </Button>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          ¿Problemas? Asegúrate de que tu autenticador esté funcionando correctamente.
        </p>
      </CardContent>
    </Card>
  );
};
