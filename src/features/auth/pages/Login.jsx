import { useState, useEffect } from "react";
import { useAuth } from "../../../providers/AuthProvider";
import { useNavigate, Link } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff, LogIn } from "lucide-react";
import AuthLayout from "../../../shared/components/AuthLayout";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const { signIn, user, profileLoaded, error, setError, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && profileLoaded && !error) {
      navigate("/");
    }
  }, [user, profileLoaded, error, navigate]);

  const validate = () => {
    const errs = {};
    if (!email) errs.email = "El correo es obligatorio";
    else if (!/\S+@\S+\.\S+/.test(email)) errs.email = "Correo inválido";
    if (!password) errs.password = "La contraseña es obligatoria";
    else if (password.length < 6) errs.password = "Mínimo 6 caracteres";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setIsSubmitting(true);
    setError(null);
    
    try {
      const result = await signIn(email, password);
      if (!result.success) {
        setIsSubmitting(false);
      } else {
        setIsSubmitting(false);
        // La navegación la maneja el useEffect de arriba (user && profileLoaded && !error)
      }
    } catch (err) {
      setIsSubmitting(false);
      console.error("Login error:", err);
    }
  };

  if (loading) {
    return (
      <AuthLayout>
        <div className="auth-card">
          <h1>Cargando...</h1>
          <p className="auth-subtitle">Verificando autenticación...</p>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <div className="auth-card">
        <h1>Iniciar Sesión</h1>
        <p className="auth-subtitle">Accede a tu cuenta del sistema</p>

        {(error && !isSubmitting) && <div className="auth-error">{error}</div>}

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <div className={`field ${errors.email ? 'field--error' : ''}`}>
            <input
              id="login-email"
              className="field__input"
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setErrors((prev) => ({ ...prev, email: '' })); }}
              required
              placeholder="tu.email@soy.sena.edu.co"
              aria-describedby={errors.email ? "email-error" : undefined}
              aria-invalid={!!errors.email}
              disabled={isSubmitting}
            />
            <label className="field__label" htmlFor="login-email">
              Correo electrónico
            </label>
            {errors.email && (
              <p className="field__error" id="email-error" role="alert">
                {errors.email}
              </p>
            )}
          </div>

          <div className={`field ${errors.password ? 'field--error' : ''}`}>
            <div className="password-field">
              <input
                id="login-password"
                className="field__input"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setErrors((prev) => ({ ...prev, password: '' })); }}
                required
                placeholder="Tu contraseña"
                aria-describedby={errors.password ? "password-error" : undefined}
                aria-invalid={!!errors.password}
                disabled={isSubmitting}
              />
              <label className="field__label" htmlFor="login-password">
                Contraseña
              </label>
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                disabled={isSubmitting}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.password && (
              <p className="field__error" id="password-error" role="alert">
                {errors.password}
              </p>
            )}
          </div>

          <div className="auth-forgot">
            <Link to="/recuperar">¿Olvidaste tu contraseña?</Link>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn--block"
            disabled={isSubmitting}
            aria-busy={isSubmitting}
          >
            <LogIn size={18} aria-hidden="true" />
            <span className="btn__label">
              {isSubmitting ? "Entrando..." : "Entrar"}
            </span>
          </button>
        </form>

        <p className="auth-footer">
          ¿No tienes cuenta?{" "}
          <Link to="/register" className="auth-link">
            Regístrate aquí
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
