/*
  # Create actividad_reciente table

  1. New Tables
    - `actividad_reciente`
      - `id` (bigserial, primary key): Unique activity identifier
      - `usuario_id` (uuid, nullable): References auth.users - user who performed action
      - `accion` (text): Description of the action performed
      - `entidad_tipo` (text, nullable): Type of entity affected (workspace, usuario, documento)
      - `entidad_nombre` (text, nullable): Name of the affected entity
      - `entidad_id` (uuid, nullable): ID of the affected entity
      - `fecha` (timestamptz): Timestamp when action occurred
      - `metadata` (jsonb, nullable): Additional data about the action

  2. Security
    - Enable RLS on actividad_reciente table
    - Add policy for SuperAdmin to view all activities
    - Add policy for authenticated users to insert activities
    - Add policy for users to view their own activities
*/

CREATE TABLE IF NOT EXISTS actividad_reciente (
  id bigserial NOT NULL,
  usuario_id uuid NULL,
  accion text NOT NULL,
  entidad_tipo text NULL,
  entidad_nombre text NULL,
  entidad_id uuid NULL,
  fecha timestamp with time zone NULL DEFAULT now(),
  metadata jsonb NULL,
  CONSTRAINT actividad_reciente_pkey PRIMARY KEY (id),
  CONSTRAINT actividad_reciente_usuario_id_fkey FOREIGN KEY (usuario_id) 
    REFERENCES auth.users (id) ON DELETE SET NULL
);

ALTER TABLE actividad_reciente ENABLE ROW LEVEL SECURITY;

CREATE POLICY "SuperAdmin can view all activities"
  ON actividad_reciente FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.rol = 'SuperAdmin'
    )
  );

CREATE POLICY "Users can view their own activities"
  ON actividad_reciente FOR SELECT
  TO authenticated
  USING (auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can insert activities"
  ON actividad_reciente FOR INSERT
  TO authenticated
  WITH CHECK (true);
