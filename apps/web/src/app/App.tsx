import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router";
import { AppShell } from "@/components/layout/AppShell";
import { AuthPage } from "@/features/auth/AuthPage";
import { RequireAuth } from "@/features/auth/RequireAuth";
import { getSessionUser } from "@/features/auth/session";
import { AdminDashboard } from "@/features/dashboard/AdminDashboard";
import { PlaceholderPage } from "@/features/settings/PlaceholderPage";

const UserDashboard = lazy(() => import("@/features/dashboard/UserDashboard").then((module) => ({ default: module.UserDashboard })));
const TodayPage = lazy(() => import("@/features/today/TodayPage").then((module) => ({ default: module.TodayPage })));
const KanbanBoard = lazy(() => import("@/features/board/KanbanBoard").then((module) => ({ default: module.KanbanBoard })));
const ProjectsPage = lazy(() => import("@/features/projects/ProjectsPage").then((module) => ({ default: module.ProjectsPage })));

function PageLoader() {
  return <div className="rounded-lg border border-line bg-white/[0.04] p-5 text-sm text-muted">Chargement...</div>;
}

function HomeRoute() {
  const user = getSessionUser();

  if (user?.role === "ADMIN") {
    return <Navigate to="/admin" replace />;
  }

  return <UserDashboard />;
}

function AdminRoute() {
  const user = getSessionUser();

  if (user?.role !== "ADMIN") {
    return <Navigate to="/" replace />;
  }

  return <AdminDashboard />;
}

export function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/auth/login" element={<AuthPage />} />
        <Route path="/auth/register" element={<AuthPage />} />
        <Route path="/auth/reset" element={<AuthPage />} />
        <Route
          element={
            <RequireAuth>
              <AppShell />
            </RequireAuth>
          }
        >
          <Route index element={<HomeRoute />} />
          <Route path="today" element={<TodayPage />} />
          <Route path="admin" element={<AdminRoute />} />
          <Route path="projects" element={<ProjectsPage />} />
          <Route path="board" element={<KanbanBoard />} />
          <Route path="teams" element={<PlaceholderPage title="Equipes" subtitle="Creation, invitation, retrait, roles et charge par equipe." />} />
          <Route path="calendar" element={<PlaceholderPage title="Calendrier" subtitle="Jour, semaine, mois, timeline sprint et integration Google Calendar prevue." />} />
          <Route path="settings" element={<PlaceholderPage title="Parametres" subtitle="Logo, entreprise, theme, notifications, langue, fuseau horaire et sauvegardes." />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
