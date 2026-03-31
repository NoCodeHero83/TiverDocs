import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Copy, Check, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { enrollTOTP, verifyTOTPEnrollment, TOTPEnrollmentResponse } from "@/services/totpService";

interface TOTPEnrollmentFormProps {
  onEnrollmentComplete: () => void;
  onCancel: () => void;
}

/**
 * Componente para enrollarse en TOTP MFA
 * Muestra QR code, secreto manual y requiere verificación con código
 */
export const TOTPEnrollmentForm = ({ onEnrollmentComplete, onCancel }: TOTPEnrollmentFormProps) => {
  const { toast } = useToast();
  const [step, setStep] = useState<"qr" | "verify" | "backup">("qr");
  const [enrollmentData, setEnrollmentData] = useState<TOTPEnrollmentResponse | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedCodes, setCopiedCodes] = useState(false);

  const handleInitiateEnrollment = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await enrollTOTP();
      setEnrollmentData(data);
      setStep("qr");
    } catch (err: any) {
      setError(err.message || "Error al iniciar enrolamiento TOTP");
      toast({
        title: "Error",
        description: err.message || "No se pudo iniciar el enrolamiento",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!enrollmentData?.id || verificationCode.length !== 6) {
      setError("Ingrese un código de 6 dígitos válido");
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const success = await verifyTOTPEnrollment(enrollmentData.id, verificationCode);
      if (success) {
        // Mostrar códigos de recuperación si están disponibles
        if (enrollmentData.recovery_codes?.codes?.length) {
          setStep("backup");
        } else {
          toast({
            title: "¡Éxito!",
            description: "TOTP ha sido configurado correctamente.",
          });
          onEnrollmentComplete();
        }
      }
    } catch (err: any) {
      setError(err.message || "Código inválido");
      toast({
        title: "Error",
        description: err.message || "No se pudo verificar el código",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopySecret = () => {
    if (enrollmentData?.totp.secret) {
      navigator.clipboard.writeText(enrollmentData.totp.secret);
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
    }
  };

  const handleCopyBackupCodes = () => {
    const codes = enrollmentData?.recovery_codes?.codes?.map((c) => c.code).join("\n");
    if (codes) {
      navigator.clipboard.writeText(codes);
      setCopiedCodes(true);
      setTimeout(() => setCopiedCodes(false), 2000);
    }
  };

  const handleCompleteEnrollment = () => {
    toast({
      title: "¡Éxito!",
      description: "TOTP ha sido configurado correctamente. Guarda tus códigos de recuperación en un lugar seguro.",
    });
    onEnrollmentComplete();
  };

  // Paso 1: Mostrar QR Code
  if (step === "qr" && enrollmentData) {
    return (
      <Card className="shadow-elevated border-0 bg-gradient-card w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Configurar Autenticador de Dos Factores</CardTitle>
          <CardDescription>
            Escanea este código QR con tu app de autenticación o ingresa el secreto manualmente
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* QR Code */}
          <div className="flex flex-col items-center gap-4">
            {enrollmentData.totp.qr_code && (
              <div className="bg-white p-4 rounded-lg border-2 border-primary/20">
                <img
                  src={enrollmentData.totp.qr_code}
                  alt="QR Code para TOTP"
                  className="w-64 h-64"
                  crossOrigin="anonymous"
                />
              </div>
            )}
          </div>

          {/* Secreto manual */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">O ingresa este secreto manualmente:</Label>
            <div className="flex gap-2">
              <code className="flex-1 p-3 bg-background/50 rounded border border-border font-mono text-sm break-all">
                {enrollmentData.totp.secret}
              </code>
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopySecret}
                title="Copiar secreto"
              >
                {copiedSecret ? (
                  <Check className="w-4 h-4 text-success" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>

          <Alert className="bg-amber-50 border-amber-200">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <AlertDescription className="text-amber-900">
              Guarda este secreto en un lugar seguro. Lo necesitarás si reinstulas tu autenticador.
            </AlertDescription>
          </Alert>

          <Button
            className="w-full bg-gradient-primary hover:opacity-90"
            onClick={() => setStep("verify")}
            disabled={isLoading}
          >
            Siguiente: Verificar Código
          </Button>

          <Button variant="outline" className="w-full" onClick={onCancel} disabled={isLoading}>
            Cancelar
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Paso 2: Verificar código TOTP
  if (step === "verify" && enrollmentData) {
    return (
      <Card className="shadow-elevated border-0 bg-gradient-card w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Verificar Autenticador</CardTitle>
          <CardDescription>
            Ingresa el código de 6 dígitos que genera tu app autenticadora
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="totp-code">Código de Verificación</Label>
            <Input
              id="totp-code"
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="000000"
              value={verificationCode}
              onChange={(e) => {
                setVerificationCode(e.target.value.replace(/\D/g, ""));
                setError(null);
              }}
              disabled={isLoading}
              className="text-center text-lg tracking-widest font-mono bg-background/50"
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="w-4 h-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button
            className="w-full bg-gradient-primary hover:opacity-90"
            onClick={handleVerifyCode}
            disabled={verificationCode.length !== 6 || isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Verificando...
              </>
            ) : (
              "Verificar Código"
            )}
          </Button>

          <Button
            variant="outline"
            className="w-full"
            onClick={() => setStep("qr")}
            disabled={isLoading}
          >
            Volver
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Paso 3: Mostrar códigos de recuperación
  if (step === "backup" && enrollmentData?.recovery_codes?.codes) {
    const backupCodes = enrollmentData.recovery_codes.codes.map((c) => c.code).join("\n");
    return (
      <Card className="shadow-elevated border-0 bg-gradient-card w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Códigos de Recuperación</CardTitle>
          <CardDescription>
            Guarda estos códigos en un lugar seguro. Úsalos si pierdes acceso a tu autenticador.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="bg-blue-50 border-blue-200">
            <AlertTriangle className="w-4 h-4 text-blue-600" />
            <AlertDescription className="text-blue-900">
              Cada código se puede usar una sola vez. No los compartas con nadie.
            </AlertDescription>
          </Alert>

          <div className="bg-background/50 rounded p-4 border border-border max-h-48 overflow-y-auto">
            <code className="text-xs font-mono whitespace-pre-wrap break-all">{backupCodes}</code>
          </div>

          <Button
            variant="outline"
            className="w-full"
            onClick={handleCopyBackupCodes}
          >
            {copiedCodes ? (
              <>
                <Check className="w-4 h-4 mr-2 text-success" />
                Códigos Copiados
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 mr-2" />
                Copiar Códigos
              </>
            )}
          </Button>

          <Button
            className="w-full bg-gradient-primary hover:opacity-90"
            onClick={handleCompleteEnrollment}
          >
            Completar Configuración
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Estado inicial
  return (
    <Card className="shadow-elevated border-0 bg-gradient-card w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Configurar TOTP</CardTitle>
        <CardDescription>
          Añade una capa extra de seguridad a tu cuenta con autenticación de dos factores.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="bg-blue-50 border-blue-200">
          <AlertTriangle className="w-4 h-4 text-blue-600" />
          <AlertDescription className="text-blue-900">
            Necesitarás una app de autenticación como Google Authenticator, Microsoft Authenticator o Authy.
          </AlertDescription>
        </Alert>

        <Button
          className="w-full bg-gradient-primary hover:opacity-90"
          onClick={handleInitiateEnrollment}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Iniciando...
            </>
          ) : (
            "Iniciar Configuración TOTP"
          )}
        </Button>

        <Button variant="outline" className="w-full" onClick={onCancel} disabled={isLoading}>
          Cancelar
        </Button>
      </CardContent>
    </Card>
  );
};
