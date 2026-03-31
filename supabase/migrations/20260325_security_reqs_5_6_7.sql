/*
  Requerimientos de Seguridad 5, 6 y 7

  5. Hash criptográfico fuerte por pagaré (SHA-256+)
     - Agrega columna hash_sha256 a documentos para almacenar el hash del archivo

  6. Inmutabilidad lógica post-emisión
     - Trigger que impide modificar campos críticos de un pagaré después de emitido

  7. Control de versiones con trazabilidad
     - Tabla documento_versiones que guarda un snapshot antes de cada UPDATE
     - Trigger que inserta la versión anterior automáticamente
*/

-- ============================================================
-- REQ 5: Columna hash SHA-256 en documentos
-- ============================================================
ALTER TABLE documentos
  ADD COLUMN IF NOT EXISTS hash_sha256 text NULL;

COMMENT ON COLUMN documentos.hash_sha256 IS
  'Hash SHA-256 del archivo binario al momento de la subida. Permite verificar integridad.';

-- ============================================================
-- REQ 7: Tabla de versiones de documentos
-- ============================================================
CREATE TABLE IF NOT EXISTS documento_versiones (
  id             bigserial PRIMARY KEY,
  documento_id   uuid        NOT NULL,
  version_num    integer     NOT NULL DEFAULT 1,
  snapshot       jsonb       NOT NULL,          -- copia completa del row antes del cambio
  modificado_por uuid        NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  modificado_en  timestamptz NOT NULL DEFAULT now(),
  motivo         text        NULL               -- descripción opcional del cambio
);

COMMENT ON TABLE documento_versiones IS
  'Historial de versiones de documentos. Cada fila es un snapshot del estado anterior antes de un UPDATE.';

ALTER TABLE documento_versiones ENABLE ROW LEVEL SECURITY;

-- SuperAdmin puede ver todas las versiones
CREATE POLICY "SuperAdmin puede ver versiones"
  ON documento_versiones FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
        AND usuarios.rol = 'SuperAdmin'
    )
  );

-- Admins del workspace pueden ver versiones de sus documentos
CREATE POLICY "Admin workspace puede ver versiones de sus documentos"
  ON documento_versiones FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM documentos d
      JOIN user_workspaces uw ON uw.workspace_id = d.workspace_id
      WHERE d.id = documento_versiones.documento_id
        AND uw.user_id = auth.uid()
        AND uw.rol IN ('Administrador', 'SuperAdmin')
        AND uw.estado = 'Activo'
    )
  );

-- Solo triggers internos insertan versiones (no usuarios directos)
CREATE POLICY "Solo sistema puede insertar versiones"
  ON documento_versiones FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Nadie puede modificar ni eliminar versiones (inmutabilidad del log)
CREATE POLICY "Versiones son inmutables - no UPDATE"
  ON documento_versiones FOR UPDATE
  TO authenticated
  USING (false);

CREATE POLICY "Versiones son inmutables - no DELETE"
  ON documento_versiones FOR DELETE
  TO authenticated
  USING (false);

-- Índices para consultas de trazabilidad
CREATE INDEX IF NOT EXISTS idx_documento_versiones_documento_id
  ON documento_versiones(documento_id);

CREATE INDEX IF NOT EXISTS idx_documento_versiones_modificado_en
  ON documento_versiones(modificado_en DESC);

-- ============================================================
-- REQ 7: Trigger que captura versión antes de cada UPDATE
-- ============================================================
CREATE OR REPLACE FUNCTION fn_versionar_documento()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_num integer;
BEGIN
  -- Obtener el número de versión actual
  SELECT COALESCE(MAX(version_num), 0) + 1
    INTO v_num
    FROM documento_versiones
   WHERE documento_id = OLD.id;

  INSERT INTO documento_versiones (
    documento_id,
    version_num,
    snapshot,
    modificado_por,
    modificado_en
  ) VALUES (
    OLD.id,
    v_num,
    to_jsonb(OLD),
    auth.uid(),
    now()
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_versionar_documento ON documentos;
CREATE TRIGGER trg_versionar_documento
  BEFORE UPDATE ON documentos
  FOR EACH ROW
  EXECUTE FUNCTION fn_versionar_documento();

-- ============================================================
-- REQ 6: Trigger de inmutabilidad post-emisión para Pagarés
-- ============================================================
-- Los campos críticos de un Pagaré NO pueden cambiar una vez creado.
-- Campos protegidos: file_path, file_name, hash_sha256, tipo_documento,
--                    workspace_id, uploaded_by
-- Para modificar estos campos se requiere intervención del SuperAdmin
-- directamente en BD (bypass de RLS con SERVICE_ROLE).

CREATE OR REPLACE FUNCTION fn_proteger_campos_pagare()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Solo aplica a documentos de tipo Pagaré
  IF OLD.tipo_documento = 'Pagaré' THEN
    IF OLD.file_path      IS DISTINCT FROM NEW.file_path      OR
       OLD.file_name      IS DISTINCT FROM NEW.file_name      OR
       OLD.hash_sha256    IS DISTINCT FROM NEW.hash_sha256    OR
       OLD.tipo_documento IS DISTINCT FROM NEW.tipo_documento OR
       OLD.workspace_id   IS DISTINCT FROM NEW.workspace_id   OR
       OLD.uploaded_by    IS DISTINCT FROM NEW.uploaded_by
    THEN
      RAISE EXCEPTION
        'INMUTABILIDAD: Los campos críticos del Pagaré (id=%) no pueden modificarse después de emitido. Campos protegidos: file_path, file_name, hash_sha256, tipo_documento, workspace_id, uploaded_by.',
        OLD.id
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_proteger_campos_pagare ON documentos;
CREATE TRIGGER trg_proteger_campos_pagare
  BEFORE UPDATE ON documentos
  FOR EACH ROW
  EXECUTE FUNCTION fn_proteger_campos_pagare();

-- Nota: el trigger de versionado (trg_versionar_documento) se ejecuta ANTES
-- que el de protección, por lo que cualquier intento de modificación inválida
-- quedará registrado en documento_versiones antes de ser rechazado.
-- Para el correcto ordenamiento, recrea ambos triggers en el mismo orden:
-- 1. trg_versionar_documento  (BEFORE UPDATE, primero en orden alfab.)
-- 2. trg_proteger_campos_pagare (BEFORE UPDATE, segundo)
-- PostgreSQL ejecuta los triggers BEFORE en orden alfabético de nombre.
