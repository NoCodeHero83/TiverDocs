import { supabase } from '@/lib/supabase';

interface LogActivityParams {
  accion: string;
  entidad_tipo?: string;
  entidad_nombre?: string | null;
  entidad_id?: string | null;
  metadata?: Record<string, any>;
}

/**
 * Req 10: Logging detallado de acciones críticas.
 * Registra la acción junto con metadatos de auditoría (user-agent, timestamp, etc.).
 */
export const logActivity = async ({
  accion,
  entidad_tipo,
  entidad_nombre,
  entidad_id,
  metadata
}: LogActivityParams): Promise<void> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    // Req 10: Enriquecer metadata con información de auditoría del navegador
    const auditMetadata: Record<string, any> = {
      ...metadata,
      _audit: {
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
        timestamp_iso: new Date().toISOString(),
        platform: typeof navigator !== 'undefined' ? navigator.platform : null,
        language: typeof navigator !== 'undefined' ? navigator.language : null,
      }
    };

    const { error } = await supabase
      .from('actividad_reciente')
      .insert({
        usuario_id: user?.id || null,
        accion,
        entidad_tipo: entidad_tipo || null,
        entidad_nombre: entidad_nombre || null,
        entidad_id: entidad_id || null,
        metadata: auditMetadata
      });

    if (error) {
      console.error('Error logging activity:', error);
    }
  } catch (error) {
    console.error('Error in logActivity:', error);
  }
};
