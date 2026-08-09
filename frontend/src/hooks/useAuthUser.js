import { useEffect, useState } from "react";
import { api } from "../api/client";

let cachedUser = null;
let inflight = null;

export function useAuthUser() {
  const [user, setUser] = useState(cachedUser);
  const [loading, setLoading] = useState(!cachedUser);

  useEffect(() => {
    let active = true;

    async function load() {
      if (cachedUser) {
        setUser(cachedUser);
        setLoading(false);
        return;
      }
      if (!inflight) {
        inflight = api("/auth/me")
          .then((data) => {
            cachedUser = data;
            return data;
          })
          .finally(() => {
            inflight = null;
          });
      }
      try {
        const data = await inflight;
        if (active) {
          setUser(data);
          setLoading(false);
        }
      } catch {
        if (active) {
          setUser(null);
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      active = false;
    };
  }, []);

  return { user, loading };
}

export function clearAuthUserCache() {
  cachedUser = null;
  inflight = null;
}

export function setAuthUser(user) {
  cachedUser = user;
}
