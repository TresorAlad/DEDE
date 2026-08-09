import { useEffect } from "react";
import {
  IDLE_TIMEOUT_MS,
  getToken,
  isIdleExpired,
  logoutDueToInactivity,
  touchActivity,
} from "../api/client";

const ACTIVITY_EVENTS = ["mousedown", "keydown", "scroll", "touchstart", "mousemove"];

/**
 * Surveille l'inactivité utilisateur. Après 15 minutes sans interaction,
 * la session est clôturée et l'utilisateur est renvoyé vers la connexion.
 */
export default function SessionGuard({ children }) {
  useEffect(() => {
    if (!getToken()) return undefined;

    if (isIdleExpired()) {
      logoutDueToInactivity();
      return undefined;
    }

    let idleTimer = null;
    let lastWrite = 0;

    function scheduleCheck() {
      if (idleTimer) clearTimeout(idleTimer);
      const last = Number(localStorage.getItem("dede_last_activity") || Date.now());
      const remaining = Math.max(1000, IDLE_TIMEOUT_MS - (Date.now() - last));
      idleTimer = setTimeout(() => {
        if (!getToken()) return;
        if (isIdleExpired()) {
          logoutDueToInactivity();
        } else {
          scheduleCheck();
        }
      }, remaining);
    }

    function onActivity() {
      if (!getToken()) return;
      touchActivity();
      scheduleCheck();
    }

    function onActivityThrottled() {
      const now = Date.now();
      if (now - lastWrite < 5000) return;
      lastWrite = now;
      onActivity();
    }

    const handlers = {};
    ACTIVITY_EVENTS.forEach((event) => {
      handlers[event] = event === "mousemove" ? onActivityThrottled : onActivity;
      window.addEventListener(event, handlers[event], { passive: true });
    });

    function onVisibility() {
      if (document.visibilityState === "visible") {
        if (isIdleExpired()) {
          logoutDueToInactivity();
        } else {
          onActivity();
        }
      }
    }
    document.addEventListener("visibilitychange", onVisibility);

    scheduleCheck();

    return () => {
      if (idleTimer) clearTimeout(idleTimer);
      ACTIVITY_EVENTS.forEach((event) => {
        window.removeEventListener(event, handlers[event]);
      });
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return children;
}
