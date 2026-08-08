import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { api } from "../api/client";

export default function AddPlatform() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", domain: "", url: "" });
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    try {
      const platform = await api("/platforms", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setMessage(
        `Plateforme créée (id ${platform.id}). Complétez la vérification de propriété avant l'audit.`
      );
      setTimeout(() => navigate("/dashboard"), 1200);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-8">
        <h1 className="text-2xl font-bold text-primary">Ajouter une plateforme</h1>
        <p className="mt-1 text-sm text-slate-500">
          Indiquez le domaine à auditer. La vérification de propriété est obligatoire avant tout scan.
        </p>
        {error && <p className="mt-4 text-sm text-rose-600">{error}</p>}
        {message && <p className="mt-4 text-sm text-emerald-600">{message}</p>}
        <form onSubmit={handleSubmit} className="mt-6 max-w-lg space-y-4 rounded-xl bg-white p-6 shadow">
          {[
            ["name", "Nom", "text"],
            ["domain", "Domaine (ex. exemple.com)", "text"],
            ["url", "URL (ex. https://exemple.com)", "url"],
          ].map(([key, label, type]) => (
            <label key={key} className="block text-sm">
              {label}
              <input
                className="mt-1 w-full rounded border px-3 py-2"
                type={type}
                value={form[key]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                required
              />
            </label>
          ))}
          <button type="submit" className="rounded bg-accent px-4 py-2 text-white">
            Enregistrer
          </button>
        </form>
      </main>
    </div>
  );
}
