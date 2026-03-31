import React, { useState, useEffect } from "react";
import { LoginForm } from "@/components/auth/LoginForm";
import { MfaVerificationForm } from "@/components/auth/MfaVerificationForm";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

export const LoginPage = () => {
  const { toast } = useToast();
  const { signIn, mfaPending, pendingEmail, cancelMfa } = useAuth();

  const handleLogin = async (email: string, password: string) => {
    try {
      await signIn(email, password);
      // Si signIn tiene éxito, mfaPending pasará a true
      // y se mostrará el formulario MFA
      if (!mfaPending) {
        toast({
          title: "Código enviado",
          description: "Revisa tu correo para el código de verificación.",
        });
      }
    } catch (error: any) {
      // Si el usuario tiene TOTP, el error es TOTP_CONFIGURED
      // En este caso, no mostrar error porque LoginForm lo maneja
      if (error.message === 'TOTP_CONFIGURED') {
        console.log('[LoginPage] Usuario con TOTP - flujo manejado por LoginForm');
        return;
      }
      
      console.error("[LoginPage] Error de autenticación:", error);
      toast({
        title: "Error de autenticación",
        description:
          error.message ||
          "Credenciales incorrectas. Verifica tu email y contraseña.",
        variant: "destructive",
      });
    }
  };

  const handleForgotPassword = async () => {
    toast({
      title: "Recuperación de contraseña",
      description: "Contacta al administrador para restablecer tu contraseña.",
    });
  };

  // Para la verificación del OTP necesitamos el userId del usuario pendiente
  const [pendingUserId, setPendingUserId] = useState<string>('');

  useEffect(() => {
    if (mfaPending && pendingEmail) {
      // El userId se obtiene a través de la tabla usuarios por email
      supabase
        .from('usuarios')
        .select('id')
        .eq('email', pendingEmail)
        .maybeSingle()
        .then(({ data }) => {
          if (data?.id) setPendingUserId(data.id);
        });
    }
  }, [mfaPending, pendingEmail]);

  if (mfaPending && pendingEmail) {
    return (
      <div className="min-h-screen flex">
        <div className="hidden lg:flex lg:flex-1 relative bg-cover bg-center bg-no-repeat bg-primary/10" />
        <div className="flex-1 bg-gradient-background flex items-center justify-center p-4">
          <div className="w-full max-w-md">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                TiverDocs
              </h1>
              <p className="text-muted-foreground mt-2">
                Verificación en dos pasos
              </p>
            </div>
            <MfaVerificationForm
              email={pendingEmail}
              userId={pendingUserId}
              onCancel={cancelMfa}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <LoginForm onLogin={handleLogin} onForgotPassword={handleForgotPassword} />
  );
};

