import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
} from "react";
import { supabase } from "@/lib/supabase";
import { User, Session } from "@supabase/supabase-js";
import { logActivity } from "@/services/activityService";

/** Minutos de inactividad antes del cierre automático de sesión (Req 3) */
const IDLE_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutos

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
  /** true cuando el usuario pasó la contraseña pero aún no verificó OTP (Req 1) */
  mfaPending: boolean;
  /** email del usuario en espera de verificación MFA (Req 1) */
  pendingEmail: string | null;
  /** true cuando la sesión expiró por inactividad y se requiere reautenticación (Req 3/4) */
  sessionExpired: boolean;
  lastUserEmail: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  /**
   * Req 1: Verifica el código OTP usando el token de sesión pendiente (autenticado).
   * Lanza error si el código es inválido o expirado.
   */
  verifyMfaCode: (code: string, userId: string) => Promise<void>;
  cancelMfa: () => void;
  setMfaPending: (pending: boolean) => void;
  signOut: () => Promise<void>;
  updateLastAccess: () => Promise<void>;
  /** Función para que el modal de reauth descarte el estado de sesión expirada */
  clearSessionExpired: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const usuarioRef = useRef<Usuario | null>(null);

  // --- Req 1: MFA state ---
  const [mfaPending, setMfaPending] = useState(false);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [lastUserEmail, setLastUserEmail] = useState<string | null>(() =>
    localStorage.getItem("last_user_email"),
  );
  /** Sesión temporal guardada hasta completar MFA */
  const pendingSessionRef = useRef<Session | null>(null);
  const mfaPendingRef = useRef(false);
  /** Lock para evitar múltiples fetchUsuario simultáneos */
  const isFetchingProfileRef = useRef(false);

  const setMfaPendingExtended = (pending: boolean) => {
    console.log(`[AuthContext] setMfaPending -> ${pending}`);
    setMfaPending(pending);
    mfaPendingRef.current = pending;
    
    // No disparamos un re-fetch manual aquí porque onAuthStateChange lo detectará 
    // y hará el fetch de manera centralizada evitando colisiones.
  };

  // --- Req 3/4: Inactividad ---
  const [sessionExpired, setSessionExpired] = useState(false);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetIdleTimer = () => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(handleIdleTimeout, IDLE_TIMEOUT_MS);
  };

  const handleIdleTimeout = async () => {
    // Solo actúa si hay sesión activa y no hay MFA pendiente
    if (!user) return;
    console.log("[AuthContext] Sesión expirada por inactividad");

    // Guardar email para reautenticación
    const emailToSave = user.email || usuario?.email;
    if (emailToSave) {
      setLastUserEmail(emailToSave);
      localStorage.setItem("last_user_email", emailToSave);
    }

    try {
      await logActivity({
        accion: "Sesión expirada por inactividad",
        entidad_tipo: "usuario",
        entidad_nombre: emailToSave || null,
        entidad_id: user.id,
        metadata: { motivo: "idle_timeout", idle_ms: IDLE_TIMEOUT_MS },
      });
    } catch (_) {}

    setSessionExpired(true);
    // Invalidamos la sesión en Supabase
    await supabase.auth.signOut();
    setUser(null);
    setUsuario(null);
    usuarioRef.current = null;
    setSession(null);
  };

  // Registrar listeners de actividad del usuario
  useEffect(() => {
    const events = [
      "mousemove",
      "keydown",
      "mousedown",
      "touchstart",
      "scroll",
    ];
    const handleActivity = () => {
      if (user) resetIdleTimer();
    };
    events.forEach((e) =>
      window.addEventListener(e, handleActivity, { passive: true }),
    );
    return () => {
      events.forEach((e) => window.removeEventListener(e, handleActivity));
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [user]);

  const fetchUsuario = async (userId: string) => {
    console.log("[AuthContext] fetchUsuario - Buscando perfil para:", userId);
    const { data, error } = await supabase
      .from("usuarios")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.error("[AuthContext] fetchUsuario error:", error);
      return null;
    }
    console.log("[AuthContext] fetchUsuario - Resultado:", data ? `Encontrado (${data.rol})` : "No encontrado");
    return data;
  };

  const updateLastAccess = async () => {
    if (!user) return;
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
        const usuarioData = await fetchUsuario(session.user.id);
        setUsuario(usuarioData);
        usuarioRef.current = usuarioData;
        await updateLastAccess();
        resetIdleTimer();
      } else {
        setUsuario(null);
        usuarioRef.current = null;
      }
      setLoading(false);
    };

    initialize();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      const aal = session?.user?.app_metadata?.aal;
      console.log(`[AuthContext] onAuthStateChange Event: ${event}, AAL: ${aal}`);

      if (event === "SIGNED_OUT") {
        setSession(null);
        setUser(null);
        setUsuario(null);
        usuarioRef.current = null;
        setMfaPending(false);
        mfaPendingRef.current = false;
        if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
        setLoading(false);
        return;
      }

      setSession(session);
      setUser(session?.user ?? null);

      if (!session?.user) {
        setUsuario(null);
        usuarioRef.current = null;
        setLoading(false);
        return;
      }

      const isAAL2 = aal === "aal2" || event === "MFA_CHALLENGE_VERIFIED";

      // Si es AAL2 y no estamos ya sincronizando, procedemos
      if (isAAL2 && !isFetchingProfileRef.current) {
        // Optimización: Si ya tenemos al usuario correcto cargado, solo quitamos mfaPending
        if (usuarioRef.current?.id === session.user.id) {
          if (mfaPendingRef.current) {
            setMfaPending(false);
            mfaPendingRef.current = false;
          }
          setLoading(false);
          return;
        }

        console.log("[AuthContext] Sincronizando perfil AAL2...");
        isFetchingProfileRef.current = true;
        setLoading(true);

        // Timeout de seguridad: liberamos loading si algo se cuelga 8 segundos
        const timer = setTimeout(() => {
          if (isFetchingProfileRef.current) {
            console.warn("[AuthContext] Sincronización excedió tiempo límite");
            setLoading(false);
            isFetchingProfileRef.current = false;
          }
        }, 8000);

        fetchUsuario(session.user.id).then(async (data) => {
          clearTimeout(timer);
          setUsuario(data);
          usuarioRef.current = data;
          setMfaPending(false);
          mfaPendingRef.current = false;
          
          if (event === "SIGNED_IN" || event === "MFA_CHALLENGE_VERIFIED") {
            await updateLastAccess();
            resetIdleTimer();
          }
          
          isFetchingProfileRef.current = false;
          setLoading(false);
        }).catch(err => {
          console.error("[AuthContext] Error cargando perfil:", err);
          clearTimeout(timer);
          isFetchingProfileRef.current = false;
          setLoading(false);
        });
      } else if (!isAAL2) {
        // Bloqueamos acceso si es AAL1 y no los conocíamos
        if (!usuarioRef.current) {
          setUsuario(null);
          usuarioRef.current = null;
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  /**
   * Req 1: Sign-in en dos pasos.
   * Paso 1: Validar credenciales con Supabase, guardar sesión pendiente
   * y disparar envío de OTP. La sesión NO se expone hasta que MFA sea verificado.
   */
  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;

    if (data.user && data.session) {
      console.log("[AuthContext] Login exitoso para usuario:", email);

      // Verificar si el usuario tiene TOTP configurado
      try {
        const { data: mfaData } = await supabase.auth.mfa.listFactors();
        if (mfaData?.totp && mfaData.totp.length > 0) {
          const verifiedFactor = mfaData.totp.find(
            (f) => f.status === "verified",
          );
          if (verifiedFactor) {
            console.log(
              "[AuthContext] Usuario tiene TOTP configurado - NO enviar OTP de email",
            );
            // Usuario tiene TOTP, no enviar OTP de email
            // Cerrar sesión y dejar que LoginForm maneje el flujo TOTP
            await supabase.auth.signOut();
            throw new Error("TOTP_CONFIGURED");
          }
        } else {
          console.log(
            "[AuthContext] Usuario NO tiene TOTP - Enviando OTP de email",
          );
        }
      } catch (err: any) {
        if (err.message === "TOTP_CONFIGURED") {
          throw err; // Re-lanzar si tiene TOTP
        }
        console.warn("[AuthContext] Error al verificar MFA:", err);
      }

      // Guardar sesión temporalmente sin exponerla al resto de la app
      pendingSessionRef.current = data.session;
      setPendingEmail(email);

      // Enviar OTP al correo del usuario
      const functionsBase =
        import.meta.env.VITE_SUPABASE_FUNCTIONS_URL ||
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

      try {
        console.log("[AuthContext] Enviando OTP a:", email);
        const res = await fetch(`${functionsBase}/send-otp`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${data.session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            documentId: `mfa_login_${data.user.id}`,
            purpose: "mfa_login",
          }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          console.error("[AuthContext] send-otp error response:", err);
          console.error("[AuthContext] send-otp status:", res.status);
          // Si falla el envío de OTP, cerrar sesión y lanzar error
          await supabase.auth.signOut();
          pendingSessionRef.current = null;
          setPendingEmail(null);
          throw new Error(
            "No se pudo enviar el código OTP. Verifica que el correo sea válido e intenta nuevamente.",
          );
        }

        console.log("[AuthContext] OTP enviado exitosamente a:", email);
      } catch (fetchErr: any) {
        console.error("[AuthContext] Error al enviar OTP:", fetchErr);
        await supabase.auth.signOut();
        pendingSessionRef.current = null;
        setPendingEmail(null);
        throw fetchErr;
      }

      // Cerrar sesión en Supabase hasta que MFA se valide
      await supabase.auth.signOut();
      setMfaPending(true);
    }
  };

  /**
   * Req 1: Verifica el código OTP usando el token de sesión pendiente.
   * Usa el token temporal para autenticar la query a otp_codes (respeta RLS).
   * Si el código es válido, completa el login y restaura la sesión.
   */
  const verifyMfaCode = async (code: string, userId: string) => {
    const pending = pendingSessionRef.current;
    if (!pending)
      throw new Error("No hay sesión pendiente. Inicia sesión nuevamente.");

    const mfaDocumentId = `mfa_login_${userId}`;

    // Crear cliente Supabase temporal con el token de sesión pendiente
    // para que la query a otp_codes respete las políticas RLS del usuario
    const { createClient } = await import("@supabase/supabase-js");
    const tempClient = createClient(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_ANON_KEY,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
        global: {
          headers: { Authorization: `Bearer ${pending.access_token}` },
        },
      },
    );

    const { data: rows, error: queryErr } = await tempClient
      .from("otp_codes")
      .select("*")
      .eq("code", code)
      .eq("document_id", mfaDocumentId)
      .order("created_at", { ascending: false })
      .limit(1);

    if (queryErr) throw new Error("Error al verificar el código OTP.");

    const row = rows?.[0];
    if (!row)
      throw new Error(
        "Código incorrecto. Verifica el email y vuelve a intentarlo.",
      );
    if (row.expires_at && new Date(row.expires_at) < new Date()) {
      throw new Error(
        "El código ha expirado. Cancela y vuelve a iniciar sesión.",
      );
    }

    // Consumir OTP
    await tempClient.from("otp_codes").delete().eq("id", row.id);

    // Restaurar sesión en Supabase
    const { data, error } = await supabase.auth.setSession({
      access_token: pending.access_token,
      refresh_token: pending.refresh_token,
    });

    if (error) {
      console.error("[AuthContext] verifyMfaCode setSession error", error);
      throw new Error("La sesión expiró. Por favor, inicia sesión nuevamente.");
    }

    if (data.user) {
      const usuarioData = await fetchUsuario(data.user.id);
      setUser(data.user);
      setUsuario(usuarioData);
      setSession(data.session);

      await updateLastAccess();
      resetIdleTimer();

      try {
        await logActivity({
          accion: "Inicio de sesión",
          entidad_tipo: "usuario",
          entidad_nombre: usuarioData?.full_name || data.user.email || null,
          entidad_id: data.user.id,
          metadata: { mfa: true },
        });
      } catch (e) {
        console.error("[AuthContext] logActivity verifyMfaCode error", e);
      }
    }

    pendingSessionRef.current = null;
    setPendingEmail(null);
    setMfaPending(false);
  };

  /** Req 1: Cancela el flujo MFA sin completar el login. */
  const cancelMfa = () => {
    pendingSessionRef.current = null;
    setPendingEmail(null);
    setMfaPending(false);
  };

  const signOut = async () => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setUser(null);
    setUsuario(null);
    setSession(null);
    setMfaPending(false);
    setPendingEmail(null);
    pendingSessionRef.current = null;
    setSessionExpired(false);
  };

  /** Req 4: Descarta el estado de sesión expirada (llamado desde ReauthModal). */
  const clearSessionExpired = () => {
    setSessionExpired(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        usuario,
        session,
        loading,
        mfaPending,
        setMfaPending: setMfaPendingExtended,
        pendingEmail,
        sessionExpired,
        lastUserEmail,
        signIn,
        verifyMfaCode,
        cancelMfa,
        signOut,
        updateLastAccess,
        clearSessionExpired,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};
