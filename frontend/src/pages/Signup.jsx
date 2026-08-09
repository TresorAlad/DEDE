import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, setToken } from "../api/client";
import PasswordInput from "../components/PasswordInput";

export default function Signup() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    organization_name: "",
    full_name: "",
    email: "",
    password: "",
    password_confirm: "",
    accepted_terms: false,
  });
  const [error, setError] = useState("");

  function updateField(field, value) {
    setForm({ ...form, [field]: value });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (form.password !== form.password_confirm) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
    if (!form.accepted_terms) {
      setError("Vous devez accepter les CGU et la politique de confidentialité.");
      return;
    }

    try {
      const { password_confirm, ...payload } = form;
      const data = await api("/auth/signup", {
        method: "POST",
        body: JSON.stringify(payload),
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
            Créez votre espace.<br />Sécurisez vos plateformes.
          </h2>
          <p className="mt-4 max-w-md text-sm text-white/70">
            Un compte pour ajouter vos domaines, lancer des audits automatisés et dialoguer avec l'assistant IA.
          </p>
        </div>
        <p className="text-xs text-white/50">Hackathon - Mission IA pour la cyberdéfense</p>
      </div>

      <div className="flex w-full items-center justify-center px-4 py-10 lg:w-1/2">
        <form onSubmit={handleSubmit} className="w-full max-w-md rounded-card bg-white p-8 shadow-card">
          <h1 className="text-2xl font-bold text-primary">Créer un compte</h1>
          {error && <p className="mt-4 text-sm text-danger">{error}</p>}

          <label className="mt-4 block text-sm text-slate-600">
            Nom de l'organisation
            <input
              className="input-field"
              type="text"
              value={form.organization_name}
              onChange={(e) => updateField("organization_name", e.target.value)}
              required
            />
          </label>

          <label className="mt-4 block text-sm text-slate-600">
            Nom et prénom
            <input
              className="input-field"
              type="text"
              value={form.full_name}
              onChange={(e) => updateField("full_name", e.target.value)}
              required
            />
          </label>

          <label className="mt-4 block text-sm text-slate-600">
            Email
            <input
              className="input-field"
              type="email"
              value={form.email}
              onChange={(e) => updateField("email", e.target.value)}
              required
            />
          </label>

          <label className="mt-4 block text-sm text-slate-600">
            Mot de passe
            <PasswordInput
              value={form.password}
              onChange={(e) => updateField("password", e.target.value)}
              minLength={8}
              required
            />
          </label>

          <label className="mt-4 block text-sm text-slate-600">
            Confirmer le mot de passe
            <PasswordInput
              value={form.password_confirm}
              onChange={(e) => updateField("password_confirm", e.target.value)}
              minLength={8}
              required
            />
          </label>

          <label className="mt-4 flex items-start gap-3 text-sm text-slate-600">
            <input
              className="mt-1 h-4 w-4 accent-accent"
              type="checkbox"
              checked={form.accepted_terms}
              onChange={(e) => updateField("accepted_terms", e.target.checked)}
              required
            />
            <span>
              J'accepte les{" "}
              <Link className="text-accent underline" to="/cgu" target="_blank">
                CGU
              </Link>{" "}
              et la{" "}
              <Link className="text-accent underline" to="/confidentialite" target="_blank">
                politique de confidentialité
              </Link>
              . Je certifie être autorisé à auditer les plateformes que j'ajouterai.
            </span>
          </label>

          <button
            type="submit"
            className="btn-primary mt-6 w-full"
          >
            Créer mon compte
          </button>
          <p className="mt-4 text-sm text-slate-500">
            Déjà inscrit ?{" "}
            <Link className="text-accent hover:underline" to="/login">
              Se connecter
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
