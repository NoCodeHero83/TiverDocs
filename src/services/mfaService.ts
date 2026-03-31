/**
 * Utilidades para manejar el flujo de autenticación con TOTP
 */

import { supabase } from "@/lib/supabase";

/**
 * Interfaz para representar el estado de MFA del usuario
 */
export interface UserMFAStatus {
  hasTOTP: boolean;
  totpFactorId?: string;
  totpStatus?: "verified" | "pending";
}

/**
 * Obtiene el estado de MFA del usuario después de un login exitoso
 * pero antes de establecer la sesión
 * @param userId - ID del usuario
 * @returns UserMFAStatus con información sobre MFA del usuario
 */
export const getUserMFAStatus = async (userId: string): Promise<UserMFAStatus> => {
  try {
    const { data, error } = await supabase.auth.mfa.listFactors();

    if (error) {
      console.error("Error al verificar MFA:", error);
      return { hasTOTP: false };
    }

    if (data?.totp && data.totp.length > 0) {
      const verifiedFactor = data.totp.find((f) => f.status === "verified");
      if (verifiedFactor) {
        return {
          hasTOTP: true,
          totpFactorId: verifiedFactor.id,
          totpStatus: "verified",
        };
      }
    }

    return { hasTOTP: false };
  } catch (error) {
    console.error("Error en getUserMFAStatus:", error);
    return { hasTOTP: false };
  }
};

/**
 * Verifica si el usuario puede opcionalmente configurar TOTP
 * (es decir, si no tiene TOTP pero puede agregarlo)
 * @returns true si el usuario puede enrollarse en TOTP
 */
export const canUserEnrollTOTP = async (): Promise<boolean> => {
  try {
    const { data, error } = await supabase.auth.mfa.listFactors();

    if (error) {
      console.error("Error al verificar capacidad TOTP:", error);
      return false;
    }

    // El usuario puede enrollarse si tiene una sesión activa
    // y no hay factores TOTP verificados
    if (data?.totp) {
      const unverifiedFactor = data.totp.find((f) => f.status !== "verified");
      return unverifiedFactor !== undefined || data.totp.length === 0;
    }

    return true;
  } catch (error) {
    console.error("Error en canUserEnrollTOTP:", error);
    return false;
  }
};

/**
 * Inicia un desafío MFA para completar la autenticación
 * Debe usarse después de un login exitoso con TOTP configurado
 * @param factorId - ID del factor TOTP
 * @returns ID del desafío (usado internamente por Supabase)
 */
export const initiateMFAChallenge = async (
  factorId: string
): Promise<string> => {
  try {
    const { data, error } = await supabase.auth.mfa.challenge({
      factorId,
    });

    if (error) {
      throw new Error(`Error al iniciar desafío: ${error.message}`);
    }

    if (!data?.id) {
      throw new Error("No se recibió ID de desafío");
    }

    return data.id;
  } catch (error: any) {
    console.error("Error en initiateMFAChallenge:", error);
    throw error;
  }
};

/**
 * Valida si una sesión es temporal (requiere MFA adicional)
 * Se usa para determinar si se debe mostrar la pantalla de verificación MFA
 * @param session - Sesión Supabase
 * @returns true si la sesión requiere MFA adicional
 */
export const isSessionMFAPending = (session: any): boolean => {
  if (!session) return false;
  // Supabase usa session.user.amr (Authentication Methods Reference)
  // Si contiene "mfa" en la lista, significa que MFA fue usado
  // Si NOT contiene "mfa" pero el usuario tiene TOTP configurado,
  // entonces MFA está pendiente
  return !session.user?.amr?.includes("mfa");
};

/**
 * Obtiene información sobre factores MFA configurados
 * @returns Array de factores TOTP del usuario
 */
export const getConfiguredFactors = async () => {
  try {
    const { data, error } = await supabase.auth.mfa.listFactors();

    if (error) {
      throw error;
    }

    return {
      totp: data?.totp || [],
      other: data?.other || [],
    };
  } catch (error: any) {
    console.error("Error al obtener factores:", error);
    return { totp: [], other: [] };
  }
};
