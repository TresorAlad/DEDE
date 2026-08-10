import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Icon from "./Icon";
import { useAuthUser } from "../hooks/useAuthUser";

export default function TopBar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user } = useAuthUser();
  const [query, setQuery] = useState("");

  const initials = (user?.full_name || "U")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  function onSearch(event) {
    event.preventDefault();
    const term = query.trim();
    navigate(term ? `/reports?q=${encodeURIComponent(term)}` : "/reports");
  }

  return (
    <header className="fixed right-0 top-0 z-40 flex h-16 w-[calc(100%-16rem)] items-center justify-between border-b border-outline-variant/30 bg-surface/80 px-gutter backdrop-blur-md">
      <form onSubmit={onSearch} className="relative flex w-96 items-center">
        <Icon name="search" className="absolute left-sm text-on-surface-variant" />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label="Rechercher un audit ou une plateforme"
          placeholder="Rechercher un audit, une plateforme..."
          className="w-full rounded border border-outline-variant/30 bg-surface-container-high py-xs pl-[40px] pr-sm font-body-md text-on-surface transition-colors placeholder:text-on-surface-variant focus:border-primary focus:bg-surface-variant focus:outline-none"
        />
      </form>

      <div className="flex items-center gap-md">
        <div className="flex items-center gap-sm text-on-surface-variant">
          <Link
            to="/reports"
            className="relative flex h-10 w-10 scale-95 items-center justify-center rounded-full transition-colors hover:bg-surface-variant hover:text-primary active:scale-90"
            title="Historique des audits"
          >
            <Icon name="history" />
          </Link>
        </div>

        <div className="h-8 w-px bg-outline-variant/30" />

        <div className="flex items-center gap-sm">
          <Link
            to="/cgu"
            className="scale-95 px-sm py-xs font-body-md text-on-surface-variant transition-colors hover:text-primary active:scale-90"
          >
            Mentions légales
          </Link>
          <Link
            to="/profile"
            className={`scale-95 border-b-2 px-sm py-xs font-body-md transition-colors active:scale-90 ${
              pathname === "/profile"
                ? "border-primary font-bold text-primary"
                : "border-transparent text-on-surface-variant hover:text-primary"
            }`}
          >
            Profil
          </Link>
        </div>

        <Link
          to="/profile"
          className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-outline-variant/30 bg-primary-container/10 font-label-caps text-label-caps text-primary-container"
        >
          {initials}
        </Link>
      </div>
    </header>
  );
}
