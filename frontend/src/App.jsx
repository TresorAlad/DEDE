import { Navigate, Route, Routes } from "react-router-dom";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import AddPlatform from "./pages/AddPlatform";
import Report from "./pages/Report";
import Chatbot from "./pages/Chatbot";
import { getToken } from "./api/client";

function PrivateRoute({ children }) {
  if (!getToken()) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route
        path="/dashboard"
        element={
          <PrivateRoute>
            <Dashboard />
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
    </Routes>
  );
}
