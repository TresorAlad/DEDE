import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, LogOut, PlusCircle, ScrollText, Server, UserCog } from "lucide-react";
import { clearToken } from "../api/client";
import { clearAuthUserCache, useAuthUser } from "../hooks/useAuthUser";

const links = [
  { to: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { to: "/platforms", label: "Plateformes", icon: Server },
  { to: "/platforms/new", label: "Ajouter une plateforme", icon: PlusCircle },
  { to: "/reports", label: "Rapports", icon: ScrollText },
  { to: "/profile", label: "Mon profil", icon: UserCog },
];

export default function Sidebar() {
  const location = useLocation();
  const { user } = useAuthUser();

  function isActive(path) {
    if (path === "/reports") {
      return location.pathname === "/reports" || location.pathname.startsWith("/reports/");
    }
    return location.pathname === path;
  }

  const initials = (user?.full_name || "U")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <aside className="fixed top-0 left-0 z-40 flex h-screen w-64 flex-col overflow-hidden bg-primary px-5 py-6 text-white">
      <div className="shrink-0 px-2">
        <p className="text-2xl font-bold tracking-wide">ƉEƉE</p>
        <p className="mt-1 text-sm text-white/70">Audit cybersécurité</p>
      </div>

      <nav className="mt-8 flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto">
        {links.map((link) => {
          const Icon = link.icon;
          const active = isActive(link.to);
          return (
            <Link
              key={link.to}
              to={link.to}
              className={`flex items-center gap-3 rounded-full px-4 py-2.5 text-sm ${
                active
                  ? "bg-white/15 font-medium text-white shadow-sm"
                  : "text-white/75 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Icon size={18} className="shrink-0" />
              <span className="truncate">{link.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-4 shrink-0 rounded-2xl bg-white/10 p-4">
        <Link
          to="/profile"
          className="flex items-center gap-3 rounded-xl p-1 transition-colors hover:bg-white/10"
          title="Modifier mon profil"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-semibold">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{user?.full_name || "Utilisateur"}</p>
            <p className="truncate text-xs text-white/60">{user?.organization_name || "Organisation"}</p>
          </div>
        </Link>
        <button
          type="button"
          onClick={() => {
            clearAuthUserCache();
            clearToken();
            window.location.href = "/login";
          }}
          className="mt-4 flex w-full items-center gap-2 rounded-full px-3 py-2 text-left text-sm text-white/80 hover:bg-white/10 hover:text-white"
        >
          <LogOut size={16} />
          Se déconnecter
        </button>
      </div>
    </aside>
  );
}
