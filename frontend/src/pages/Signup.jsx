import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, setToken } from "../api/client";
import AuthLayout from "../components/AuthLayout";
import Icon from "../components/Icon";
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
  const [loading, setLoading] = useState(false);

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

    setLoading(true);
    try {
      const { password_confirm, ...payload } = form;
      const data = await api("/auth/signup", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setToken(data.access_token);
      navigate("/welcome");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      subtitle="Moteur cybersécurité // Création d'accès"
      footer={
        <p className="font-body-md text-on-surface-variant">
          Déjà inscrit ?
          <Link
            to="/login"
            className="ml-2 border-b border-primary-container/30 font-data-mono text-data-mono text-primary-container transition-colors hover:border-primary hover:text-primary"
          >
            Se connecter
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-md">
        {error && (
          <p className="flex items-start gap-base rounded border border-critical/30 bg-critical/10 px-sm py-base font-data-mono text-[12px] leading-5 text-critical">
            <Icon name="error" size={16} />
            {error}
          </p>
        )}

        <div>
          <label className="field-label" htmlFor="organization">
            Organisation
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-sm">
              <Icon name="corporate_fare" size={18} className="text-outline" />
            </span>
            <input
              id="organization"
              type="text"
              required
              value={form.organization_name}
              onChange={(e) => updateField("organization_name", e.target.value)}
              placeholder="Nom de votre structure"
              className="input-field pl-xl"
            />
          </div>
        </div>

        <div>
          <label className="field-label" htmlFor="fullname">
            Nom et prénom
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-sm">
              <Icon name="person" size={18} className="text-outline" />
            </span>
            <input
              id="fullname"
              type="text"
              required
              value={form.full_name}
              onChange={(e) => updateField("full_name", e.target.value)}
              placeholder="Kossi Amevor"
              className="input-field pl-xl"
            />
          </div>
        </div>

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
              value={form.email}
              onChange={(e) => updateField("email", e.target.value)}
              placeholder="operateur@domaine.tg"
              className="input-field pl-xl"
            />
          </div>
        </div>

        <div>
          <label className="field-label" htmlFor="password">
            Mot de passe
          </label>
          <PasswordInput
            value={form.password}
            onChange={(e) => updateField("password", e.target.value)}
            minLength={8}
            required
          />
        </div>

        <div>
          <label className="field-label" htmlFor="password-confirm">
            Confirmation du mot de passe
          </label>
          <PasswordInput
            value={form.password_confirm}
            onChange={(e) => updateField("password_confirm", e.target.value)}
            minLength={8}
            required
          />
        </div>

        <div className="flex items-start gap-sm pt-sm">
          <input
            id="terms"
            type="checkbox"
            required
            checked={form.accepted_terms}
            onChange={(e) => updateField("accepted_terms", e.target.checked)}
            className="mt-1 h-4 w-4 shrink-0 rounded border-outline-variant bg-surface-container-highest accent-primary-container"
          />
          <label htmlFor="terms" className="text-[14px] leading-5 text-on-surface-variant">
            J'accepte les{" "}
            <Link
              to="/cgu"
              target="_blank"
              className="text-primary-container underline decoration-primary-container/30 underline-offset-4 transition-colors hover:text-primary"
            >
              CGU
            </Link>{" "}
            et la{" "}
            <Link
              to="/confidentialite"
              target="_blank"
              className="text-primary-container underline decoration-primary-container/30 underline-offset-4 transition-colors hover:text-primary"
            >
              politique de confidentialité
            </Link>
            . Je certifie être autorisé à auditer les plateformes que j'ajouterai.
          </label>
        </div>

        <div className="pt-sm">
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? "Création en cours..." : "Créer mon compte"}
            <Icon name="arrow_forward" size={18} />
          </button>
        </div>
      </form>
    </AuthLayout>
  );
}
