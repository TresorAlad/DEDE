import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import ConfirmDialog from "./ConfirmDialog";
import Icon from "./Icon";
import { clearToken } from "../api/client";
import { clearAuthUserCache, useAuthUser } from "../hooks/useAuthUser";

const links = [
  { to: "/dashboard", label: "Tableau de bord", icon: "dashboard" },
  { to: "/platforms", label: "Plateformes", icon: "inventory_2" },
  { to: "/reports", label: "Rapports", icon: "assessment" },
  { to: "/profile", label: "Profil", icon: "settings" },
];

export default function Sidebar() {
  const location = useLocation();
  const { user } = useAuthUser();
  const [logoutOpen, setLogoutOpen] = useState(false);

  function isActive(path) {
    if (path === "/reports") {
      return location.pathname === "/reports" || location.pathname.startsWith("/reports/");
    }
    if (path === "/platforms") {
      return location.pathname === "/platforms";
    }
    return location.pathname === path;
  }

  const initials = (user?.full_name || "U")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  function confirmLogout() {
    clearAuthUserCache();
    clearToken();
    window.location.href = "/login";
  }

  return (
    <nav className="fixed left-0 top-0 z-50 flex h-screen w-64 flex-col border-r border-outline-variant/30 bg-surface-container-low px-sm py-md">
      <div className="mb-xl flex items-center gap-sm px-sm">
        <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-outline-variant/30 bg-primary-container/10">
          <Icon name="shield_lock" size={24} className="text-primary-container" />
        </div>
        <div className="flex flex-col">
          <span
            className="font-display-lg font-bold tracking-tighter text-primary"
            style={{ fontSize: "24px", lineHeight: "32px" }}
          >
            ƉEƉE
          </span>
          <span className="font-label-caps text-label-caps uppercase text-on-surface-variant">
            Moteur cybersécurité
          </span>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-xs overflow-y-auto">
        {links.map((link) => {
          const active = isActive(link.to);
          return (
            <Link
              key={link.to}
              to={link.to}
              className={
                active
                  ? "flex items-center gap-sm rounded border-r-2 border-primary bg-primary/5 px-sm py-sm font-bold text-primary transition-all duration-200 ease-in-out"
                  : "flex items-center gap-sm rounded px-sm py-sm font-medium text-on-surface-variant transition-colors duration-200 ease-in-out hover:bg-surface-variant/50 hover:text-primary"
              }
            >
              <Icon name={link.icon} />
              <span className="truncate">{link.label}</span>
            </Link>
          );
        })}
      </div>

      <div className="mb-md">
        <Link
          to="/platforms/new"
          className="flex w-full items-center justify-center gap-sm rounded border border-primary px-md py-sm font-label-caps text-label-caps uppercase text-primary transition-colors duration-200 hover:bg-primary hover:text-on-primary"
        >
          <Icon name="add" size={18} />
          Nouvel audit
        </Link>
      </div>

      <div className="flex flex-col gap-xs border-t border-outline-variant/30 pt-md">
        <Link
          to="/profile"
          className="flex items-center gap-sm rounded px-sm py-sm text-on-surface-variant transition-colors duration-200 hover:bg-surface-variant/50 hover:text-primary"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-outline-variant/30 bg-primary-container/10 font-label-caps text-label-caps text-primary-container">
            {initials}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[14px] font-medium leading-5 text-on-surface">
              {user?.full_name || "Utilisateur"}
            </span>
            <span className="block truncate font-data-mono text-[12px] leading-4 text-on-surface-variant">
              {user?.organization_name || "Organisation"}
            </span>
          </span>
        </Link>
        <button
          type="button"
          onClick={() => setLogoutOpen(true)}
          className="flex items-center gap-sm rounded px-sm py-sm text-left font-medium text-on-surface-variant transition-colors duration-200 hover:bg-surface-variant/50 hover:text-critical"
        >
          <Icon name="logout" />
          <span>Déconnexion</span>
        </button>
      </div>

      <ConfirmDialog
        open={logoutOpen}
        tone="primary"
        title="Se déconnecter ?"
        description="Vous quitterez votre session ƉEƉE. Vous pourrez vous reconnecter à tout moment avec vos identifiants."
        confirmLabel="Se déconnecter"
        cancelLabel="Rester connecté"
        onConfirm={confirmLogout}
        onCancel={() => setLogoutOpen(false)}
      />
    </nav>
  );
}
