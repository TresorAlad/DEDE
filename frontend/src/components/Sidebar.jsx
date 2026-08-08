import { Link, useLocation } from "react-router-dom";
import { clearToken } from "../api/client";

const links = [
  { to: "/dashboard", label: "Tableau de bord" },
  { to: "/platforms/new", label: "Ajouter une plateforme" },
];

export default function Sidebar() {
  const location = useLocation();

  return (
    <aside className="w-64 min-h-screen bg-primary text-white p-6 flex flex-col gap-6">
      <div>
        <p className="text-2xl font-bold tracking-wide">DEDE</p>
        <p className="text-sm text-white/70">Audit cybersécurité</p>
      </div>
      <nav className="flex flex-col gap-2">
        {links.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className={`rounded px-3 py-2 text-sm ${
              location.pathname === link.to
                ? "bg-accent"
                : "hover:bg-white/10"
            }`}
          >
            {link.label}
          </Link>
        ))}
      </nav>
      <button
        type="button"
        onClick={() => {
          clearToken();
          window.location.href = "/login";
        }}
        className="mt-auto text-left text-sm text-white/80 hover:text-white"
      >
        Se déconnecter
      </button>
    </aside>
  );
}
