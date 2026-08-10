import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api, setToken } from "../api/client";
import AuthLayout from "../components/AuthLayout";
import Icon from "../components/Icon";
import PasswordInput from "../components/PasswordInput";

const REASON_MESSAGES = {
  idle: "Votre session a été clôturée après 15 minutes d'inactivité. Veuillez vous reconnecter.",
  expired: "Votre session a expiré. Veuillez vous reconnecter.",
};

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const reasonMessage = REASON_MESSAGES[searchParams.get("reason")] || "";

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await api("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setToken(data.access_token);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      subtitle="Moteur cybersécurité // Authentification"
      footer={
        <p className="font-body-md text-on-surface-variant">
          Pas encore de compte ?
          <Link
            to="/signup"
            className="ml-2 border-b border-primary-container/30 font-data-mono text-data-mono text-primary-container transition-colors hover:border-primary hover:text-primary"
          >
            Créer un accès
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-md">
        {reasonMessage && (
          <p className="flex items-start gap-base rounded border border-warning/30 bg-warning/10 px-sm py-base font-data-mono text-[12px] leading-5 text-warning">
            <Icon name="schedule" size={16} />
            {reasonMessage}
          </p>
        )}
        {error && (
          <p className="flex items-start gap-base rounded border border-critical/30 bg-critical/10 px-sm py-base font-data-mono text-[12px] leading-5 text-critical">
            <Icon name="error" size={16} />
            {error}
          </p>
        )}

        <div>
          <label className="field-label" htmlFor="email">
            Adresse e-mail
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-sm">
              <Icon name="mail" size={18} className="text-outline" />
            </span>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="operateur@domaine.tg"
              className="input-field pl-xl"
            />
          </div>
        </div>

        <div>
          <label className="field-label" htmlFor="password">
            Mot de passe
          </label>
          <PasswordInput required value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>

        <div className="flex items-center justify-between pt-xs">
          <span className="font-data-mono text-[12px] text-on-surface-variant">
            Session sécurisée par jeton JWT
          </span>
          <Link
            to="/confidentialite"
            className="font-data-mono text-[12px] text-primary-container transition-colors hover:text-primary"
          >
            Confidentialité
          </Link>
        </div>

        <div className="pt-sm">
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? "Connexion en cours..." : "Se connecter"}
            <Icon name="login" size={18} />
          </button>
        </div>
      </form>
    </AuthLayout>
  );
}
