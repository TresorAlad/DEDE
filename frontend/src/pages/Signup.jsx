import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, setToken } from "../api/client";

export default function Signup() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    organization_name: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    try {
      const data = await api("/auth/signup", {
        method: "POST",
        body: JSON.stringify(form),
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
        <h1 className="text-2xl font-bold text-primary">Créer un compte</h1>
        {error && <p className="mt-4 text-sm text-rose-600">{error}</p>}
        {["organization_name", "email", "password"].map((field) => (
          <label key={field} className="mt-4 block text-sm capitalize">
            {field === "organization_name" ? "Organisation" : field === "email" ? "Email" : "Mot de passe"}
            <input
              className="mt-1 w-full rounded border px-3 py-2"
              type={field === "password" ? "password" : field === "email" ? "email" : "text"}
              value={form[field]}
              onChange={(e) => setForm({ ...form, [field]: e.target.value })}
              required
            />
          </label>
        ))}
        <button type="submit" className="mt-6 w-full rounded bg-accent py-2 text-white">
          Créer mon compte
        </button>
        <p className="mt-4 text-sm text-slate-500">
          Déjà inscrit ? <Link className="text-accent" to="/login">Se connecter</Link>
        </p>
      </form>
    </div>
  );
}
