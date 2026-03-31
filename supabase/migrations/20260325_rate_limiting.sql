/*
  Req 14: Rate limiting por IP/usuario
  Tabla para rastrear intentos de llamadas a funciones sensibles.
  Permite bloquear automáticamente usuarios/IPs con demasiados intentos.
*/

CREATE TABLE IF NOT EXISTS rate_limit_attempts (
  id          bigserial PRIMARY KEY,
  key         text       NOT NULL,  -- formato: "{tipo}:{identificador}" p.ej. "otp_send:user_uuid" o "otp_verify:ip_addr"
  tipo        text       NOT NULL,  -- "otp_send", "otp_verify", "login"
  usuario_id  uuid       NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ip_address  text       NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE rate_limit_attempts IS
  'Registro de intentos para rate limiting de operaciones sensibles (OTP, login).';

-- Índice para consultas de rate limiting (buscar por key en ventana de tiempo)
CREATE INDEX IF NOT EXISTS idx_rate_limit_key_time
  ON rate_limit_attempts(key, created_at DESC);

-- Limpiar registros viejos automáticamente (más de 1 hora)
-- Esta función debe ejecutarse periódicamente via pg_cron o trigger
CREATE OR REPLACE FUNCTION fn_cleanup_rate_limit()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  DELETE FROM rate_limit_attempts
  WHERE created_at < now() - interval '1 hour';
$$;

-- RLS: La tabla es interna, solo Edge Functions (service role) la usan
ALTER TABLE rate_limit_attempts ENABLE ROW LEVEL SECURITY;

-- SuperAdmin puede ver los intentos para monitoreo
CREATE POLICY "SuperAdmin puede ver rate limits"
  ON rate_limit_attempts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
        AND usuarios.rol = 'SuperAdmin'
    )
  );

-- Solo service role puede insertar/borrar (Edge Functions usan service key)
-- No se crean políticas de INSERT/DELETE para authenticated ya que
-- las Edge Functions usan la service key que bypasea RLS.
