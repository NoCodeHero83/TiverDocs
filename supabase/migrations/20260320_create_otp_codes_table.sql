/*
  Cambiar document_id de uuid a text en otp_codes.

  document_id se usa tanto para UUIDs de documentos reales como para
  identificadores MFA de login con formato "mfa_login_{userId}",
  por lo que debe ser text en lugar de uuid.
*/

ALTER TABLE otp_codes ALTER COLUMN document_id TYPE text;
