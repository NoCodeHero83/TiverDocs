import { useState } from "react";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck, Mail, ArrowLeft, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface MfaVerificationFormProps {
  email: string;
  userId: string;
  onCancel: () => void;
}

/**
 * Req 1: Formulario de verificación MFA post-login.
 * La verificación se delega al AuthContext que usa el token pendiente para
 * respetar RLS (Req 9) sin exponer el token al componente.
 */
export const MfaVerificationForm = ({ email, userId, onCancel }: MfaVerificationFormProps) => {
  const { verifyMfaCode } = useAuth();
  const { toast } = useToast();
  const [code, setCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleVerify = async () => {
    if (code.length !== 6) return;

    setIsVerifying(true);
    setError(null);

    try {
      await verifyMfaCode(code, userId);
      toast({
        title: "Bienvenido",
        description: "Has iniciado sesión correctamente.",
      });
    } catch (err: any) {
      setError(err.message || 'Error al verificar el código.');
    } finally {
      setIsVerifying(false);
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
        <CardTitle className="text-2xl">Verificación en dos pasos</CardTitle>
        <CardDescription>
          Se ha enviado un código de 6 dígitos a
        </CardDescription>
        <div className="flex items-center justify-center gap-2 text-sm font-medium mt-1">
          <Mail className="w-4 h-4 text-primary" />
          <span className="text-primary">{email}</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col items-center gap-4">
          <InputOTP
            maxLength={6}
            value={code}
            onChange={setCode}
            disabled={isVerifying}
          >
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
              <InputOTPSlot index={3} />
              <InputOTPSlot index={4} />
              <InputOTPSlot index={5} />
            </InputOTPGroup>
          </InputOTP>

          {error && (
            <p className="text-sm text-destructive text-center">{error}</p>
          )}

          <p className="text-xs text-muted-foreground text-center">
            El código expira en 10 minutos. Revisa también tu carpeta de spam.
          </p>
        </div>

        <Button
          className="w-full bg-gradient-primary hover:opacity-90"
          onClick={handleVerify}
          disabled={code.length !== 6 || isVerifying}
        >
          {isVerifying ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Verificando...
            </>
          ) : (
            "Verificar código"
          )}
        </Button>

        <div className="flex items-center justify-between text-sm">
          <button
            type="button"
            onClick={onCancel}
            className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-3 h-3" />
            Volver al login
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="text-primary hover:text-primary/80 transition-colors"
          >
            ¿No recibiste el código? Reintentar
          </button>
        </div>
      </CardContent>
    </Card>
  );
};
