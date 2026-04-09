import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import AdminDashboard from "./pages/admin/Dashboard";
import Clients from "./pages/admin/Clients";
import ClientDetail from "./pages/admin/ClientDetail";
import AdminProjects from "./pages/admin/Projects";
import AuditLog from "./pages/admin/AuditLog";
import Users from "./pages/admin/Users";
import ClientDashboard from "./pages/client/Dashboard";
import ClientProjectDetail from "./pages/client/ProjectDetail";
import ClientLogs from "./pages/client/Logs";
import "./index.css";

function getRole(): string {
  try {
    const token = localStorage.getItem("token");
    if (!token) return "";
    return JSON.parse(atob(token.split(".")[1])).role || "admin";
  } catch { return "admin"; }
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem("token");
  return token ? <>{children}</> : <Navigate to="/login" />;
}

function RoleRoute({ roles, children }: { roles: string[]; children: React.ReactNode }) {
  const token = localStorage.getItem("token");
  if (!token) return <Navigate to="/login" />;
  const role = getRole();
  return roles.includes(role) ? <>{children}</> : <Navigate to="/" />;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        {/* Admin routes */}
        <Route path="/admin" element={<RoleRoute roles={["superadmin", "admin"]}><AdminDashboard /></RoleRoute>} />
        <Route path="/admin/clients" element={<RoleRoute roles={["superadmin", "admin"]}><Clients /></RoleRoute>} />
        <Route path="/admin/clients/:slug" element={<RoleRoute roles={["superadmin", "admin"]}><ClientDetail /></RoleRoute>} />
        <Route path="/admin/projects" element={<RoleRoute roles={["superadmin", "admin"]}><AdminProjects /></RoleRoute>} />
        <Route path="/admin/audit" element={<RoleRoute roles={["superadmin", "admin"]}><AuditLog /></RoleRoute>} />
        <Route path="/admin/users" element={<RoleRoute roles={["superadmin"]}><Users /></RoleRoute>} />

        {/* Client portal routes */}
        <Route path="/client" element={<RoleRoute roles={["client"]}><ClientDashboard /></RoleRoute>} />
        <Route path="/client/projects/:name" element={<RoleRoute roles={["client"]}><ClientProjectDetail /></RoleRoute>} />
        <Route path="/client/projects/:name/logs" element={<RoleRoute roles={["client"]}><ClientLogs /></RoleRoute>} />

        {/* Default: redirect based on role */}
        <Route path="/" element={
          <ProtectedRoute>
            {getRole() === "client" ? <Navigate to="/client" /> : getRole() === "admin" || getRole() === "superadmin" ? <Navigate to="/admin" /> : <Dashboard />}
          </ProtectedRoute>
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
);
