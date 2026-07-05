import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";

type Theme = "dark" | "light";

const storageKey = "qualis.theme";

function getInitialTheme(): Theme {
  const stored = localStorage.getItem(storageKey);

  if (stored === "light" || stored === "dark") {
    return stored;
  }

  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("theme-light", theme === "light");
  document.documentElement.classList.toggle("theme-dark", theme === "dark");
  document.documentElement.dataset.theme = theme;
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() => getInitialTheme());
  const isLight = theme === "light";

  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem(storageKey, theme);
  }, [theme]);

  return (
    <Button
      variant="ghost"
      className="h-9 w-9 px-0 text-cyan"
      type="button"
      aria-label={isLight ? "Activer le theme sombre" : "Activer le theme clair"}
      title={isLight ? "Theme sombre" : "Theme clair"}
      onClick={() => setTheme(isLight ? "dark" : "light")}
    >
      {isLight ? (
        <Moon aria-hidden="true" className="h-5 w-5 shrink-0" strokeWidth={2.4} />
      ) : (
        <Sun aria-hidden="true" className="h-5 w-5 shrink-0" strokeWidth={2.4} />
      )}
    </Button>
  );
}
