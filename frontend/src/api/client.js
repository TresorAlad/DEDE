const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

export function getToken() {
  return localStorage.getItem("dede_token");
}

export function setToken(token) {
  localStorage.setItem("dede_token", token);
}

export function clearToken() {
  localStorage.removeItem("dede_token");
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

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let detail = "Erreur API";
    try {
      const data = await response.json();
      detail = data.detail || detail;
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }

  if (response.status === 204) {
    return null;
  }
  return response.json();
}
