import { NavLink, Outlet } from "react-router";
import { AnimatePresence, motion } from "framer-motion";
import {
  CalendarDays,
  CalendarCheck2,
  ChartNoAxesCombined,
  Command,
  Gauge,
  KanbanSquare,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Sparkles,
  Users,
  X
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/Button";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { clearSession, getSessionUser } from "@/features/auth/session";
import { cn } from "@/lib/cn";

const nav = [
  { to: "/", label: "Dashboard", icon: Gauge },
  { to: "/today", label: "Aujourd'hui", icon: CalendarCheck2 },
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
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

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
        <div className={cn("mb-6 flex items-center gap-3 px-2 pt-2", isSidebarCollapsed && "justify-center px-0")}>
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-white text-ink">
              <KanbanSquare size={18} />
            </div>
            <div className={cn("min-w-0", isSidebarCollapsed && "hidden")}>
              <p className="text-sm font-semibold">TraceFlow</p>
              <p className="max-w-40 text-[11px] leading-4 text-muted">Transformez vos idées en projets maîtrisés.</p>
            </div>
          </div>
        </div>
        <nav className="space-y-1">
          <button
            className={cn(
              "mb-3 flex w-full items-center gap-3 rounded-lg border border-line bg-white/[0.04] px-3 py-2.5 text-sm text-muted transition hover:bg-white/[0.08] hover:text-white",
              isSidebarCollapsed && "justify-center px-0"
            )}
            type="button"
            onClick={() => setIsSidebarCollapsed((value) => !value)}
            aria-label={isSidebarCollapsed ? "Ouvrir le menu" : "Fermer le menu"}
            title={isSidebarCollapsed ? "Ouvrir le menu" : "Fermer le menu"}
          >
            {isSidebarCollapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
            <span className={cn(isSidebarCollapsed && "sr-only")}>{isSidebarCollapsed ? "Ouvrir le menu" : "Fermer le menu"}</span>
          </button>
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

      <AnimatePresence>
        {isMobileNavOpen ? (
          <motion.div
            className="fixed inset-0 z-50 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            <button
              className="absolute inset-0 bg-black/65 backdrop-blur-sm"
              type="button"
              onClick={() => setIsMobileNavOpen(false)}
              aria-label="Fermer le menu"
            />
            <motion.aside
              className="absolute inset-y-0 left-0 flex w-[min(20rem,calc(100vw-2rem))] flex-col border-r border-line bg-ink p-4 shadow-panel"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 360, damping: 34 }}
            >
              <div className="mb-6 flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-white text-ink">
                    <KanbanSquare size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">TraceFlow</p>
                    <p className="text-[11px] leading-4 text-muted">Menu principal</p>
                  </div>
                </div>
                <button
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-line bg-white/[0.04] text-muted transition hover:bg-white/[0.08] hover:text-white"
                  type="button"
                  onClick={() => setIsMobileNavOpen(false)}
                  aria-label="Fermer le menu"
                  title="Fermer le menu"
                >
                  <X size={18} />
                </button>
              </div>
              <nav className="space-y-1">
                {visibleNav.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setIsMobileNavOpen(false)}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-3 rounded-lg px-3 py-3 text-sm text-muted transition hover:bg-white/[0.06] hover:text-white",
                        isActive && "bg-white/[0.08] text-white"
                      )
                    }
                  >
                    <item.icon size={17} />
                    <span>{item.label}</span>
                  </NavLink>
                ))}
              </nav>
            </motion.aside>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <header
        className={cn(
          "sticky top-0 z-20 border-b border-line bg-ink/70 backdrop-blur-xl transition-[margin] duration-200",
          isSidebarCollapsed ? "lg:ml-28" : "lg:ml-72"
        )}
      >
        <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              className="grid h-10 w-10 place-items-center rounded-lg border border-line bg-white/[0.05] text-white shadow-soft transition hover:bg-white/[0.1] lg:hidden"
              type="button"
              onClick={() => setIsMobileNavOpen(true)}
              aria-label="Ouvrir le menu"
              aria-expanded={isMobileNavOpen}
              title="Ouvrir le menu"
            >
              <Menu size={19} />
            </button>
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
