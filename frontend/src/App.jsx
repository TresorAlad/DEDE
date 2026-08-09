import { Navigate, Route, Routes } from "react-router-dom";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import Platforms from "./pages/Platforms";
import AddPlatform from "./pages/AddPlatform";
import Reports from "./pages/Reports";
import Report from "./pages/Report";
import Chatbot from "./pages/Chatbot";
import Profile from "./pages/Profile";
import CGU from "./pages/legal/CGU";
import Confidentialite from "./pages/legal/Confidentialite";
import SessionGuard from "./components/SessionGuard";
import { getToken, isIdleExpired, logoutDueToInactivity } from "./api/client";

function PrivateRoute({ children }) {
  if (!getToken()) {
    return <Navigate to="/login" replace />;
  }
  if (isIdleExpired()) {
    logoutDueToInactivity();
    return <Navigate to="/login?reason=idle" replace />;
  }
  return <SessionGuard>{children}</SessionGuard>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/cgu" element={<CGU />} />
      <Route path="/confidentialite" element={<Confidentialite />} />
      <Route
        path="/dashboard"
        element={
          <PrivateRoute>
            <Dashboard />
          </PrivateRoute>
        }
      />
      <Route
        path="/platforms"
        element={
          <PrivateRoute>
            <Platforms />
          </PrivateRoute>
        }
      />
      <Route
        path="/platforms/new"
        element={
          <PrivateRoute>
            <AddPlatform />
          </PrivateRoute>
        }
      />
      <Route
        path="/reports"
        element={
          <PrivateRoute>
            <Reports />
          </PrivateRoute>
        }
      />
      <Route
        path="/reports/:auditId"
        element={
          <PrivateRoute>
            <Report />
          </PrivateRoute>
        }
      />
      <Route
        path="/reports/:auditId/chat"
        element={
          <PrivateRoute>
            <Chatbot />
          </PrivateRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <PrivateRoute>
            <Profile />
          </PrivateRoute>
        }
      />
    </Routes>
  );
}
