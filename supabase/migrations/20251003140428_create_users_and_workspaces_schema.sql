/*
  # Create Users and Workspaces Management Schema

  1. New Enums
    - `user_role`: Defines user roles (SuperAdmin, Administrador, Visualizador)
    - `estado_enum`: Defines entity states (Activo, Inactivo)

  2. New Tables
    - `usuarios`
      - `id` (uuid, primary key): Unique user identifier
      - `full_name` (varchar(150)): User's full name
      - `email` (varchar(150), unique): User's email address
      - `rol` (user_role): User's global role
      - `estado` (estado_enum): User's status (Active/Inactive)
      - `ultimo_acceso` (timestamp): Last login timestamp
      - `created_at` (timestamp): Account creation timestamp

    - `workspaces`
      - `id` (uuid, primary key): Unique workspace identifier
      - `name` (varchar(150)): Workspace name
      - `client_id` (uuid): Optional client identifier
      - `description` (text): Workspace description
      - `estado` (estado_enum): Workspace status
      - `created_at` (timestamp): Creation timestamp
      - `last_activity_at` (timestamp): Last activity timestamp
      - `user_count` (integer): Number of users in workspace

    - `user_workspaces`
      - `id` (uuid, primary key): Unique relationship identifier
      - `user_id` (uuid): References usuarios table
      - `workspace_id` (uuid): References workspaces table
      - `rol` (user_role): User's role within workspace
      - `estado` (estado_enum): Relationship status
      - `joined_at` (timestamp): When user joined workspace

  3. Functions
    - `update_workspace_user_count()`: Maintains accurate user count in workspaces

  4. Triggers
    - `trg_add_user_workspace`: Updates user count on insert
    - `trg_remove_user_workspace`: Updates user count on delete

  5. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
    - Add policies for SuperAdmin to manage all data
*/

-- Create enums if they don't exist
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('SuperAdmin', 'Administrador', 'Visualizador');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'estado_enum') THEN
    CREATE TYPE estado_enum AS ENUM ('Activo', 'Inactivo');
  END IF;
END $$;

-- Create usuarios table
CREATE TABLE IF NOT EXISTS usuarios (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  full_name character varying(150) NOT NULL,
  email character varying(150) NOT NULL,
  rol user_role NOT NULL DEFAULT 'Visualizador',
  estado estado_enum NOT NULL DEFAULT 'Activo',
  ultimo_acceso timestamp without time zone NULL,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT usuarios_pkey PRIMARY KEY (id),
  CONSTRAINT usuarios_email_key UNIQUE (email)
);

-- Create workspaces table
CREATE TABLE IF NOT EXISTS workspaces (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name character varying(150) NOT NULL,
  client_id uuid NULL,
  description text NULL,
  estado estado_enum NOT NULL DEFAULT 'Activo',
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  last_activity_at timestamp without time zone NULL,
  user_count integer NOT NULL DEFAULT 0,
  CONSTRAINT workspaces_pkey PRIMARY KEY (id)
);

-- Create user_workspaces junction table
CREATE TABLE IF NOT EXISTS user_workspaces (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  workspace_id uuid NOT NULL,
  rol user_role NOT NULL DEFAULT 'Visualizador',
  estado estado_enum NOT NULL DEFAULT 'Activo',
  joined_at timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT user_workspaces_pkey PRIMARY KEY (id),
  CONSTRAINT user_workspaces_user_id_workspace_id_key UNIQUE (user_id, workspace_id),
  CONSTRAINT user_workspaces_user_id_fkey FOREIGN KEY (user_id) 
    REFERENCES usuarios (id) ON DELETE CASCADE,
  CONSTRAINT user_workspaces_workspace_id_fkey FOREIGN KEY (workspace_id) 
    REFERENCES workspaces (id) ON DELETE CASCADE
);

-- Create function to update workspace user count
CREATE OR REPLACE FUNCTION update_workspace_user_count()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE workspaces 
    SET user_count = user_count + 1,
        last_activity_at = now()
    WHERE id = NEW.workspace_id;
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE workspaces 
    SET user_count = GREATEST(0, user_count - 1),
        last_activity_at = now()
    WHERE id = OLD.workspace_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS trg_add_user_workspace ON user_workspaces;
CREATE TRIGGER trg_add_user_workspace
  AFTER INSERT ON user_workspaces
  FOR EACH ROW
  EXECUTE FUNCTION update_workspace_user_count();

DROP TRIGGER IF EXISTS trg_remove_user_workspace ON user_workspaces;
CREATE TRIGGER trg_remove_user_workspace
  AFTER DELETE ON user_workspaces
  FOR EACH ROW
  EXECUTE FUNCTION update_workspace_user_count();

-- Enable RLS
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_workspaces ENABLE ROW LEVEL SECURITY;

-- RLS Policies for usuarios table
CREATE POLICY "SuperAdmin can view all users"
  ON usuarios FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.rol = 'SuperAdmin'
    )
  );

CREATE POLICY "Users can view their own profile"
  ON usuarios FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "SuperAdmin can insert users"
  ON usuarios FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.rol = 'SuperAdmin'
    )
  );

CREATE POLICY "SuperAdmin can update users"
  ON usuarios FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.rol = 'SuperAdmin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.rol = 'SuperAdmin'
    )
  );

CREATE POLICY "Users can update their own ultimo_acceso"
  ON usuarios FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- RLS Policies for workspaces table
CREATE POLICY "SuperAdmin can view all workspaces"
  ON workspaces FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.rol = 'SuperAdmin'
    )
  );

CREATE POLICY "Users can view their assigned workspaces"
  ON workspaces FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_workspaces
      WHERE user_workspaces.workspace_id = workspaces.id
      AND user_workspaces.user_id = auth.uid()
      AND user_workspaces.estado = 'Activo'
    )
  );

CREATE POLICY "SuperAdmin can insert workspaces"
  ON workspaces FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.rol = 'SuperAdmin'
    )
  );

CREATE POLICY "SuperAdmin can update workspaces"
  ON workspaces FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.rol = 'SuperAdmin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.rol = 'SuperAdmin'
    )
  );

CREATE POLICY "SuperAdmin can delete workspaces"
  ON workspaces FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.rol = 'SuperAdmin'
    )
  );

-- RLS Policies for user_workspaces table
CREATE POLICY "SuperAdmin can view all user-workspace relationships"
  ON user_workspaces FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.rol = 'SuperAdmin'
    )
  );

CREATE POLICY "Users can view their own workspace relationships"
  ON user_workspaces FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "SuperAdmin can insert user-workspace relationships"
  ON user_workspaces FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.rol = 'SuperAdmin'
    )
  );

CREATE POLICY "SuperAdmin can update user-workspace relationships"
  ON user_workspaces FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.rol = 'SuperAdmin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.rol = 'SuperAdmin'
    )
  );

CREATE POLICY "SuperAdmin can delete user-workspace relationships"
  ON user_workspaces FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.rol = 'SuperAdmin'
    )
  );