/*
  Req 9: Acceso restringido a secretos — RLS en tabla otp_codes

  La tabla otp_codes no tenía RLS, lo que permitía que cualquier usuario
  autenticado pudiera leer todos los códigos OTP de todos los usuarios.

  Con estas políticas:
  - Cada usuario solo puede ver/eliminar sus propios OTPs (filtrando por email)
  - Las Edge Functions usan service_role que bypasea RLS, por lo que
    send-otp (INSERT) y verify-otp (SELECT+DELETE) siguen funcionando sin cambios.
  - Nadie puede insertar OTPs directamente desde el frontend.
*/

ALTER TABLE otp_codes ENABLE ROW LEVEL SECURITY;

-- Usuarios autenticados solo pueden leer sus propios OTPs
CREATE POLICY "Usuarios solo ven sus propios OTPs"
  ON otp_codes FOR SELECT
  TO authenticated
  USING (
    email = (
      SELECT au.email FROM auth.users au WHERE au.id = auth.uid()
    )
  );

-- Usuarios autenticados solo pueden eliminar (consumir) sus propios OTPs
CREATE POLICY "Usuarios solo eliminan sus propios OTPs"
  ON otp_codes FOR DELETE
  TO authenticated
  USING (
    email = (
      SELECT au.email FROM auth.users au WHERE au.id = auth.uid()
    )
  );

-- Nadie puede insertar OTPs directamente desde el frontend
-- (solo service_role via Edge Functions puede hacerlo — bypasea RLS)
-- No se crea política de INSERT para "authenticated" intencionalmente.

-- SuperAdmin puede ver todos los OTPs para auditoría
CREATE POLICY "SuperAdmin puede ver todos los OTPs"
  ON otp_codes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
        AND usuarios.rol = 'SuperAdmin'
    )
  );
