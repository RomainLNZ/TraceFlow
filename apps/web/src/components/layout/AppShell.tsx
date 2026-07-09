import { NavLink, Outlet } from "react-router";
import { AnimatePresence, motion } from "framer-motion";
import {
  CalendarDays,
  ChartNoAxesCombined,
  Command,
  Gauge,
  KanbanSquare,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Sparkles,
  Users
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/Button";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { clearSession, getSessionUser } from "@/features/auth/session";
import { cn } from "@/lib/cn";

const nav = [
  { to: "/", label: "Dashboard", icon: Gauge },
  { to: "/admin", label: "Admin", icon: ChartNoAxesCombined, adminOnly: true },
  { to: "/projects", label: "Projets", icon: Sparkles },
  { to: "/board", label: "Kanban", icon: KanbanSquare },
  { to: "/teams", label: "Equipes", icon: Users },
  { to: "/calendar", label: "Calendrier", icon: CalendarDays },
  { to: "/settings", label: "Parametres", icon: Settings }
];

const SIDEBAR_COLLAPSED_STORAGE_KEY = "traceflow.sidebar.collapsed";

export function AppShell() {
  const navigate = useNavigate();
  const user = getSessionUser();
  const initials = user ? `${user.firstName[0] ?? ""}${user.lastName[0] ?? ""}`.toUpperCase() : "U";
  const visibleNav = nav.filter((item) => !item.adminOnly || user?.role === "ADMIN");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === "true");

  useEffect(() => {
    localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, String(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

  function logout() {
    clearSession();
    navigate("/auth/login", { replace: true });
  }

  return (
    <div className="min-h-screen">
      <aside
        className={cn(
          "fixed inset-y-4 left-4 z-30 hidden rounded-lg border border-line bg-ink/70 p-3 shadow-panel backdrop-blur-xl transition-[width] duration-200 lg:block",
          isSidebarCollapsed ? "w-20" : "w-64"
        )}
      >
        <div className={cn("mb-8 flex items-start gap-3 px-2 pt-2", isSidebarCollapsed && "flex-col items-center px-0")}>
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-white text-ink">
              <KanbanSquare size={18} />
            </div>
            <div className={cn("min-w-0", isSidebarCollapsed && "hidden")}>
              <p className="text-sm font-semibold">TraceFlow</p>
              <p className="max-w-40 text-[11px] leading-4 text-muted">Transformez vos idées en projets maîtrisés.</p>
            </div>
          </div>
          <Button
            variant="ghost"
            className="h-9 w-9 shrink-0 px-0"
            type="button"
            onClick={() => setIsSidebarCollapsed((value) => !value)}
            aria-label={isSidebarCollapsed ? "Ouvrir le menu" : "Fermer le menu"}
            title={isSidebarCollapsed ? "Ouvrir le menu" : "Fermer le menu"}
          >
            {isSidebarCollapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
          </Button>
        </div>
        <nav className="space-y-1">
          {visibleNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              title={isSidebarCollapsed ? item.label : undefined}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted transition hover:bg-white/[0.06] hover:text-white",
                  isSidebarCollapsed && "justify-center px-0",
                  isActive && "bg-white/[0.08] text-white"
                )
              }
            >
              <item.icon size={17} />
              <span className={cn(isSidebarCollapsed && "sr-only")}>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      <header
        className={cn(
          "sticky top-0 z-20 border-b border-line bg-ink/70 backdrop-blur-xl transition-[margin] duration-200",
          isSidebarCollapsed ? "lg:ml-28" : "lg:ml-72"
        )}
      >
        <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="lg:hidden grid h-9 w-9 place-items-center rounded-lg bg-white text-ink">
              <KanbanSquare size={17} />
            </div>
            <button className="hidden h-10 w-[min(28rem,42vw)] items-center gap-3 rounded-lg border border-line bg-white/[0.04] px-3 text-left text-sm text-muted transition hover:bg-white/[0.07] md:flex">
              <Command size={16} />
              Rechercher utilisateurs, taches, documents...
              <span className="ml-auto rounded border border-line px-1.5 py-0.5 text-[11px]">Ctrl K</span>
            </button>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-cyan to-brand p-[1px]">
              <div className="grid h-full w-full place-items-center rounded-lg bg-ink text-xs font-semibold">{initials}</div>
            </div>
            <Button variant="ghost" className="h-9 px-3" type="button" onClick={logout} aria-label="Se deconnecter" title="Se deconnecter">
              <LogOut size={16} />
              <span className="hidden sm:inline">Deconnexion</span>
            </Button>
          </div>
        </div>
      </header>

      <main className={cn("px-4 py-6 transition-[margin] duration-200 sm:px-6 lg:px-8", isSidebarCollapsed ? "lg:ml-28" : "lg:ml-72")}>
        <AnimatePresence mode="wait">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.28 }}>
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
