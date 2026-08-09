const API_URL = import.meta.env.VITE_API_URL || "/api";

/** Inactivité max avant clôture de session (alignée sur le JWT backend). */
export const IDLE_TIMEOUT_MS = 15 * 60 * 1000;
const ACTIVITY_KEY = "dede_last_activity";

export function getToken() {
  return localStorage.getItem("dede_token");
}

export function setToken(token) {
  localStorage.setItem("dede_token", token);
  touchActivity();
}

export function clearToken() {
  localStorage.removeItem("dede_token");
  localStorage.removeItem(ACTIVITY_KEY);
}

export function touchActivity() {
  localStorage.setItem(ACTIVITY_KEY, String(Date.now()));
}

export function getLastActivity() {
  const raw = localStorage.getItem(ACTIVITY_KEY);
  return raw ? Number(raw) : 0;
}

export function isIdleExpired() {
  const last = getLastActivity();
  if (!last) return true;
  return Date.now() - last > IDLE_TIMEOUT_MS;
}

export function logoutDueToInactivity() {
  clearToken();
  const path = window.location.pathname || "";
  if (!path.startsWith("/login") && !path.startsWith("/signup")) {
    window.location.href = "/login?reason=idle";
  }
}

export function logoutDueToExpiredSession() {
  clearToken();
  const path = window.location.pathname || "";
  if (!path.startsWith("/login") && !path.startsWith("/signup")) {
    window.location.href = "/login?reason=expired";
  }
}

function formatDetail(detail) {
  if (!detail) return "Erreur API";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((item) => item?.msg || JSON.stringify(item))
      .join(" ");
  }
  return String(detail);
}

function applyRefreshedToken(response) {
  const refreshed = response.headers.get("X-Access-Token");
  if (refreshed) {
    localStorage.setItem("dede_token", refreshed);
    touchActivity();
  } else if (getToken()) {
    touchActivity();
  }
}

async function handleUnauthorized(response) {
  if (response.status !== 401) return false;
  logoutDueToExpiredSession();
  return true;
}

export async function api(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };
  const token = getToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
    });
  } catch {
    throw new Error(
      "Impossible de joindre le serveur. Vérifiez que le backend est démarré, puis réessayez."
    );
  }

  if (await handleUnauthorized(response)) {
    throw new Error("Session expirée. Veuillez vous reconnecter.");
  }

  if (!response.ok) {
    let detail = "Une erreur est survenue. Réessayez.";
    try {
      const data = await response.json();
      detail = formatDetail(data.detail) || detail;
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }

  applyRefreshedToken(response);

  if (response.status === 204) {
    return null;
  }
  return response.json();
}

export async function downloadFile(path, filename) {
  const headers = {};
  const token = getToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(`${API_URL}${path}`, { headers });
  } catch {
    throw new Error(
      "Impossible de joindre le serveur. Vérifiez que le backend est démarré, puis réessayez."
    );
  }

  if (await handleUnauthorized(response)) {
    throw new Error("Session expirée. Veuillez vous reconnecter.");
  }

  if (!response.ok) {
    let detail = "Impossible de générer le fichier. Réessayez.";
    try {
      const data = await response.json();
      detail = formatDetail(data.detail) || detail;
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }

  applyRefreshedToken(response);

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
