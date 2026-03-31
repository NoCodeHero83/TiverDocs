import { supabase } from "@/lib/supabase";

/**
 * Servicio para manejar TOTP (Time-based One-Time Password) MFA
 * Utiliza las APIs nativas de Supabase: mfa.enroll() y mfa.challengeAndVerify()
 */

/**
 * Respuesta de enrolamiento TOTP
 * Contiene QR code, secreto y códigos de recuperación
 */
export interface TOTPEnrollmentResponse {
  id: string;
  totp: {
    qr_code: string;
    secret: string;
  };
  recovery_codes?: {
    codes: { code: string; used_at: string | null }[];
  };
}

/**
 * Verifica si el usuario tiene MFA habilitado
 * @returns true si el usuario tiene al menos un factor de autenticación configurado
 */
export const hasMFAEnabled = async (userId: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase.auth.mfa.listFactors();

    if (error) {
      console.error("Error al verificar MFA:", error);
      return false;
    }

    // Verificar si hay factores confirmados
    if (data?.totp && data.totp.length > 0) {
      return data.totp.some((factor) => factor.status === "verified");
    }

    return false;
  } catch (error) {
    console.error("Error al verificar MFA:", error);
    return false;
  }
};

/**
 * Inicia el enrolamiento de un nuevo factor TOTP
 * Retorna el ID de la sesión, QR code y secreto
 * @returns TOTPEnrollmentResponse con datos necesarios para completar el enrolamiento
 */
export const enrollTOTP = async (): Promise<TOTPEnrollmentResponse> => {
  try {
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
    });

    if (error) {
      throw new Error(`Error al iniciar enrolamiento TOTP: ${error.message}`);
    }

    if (!data) {
      throw new Error(
        "No se recibió respuesta del servidor al enrollarse en TOTP",
      );
    }

    return {
      id: data.id,
      totp: {
        qr_code: data.totp?.qr_code || "",
        secret: data.totp?.secret || "",
      },
      recovery_codes: (data as any).recovery_codes,
    };
  } catch (error: any) {
    console.error("Error en enrollTOTP:", error);
    throw error;
  }
};

/**
 * Completa el enrolamiento de TOTP verificando el código
 * @param factorId - ID del factor obtenido de enrollTOTP()
 * @param code - Código de 6 dígitos del autenticador
 * @returns true si la verificación fue exitosa
 */
export const verifyTOTPEnrollment = async (
  factorId: string,
  code: string,
): Promise<boolean> => {
  try {
    if (!code || code.length !== 6) {
      throw new Error("El código debe tener 6 dígitos");
    }

    const { data, error } = await supabase.auth.mfa.challengeAndVerify({
      factorId,
      code,
    });

    if (error) {
      throw new Error(`Error al verificar TOTP: ${error.message}`);
    }

    if ((data as any)?.session) {
      return true;
    }

    // Fallback: Verificar si ahora tenemos sesión AAL2
    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData?.session?.user?.app_metadata?.aal === 'aal2') {
      return true;
    }

    return false;
  } catch (error: any) {
    console.error("Error en verifyTOTPEnrollment:", error);
    throw error;
  }
};

/**
 * Verifica un código TOTP durante el login
 * Requiere que haya una sesión autenticada con MFA pendiente
 * @param factorId - ID del factor TOTP configurado
 * @param code - Código de 6 dígitos del autenticador
 * @returns true si la verificación fue exitosa
 */
export const verifyTOTPLogin = async (
  factorId: string,
  code: string,
): Promise<{ session: any; user: any }> => {
  try {
    if (!code || code.length !== 6) {
      throw new Error("El código debe tener 6 dígitos");
    }

    const { data, error } = (await supabase.auth.mfa.challengeAndVerify({
      factorId,
      code,
    })) as { data: any, error: any };

    console.log("[totpService] challengeAndVerify response - Data:", !!data, "Session:", !!data?.session, "User:", !!data?.user, "Error:", error);
    if (data) console.log("[totpService] Full data keys:", Object.keys(data));

    if (error) {
      throw new Error(`Código TOTP inválido: ${error.message}`);
    }

    if (!data?.session || !data?.user) {
      console.warn("[totpService] La verificación no devolvió sesión/usuario, intentando recuperar de getSession...");
      const { data: sessionData } = await supabase.auth.getSession();
      
      if (sessionData?.session) {
        console.log("[totpService] Sesión recuperada exitosamente de getSession()");
        return {
          session: sessionData.session,
          user: sessionData.session.user,
        };
      }
      
      throw new Error("No se pudo completar la verificación MFA (sin sesión en respuesta ni en el cliente)");
    }

    return {
      session: data.session,
      user: data.user,
    };
  } catch (error: any) {
    console.error("Error en verifyTOTPLogin:", error);
    throw error;
  }
};

/**
 * Obtiene los factores MFA configurados del usuario actual
 * @returns Lista de factores TOTP configurados
 */
export const getTOTPFactors = async () => {
  try {
    const { data, error } = await supabase.auth.mfa.listFactors();

    console.log("TOTP factors:", data?.totp);

    if (error) {
      throw error;
    }

    return data?.totp || [];
  } catch (error: any) {
    console.error("Error al obtener factores TOTP:", error);
    throw error;
  }
};

/**
 * Crea un desafío MFA para el login
 * Se llama después de validar credenciales exitosamente
 * @param factorId - ID del factor TOTP para el cual se requiere verificación
 * @returns ID del desafío para ser usado en challengeAndVerify
 */
export const createTOTPChallenge = async (factorId: string) => {
  try {
    const { data, error } = await supabase.auth.mfa.challenge({
      factorId,
    });

    if (error) {
      throw new Error(`Error al crear desafío MFA: ${error.message}`);
    }

    if (!data?.id) {
      throw new Error("No se recibió ID de desafío");
    }

    return data.id;
  } catch (error: any) {
    console.error("Error en createTOTPChallenge:", error);
    throw error;
  }
};
