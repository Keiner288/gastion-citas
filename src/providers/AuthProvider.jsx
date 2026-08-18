import { createContext, useContext, useEffect, useState, useRef } from "react";
import { supabase } from "../lib/supabase";

// 1 Creamos el contenedor (context)
const AuthContext = createContext(null);

// 2. Hook personalizado para usar el contexto facilmente
//esto evita importar useContext y AuthContext en cada archivo
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("UseAuth debe usarse dentro de AuthProvider");
  }
  return context;
};

//3 El provider que envuelve la aplicacion
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [error, setError] = useState(null);

  // Guard para evitar fetchProfile concurrentes
  const fetchingRef = useRef(false);

  // Serializacion segura de errores (evita JSON.stringify con referencias circulares)
  const safeErrorStr = (err) => {
    if (!err) return "unknown error";
    if (typeof err === "string") return err;
    if (err.message) return err.message;
    if (err.msg) return err.msg;
    if (err.error_description) return err.error_description;
    try {
      const seen = new WeakSet();
      return JSON.stringify(err, (key, val) => {
        if (typeof val === "object" && val !== null) {
          if (seen.has(val)) return "[circular]";
          seen.add(val);
        }
        return val;
      });
    } catch {
      return String(err);
    }
  };

  // Parse seguro de JSON desde RPC (maneja string o object)
  const safeParseRpc = (val) => {
    if (!val) return null;
    if (typeof val === "object") return val;
    try { return JSON.parse(val); } catch { return null; }
  };

  // Transforma el resultado del RPC al shape esperado por la app
  const transformProfile = (row) => {
    if (!row) return null;
    return {
      id: row.id,
      full_name: row.full_name,
      document_number: row.document_number,
      role_id: row.role_id,
      dependency_id: row.dependency_id,
      is_active: row.is_active,
      created_at: row.created_at,
      updated_at: row.updated_at,
      roles: row.roles || null,
      dependencies: row.dependencies || null,
    };
  };

  // Funcion auxiliar: obtener el perfil via RPC (bypassa RLS)
  const fetchProfile = async (userId, authUser) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;

    try {
      const meta = authUser?.user_metadata || {};

      // Leer perfil via RPC (bypassa RLS infinite recursion)
      const { data: rpcData, error: rpcError } = await supabase
        .rpc("get_profile", { p_user_id: userId });

      let profile = transformProfile(safeParseRpc(rpcData));

      if (rpcError || !profile) {
        // No existe el perfil -> crearlo via RPC
        console.warn("Perfil no encontrado, creando uno nuevo...");
        const { data: newData, error: insertErr } = await supabase
          .rpc("upsert_profile", {
            p_id: userId,
            p_full_name: meta.full_name || "",
            p_document_number: meta.document_number || "",
            p_role_id: meta.role_id || 6,
            p_dependency_id: meta.dependency_id || null,
          });
        if (insertErr) throw insertErr;
        profile = transformProfile(safeParseRpc(newData));
      }

      // Sincronizar role_id si el user_metadata tiene un rol diferente
      if (profile && meta.role_id && profile.role_id !== meta.role_id) {
        const { data: updatedData } = await supabase
          .rpc("update_profile_role", {
            p_id: userId,
            p_role_id: meta.role_id,
            p_dependency_id: meta.dependency_id || profile.dependency_id,
          });
        const updated = transformProfile(safeParseRpc(updatedData));
        if (updated) profile = updated;
      }

      setProfile(profile);

      // Verificar si la cuenta está desactivada
      if (profile && profile.is_active === false) {
        setError("Tu cuenta ha sido suspendida por el administrador. Contacta al administrador para más información.");
        await supabase.auth.signOut();
        setUser(null);
        setProfile(null);
      }
    } catch (err) {
      console.error("Error cargando perfil:", safeErrorStr(err));
      setError("No se pudo cargar el perfil de usuario");
    } finally {
      setProfileLoaded(true);
      fetchingRef.current = false;
    }
  };

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "INITIAL_SESSION") {
          if (session?.user) {
            setProfileLoaded(false);
            setUser(session.user);
            // await en INITIAL_SESSION esta bien porque es el primer carga
            fetchProfile(session.user.id, session.user);
          } else {
            setUser(null);
            setProfile(null);
            setProfileLoaded(true);
          }
          setInitialLoading(false);
        } else if (event === "SIGNED_IN") {
          if (session?.user) {
            setProfileLoaded(false);
            setUser(session.user);
            // NO await - fire & forget.
            // Si fetchProfile se cuelga, no bloquea la cola de eventos de Supabase.
            // El visibilitychange listener lo relanzara si es necesario.
            fetchProfile(session.user.id, session.user);
          }
        } else if (event === "SIGNED_OUT") {
          setUser(null);
          setProfile(null);
          setProfileLoaded(true);
          fetchingRef.current = false;
        }
      },
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  //Método de autenticacion (clean code: funciones puras y descriptivas)
  const signIn = async (email, password) => {
    try {
      console.log('Auth: Intentando iniciar sesión para:', email);
      setError(null);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      console.log('Auth: Resultado del inicio de sesión:', { 
        success: !error, 
        error: error?.message,
        user: data?.user?.id
      });
      
      if (error) {
        console.error('Auth error details:', {
          message: error.message,
          status: error.status,
          code: error.code
        });
        throw error;
      }
      return { success: true, data };
    } catch (err) {
      console.error('Auth catch error:', err);
      const msg = err?.message || "Credenciales de inicio de sesión incorrectas";
      setError(msg);
      return { success: false, error: msg };
    }
  };

  const signUp = async (email, password, userData) => {
    try {
      setError(null);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: userData.full_name,
            document_number: userData.document_number,
            role_id: userData.role_id,
            dependency_id: userData.dependency_id,
          },
        },
      });

      if (error) throw error;
      return { success: true, data };
    } catch (err) {
      const msg = err?.message || "Error al registrar usuario";
      setError(msg);
      return { success: false, error: msg };
    }
  };
  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      setError(err?.message || "Error al cerrar sesión");
    }
  };

  const resetPassword = async (email) => {
    try {
      setError(null);
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      return { success: true };
    } catch (err) {
      const msg = err?.message || "Error al enviar el correo de recuperación";
      setError(msg);
      return { success: false, error: msg };
    }
  };

  const updatePassword = async (newPassword) => {
    try {
      setError(null);
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      return { success: true };
    } catch (err) {
      const msg = err?.message || "Error al actualizar la contraseña";
      setError(msg);
      return { success: false, error: msg };
    }
  };

  //SISTEMA RBAC: helper functions para verificar permisos
  const normalizeRole = (str) => str?.toUpperCase().replace(/\s+/g, "_").trim();
  const hasRole = (requiredRoles) => {
    if (!profile?.roles?.name) return false;
    const userRole = normalizeRole(profile.roles.name);
    if (Array.isArray(requiredRoles)) {
      return requiredRoles.some((r) => normalizeRole(r) === userRole);
    }
    return normalizeRole(requiredRoles) === userRole;
  };

  const isAdmin = () => hasRole("SUPERADMIN");
  const isCoordination = () => hasRole(["COORDINACION", "SUPERADMIN"]);
  const isProfessional = () =>
    hasRole(["PSICOLOGIA", "ENFERMERIA", "TRABAJO_SOCIAL"]);
  const isAprendiz = () => hasRole("APRENDIZ");
  const isPsicologia = () => hasRole("PSICOLOGIA");
  const isEnfermeria = () => hasRole("ENFERMERIA");
  const isTrabajoSocial = () => hasRole("TRABAJO_SOCIAL");

  const value = {
    user,
    profile,
    loading: initialLoading,
    profileLoaded,
    error,
    setError,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
    hasRole,
    isAdmin,
    isCoordination,
    isProfessional,
    isAprendiz,
    isPsicologia,
    isEnfermeria,
    isTrabajoSocial,
  };

  return (
    <AuthContext.Provider value={value}>
      {!initialLoading && children}
    </AuthContext.Provider>
  );
}
