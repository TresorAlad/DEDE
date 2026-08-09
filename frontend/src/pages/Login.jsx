import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api, setToken } from "../api/client";
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
  const reasonMessage = REASON_MESSAGES[searchParams.get("reason")] || "";

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    try {
      const data = await api("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setToken(data.access_token);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="flex min-h-screen bg-surface">
      <div className="hidden w-1/2 flex-col justify-between bg-primary p-10 text-white lg:flex">
        <div>
          <p className="text-3xl font-bold tracking-wide">ƉEƉE</p>
          <p className="mt-2 text-white/70">Audit cybersécurité intelligent</p>
        </div>
        <div>
          <h2 className="text-3xl font-semibold leading-tight">
            Visualisez le risque.<br />Corrigez plus vite.
          </h2>
          <p className="mt-4 max-w-md text-sm text-white/70">
            Connectez-vous pour suivre vos plateformes, lancer des audits et consulter vos rapports IA.
          </p>
        </div>
        <p className="text-xs text-white/50">Hackathon - Mission IA pour la cyberdéfense</p>
      </div>

      <div className="flex w-full items-center justify-center px-4 py-10 lg:w-1/2">
        <form onSubmit={handleSubmit} className="w-full max-w-md rounded-card bg-white p-8 shadow-card">
          <h1 className="text-2xl font-bold text-primary">Connexion</h1>
          <p className="mt-1 text-sm text-slate-500">Accédez à votre espace d'audit.</p>
          {reasonMessage && (
            <p className="mt-4 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
              {reasonMessage}
            </p>
          )}
          {error && <p className="mt-4 text-sm text-danger">{error}</p>}
          <label className="mt-6 block text-sm text-slate-600">
            Email
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </label>
          <label className="mt-4 block text-sm text-slate-600">
            Mot de passe
            <PasswordInput
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <button
            type="submit"
            className="mt-6 w-full rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90"
          >
            Se connecter
          </button>
          <p className="mt-4 text-center text-sm text-slate-500">
            Pas encore de compte ?{" "}
            <Link className="text-accent hover:underline" to="/signup">
              Créer un compte
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
