import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { supabase } from "@/lib/supabase";
import { User, Session } from "@supabase/supabase-js";
import { logActivity } from '@/services/activityService';

interface Usuario {
  id: string;
  full_name: string;
  email: string;
  rol: "SuperAdmin" | "Administrador" | "Visualizador";
  estado: "Activo" | "Inactivo";
  ultimo_acceso: string | null;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  usuario: Usuario | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateLastAccess: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUsuario = async (userId: string) => {
    console.log("Buscando por id ", userId);
    const { data, error } = await supabase
      .from("usuarios")
      .select("*")
      .eq("id", userId)
      .maybeSingle();
    console.log("Data de usuario obtenida:", data, error);

    if (error) {
      console.error("Error fetching usuario:", error);
      return null;
    }

    return data;
  };

  const updateLastAccess = async () => {
    if (!user) return;
    // const { error } = await supabase.rpc("update_ultimo_acceso");
    const { error } = await supabase.rpc("update_ultimo_acceso", {
      p_user_id: user.id,
    });

    if (error) console.error("Error updating ultimo_acceso:", error);
  };

  useEffect(() => {
    const initialize = async () => {
      setLoading(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        console.log("Sesión obtenida: aqui xd", session.user.id);

        const usuarioData = await fetchUsuario(session.user.id);
        setUsuario(usuarioData);
        await updateLastAccess();
      } else {
        setUsuario(null);
      }
      setLoading(false);
    };

    initialize();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        console.log("Auth state changed, event:", _event, "session:", session?.user?.id);
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          const usuarioData = await fetchUsuario(session.user.id);
          console.log("Usuario obtenido en onAuthStateChange:", usuarioData);
          setUsuario(usuarioData);
          if (_event === 'SIGNED_IN') {
            await updateLastAccess();
          }
        } else {
          setUsuario(null);
        }
      })();
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;

    if (data.user) {
      const usuarioData = await fetchUsuario(data.user.id);
      console.log("Usuario obtenido en signIn:", usuarioData);

      setUser(data.user);
      setUsuario(usuarioData);
      setSession(data.session);

      await updateLastAccess();
      try {
        await logActivity({
          accion: 'Inicio de sesión',
          entidad_tipo: 'usuario',
          entidad_nombre: usuarioData?.full_name || data.user.email || null,
          entidad_id: data.user.id
        });
      } catch (e) {
        console.error('[AuthContext] logActivity signIn error', e);
      }
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;

    setUser(null);
    setUsuario(null);
    setSession(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        usuario,
        session,
        loading,
        signIn,
        signOut,
        updateLastAccess,
      }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};
