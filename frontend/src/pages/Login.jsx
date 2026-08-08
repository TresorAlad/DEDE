import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, setToken } from "../api/client";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

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
    <div className="min-h-screen flex items-center justify-center bg-slate-100 px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-md rounded-xl bg-white p-8 shadow">
        <h1 className="text-2xl font-bold text-primary">Connexion DEDE</h1>
        <p className="mt-1 text-sm text-slate-500">Accédez à votre espace d'audit.</p>
        {error && <p className="mt-4 text-sm text-rose-600">{error}</p>}
        <label className="mt-6 block text-sm">
          Email
          <input
            className="mt-1 w-full rounded border px-3 py-2"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label className="mt-4 block text-sm">
          Mot de passe
          <input
            className="mt-1 w-full rounded border px-3 py-2"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        <button type="submit" className="mt-6 w-full rounded bg-accent py-2 text-white">
          Se connecter
        </button>
        <p className="mt-4 text-sm text-slate-500">
          Pas encore de compte ? <Link className="text-accent" to="/signup">Créer un compte</Link>
        </p>
      </form>
    </div>
  );
}
